'use client'
import { useState, useEffect } from 'react'
import SettingsShell from '@/components/settings/SettingsShell'
import { createClient } from '@/lib/supabase/client'

type Category = { id: number | string; name: string; shared: 'me' | 'all' | 'groups'; count: number; mine: boolean }
type Response = { id: number | string; shortcode: string; message: string; categoryId: number | string }

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'mine', name: 'My Canned Responses', shared: 'me', count: 3, mine: true },
  { id: 'gen',  name: 'General',             shared: 'all', count: 5, mine: false },
  { id: 'sale', name: 'Sales',               shared: 'all', count: 4, mine: false },
]

const DEFAULT_RESPONSES: Response[] = [
  { id: 1, shortcode: '/greet',      message: 'Hi {{contact.first_name}}! 👋 Thanks for reaching out. How can I help you today?', categoryId: 'mine' },
  { id: 2, shortcode: '/order',      message: 'Thank you for your order! Your order #{{order.id}} has been confirmed and will be processed shortly.', categoryId: 'mine' },
  { id: 3, shortcode: '/followup',   message: "Just following up on our previous conversation. Is there anything else I can help you with?", categoryId: 'mine' },
  { id: 4, shortcode: '/thanks',     message: 'Thank you for contacting us! We appreciate your patience. 🙏', categoryId: 'gen' },
  { id: 5, shortcode: '/away',       message: "We're currently away but will get back to you as soon as possible. Our business hours are Mon–Fri, 9AM–6PM.", categoryId: 'gen' },
  { id: 6, shortcode: '/demo',       message: "I'd love to show you a demo! Let me check our calendar and find a slot that works for you.", categoryId: 'sale' },
  { id: 7, shortcode: '/pricing',    message: 'Our pricing starts at ₹999/month for the starter plan. Would you like a detailed breakdown?', categoryId: 'sale' },
]

