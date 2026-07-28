/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import { buildMetaGraphUrl } from './meta'

export interface MetaProductItem {
  retailer_id: string         // Unique SKU or storefront ID in React Commerce
  name: string                // Product title
  description: string         // Product description
  image_url: string           // Main picture image URL
  additional_image_urls?: string[]
  price: number               // Unit price in numbers (e.g. 1999) # formatted later as "19.99 USD"
  currency?: string           // ISO currency code (defaults to USD or INR)
  availability?: 'in stock' | 'out of stock' | 'preorder' | 'available for order' | 'discontinued'
  condition?: 'new' | 'refurbished' | 'used'
  url: string                 // Link to purchase page on reactcommerce.shop
  brand?: string
  category?: string
}

/**
 * Meta E-Commerce Catalog Client (Graph API v25.0)
 * Powered by `catalog_management` permission.
 * Automatically synchronizes React Commerce products into Meta Product Catalogs,
 * making SKUs immediately taggable across Facebook Shops, Instagram Shops, and Content Planner Reels/Feed!
 */
export class MetaCatalogClient {
  constructor(
    private accessToken: string,
    private catalogId: string
  ) {}

  private get headers() {
    return { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' }
  }

  private formatPrice(amount: number, currency: string = 'USD'): string {
    const formatted = (typeof amount === 'number' ? amount : parseFloat(amount)).toFixed(2)
    return `${formatted} ${currency.toUpperCase()}`
  }

  /** Fetch all products registered in the Meta Commerce Catalog */
  async listProducts(limit = 50): Promise<any[]> {
    try {
      const res = await axios.get(buildMetaGraphUrl(`${this.catalogId}/products`), {
        params: {
          fields: 'id,retailer_id,name,description,image_url,price,currency,availability,url,brand',
          limit,
          access_token: this.accessToken,
        },
      })
      return res.data?.data ?? []
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err.message
      console.error(`[MetaCatalog listProducts Error] Catalog ${this.catalogId}:`, msg)
      throw new Error(`Meta Catalog API Error: ${msg}`)
    }
  }

  /** Get a single product by its Meta Product ID or retail SKU */
  async getProduct(productId: string): Promise<any> {
    try {
      const res = await axios.get(buildMetaGraphUrl(productId), {
        params: {
          fields: 'id,retailer_id,name,description,image_url,additional_image_urls,price,currency,availability,url,brand',
          access_token: this.accessToken,
        },
      })
      return res.data
    } catch (err: any) {
      throw new Error(err?.response?.data?.error?.message || err.message)
    }
  }

  /** Create or register a storefront product item in Meta Shop */
  async createProduct(item: MetaProductItem): Promise<{ id: string }> {
    try {
      const payload: Record<string, any> = {
        retailer_id: item.retailer_id,
        name: item.name,
        description: item.description || item.name,
        image_url: item.image_url,
        price: this.formatPrice(item.price, item.currency || 'USD'),
        currency: (item.currency || 'USD').toUpperCase(),
        availability: item.availability || 'in stock',
        condition: item.condition || 'new',
        url: item.url || `https://reactcommerce.shop/products/${item.retailer_id}`,
      }

      if (item.brand) payload.brand = item.brand
      if (item.category) payload.category = item.category
      if (item.additional_image_urls?.length) payload.additional_image_urls = item.additional_image_urls

      const res = await axios.post(
        buildMetaGraphUrl(`${this.catalogId}/products`),
        payload,
        { headers: this.headers }
      )
      console.log(`[MetaCatalog createProduct] ✅ Created product SKU ${item.retailer_id} (ID: ${res.data.id})`)
      return { id: res.data.id }
    } catch (err: any) {
      const errorDetail = err?.response?.data?.error?.message || err.message
      console.error(`[MetaCatalog createProduct Error] SKU ${item.retailer_id}:`, errorDetail)
      throw new Error(`Failed to sync product to Meta Catalog: ${errorDetail}`)
    }
  }

  /** Update attributes (such as price or stock status) of an existing Meta catalog product */
  async updateProduct(productId: string, updates: Partial<MetaProductItem>): Promise<void> {
    try {
      const payload: Record<string, any> = {}
      if (updates.name) payload.name = updates.name
      if (updates.description) payload.description = updates.description
      if (updates.image_url) payload.image_url = updates.image_url
      if (updates.availability) payload.availability = updates.availability
      if (updates.price !== undefined) payload.price = this.formatPrice(updates.price, updates.currency || 'USD')
      if (updates.url) payload.url = updates.url

      await axios.post(
        buildMetaGraphUrl(productId),
        payload,
        { headers: this.headers }
      )
    } catch (err: any) {
      throw new Error(err?.response?.data?.error?.message || err.message)
    }
  }

  /** Delete a product item from the Meta Catalog */
  async deleteProduct(productId: string): Promise<void> {
    try {
      await axios.delete(buildMetaGraphUrl(productId), {
        params: { access_token: this.accessToken },
      })
      console.log(`[MetaCatalog deleteProduct] Deleted product ${productId}`)
    } catch (err: any) {
      throw new Error(err?.response?.data?.error?.message || err.message)
    }
  }

  /**
   * Bulk Batch Sync API
   * Used when synchronizing inventory batches from React Commerce store to Facebook & Instagram Shops
   * Each request in array specifies: method ('CREATE' | 'UPDATE' | 'DELETE'), data: { retailer_id, ... }
   */
  async batchSyncProducts(requests: Array<{ method: 'CREATE' | 'UPDATE' | 'DELETE'; data: Record<string, any> }>): Promise<any> {
    try {
      const formattedRequests = requests.map(req => {
        const d = { ...req.data }
        if (d.price && typeof d.price === 'number') {
          d.price = this.formatPrice(d.price, d.currency || 'USD')
        }
        return {
          method: req.method,
          data: d,
        }
      })

      const res = await axios.post(
        buildMetaGraphUrl(`${this.catalogId}/items_batch`),
        { item_type: 'PRODUCT_ITEM', requests: formattedRequests },
        { headers: this.headers }
      )
      return res.data // { handles, validation_status }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err.message
      console.error(`[MetaCatalog batchSync Error]:`, msg)
      throw new Error(`Meta Catalog Bulk Sync failed: ${msg}`)
    }
  }

  /** Fetch all owned Meta Commerce Catalogs for a Business Manager or user account */
  static async listCatalogs(accessToken: string, businessId?: string): Promise<any[]> {
    try {
      const target = businessId ? `${businessId}/owned_product_catalogs` : 'me/product_catalogs'
      const res = await axios.get(buildMetaGraphUrl(target), {
        params: {
          fields: 'id,name,product_count,vertical,business',
          access_token: accessToken,
        },
      })
      return res.data?.data ?? []
    } catch (err: any) {
      console.warn(`[MetaCatalog listCatalogs warning]:`, err?.response?.data?.error?.message || err.message)
      return []
    }
  }

  /** Create a new Meta Product Catalog under a Business Manager */
  static async createCatalog(accessToken: string, businessId: string, name: string): Promise<{ id: string }> {
    try {
      const res = await axios.post(
        buildMetaGraphUrl(`${businessId}/owned_product_catalogs`),
        { name, vertical: 'commerce' },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      )
      return { id: res.data.id }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err.message
      throw new Error(`Failed to create Meta Catalog: ${msg}`)
    }
  }
}

