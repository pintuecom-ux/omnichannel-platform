'use client'
import { useState } from 'react'
import SettingsShell from '@/components/settings/SettingsShell'

type FileResource  = { id: number; name: string; type: string; size: string; uploadedBy: string; date: string }
type URLResource   = { id: number; displayName: string; url: string; description: string }

const INITIAL_FILES: FileResource[] = [
  { id: 1, name: 'Product Brochure Q1 2026.pdf',  type: 'PDF',   size: '2.4 MB', uploadedBy: 'Admin',   date: 'Apr 15, 2026' },
  { id: 2, name: 'Pricing Sheet - Enterprise.xlsx', type: 'Excel', size: '340 KB', uploadedBy: 'Manager', date: 'Apr 10, 2026' },
  { id: 3, name: 'Onboarding Guide.docx',           type: 'Word',  size: '1.2 MB', uploadedBy: 'Admin',   date: 'Mar 28, 2026' },
]

const INITIAL_URLS: URLResource[] = [
  { id: 1, displayName: 'Help Documentation',    url: 'https://help.yourcompany.com',     description: 'Full product documentation and guides' },
  { id: 2, displayName: 'Feature Roadmap',       url: 'https://roadmap.yourcompany.com',  description: 'Public roadmap of upcoming features' },
  { id: 3, displayName: 'Status Page',           url: 'https://status.yourcompany.com',   description: 'Live system status and uptime' },
]

function FileTypeIcon({ type }: { type: string }) {
  const configs: Record<string, { color: string; icon: string }> = {
    PDF:   { color: '#e84040', icon: 'fa-solid fa-file-pdf' },
    Excel: { color: '#10b981', icon: 'fa-solid fa-file-excel' },
    Word:  { color: '#00a8e8', icon: 'fa-solid fa-file-word' },
    PPT:   { color: '#f59e0b', icon: 'fa-solid fa-file-powerpoint' },
    Image: { color: '#8b5cf6', icon: 'fa-solid fa-file-image' },
    Video: { color: '#e84393', icon: 'fa-solid fa-file-video' },
    CSV:   { color: '#10b981', icon: 'fa-solid fa-file-csv' },
  }
  const cfg = configs[type] ?? { color: 'var(--text-muted)', icon: 'fa-solid fa-file' }
  return (
    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <i className={cfg.icon} style={{ color: cfg.color, fontSize: 16 }} />
    </div>
  )
}

