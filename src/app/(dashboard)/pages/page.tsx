'use client'

import { useEffect, useState } from 'react'

type MediaItem = {
  id: string
  caption: string | null
  media_type: string
  media_url?: string | null
  thumbnail_url?: string | null
  permalink?: string | null
  timestamp?: string | null
  comment_count: number
  like_count: number
  metrics?: Record<string, number>
}

export default function PagesPostsPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [connected, setConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  async function load(sync = false) {
    setLoading(true)
    try {
      const [channelRes, mediaRes] = await Promise.all([
        fetch('/api/instagram/channel', { cache: 'no-store' }),
        fetch(`/api/instagram/media${sync ? '?sync=true' : ''}`, { cache: 'no-store' }),
      ])
      const channelJson = await channelRes.json()
      const mediaJson = await mediaRes.json()
      setConnected(!!channelJson.channel?.is_active)
      setMedia(mediaJson.media ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(true) }, [])

  return (
    <div style={{ padding: 28, display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Publishing / Pages & Posts</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Instagram Posts Library</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 660 }}>
            Synced owned posts and reels live here so content performance, comments, and planner history all reference the same cached media records.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" disabled={!connected || loading} onClick={() => load(true)}>
            {loading ? 'Syncing…' : 'Sync Media'}
          </button>
        </div>
      </div>

      {!connected && !loading ? (
        <div className="form-section" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Connect Instagram in Settings before syncing owned posts and comments.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {media.map(item => (
            <article key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--bg-panel)' }}>
              <div style={{ aspectRatio: '1 / 1', background: 'linear-gradient(135deg, rgba(225,48,108,0.22), rgba(0,168,232,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.media_url || item.thumbnail_url ? (
                  item.media_type === 'video' ? (
                    <video src={item.thumbnail_url || item.media_url || undefined} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img src={item.thumbnail_url || item.media_url || undefined} alt={item.caption || 'Instagram media'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )
                ) : (
                  <i className="fa-brands fa-instagram" style={{ fontSize: 40, color: 'rgba(255,255,255,0.5)' }} />
                )}
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{item.media_type}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Unknown date'}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, minHeight: 62 }}>{item.caption || 'No caption'}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span><i className="fa-regular fa-heart" /> {item.like_count}</span>
                  <span><i className="fa-regular fa-comment" /> {item.comment_count}</span>
                  <span><i className="fa-solid fa-chart-line" /> {item.metrics?.reach ?? 0}</span>
                </div>
                {item.permalink && (
                  <a href={item.permalink} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', marginTop: 12, fontSize: 12, color: 'var(--accent2)' }}>
                    Open on Instagram
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
