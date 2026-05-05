'use client'

import { useEffect, useState } from 'react'

type Publication = {
  id: string
  status: string
  caption: string | null
  publish_at: string | null
  created_at: string
  media_payload: Array<{ public_url?: string; media_type?: string; file_name?: string }>
  last_error?: string | null
}

export default function PlannerPage() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [publications, setPublications] = useState<Publication[]>([])
  const [caption, setCaption] = useState('')
  const [publishAt, setPublishAt] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  async function load() {
    const [channelRes, publicationsRes] = await Promise.all([
      fetch('/api/instagram/channel', { cache: 'no-store' }),
      fetch('/api/instagram/publications', { cache: 'no-store' }),
    ])

    const channelJson = await channelRes.json()
    const publicationsJson = await publicationsRes.json()
    setConnected(!!channelJson.channel?.is_active)
    setPublications(publicationsJson.publications ?? [])
  }

  useEffect(() => { load() }, [])

  async function submit(action: 'draft' | 'schedule' | 'publish_now') {
    setSaving(action)
    try {
      const form = new FormData()
      form.append('caption', caption)
      form.append('action', action)
      if (publishAt) form.append('publish_at', publishAt)
      for (const file of files) form.append('files', file)

      const res = await fetch('/api/instagram/publications', { method: 'POST', body: form })
      if (!res.ok) {
        const json = await res.json()
        alert(json.error || 'Failed to save publication')
        return
      }
      setCaption('')
      setPublishAt('')
      setFiles([])
      await load()
    } finally {
      setSaving(null)
    }
  }

  async function updatePublication(id: string, action: 'publish_now' | 'canceled') {
    setSaving(id)
    try {
      const res = await fetch('/api/instagram/publications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: action === 'publish_now' ? 'publish_now' : undefined,
          status: action === 'canceled' ? 'canceled' : undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        alert(json.error || 'Failed to update publication')
      }
      await load()
    } finally {
      setSaving(null)
    }
  }

  async function deletePublication(id: string) {
    setSaving(id)
    try {
      await fetch(`/api/instagram/publications?id=${id}`, { method: 'DELETE' })
      await load()
    } finally {
      setSaving(null)
    }
  }

  return (
    <div style={{ padding: 28, display: 'grid', gap: 20 }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Publishing / Content Planner</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Instagram Planner</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 620 }}>
              Create drafts, schedule future posts, or publish immediately. This workspace is Instagram-first today and is structured so Facebook publishing can slot into the same flow later.
            </div>
          </div>
          {connected === false && (
            <button className="btn btn-primary" onClick={() => { window.location.href = '/settings/channels?tab=instagram' }}>
              Connect Instagram
            </button>
          )}
        </div>
      </div>

      <div className="form-section">
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Compose</div>
        <textarea
          className="form-input"
          rows={5}
          placeholder="Write your caption…"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          style={{ resize: 'vertical', marginBottom: 12 }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 12 }}>
          <input type="file" multiple accept="image/*,video/*" className="form-input" onChange={e => setFiles(Array.from(e.target.files ?? []))} />
          <input type="datetime-local" className="form-input" value={publishAt} onChange={e => setPublishAt(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" disabled={!connected || saving === 'draft'} onClick={() => submit('draft')}>
            {saving === 'draft' ? 'Saving…' : 'Save Draft'}
          </button>
          <button className="btn btn-secondary" disabled={!connected || !publishAt || saving === 'schedule'} onClick={() => submit('schedule')}>
            {saving === 'schedule' ? 'Scheduling…' : 'Schedule'}
          </button>
          <button className="btn btn-primary" disabled={!connected || files.length === 0 || saving === 'publish_now'} onClick={() => submit('publish_now')}>
            {saving === 'publish_now' ? 'Publishing…' : 'Publish Now'}
          </button>
        </div>
      </div>

      <div className="form-section">
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Pipeline</div>
        {publications.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No drafts or scheduled Instagram publications yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {publications.map(item => (
              <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ padding: '4px 9px', borderRadius: 999, background: 'var(--bg-panel)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{item.status}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', marginBottom: 8 }}>{item.caption || 'Untitled publication'}</div>
                    {item.publish_at && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Scheduled for {new Date(item.publish_at).toLocaleString()}</div>}
                    {item.last_error && <div style={{ fontSize: 12, color: '#e84040', marginBottom: 8 }}>{item.last_error}</div>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(item.media_payload ?? []).map((media, index) => (
                        <span key={`${item.id}-${index}`} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 999 }}>
                          {media.file_name || media.media_type || `Asset ${index + 1}`}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {item.status !== 'published' && item.status !== 'publishing' && (
                      <button className="btn btn-secondary" disabled={saving === item.id} onClick={() => updatePublication(item.id, 'publish_now')}>
                        Publish
                      </button>
                    )}
                    {item.status === 'scheduled' && (
                      <button className="btn btn-secondary" disabled={saving === item.id} onClick={() => updatePublication(item.id, 'canceled')}>
                        Cancel
                      </button>
                    )}
                    <button className="btn btn-secondary" disabled={saving === item.id} onClick={() => deletePublication(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
