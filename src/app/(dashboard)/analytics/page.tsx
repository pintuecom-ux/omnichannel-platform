'use client'

import { useEffect, useState } from 'react'

type AnalyticsPayload = {
  executive?: Record<string, number | null>
  latest?: {
    account_metrics?: Record<string, unknown>
    content_metrics?: Array<{
      instagram_media_id?: string
      caption?: string
      metrics?: Record<string, number | null>
      comment_count?: number
      like_count?: number
    }>
    operational_metrics?: Record<string, number | null>
  } | null
  history?: Array<Record<string, unknown>>
  media?: Array<Record<string, unknown>>
}

function MetricCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 16, background: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent }}>{value}</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [payload, setPayload] = useState<AnalyticsPayload>({})
  const [connected, setConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  async function load(sync = false) {
    setLoading(true)
    try {
      const [channelRes, analyticsRes] = await Promise.all([
        fetch('/api/instagram/channel', { cache: 'no-store' }),
        fetch(`/api/instagram/analytics${sync ? '?sync=true' : ''}`, { cache: 'no-store' }),
      ])
      const channelJson = await channelRes.json()
      const analyticsJson = await analyticsRes.json()
      setConnected(!!channelJson.channel?.is_active)
      setPayload(analyticsJson)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(true) }, [])

  const executive: Record<string, number | null> =
    payload.executive ??
    ((payload.latest?.account_metrics?.executive as Record<string, number | null> | undefined) ?? {})
  const content = payload.latest?.content_metrics ?? []
  const ops = payload.latest?.operational_metrics ?? {}

  return (
    <div style={{ padding: 28, display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Ads & Analytics / Analytics</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Executive Analytics</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 660 }}>
            Instagram is fully wired in this first analytics slice, with cross-channel framing preserved so WhatsApp and Facebook can grow into the same dashboard later.
          </div>
        </div>
        <button className="btn btn-secondary" disabled={!connected || loading} onClick={() => load(true)}>
          {loading ? 'Refreshing…' : 'Refresh Data'}
        </button>
      </div>

      {!connected && !loading ? (
        <div className="form-section" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Connect Instagram in Settings to populate this executive dashboard.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            <MetricCard label="Published Posts" value={executive.published_posts ?? 0} accent="#e1306c" />
            <MetricCard label="Reach" value={executive.reach ?? 0} accent="#00a8e8" />
            <MetricCard label="Engagement" value={executive.engagement ?? 0} accent="#2fe774" />
            <MetricCard label="Response Rate" value={`${executive.response_rate ?? 0}%`} accent="#f59e0b" />
            <MetricCard label="Inbound DMs" value={executive.inbound_dms ?? 0} accent="#e1306c" />
            <MetricCard label="Inbound Comments" value={executive.inbound_comments ?? 0} accent="#00a8e8" />
            <MetricCard label="Avg Reply (Min)" value={executive.avg_reply_minutes ?? 0} accent="#2fe774" />
            <MetricCard label="Followers" value={executive.followers_count ?? 0} accent="#f59e0b" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div className="form-section">
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Top Content</div>
              {content.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No synced content metrics yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {content.slice(0, 8).map((item, index) => (
                    <div key={`${item.instagram_media_id}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(5, 90px)', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{item.caption || 'Untitled media'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.metrics?.reach ?? 0}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.metrics?.impressions ?? 0}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.comment_count ?? 0}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.like_count ?? 0}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.metrics?.saved ?? 0}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-section">
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Cross-Channel View</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Instagram</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Full content + inbox + operational metrics</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>WhatsApp</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Local inbox metrics next: calls, conversations, response timings</div>
                </div>
                <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Facebook</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Ready to adopt the same publishing + insights shape later</div>
                </div>
              </div>
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                Current operations snapshot: {ops.inbound_dms ?? 0} DMs, {ops.inbound_comments ?? 0} comments, {ops.responded_comments ?? 0} responded.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