export default function CannedResponsesPage() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [responses, setResponses] = useState<Response[]>(DEFAULT_RESPONSES)
  const [selectedCat, setSelectedCat] = useState<number | string>('mine')
  const [search, setSearch] = useState('')
  const [showCatForm, setShowCatForm] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatShared, setNewCatShared] = useState<'me' | 'all'>('me')
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [editingResponse, setEditingResponse] = useState<Response | null>(null)
  const [formShortcode, setFormShortcode] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [searchCat, setSearchCat] = useState('')
  const [saving, setSaving] = useState(false)

  const activeCat = categories.find(c => c.id === selectedCat)
  const filteredResponses = responses.filter(r =>
    r.categoryId === selectedCat &&
    (!search || r.shortcode.toLowerCase().includes(search.toLowerCase()) || r.message.toLowerCase().includes(search.toLowerCase()))
  )

  function openCreate() {
    setEditingResponse(null)
    setFormShortcode('/')
    setFormMessage('')
    setShowResponseModal(true)
  }

  function openEdit(r: Response) {
    setEditingResponse(r)
    setFormShortcode(r.shortcode)
    setFormMessage(r.message)
    setShowResponseModal(true)
  }

  function saveResponse() {
    setSaving(true)
    if (editingResponse) {
      setResponses(prev => prev.map(r => r.id === editingResponse.id ? { ...r, shortcode: formShortcode, message: formMessage } : r))
    } else {
      setResponses(prev => [...prev, { id: Date.now(), shortcode: formShortcode, message: formMessage, categoryId: selectedCat }])
      setCategories(prev => prev.map(c => c.id === selectedCat ? { ...c, count: c.count + 1 } : c))
    }
    setTimeout(() => { setSaving(false); setShowResponseModal(false) }, 600)
  }

  function deleteResponse(id: number | string) {
    setResponses(prev => prev.filter(r => r.id !== id))
    setCategories(prev => prev.map(c => c.id === selectedCat ? { ...c, count: Math.max(0, c.count - 1) } : c))
  }

  const myCats  = categories.filter(c => c.mine)
  const sharedCats = categories.filter(c => !c.mine)

  return (
    <SettingsShell>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* ── Left: Category Sidebar ─────────────── */}
        <div style={{ width: 260, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '14px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="fa-solid fa-comment-dots" style={{ color: 'var(--accent)' }} />
              My Canned Responses
            </div>
            <button className="icon-btn" title="Settings"><i className="fa-solid fa-gear" /></button>
          </div>

          {/* Search categories */}
          <div style={{ padding: '10px 10px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', height: 32 }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-muted)', fontSize: 11 }} />
              <input value={searchCat} onChange={e => setSearchCat(e.target.value)} placeholder="Search Category" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Add category */}
            <div style={{ padding: '0 10px 8px' }}>
              {showCatForm ? (
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                  <input className="form-input" placeholder="Category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} style={{ marginBottom: 8 }} />
                  <select className="form-input" value={newCatShared} onChange={e => setNewCatShared(e.target.value as any)} style={{ marginBottom: 8 }}>
                    <option value="me">Only me</option>
                    <option value="all">All agents</option>
                  </select>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary" style={{ flex: 1, padding: '6px', fontSize: 12 }} onClick={() => { if (newCatName) { setCategories(prev => [...prev, { id: Date.now(), name: newCatName, shared: newCatShared, count: 0, mine: true }]); setNewCatName(''); setShowCatForm(false) } }}>Save</button>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setShowCatForm(false)}>✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCatForm(true)} style={{ width: '100%', padding: '7px 10px', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                  <i className="fa-solid fa-plus" /> Add Category
                </button>
              )}
            </div>

            {/* Created by me */}
            <div style={{ padding: '6px 14px 2px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CREATED BY ME</div>
            {myCats.filter(c => !searchCat || c.name.toLowerCase().includes(searchCat.toLowerCase())).map(cat => (
              <CategoryRow key={cat.id} cat={cat} isActive={selectedCat === cat.id} onClick={() => { setSelectedCat(cat.id); setSearch('') }}
                onDelete={() => setCategories(prev => prev.filter(c => c.id !== cat.id))} />
            ))}

            {/* Shared */}
            <div style={{ padding: '10px 14px 2px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SHARED WITH ME</div>
            {sharedCats.filter(c => !searchCat || c.name.toLowerCase().includes(searchCat.toLowerCase())).map(cat => (
              <CategoryRow key={cat.id} cat={cat} isActive={selectedCat === cat.id} onClick={() => { setSelectedCat(cat.id); setSearch('') }}
                onDelete={() => setCategories(prev => prev.filter(c => c.id !== cat.id))} />
            ))}
          </div>
        </div>

        {/* ── Right: Responses ───────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {activeCat?.name}
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: activeCat?.shared === 'all' ? 'rgba(0,168,232,0.1)' : 'var(--bg-surface2)', color: activeCat?.shared === 'all' ? 'var(--accent2)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {activeCat?.shared === 'all' ? 'Shared with all agents' : 'Only me'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', height: 32, width: 200 }}>
              <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-muted)', fontSize: 11 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search responses..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }} />
            </div>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={openCreate}><i className="fa-solid fa-plus" /> Create canned response</button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {filteredResponses.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14 }}>
                <i className="fa-solid fa-comment-dots" style={{ fontSize: 40, color: 'var(--text-muted)', opacity: 0.3 }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Create your first canned response</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>Create canned responses to help your agents respond faster with consistent, professional messages.</div>
                <button className="btn btn-primary" onClick={openCreate}><i className="fa-solid fa-plus" /> Create canned response</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredResponses.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, transition: 'border-color 0.15s', cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(47,231,116,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <code style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent3)', background: 'rgba(245,158,11,0.1)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.2)', flexShrink: 0, marginTop: 1, whiteSpace: 'nowrap' }}>{r.shortcode}</code>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.message}</span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(r)}><i className="fa-solid fa-pencil" /></button>
                      <button className="icon-btn" title="Delete" onClick={() => deleteResponse(r.id)}><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal ───────────────────────────────── */}
      {showResponseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 16, width: 540, maxWidth: '94vw', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{editingResponse ? 'Edit canned response' : 'Create canned response'}</div>
              <button className="icon-btn" onClick={() => setShowResponseModal(false)}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Short Name (Shortcode)</div>
                <input className="form-input" placeholder="/greeting" value={formShortcode} onChange={e => setFormShortcode(e.target.value.startsWith('/') ? e.target.value : '/' + e.target.value)} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Start with / — agents type this in the reply box to trigger this response</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Response Text</div>
                <textarea className="form-input" rows={5} placeholder="Write your canned response here..." value={formMessage} onChange={e => setFormMessage(e.target.value)} style={{ resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {['{{contact.first_name}}', '{{contact.last_name}}', '{{agent.name}}', '{{conversation.id}}'].map(v => (
                    <button key={v} onClick={() => setFormMessage(p => p + v)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: 'var(--accent3)', border: '1px solid rgba(245,158,11,0.2)', cursor: 'pointer', fontFamily: 'monospace' }}>{v}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Shared With</div>
                <select className="form-input">
                  <option>Only me</option>
                  <option>All agents</option>
                  <option>Specific groups</option>
                </select>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowResponseModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveResponse} disabled={!formShortcode || !formMessage || saving}>
                {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving…</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsShell>
  )
}

function CategoryRow({ cat, isActive, onClick, onDelete }: { cat: Category; isActive: boolean; onClick: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: isActive ? 'var(--accent-glow)' : hovered ? 'var(--bg-hover)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--text-secondary)', transition: 'all 0.15s', borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent', margin: '1px 0' }}
    >
      <i className={cat.mine ? 'fa-solid fa-folder' : 'fa-solid fa-folder-open'} style={{ fontSize: 11, width: 14, color: isActive ? 'var(--accent)' : cat.mine ? 'var(--accent3)' : 'var(--accent2)' }} />
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: isActive ? 700 : 500 }}>{cat.name}</span>
      <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: isActive ? 'rgba(47,231,116,0.15)' : 'var(--bg-surface2)', color: isActive ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600 }}>{cat.count}</span>
      {hovered && !isActive && (
        <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e84040', fontSize: 11, padding: 0 }}>
          <i className="fa-solid fa-trash" />
        </button>
      )}
    </div>
  )
}
