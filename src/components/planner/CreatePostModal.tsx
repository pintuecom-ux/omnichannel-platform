'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from 'react'
import {
  X,
  Image as ImageIcon,
  Hash,
  MapPin,
  Tag,
  Loader2,
  Plus,
  Check,
  Globe,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Send,
  ThumbsUp,
  ShoppingBag
} from 'lucide-react'

interface TaggedProduct {
  id: string
  name: string
  price?: number
  retailer_id: string
}

const PRESET_HASHTAGS = [
  '#reactcommerce', '#shop', '#ecommerce', '#newarrival',
  '#style', '#onlineshopping', '#deals', '#bestseller', '#musthave', '#fashion'
]

const PRESET_LOCATIONS = [
  'New York, USA', 'London, UK', 'Tokyo, Japan', 'Global Online Store', 'California, USA', 'Dubai, UAE'
]

const CATALOG_PRODUCTS: TaggedProduct[] = [
  { id: 'prod_1', retailer_id: 'SKU-101', name: 'Executive Slate Watch', price: 199.99 },
  { id: 'prod_2', retailer_id: 'SKU-102', name: 'Platinum Wireless Earbuds', price: 149.99 },
  { id: 'prod_3', retailer_id: 'SKU-103', name: 'Smart Fitness Tracker', price: 89.99 },
  { id: 'prod_4', retailer_id: 'SKU-104', name: 'Minimalist Leather Wallet', price: 49.99 },
]

