/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { MetaCatalogClient } from '@/lib/platforms/catalog'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const filterCatalogId = searchParams.get('catalog_id')

    const token = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    const businessId = process.env.META_BUSINESS_ID
    const envCatalogId = process.env.META_CATALOG_ID || '1084291823901'

    const supabase = await createClient()

    let catalogs: any[] = []
    let allProducts: any[] = []
    let isMetaConnected = false

    // 1. Query Supabase cached catalogs & products
    const { data: dbCatalogs } = await supabase.from('meta_catalogs').select('*')
    const { data: dbProducts } = await supabase.from('meta_catalog_products').select('*')

    if (dbCatalogs && dbCatalogs.length > 0) {
      catalogs = dbCatalogs
    }
    if (dbProducts && dbProducts.length > 0) {
      allProducts = dbProducts
    }

    // 2. Fetch live from Meta Graph API v25.0 if token available
    if (token) {
      try {
        const liveCatalogs = await MetaCatalogClient.listCatalogs(token, businessId)
        if (liveCatalogs && liveCatalogs.length > 0) {
          isMetaConnected = true
          // Merge or set live catalogs
          catalogs = liveCatalogs.map(c => ({
            id: c.id,
            name: c.name || `Catalog ${c.id}`,
            product_count: c.product_count || 0,
            vertical: c.vertical || 'commerce',
            business: c.business || { name: 'ReactCommerce' },
          }))
        }

        // Fetch products for each catalog or specified catalog
        const catalogsToFetch = filterCatalogId
          ? [{ id: filterCatalogId, name: catalogs.find(c => c.id === filterCatalogId)?.name || `Catalog ${filterCatalogId}` }]
          : catalogs.length > 0
          ? catalogs
          : [{ id: envCatalogId, name: 'Main E-Commerce Catalog' }]

        for (const cat of catalogsToFetch) {
          try {
            const client = new MetaCatalogClient(token, cat.id)
            const metaProds = await client.listProducts(50)
            if (metaProds && metaProds.length > 0) {
              isMetaConnected = true
              const formattedMetaProds = metaProds.map(p => ({
                id: p.id,
                retailer_id: p.retailer_id || p.id,
                name: p.name,
                description: p.description || p.name,
                image_url: p.image_url,
                price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
                currency: p.currency || 'USD',
                availability: p.availability || 'in stock',
                brand: p.brand || 'ReactCommerce',
                category: p.category || 'General',
                url: p.url,
                catalog_id: cat.id,
                catalog_name: cat.name || `Catalog ${cat.id}`,
              }))

              // Deduplicate with existing
              formattedMetaProds.forEach(mp => {
                if (!allProducts.some(p => p.id === mp.id || p.retailer_id === mp.retailer_id)) {
                  allProducts.push(mp)
                }
              })
            }
          } catch (e: any) {
            console.warn(`[MetaCatalog fetch products warning for ${cat.id}]:`, e.message)
          }
        }
      } catch (metaErr: any) {
        console.warn(`[Catalog GET Meta warning]:`, metaErr.message)
      }
    }

    // Default fallback catalog metadata if no catalogs exist yet
    if (catalogs.length === 0) {
      catalogs = [
        {
          id: envCatalogId,
          name: 'Main E-Commerce Catalog',
          product_count: allProducts.length,
          vertical: 'commerce',
          business: { name: 'ReactCommerce Shop' },
          is_default: true,
        },
      ]
    }

    // Attach catalog_name and catalog_id to any products missing them
    const catalogMap = new Map(catalogs.map(c => [c.id, c.name]))
    const enrichedProducts = allProducts.map(p => {
      const cId = p.catalog_id || catalogs[0]?.id || envCatalogId
      const cName = p.catalog_name || catalogMap.get(cId) || catalogs[0]?.name || 'Main E-Commerce Catalog'
      return {
        ...p,
        catalog_id: cId,
        catalog_name: cName,
      }
    })

    // Filter products if catalog_id searchParam is provided
    const filteredProducts = filterCatalogId && filterCatalogId !== 'all'
      ? enrichedProducts.filter(p => p.catalog_id === filterCatalogId)
      : enrichedProducts

    return NextResponse.json({
      success: true,
      is_meta_connected: isMetaConnected,
      catalogs,
      products: filteredProducts,
      total_products: enrichedProducts.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action } = body

    const token = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    const businessId = process.env.META_BUSINESS_ID || '109283749210'
    const catalogId = body.catalog_id || process.env.META_CATALOG_ID || '1084291823901'
    const catalogName = body.catalog_name || 'Main E-Commerce Catalog'

    const supabase = await createClient()

    if (action === 'create_catalog') {
      const { name } = body
      if (!name) {
        return NextResponse.json({ error: 'Catalog name is required' }, { status: 400 })
      }

      let newCatalogId = `cat_${Date.now()}`
      if (token && businessId) {
        try {
          const created = await MetaCatalogClient.createCatalog(token, businessId, name)
          newCatalogId = created.id
        } catch (metaErr: any) {
          console.warn(`[Create Catalog Meta Warning]:`, metaErr.message)
        }
      }

      const newCatalogObj = {
        id: newCatalogId,
        name,
        product_count: 0,
        vertical: 'commerce',
        business: { name: 'ReactCommerce Shop' },
      }

      // Persist to Supabase
      await supabase.from('meta_catalogs').upsert(newCatalogObj)

      return NextResponse.json({
        success: true,
        catalog: newCatalogObj,
      })
    }

    if (action === 'add_product') {
      const { retailer_id, name, description, image_url, price, currency, availability, category, brand, url, target_catalog_id, target_catalog_name } = body

      if (!name || !price || !retailer_id) {
        return NextResponse.json({ error: 'Product name, SKU (retailer_id), and price are required' }, { status: 400 })
      }

      const activeCatalogId = target_catalog_id || catalogId
      const activeCatalogName = target_catalog_name || catalogName

      const productItem = {
        retailer_id: String(retailer_id).toUpperCase().replace(/\s+/g, '_'),
        name,
        description: description || name,
        image_url: image_url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop',
        price: parseFloat(price),
        currency: (currency || 'USD').toUpperCase(),
        availability: availability || 'in stock',
        category: category || 'General',
        brand: brand || 'ReactCommerce',
        url: url || `https://reactcommerce.shop/products/${retailer_id}`,
        catalog_id: activeCatalogId,
        catalog_name: activeCatalogName,
      }

      let metaId = `prod_${Date.now()}`
      let syncedToMeta = false

      if (token && activeCatalogId) {
        try {
          const client = new MetaCatalogClient(token, activeCatalogId)
          const result = await client.createProduct(productItem)
          metaId = result.id
          syncedToMeta = true
        } catch (metaErr: any) {
          console.warn(`[Add Product Meta Warning]:`, metaErr.message)
        }
      }

      const fullProductObj = {
        id: metaId,
        ...productItem,
      }

      // Save to Supabase
      await supabase.from('meta_catalog_products').upsert(fullProductObj)

      return NextResponse.json({
        success: true,
        synced_to_meta: syncedToMeta,
        product: fullProductObj,
      })
    }

    if (action === 'delete_product') {
      const { product_id, target_catalog_id } = body
      if (!product_id) {
        return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
      }

      const activeCatalogId = target_catalog_id || catalogId

      if (token && activeCatalogId && !product_id.startsWith('prod_')) {
        try {
          const client = new MetaCatalogClient(token, activeCatalogId)
          await client.deleteProduct(product_id)
        } catch (metaErr: any) {
          console.warn(`[Delete Product Meta Warning]:`, metaErr.message)
        }
      }

      // Remove from Supabase
      await supabase.from('meta_catalog_products').delete().eq('id', product_id)

      return NextResponse.json({ success: true, deleted_id: product_id })
    }

    return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
