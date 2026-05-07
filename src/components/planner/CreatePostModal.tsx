'use client'

import { useState, useRef } from 'react'
import { X, Image as ImageIcon, Hash, MapPin, Loader2, Plus } from 'lucide-react'

export default function CreatePostModal({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
  const [caption, setCaption] = useState('')
  const [platforms, setPlatforms] = useState({ instagram: true, facebook: false })
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [previewTab, setPreviewTab] = useState<'instagram' | 'facebook'>('instagram')
  const [scheduleOption, setScheduleOption] = useState<'now' | 'later'>('now')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const handleSubmit = async () => {
    if (mediaFiles.length === 0) {
      alert("Please upload at least one image or video.")
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('caption', caption)
      formData.append('action', scheduleOption === 'now' ? 'publish_now' : 'schedule')
      
      if (scheduleOption === 'later' && scheduleDate && scheduleTime) {
        // Create ISO string for the local time
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
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Post</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Editor Left Side */}
          <div className="creator-left">
            <div className="form-group">
              <label>Platforms</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: platforms.instagram ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  <input type="checkbox" checked={platforms.instagram} onChange={e => setPlatforms({...platforms, instagram: e.target.checked})} />
                  <i className="fa-brands fa-instagram" style={{ color: platforms.instagram ? '#E1306C' : 'currentColor', fontSize: '18px' }}></i> Instagram
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: platforms.facebook ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  <input type="checkbox" checked={platforms.facebook} onChange={e => setPlatforms({...platforms, facebook: e.target.checked})} />
                  <i className="fa-brands fa-facebook" style={{ color: platforms.facebook ? '#1877F2' : 'currentColor', fontSize: '18px' }}></i> Facebook
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
                  <ImageIcon />
                  <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>Click to upload media</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG, MP4 up to 50MB</div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Caption</label>
              <textarea 
                className="form-textarea" 
                placeholder="Write a caption..."
                value={caption}
                onChange={e => setCaption(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button className="planner-btn" style={{ padding: '4px 8px', fontSize: '12px' }}><Hash size={14} /> Add Hashtags</button>
                <button className="planner-btn" style={{ padding: '4px 8px', fontSize: '12px' }}><MapPin size={14} /> Add Location</button>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 'auto' }}>
              <label>Schedule Options</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="radio" name="schedule" checked={scheduleOption === 'now'} onChange={() => setScheduleOption('now')} /> Publish Now
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                style={{ opacity: platforms.instagram ? 1 : 0.5 }}
              >
                Instagram
              </button>
              <button 
                className={`preview-tab ${previewTab === 'facebook' ? 'active' : ''}`}
                onClick={() => setPreviewTab('facebook')}
                disabled={!platforms.facebook}
                style={{ opacity: platforms.facebook ? 1 : 0.5 }}
              >
                Facebook
              </button>
            </div>
            <div className="preview-container">
              <div className="phone-mockup">
                <div className="mockup-header">
                  <div className="mockup-avatar"></div>
                  <div className="mockup-name">Your Account</div>
                  <div style={{ marginLeft: 'auto', fontWeight: 600 }}>...</div>
                </div>
                <div className="mockup-media">
                  {mediaPreviews.length > 0 ? (
                    <img src={mediaPreviews[0]} alt="Preview" />
                  ) : (
                    <div style={{ color: '#999', fontSize: '12px' }}>No media uploaded</div>
                  )}
                </div>
                <div className="mockup-actions">
                  ♡ 💬 ↗ <span style={{ marginLeft: 'auto' }}>⚑</span>
                </div>
                <div className="mockup-caption">
                  <strong>Your Account</strong> {caption || <span style={{ color: '#999' }}>Caption will appear here...</span>}
                </div>
              </div>
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