export default function CreatePostModal({
  onClose,
  onSave,
  initialDate
}: {
  onClose: () => void
  onSave: () => void
  initialDate?: Date | null
}) {
  const [caption, setCaption] = useState('')
  const [platforms, setPlatforms] = useState({ instagram: true, facebook: true })
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [previewTab, setPreviewTab] = useState<'instagram' | 'facebook'>('instagram')
  const [scheduleOption, setScheduleOption] = useState<'now' | 'later'>(initialDate ? 'later' : 'now')
  const [scheduleDate, setScheduleDate] = useState(initialDate ? initialDate.toISOString().split('T')[0] : '')
  const [scheduleTime, setScheduleTime] = useState(initialDate ? '10:00' : '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Interactive Tools state
  const [location, setLocation] = useState('')
  const [taggedProducts, setTaggedProducts] = useState<TaggedProduct[]>([])
  const [activePopover, setActivePopover] = useState<'hashtags' | 'location' | 'products' | null>(null)
  const [customLocationInput, setCustomLocationInput] = useState('')
  const [customProductInput, setCustomProductInput] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setMediaFiles(prev => [...prev, ...newFiles])
      const newPreviews = newFiles.map(file => URL.createObjectURL(file))
      setMediaPreviews(prev => [...prev, ...newPreviews])
    }
  }

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const toggleHashtag = (tag: string) => {
    if (caption.includes(tag)) {
      setCaption(prev => prev.replace(tag, '').replace(/\s+/g, ' ').trim())
    } else {
      setCaption(prev => (prev ? `${prev.trim()} ${tag}` : tag))
    }
  }

  const selectLocation = (loc: string) => {
    setLocation(loc)
    setActivePopover(null)
  }

  const toggleProductTag = (product: TaggedProduct) => {
    if (taggedProducts.some(p => p.retailer_id === product.retailer_id)) {
      setTaggedProducts(prev => prev.filter(p => p.retailer_id !== product.retailer_id))
    } else {
      setTaggedProducts(prev => [...prev, product])
    }
  }

  const addCustomProduct = () => {
    if (!customProductInput.trim()) return
    const sku = `SKU-${Date.now().toString().slice(-4)}`
    const newProd: TaggedProduct = {
      id: `custom_${Date.now()}`,
      retailer_id: sku,
      name: customProductInput.trim(),
      price: 99.99
    }
    setTaggedProducts(prev => [...prev, newProd])
    setCustomProductInput('')
  }

  const handleSubmit = async () => {
    if (mediaFiles.length === 0) {
      alert('Please upload at least one image or video.')
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('caption', caption)
      formData.append('action', scheduleOption === 'now' ? 'publish_now' : 'schedule')
      formData.append('target_platforms', JSON.stringify(platforms))
      if (location) formData.append('location', location)
      if (taggedProducts.length > 0) {
        formData.append('product_tags', JSON.stringify(taggedProducts.map(p => ({
          product_id: p.id,
          retailer_id: p.retailer_id,
          x: 0.5,
          y: 0.5
        }))))
      }

      if (scheduleOption === 'later' && scheduleDate && scheduleTime) {
        const dt = new Date(`${scheduleDate}T${scheduleTime}`)
        formData.append('publish_at', dt.toISOString())
      }

      mediaFiles.forEach(file => {
        formData.append('files', file)
      })

      const res = await fetch('/api/instagram/publications', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create post')
      }

      onSave()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '1080px' }}>
        <div className="modal-header">
          <h2>Create Post</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Editor Left Side */}
          <div className="creator-left">
            <div className="form-group">
              <label>Target Platforms</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, color: platforms.instagram ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={platforms.instagram}
                    onChange={e => {
                      const next = { ...platforms, instagram: e.target.checked }
                      setPlatforms(next)
                      if (!next.instagram && previewTab === 'instagram') setPreviewTab('facebook')
                    }}
                  />
                  <i className="fa-brands fa-instagram" style={{ color: platforms.instagram ? '#E1306C' : 'currentColor', fontSize: '18px' }}></i> Instagram
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, color: platforms.facebook ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={platforms.facebook}
                    onChange={e => {
                      const next = { ...platforms, facebook: e.target.checked }
                      setPlatforms(next)
                      if (!next.facebook && previewTab === 'facebook') setPreviewTab('instagram')
                    }}
                  />
                  <i className="fa-brands fa-facebook" style={{ color: platforms.facebook ? '#1877F2' : 'currentColor', fontSize: '18px' }}></i> Facebook Page
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Media</label>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,video/*"
                multiple
                onChange={handleMediaUpload}
              />
              {mediaPreviews.length > 0 ? (
                <div className="media-preview-grid">
                  {mediaPreviews.map((url, i) => (
                    <div key={i} className="media-thumbnail">
                      <img src={url} alt={`Upload ${i}`} />
                      <button className="media-remove" onClick={() => removeMedia(i)}><X size={12} /></button>
                    </div>
                  ))}
                  <div className="media-upload-area" style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px' }} onClick={() => fileInputRef.current?.click()}>
                    <Plus size={24} color="var(--text-muted)" />
                  </div>
                </div>
              ) : (
                <div className="media-upload-area" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>Click to upload photo or video</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG, MP4 up to 50MB</div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label>Caption & Interactive Tags</label>
              <textarea
                className="form-textarea"
                placeholder="Write a caption for your post..."
                value={caption}
                onChange={e => setCaption(e.target.value)}
                style={{ minHeight: '110px' }}
              />

              {/* Action Tool Toolbar */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="planner-btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '20px',
                    borderColor: activePopover === 'hashtags' ? 'var(--accent)' : 'var(--border-color)',
                    background: activePopover === 'hashtags' ? 'rgba(20, 184, 166, 0.15)' : undefined
                  }}
                  onClick={() => setActivePopover(activePopover === 'hashtags' ? null : 'hashtags')}
                >
                  <Hash size={14} style={{ color: '#14b8a6' }} /> Add Hashtags
                </button>

                <button
                  type="button"
                  className="planner-btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '20px',
                    borderColor: location ? 'var(--accent)' : activePopover === 'location' ? 'var(--accent)' : 'var(--border-color)',
                    background: location ? 'rgba(59, 130, 246, 0.15)' : activePopover === 'location' ? 'rgba(59, 130, 246, 0.15)' : undefined
                  }}
                  onClick={() => setActivePopover(activePopover === 'location' ? null : 'location')}
                >
                  <MapPin size={14} style={{ color: '#3b82f6' }} /> {location ? `📍 ${location}` : 'Add Location'}
                </button>

                <button
                  type="button"
                  className="planner-btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '20px',
                    borderColor: taggedProducts.length > 0 ? 'var(--accent)' : activePopover === 'products' ? 'var(--accent)' : 'var(--border-color)',
                    background: taggedProducts.length > 0 ? 'rgba(245, 158, 11, 0.15)' : activePopover === 'products' ? 'rgba(245, 158, 11, 0.15)' : undefined
                  }}
                  onClick={() => setActivePopover(activePopover === 'products' ? null : 'products')}
                >
                  <Tag size={14} style={{ color: '#f59e0b' }} /> {taggedProducts.length > 0 ? `🏷️ Tagged (${taggedProducts.length})` : 'Tag Products'}
                </button>
              </div>

              {/* Tagged Items Active Bar */}
              {(location || taggedProducts.length > 0) && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {location && (
                    <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '3px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={10} /> {location}
                      <button onClick={() => setLocation('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}><X size={10} /></button>
                    </span>
                  )}
                  {taggedProducts.map(p => (
                    <span key={p.retailer_id} style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '3px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ShoppingBag size={10} /> {p.name}
                      <button onClick={() => toggleProductTag(p)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}

              {/* Popover 1: Hashtags Suggestion Box */}
              {activePopover === 'hashtags' && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '8px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px',
                  padding: '12px', boxShadow: '0 12px 24px rgba(0,0,0,0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    <span>Trending E-Commerce Hashtags</span>
                    <button onClick={() => setActivePopover(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {PRESET_HASHTAGS.map(tag => {
                      const isSelected = caption.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleHashtag(tag)}
                          style={{
                            fontSize: '11px', padding: '4px 8px', borderRadius: '12px', cursor: 'pointer',
                            border: '1px solid',
                            borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                            background: isSelected ? 'var(--accent)' : 'var(--bg-body)',
                            color: isSelected ? '#ffffff' : 'var(--text-main)'
                          }}
                        >
                          {tag} {isSelected && <Check size={10} style={{ marginLeft: '2px' }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Popover 2: Location Selector */}
              {activePopover === 'location' && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '8px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px',
                  padding: '12px', boxShadow: '0 12px 24px rgba(0,0,0,0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    <span>Add Location</span>
                    <button onClick={() => setActivePopover(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder="Type location name..."
                      value={customLocationInput}
                      onChange={e => setCustomLocationInput(e.target.value)}
                      className="form-textarea"
                      style={{ minHeight: 'unset', padding: '6px 10px', fontSize: '12px' }}
                    />
                    <button
                      type="button"
                      className="planner-btn primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => {
                        if (customLocationInput.trim()) selectLocation(customLocationInput.trim())
                      }}
                    >
                      Set
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Popular Presets:</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {PRESET_LOCATIONS.map(loc => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => selectLocation(loc)}
                        style={{
                          fontSize: '11px', padding: '4px 8px', borderRadius: '12px', cursor: 'pointer',
                          border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'var(--text-main)'
                        }}
                      >
                        📍 {loc}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popover 3: Product Tagging Selector */}
              {activePopover === 'products' && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '8px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px',
                  padding: '12px', boxShadow: '0 12px 24px rgba(0,0,0,0.3)', maxHeight: '280px', overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                    <span>Tag Catalog Storefront Products</span>
                    <button onClick={() => setActivePopover(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {CATALOG_PRODUCTS.map(prod => {
                      const isTagged = taggedProducts.some(p => p.retailer_id === prod.retailer_id)
                      return (
                        <div
                          key={prod.retailer_id}
                          onClick={() => toggleProductTag(prod)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '6px 10px', borderRadius: '8px', cursor: 'pointer',
                            border: '1px solid',
                            borderColor: isTagged ? 'var(--accent)' : 'var(--border-color)',
                            background: isTagged ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-body)'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{prod.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{prod.retailer_id} · ${prod.price}</div>
                          </div>
                          {isTagged && <Check size={14} style={{ color: '#f59e0b' }} />}
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Add custom SKU / Product..."
                      value={customProductInput}
                      onChange={e => setCustomProductInput(e.target.value)}
                      className="form-textarea"
                      style={{ minHeight: 'unset', padding: '4px 8px', fontSize: '11px' }}
                    />
                    <button type="button" className="planner-btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={addCustomProduct}>
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: 'auto' }}>
              <label>Schedule Options</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="schedule" checked={scheduleOption === 'now'} onChange={() => setScheduleOption('now')} /> Publish Now
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="schedule" checked={scheduleOption === 'later'} onChange={() => setScheduleOption('later')} /> Schedule for Later
                </label>
              </div>

              {scheduleOption === 'later' && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <input
                    type="date"
                    className="form-textarea"
                    style={{ minHeight: 'unset', padding: '8px 12px' }}
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                  <input
                    type="time"
                    className="form-textarea"
                    style={{ minHeight: 'unset', padding: '8px 12px' }}
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preview Right Side */}
          <div className="creator-right">
            <div className="preview-header">
              <button
                className={`preview-tab ${previewTab === 'instagram' ? 'active' : ''}`}
                onClick={() => setPreviewTab('instagram')}
                disabled={!platforms.instagram}
                style={{ opacity: platforms.instagram ? 1 : 0.4 }}
              >
                <i className="fa-brands fa-instagram" style={{ marginRight: '6px' }}></i> Instagram
              </button>
              <button
                className={`preview-tab ${previewTab === 'facebook' ? 'active' : ''}`}
                onClick={() => setPreviewTab('facebook')}
                disabled={!platforms.facebook}
                style={{ opacity: platforms.facebook ? 1 : 0.4 }}
              >
                <i className="fa-brands fa-facebook" style={{ marginRight: '6px' }}></i> Facebook
              </button>
            </div>

            <div className="preview-container">
              {/* Instagram Feed Post Preview */}
              {previewTab === 'instagram' ? (
                <div className="phone-mockup" style={{ background: '#000000', color: '#ffffff', borderRadius: '16px', border: '1px solid #262626' }}>
                  {/* IG Post Header */}
                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1a1a1a' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', padding: '2px' }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '11px' }}>
                        RC
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', lineHeight: '1.2' }}>reactcommerce.shop</div>
                      {location && <div style={{ fontSize: '11px', color: '#a8a8a8' }}>{location}</div>}
                    </div>
                    <div style={{ marginLeft: 'auto', color: '#a8a8a8', fontSize: '16px', cursor: 'pointer' }}>•••</div>
                  </div>

                  {/* IG Post Media */}
                  <div style={{ width: '100%', aspectRatio: '1', background: '#121212', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {mediaPreviews.length > 0 ? (
                      <img src={mediaPreviews[0]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ color: '#666', fontSize: '12px' }}>No media selected</div>
                    )}

                    {/* Shoppable Tag Pin Overlay on Image */}
                    {taggedProducts.length > 0 && (
                      <div style={{
                        position: 'absolute', bottom: '12px', left: '12px',
                        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                        display: 'flex', alignItems: 'center', gap: '6px', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}>
                        <Tag size={12} style={{ color: '#f59e0b' }} /> {taggedProducts[0].name} ({taggedProducts.length})
                      </div>
                    )}
                  </div>

                  {/* IG Action Bar */}
                  <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <Heart size={20} style={{ cursor: 'pointer' }} />
                    <MessageCircle size={20} style={{ cursor: 'pointer' }} />
                    <Send size={20} style={{ cursor: 'pointer' }} />
                    <Bookmark size={20} style={{ marginLeft: 'auto', cursor: 'pointer' }} />
                  </div>

                  {/* IG Caption & Metadata */}
                  <div style={{ padding: '0 12px 12px', fontSize: '12px', lineHeight: '1.4' }}>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>Liked by reactcommerce and others</div>
                    <div>
                      <strong style={{ marginRight: '6px' }}>reactcommerce.shop</strong>
                      {caption || <span style={{ color: '#666' }}>Your post caption will appear here...</span>}
                    </div>
                  </div>
                </div>
              ) : (
                /* Facebook Feed Post Preview */
                <div className="phone-mockup" style={{ background: '#242526', color: '#e4e6eb', borderRadius: '16px', border: '1px solid #3e4042' }}>
                  {/* FB Post Header */}
                  <div style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                      RC
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        React Commerce
                        <span style={{ color: '#1877f2', fontSize: '12px' }}>✔</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#b0b3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Just now · <Globe size={11} /> {location ? `at ${location}` : ''}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', color: '#b0b3b8', fontSize: '18px', cursor: 'pointer' }}>•••</div>
                  </div>

                  {/* FB Post Text (on top of media for Facebook) */}
                  <div style={{ padding: '0 12px 10px', fontSize: '13px', lineHeight: '1.4' }}>
                    {caption || <span style={{ color: '#8a8d91' }}>Write something on your page...</span>}
                  </div>

                  {/* FB Media Image */}
                  <div style={{ width: '100%', aspectRatio: '1.2', background: '#18191a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {mediaPreviews.length > 0 ? (
                      <img src={mediaPreviews[0]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ color: '#8a8d91', fontSize: '12px' }}>No media uploaded</div>
                    )}
                  </div>

                  {/* FB Product Card Tag Banner (if products tagged) */}
                  {taggedProducts.length > 0 && (
                    <div style={{ padding: '8px 12px', background: '#323436', borderTop: '1px solid #3e4042', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#2e89ff', fontWeight: 600, textTransform: 'uppercase' }}>REACTCOMMERCE.SHOP CATALOG</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#e4e6eb' }}>{taggedProducts[0].name}</div>
                      </div>
                      <button style={{ padding: '4px 10px', borderRadius: '4px', background: '#3a3b3c', border: 'none', color: '#e4e6eb', fontSize: '11px', fontWeight: 600 }}>
                        Shop Now
                      </button>
                    </div>
                  )}

                  {/* FB Action Buttons */}
                  <div style={{ borderTop: '1px solid #3e4042', padding: '6px 12px', display: 'flex', justifyContent: 'space-around', fontSize: '12px', color: '#b0b3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><ThumbsUp size={16} /> Like</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><MessageCircle size={16} /> Comment</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><Share2 size={16} /> Share</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="planner-btn" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button className="planner-btn primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
            {scheduleOption === 'now' ? 'Publish Now' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}
