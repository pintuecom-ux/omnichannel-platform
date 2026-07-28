/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { MetaCatalogClient } from '@/lib/platforms/catalog'

// Curated high-converting default e-commerce products for React Commerce storefront catalog
const DEMO_STORE_PRODUCTS = [
  {
    id: 'prod_101',
    retailer_id: 'SKU_SUMMER_SNEAKERS_01',
    name: 'React Air Flex Summer Sneakers',
    description: 'Lightweight breathable mesh sneakers designed for maximum comfort and style.',
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop',
    price: 129.99,
    currency: 'USD',
    availability: 'in stock',
    brand: 'ReactCommerce',
    category: 'Footwear',
    url: 'https://reactcommerce.shop/products/SKU_SUMMER_SNEAKERS_01',
  },
  {
    id: 'prod_102',
    retailer_id: 'SKU_LEATHER_JACKET_02',
    name: 'Classic Vintage Leather Biker Jacket',
    description: 'Handcrafted genuine leather motorcycle jacket with sleek silver zipper accents.',
    image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop',
    price: 249.50,
    currency: 'USD',
    availability: 'in stock',
    brand: 'ReactCommerce',
    category: 'Apparel',
    url: 'https://reactcommerce.shop/products/SKU_LEATHER_JACKET_02',
  },
  {
    id: 'prod_103',
    retailer_id: 'SKU_CHRONO_WATCH_03',
    name: 'Minimalist Matte Chronograph Watch',
    description: 'Water-resistant luxury minimalist stainless steel timepiece with sapphire glass.',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop',
    price: 189.00,
    currency: 'USD',
    availability: 'in stock',
    brand: 'ReactCommerce',
    category: 'Accessories',
    url: 'https://reactcommerce.shop/products/SKU_CHRONO_WATCH_03',
  },
  {
    id: 'prod_104',
    retailer_id: 'SKU_WIRELESS_EARBUDS_04',
    name: 'Pro ANC Wireless Earbuds',
    description: 'Active Noise Cancelling Bluetooth 5.3 earbuds with 36-hour charging case.',
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop',
    price: 89.99,
    currency: 'USD',
    availability: 'in stock',
    brand: 'ReactCommerce',
    category: 'Electronics',
    url: 'https://reactcommerce.shop/products/SKU_WIRELESS_EARBUDS_04',
  },
]

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const catalogIdParam = searchParams.get('catalog_id')

    const token = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    const businessId = process.env.META_BUSINESS_ID
    const defaultCatalogId = catalogIdParam || process.env.META_CATALOG_ID || '1084291823901'

    let catalogs: any[] = []
    let products: any[] = []
    let isMetaConnected = false

    if (token) {
      try {
        // Try fetching live Meta Catalogs from Graph API v25.0
        catalogs = await MetaCatalogClient.listCatalogs(token, businessId)
        if (catalogs.length > 0) {
          isMetaConnected = true
        }

        // Fetch products for active catalog
        const activeCatalogId = catalogIdParam || (catalogs[0]?.id ?? defaultCatalogId)
        const client = new MetaCatalogClient(token, activeCatalogId)
        const metaProducts = await client.listProducts(50)
        if (metaProducts && metaProducts.length > 0) {
          products = metaProducts
          isMetaConnected = true
        }
      } catch (metaErr: any) {
        console.warn(`[Catalog GET Meta warning]:`, metaErr.message)
      }
    }

    // Fallback default catalog if none returned
    if (catalogs.length === 0) {
      catalogs = [
        {
          id: defaultCatalogId,
          name: 'ReactCommerce Main E-Commerce Catalog',
          product_count: DEMO_STORE_PRODUCTS.length,
          vertical: 'commerce',
          business: { name: 'ReactCommerce Shop' },
          is_default: true,
        },
      ]
    }

    // Fallback demo products if Meta catalog has no products yet
    if (products.length === 0) {
      products = DEMO_STORE_PRODUCTS
    }

    return NextResponse.json({
      success: true,
      is_meta_connected: isMetaConnected,
      catalogs,
      products,
      active_catalog_id: catalogs[0]?.id ?? defaultCatalogId,
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

      return NextResponse.json({
        success: true,
        catalog: {
          id: newCatalogId,
          name,
          product_count: 0,
          vertical: 'commerce',
          business: { name: 'ReactCommerce Shop' },
        },
      })
    }

    if (action === 'add_product') {
      const { retailer_id, name, description, image_url, price, currency, availability, category, brand, url } = body

      if (!name || !price || !retailer_id) {
        return NextResponse.json({ error: 'Product name, SKU (retailer_id), and price are required' }, { status: 400 })
      }

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
      }

      let metaId = `prod_${Date.now()}`
      let syncedToMeta = false

      if (token && catalogId) {
        try {
          const client = new MetaCatalogClient(token, catalogId)
          const result = await client.createProduct(productItem)
          metaId = result.id
          syncedToMeta = true
        } catch (metaErr: any) {
          console.warn(`[Add Product Meta Warning]:`, metaErr.message)
        }
      }

      return NextResponse.json({
        success: true,
        synced_to_meta: syncedToMeta,
        product: {
          id: metaId,
          ...productItem,
        },
      })
    }

    if (action === 'delete_product') {
      const { product_id } = body
      if (!product_id) {
        return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
      }

      if (token && catalogId && !product_id.startsWith('prod_')) {
        try {
          const client = new MetaCatalogClient(token, catalogId)
          await client.deleteProduct(product_id)
        } catch (metaErr: any) {
          console.warn(`[Delete Product Meta Warning]:`, metaErr.message)
        }
      }

      return NextResponse.json({ success: true, deleted_id: product_id })
    }

    return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