export default function ConversationResourcesPage() {
  const [tab, setTab] = useState<'files' | 'urls'>('files')
  const [files, setFiles]         = useState<FileResource[]>(INITIAL_FILES)
  const [urls,  setUrls]          = useState<URLResource[]>(INITIAL_URLS)
  const [dragging, setDragging]   = useState(false)
  const [showURLModal, setShowURLModal] = useState(false)
  const [editingURL, setEditingURL]     = useState<URLResource | null>(null)
  const [urlForm, setURLForm]           = useState({ displayName: '', url: '', description: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    dropped.forEach(f => {
      const ext = f.name.split('.').pop()?.toUpperCase() ?? 'FILE'
      const typeMap: Record<string, string> = { PDF: 'PDF', XLSX: 'Excel', XLS: 'Excel', DOCX: 'Word', DOC: 'Word', PPTX: 'PPT', PPT: 'PPT', PNG: 'Image', JPG: 'Image', CSV: 'CSV', MP4: 'Video' }
      setFiles(prev => [...prev, { id: Date.now(), name: f.name, type: typeMap[ext] ?? ext, size: `${(f.size / 1024).toFixed(0)} KB`, uploadedBy: 'You', date: 'Just now' }])
    })
  }

  function openURLCreate() {
    setEditingURL(null)
    setURLForm({ displayName: '', url: '', description: '' })
    setShowURLModal(true)
  }

  function openURLEdit(u: URLResource) {
    setEditingURL(u)
    setURLForm({ displayName: u.displayName, url: u.url, description: u.description })
    setShowURLModal(true)
  }

  function saveURL() {
    if (!urlForm.displayName || !urlForm.url) return
    if (editingURL) {
      setUrls(prev => prev.map(u => u.id === editingURL.id ? { ...u, ...urlForm } : u))
    } else {
      setUrls(prev => [...prev, { id: Date.now(), ...urlForm }])
    }
    setShowURLModal(false)
  }

  return (
    <SettingsShell>
      <div style={{ padding: 28, maxWidth: 860 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Conversation Resources</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Upload documents and add URLs to be used by you and other agents while responding to customers.</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {(['files', 'urls'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: tab === t ? 'var(--accent)' : 'var(--text-secondary)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -1, fontFamily: 'DM Sans, sans-serif', transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className={t === 'files' ? 'fa-solid fa-file' : 'fa-solid fa-link'} style={{ fontSize: 12 }} />
              {t === 'files' ? 'Files' : 'URLs'}
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: tab === t ? 'var(--accent-glow)' : 'var(--bg-surface2)', color: tab === t ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700 }}>
                {t === 'files' ? files.length : urls.length}
              </span>
            </button>
          ))}
        </div>

        {/* ── FILES TAB ─────────────────────────── */}
        {tab === 'files' && (
          <div>
            {/* Upload area */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => {
                const inp = document.createElement('input')
                inp.type = 'file'
                inp.multiple = true
                inp.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.gif,.mp4,.mp3,.txt,.csv'
                inp.onchange = (e: any) => {
                  const dropped = Array.from(e.target.files as FileList)
                  dropped.forEach((f: File) => {
                    const ext = f.name.split('.').pop()?.toUpperCase() ?? 'FILE'
                    const typeMap: Record<string, string> = { PDF: 'PDF', XLSX: 'Excel', XLS: 'Excel', DOCX: 'Word', DOC: 'Word', PPTX: 'PPT', PNG: 'Image', JPG: 'Image', CSV: 'CSV' }
                    setFiles(prev => [...prev, { id: Date.now() + Math.random(), name: f.name, type: typeMap[ext] ?? ext, size: `${(f.size / 1024).toFixed(0)} KB`, uploadedBy: 'You', date: 'Just now' }])
                  })
                }
                inp.click()
              }}
              style={{ border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: '28px 20px', textAlign: 'center', background: dragging ? 'var(--accent-glow)' : 'var(--bg-surface)', transition: 'all 0.2s', cursor: 'pointer', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 28, color: dragging ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>Drop files here or click to browse</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Accepted: PDF, Word, Excel, PPT, Images, Video, CSV • Max 25MB per file</div>
              </div>
            </div>

            {files.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14 }}>
                <i className="fa-solid fa-box-open" style={{ fontSize: 36, color: 'var(--text-muted)', opacity: 0.3, display: 'block', marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>You do not have any files yet.</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Add files to quickly insert them in the future</div>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <table className="tbl" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Uploaded By</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map(f => (
                      <tr key={f.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileTypeIcon type={f.type} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</span>
                          </div>
                        </td>
                        <td><span className="pill blue" style={{ fontSize: 10 }}>{f.type}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.size}</td>
                        <td style={{ fontSize: 12 }}>{f.uploadedBy}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.date}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="icon-btn" title="Download"><i className="fa-solid fa-download" /></button>
                            {deleteConfirm === f.id ? (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={() => { setFiles(prev => prev.filter(x => x.id !== f.id)); setDeleteConfirm(null) }} style={{ padding: '4px 8px', background: '#e84040', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Confirm</button>
                                <button onClick={() => setDeleteConfirm(null)} style={{ padding: '4px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}>Cancel</button>
                              </div>
                            ) : (
                              <button className="icon-btn" title="Delete" onClick={() => setDeleteConfirm(f.id)}><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── URLs TAB ──────────────────────────── */}
        {tab === 'urls' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={openURLCreate}><i className="fa-solid fa-plus" /> Add URL</button>
            </div>

            {urls.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 14 }}>
                <i className="fa-solid fa-link" style={{ fontSize: 36, color: 'var(--text-muted)', opacity: 0.3, display: 'block', marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No URLs saved yet.</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Add URLs to quickly share helpful links with customers during conversations.</div>
                <button className="btn btn-primary" onClick={openURLCreate}><i className="fa-solid fa-plus" /> Add URL</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {urls.map(u => (
                  <div key={u.id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(47,231,116,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(0,168,232,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fa-solid fa-link" style={{ color: 'var(--accent2)', fontSize: 15 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{u.displayName}</div>
                      <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: u.description ? 4 : 0, wordBreak: 'break-all' }}>{u.url}</div>
                      {u.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.description}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className="icon-btn" title="Edit" onClick={() => openURLEdit(u)}><i className="fa-solid fa-pencil" /></button>
                      <button className="icon-btn" title="Open in new tab" onClick={() => window.open(u.url, '_blank')}><i className="fa-solid fa-arrow-up-right-from-square" /></button>
                      <button className="icon-btn" title="Delete" onClick={() => setUrls(prev => prev.filter(x => x.id !== u.id))}><i className="fa-solid fa-trash" style={{ color: '#e84040' }} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* URL Modal */}
      {showURLModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 16, width: 480, maxWidth: '94vw', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{editingURL ? 'Edit URL' : 'Add URL'}</div>
              <button className="icon-btn" onClick={() => setShowURLModal(false)}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Display Name</div>
                <input className="form-input" placeholder="e.g. Help Documentation" maxLength={100} value={urlForm.displayName} onChange={e => setURLForm(p => ({ ...p, displayName: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>URL</div>
                <input className="form-input" placeholder="https://example.com" value={urlForm.url} onChange={e => setURLForm(p => ({ ...p, url: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Description <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-muted)' }}>(optional)</span></div>
                <textarea className="form-input" rows={2} placeholder="Short description shown to agents" maxLength={200} value={urlForm.description} onChange={e => setURLForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'none' }} />
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowURLModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveURL} disabled={!urlForm.displayName || !urlForm.url}>Save</button>
            </div>
          </div>
        </div>
      )}
    </SettingsShell>
  )
}
