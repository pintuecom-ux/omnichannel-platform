'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { X, Search, ShoppingBag, Loader2, RefreshCw, Send, Check } from 'lucide-react'

export interface SyncedProduct {
  id: string
  name: string
  price?: number
  currency?: string
  retailer_id: string
  image_url?: string
  source?: 'meta_catalog' | 'platform_history' | 'custom'
}

interface InputProductModalProps {
  open: boolean
  onClose: () => void
  onSendProduct: (product: SyncedProduct, note?: string) => void
}

export function InputProductModal({ open, onClose, onSendProduct }: InputProductModalProps) {
  const [products, setProducts] = useState<SyncedProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<SyncedProduct | null>(null)
  const [customNote, setCustomNote] = useState('')

  const fetchProducts = async (q = '') => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/planner/meta-sync?type=products&q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (err) {
      console.warn('[InputProductModal] Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchProducts(searchQuery)
      setSelectedProduct(null)
      setCustomNote('')
    }
  }, [open])

  if (!open) return null

  const handleSend = () => {
    if (!selectedProduct) return
    onSendProduct(selectedProduct, customNote.trim())
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', width: '90%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} style={{ color: '#f59e0b' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Send Product Card from Meta Shop</h3>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ padding: '16px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search product name or SKU in Meta Catalog..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                fetchProducts(e.target.value)
              }}
              className="form-textarea"
              style={{ minHeight: 'unset', padding: '8px 12px 8px 32px', fontSize: '13px', width: '100%' }}
            />
          </div>

          {/* Product list */}
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {isLoading && products.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 size={16} className="animate-spin" /> Syncing Meta Commerce Store...
              </div>
            ) : products.length > 0 ? (
              products.map(prod => {
                const isSelected = selectedProduct?.retailer_id === prod.retailer_id
                return (
                  <div
                    key={prod.retailer_id}
                    onClick={() => setSelectedProduct(prod)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                      border: '1px solid',
                      borderColor: isSelected ? '#f59e0b' : 'var(--border-color)',
                      background: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-card)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                          <ShoppingBag size={18} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{prod.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          SKU: {prod.retailer_id} {prod.price ? ` · $${prod.price} ${prod.currency || 'USD'}` : ''}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={18} style={{ color: '#f59e0b' }} />}
                  </div>
                )
              })
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                No product match found in Meta Shop.
              </div>
            )}
          </div>

          {/* Optional Message / Note */}
          {selectedProduct && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                Optional Recommendation Note for Customer:
              </label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Here is the product you asked about! Standard shipping available."
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                style={{ minHeight: '60px', fontSize: '12px' }}
              />
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={11} /> Meta Shop Synced
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="planner-btn" onClick={onClose}>Cancel</button>
            <button
              className="planner-btn primary"
              disabled={!selectedProduct}
              onClick={handleSend}
              style={{ background: selectedProduct ? '#f59e0b' : undefined, color: selectedProduct ? '#ffffff' : undefined, borderColor: selectedProduct ? '#f59e0b' : undefined }}
            >
              <Send size={14} /> Send Product Card
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
