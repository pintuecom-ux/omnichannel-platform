'use client'

import React, { useEffect, useState } from 'react'

export interface CatalogItem {
  id: string
  name: string
  product_count: number
  vertical?: string
  business?: { name: string }
  is_default?: boolean
}

export interface ProductItem {
  id: string
  retailer_id: string
  name: string
  description?: string
  image_url: string
  price: number
  currency?: string
  availability?: 'in stock' | 'out of stock' | 'preorder'
  brand?: string
  category?: string
  url?: string
  catalog_id: string
  catalog_name: string
}

export default function MetaCatalogPage() {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('all')
  const [isMetaConnected, setIsMetaConnected] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Modals
  const [showAddProduct, setShowAddProduct] = useState<boolean>(false)
  const [showCreateCatalog, setShowCreateCatalog] = useState<boolean>(false)

  // Add Product Form State
  const [targetCatalogId, setTargetCatalogId] = useState('')
  const [sku, setSku] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [availability, setAvailability] = useState<'in stock' | 'out of stock'>('in stock')
  const [category, setCategory] = useState('Apparel')
  const [brand, setBrand] = useState('ReactCommerce')
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Create Catalog Form State
  const [newCatalogName, setNewCatalogName] = useState('')
  const [creatingCat, setCreatingCat] = useState(false)

  const fetchCatalogData = async (catId = 'all') => {
    setLoading(true)
    try {
      const url = catId && catId !== 'all' ? `/api/catalog?catalog_id=${catId}` : '/api/catalog'
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setCatalogs(data.catalogs || [])
        setProducts(data.products || [])
        setIsMetaConnected(!!data.is_meta_connected)
        if (data.catalogs?.length > 0 && !targetCatalogId) {
          setTargetCatalogId(data.catalogs[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load catalog data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCatalogData('all')
  }, [])

  const handleCatalogFilterChange = (catId: string) => {
    setSelectedCatalogId(catId)
    fetchCatalogData(catId)
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !price || !sku) {
      setFormError('Title, SKU, and Price are required')
      return
    }
    setSubmitting(true)
    setFormError(null)
    setFormSuccess(null)

    const activeCatObj = catalogs.find(c => c.id === targetCatalogId) || catalogs[0]

    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_product',
          target_catalog_id: targetCatalogId || activeCatObj?.id,
          target_catalog_name: activeCatObj?.name || 'Main E-Commerce Catalog',
          retailer_id: sku,
          name: title,
          description,
          price: parseFloat(price),
          currency,
          availability,
          category,
          brand,
          image_url: imageUrl,
          url: `https://reactcommerce.shop/products/${sku.toLowerCase()}`,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to add product')
        return
      }

      setFormSuccess(data.synced_to_meta ? '✅ Product published & synced to Meta Commerce Catalog!' : '✅ Product added to storefront catalog!')
      setProducts(prev => [data.product, ...prev])

      setTimeout(() => {
        setShowAddProduct(false)
        setFormSuccess(null)
        setSku('')
        setTitle('')
        setDescription('')
        setPrice('')
      }, 1200)
    } catch (err: any) {
      setFormError(err.message || 'Error creating product')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateCatalog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatalogName.trim()) return
    setCreatingCat(true)

    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_catalog',
          name: newCatalogName.trim(),
        }),
      })

      const data = await res.json()
      if (data.success) {
        setCatalogs(prev => [...prev, data.catalog])
        setSelectedCatalogId(data.catalog.id)
        setTargetCatalogId(data.catalog.id)
        setShowCreateCatalog(false)
        setNewCatalogName('')
      }
    } catch (err) {
      console.error('Failed to create catalog:', err)
    } finally {
      setCreatingCat(false)
    }
  }

  const handleDeleteProduct = async (prod: ProductItem) => {
    if (!confirm(`Are you sure you want to remove "${prod.name}" from ${prod.catalog_name}?`)) return
    try {
      await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_product', product_id: prod.id, target_catalog_id: prod.catalog_id }),
      })
      setProducts(prev => prev.filter(p => p.id !== prod.id))
    } catch (err) {
      console.error('Failed to delete product:', err)
    }
  }

  // Filter products by search and category
  const filteredProducts = products.filter(p => {
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.retailer_id.toLowerCase().includes(search.toLowerCase()) ||
      (p.catalog_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCat = categoryFilter === 'all' || (p.category ?? 'General') === categoryFilter
    return matchesSearch && matchesCat
  })

  const categoriesList = Array.from(new Set(products.map(p => p.category || 'General')))

  return (
    <div className="generic-page">
      {/* ── Page Header ── */}
      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-store" style={{ color: '#00A884', marginRight: 10 }} />
          Meta Commerce Catalogs & Products
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => setShowCreateCatalog(true)}>
            <i className="fa-solid fa-folder-plus" style={{ marginRight: 6 }} /> New Catalog
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddProduct(true)} style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}>
            <i className="fa-solid fa-plus" style={{ marginRight: 6 }} /> Add Product SKU
          </button>
        </div>
      </div>

      {/* ── Status Banner ── */}
      <div style={{ padding: '12px 24px', background: 'rgba(0, 168, 132, 0.08)', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa-brands fa-meta" style={{ color: '#0084FF', fontSize: 16 }} />
          <span>
            Real-Time <strong>Meta Commerce Manager v25.0 API</strong>. Each product below lists its assigned <strong>Catalog Name & Catalog ID</strong> and is immediately taggable across Facebook Shops, Instagram Reels/Feed, and Content Planner.
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: isMetaConnected ? '#25D366' : 'var(--accent3)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className={`fa-solid ${isMetaConnected ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} />
          {isMetaConnected ? 'Meta Live API Connected' : 'Storefront Direct Catalog Mode'}
        </span>
      </div>

      <div className="page-body">
        {/* ── Metrics Cards Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0, 168, 132, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#00A884' }}>
              <i className="fa-solid fa-boxes-stacked" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Total Products</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{products.length}</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0, 132, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#0084FF' }}>
              <i className="fa-solid fa-folder-tree" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Meta Commerce Catalogs</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{catalogs.length}</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37, 211, 102, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#25D366' }}>
              <i className="fa-solid fa-circle-check" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>In Stock Ratio</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {products.length > 0 ? Math.round((products.filter(p => p.availability !== 'out of stock').length / products.length) * 100) : 100}%
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(192, 132, 252, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#c084fc' }}>
              <i className="fa-solid fa-tags" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Shoppable Tagging</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#c084fc', marginTop: 2 }}>Active</div>
            </div>
          </div>
        </div>

        {/* ── Catalog Filter & Search Toolbar ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Catalog Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 12px' }}>
            <i className="fa-solid fa-filter" style={{ color: '#00A884', fontSize: 12 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Filter by Catalog:</span>
            <select
              value={selectedCatalogId}
              onChange={e => handleCatalogFilterChange(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
            >
              <option value="all" style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
                🌐 All Meta Catalogs ({products.length} products)
              </option>
              {catalogs.map(c => (
                <option key={c.id} value={c.id} style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)' }}>
                  📁 {c.name} (ID: {c.id})
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="search-input-wrap" style={{ flex: 1, minWidth: 240 }}>
            <i className="fa-solid fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search by product name, SKU, or catalog name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none' }}
          >
            <option value="all">All Categories</option>
            {categoriesList.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* ── Product Catalog Grid ── */}
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Fetching Meta Commerce Catalog products...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filteredProducts.map(p => {
              const formattedPrice = typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : `$${p.price}`
              const isInStock = p.availability !== 'out of stock'

              return (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--border-active)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  {/* Image Preview */}
                  <div style={{ height: 160, width: '100%', background: '#0b141a', position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={p.image_url}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => {
                        ;(e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop'
                      }}
                    />
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: '#25D366' }}>
                      {formattedPrice} {p.currency || 'USD'}
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, color: 'var(--text-muted)' }}>
                      SKU: {p.retailer_id}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {p.name}
                    </div>
                    {p.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                        {p.description}
                      </div>
                    )}

                    {/* ── Catalog Name & Catalog ID Badge ── */}
                    <div style={{ background: 'rgba(0, 132, 255, 0.08)', border: '1px solid rgba(0, 132, 255, 0.2)', borderRadius: 8, padding: '5px 8px', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="fa-solid fa-folder-tree" style={{ color: '#0084FF', fontSize: 10, flexShrink: 0 }} />
                      <div style={{ fontSize: 10, color: '#0084FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {p.catalog_name} <span style={{ opacity: 0.7, fontWeight: 400 }}>(ID: {p.catalog_id})</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: isInStock ? 'rgba(37,211,102,0.1)' : 'rgba(232,64,64,0.1)', color: isInStock ? '#25D366' : '#e84040', fontWeight: 600 }}>
                        ● {isInStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          style={{ background: 'none', border: 'none', color: '#e84040', cursor: 'pointer', fontSize: 12, padding: '4px 6px' }}
                          title="Delete SKU"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <i className="fa-solid fa-store" style={{ fontSize: 36, opacity: 0.3, display: 'block', marginBottom: 12 }} />
                No products found. Click <strong>Add Product SKU</strong> to publish your first SKU to Meta Catalog.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Add Product to Catalog ── */}
      {showAddProduct && (
        <div className="tpl-modal-overlay open" onClick={() => setShowAddProduct(false)}>
          <div className="tpl-modal" style={{ width: 680, maxWidth: '92vw' }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className="fa-solid fa-plus" style={{ color: '#25D366', marginRight: 8 }} />
                Add Product to Meta Commerce Catalog
              </div>
              <button className="icon-btn" onClick={() => setShowAddProduct(false)}><i className="fa-solid fa-xmark" /></button>
            </div>

            <form onSubmit={handleAddProduct}>
              <div className="tpl-modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {formError && (
                  <div style={{ gridColumn: '1 / -1', background: 'rgba(232,64,64,0.1)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e84040' }}>
                    <i className="fa-solid fa-circle-xmark" style={{ marginRight: 6 }} />{formError}
                  </div>
                )}
                {formSuccess && (
                  <div style={{ gridColumn: '1 / -1', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#25D366' }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />{formSuccess}
                  </div>
                )}

                {/* Target Catalog Selector */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="form-label">Target Meta Catalog *</div>
                  <select
                    className="form-input"
                    value={targetCatalogId}
                    onChange={e => setTargetCatalogId(e.target.value)}
                    required
                  >
                    {catalogs.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Catalog ID: {c.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="form-label">Product Name *</div>
                  <input
                    className="form-input"
                    placeholder="e.g. Vintage Leather Biker Jacket"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="form-label">Store SKU / Retailer ID *</div>
                  <input
                    className="form-input"
                    placeholder="e.g. SKU_LEATHER_JACKET_01"
                    value={sku}
                    onChange={e => setSku(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div>
                  <div className="form-label">Unit Price ($ USD) *</div>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="199.99"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="form-label">Stock Availability</div>
                  <select className="form-input" value={availability} onChange={e => setAvailability(e.target.value as any)}>
                    <option value="in stock">In Stock</option>
                    <option value="out of stock">Out of Stock</option>
                  </select>
                </div>

                <div>
                  <div className="form-label">Category</div>
                  <input className="form-input" value={category} onChange={e => setCategory(e.target.value)} placeholder="Apparel, Footwear..." />
                </div>

                <div>
                  <div className="form-label">Brand Name</div>
                  <input className="form-input" value={brand} onChange={e => setBrand(e.target.value)} placeholder="ReactCommerce" />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="form-label">Product Image URL</div>
                  <input className="form-input" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="form-label">Description</div>
                  <textarea className="form-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief product description for Facebook/Instagram Shop..." style={{ resize: 'none' }} />
                </div>
              </div>

              <div className="tpl-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddProduct(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}>
                  {submitting ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Syncing to Meta…</> : <><i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }} />Publish SKU to Meta</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Create Catalog ── */}
      {showCreateCatalog && (
        <div className="tpl-modal-overlay open" onClick={() => setShowCreateCatalog(false)}>
          <div className="tpl-modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className="fa-solid fa-folder-plus" style={{ color: '#00A884', marginRight: 8 }} />
                Create New Meta Commerce Catalog
              </div>
              <button className="icon-btn" onClick={() => setShowCreateCatalog(false)}><i className="fa-solid fa-xmark" /></button>
            </div>

            <form onSubmit={handleCreateCatalog}>
              <div className="tpl-modal-body">
                <div className="form-group">
                  <div className="form-label">Catalog Name *</div>
                  <input
                    className="form-input"
                    placeholder="e.g. ReactCommerce Festival Collection 2026"
                    value={newCatalogName}
                    onChange={e => setNewCatalogName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="tpl-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateCatalog(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creatingCat || !newCatalogName.trim()}>
                  {creatingCat ? 'Creating…' : 'Create Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
