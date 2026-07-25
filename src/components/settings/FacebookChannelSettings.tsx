'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type ChannelResponse = {
  channel: null | {
    id: string
    name: string
    external_id: string
    is_active: boolean
    created_at: string
    meta: Record<string, unknown>
  }
}

export default function FacebookChannelSettings() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<ChannelResponse['channel']>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'connect' | 'disconnect' | 'webhooks' | null>(null)

  async function loadChannel() {
    setLoading(true)
    try {
      const res = await fetch('/api/facebook/channel', { cache: 'no-store' })
      const json: ChannelResponse = await res.json()
      setData(json.channel)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadChannel() }, [])

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'

  async function disconnect() {
    setBusy('disconnect')
    try {
      await fetch('/api/facebook/channel', { method: 'DELETE' })
      await loadChannel()
    } finally {
      setBusy(null)
    }
  }

  async function repairWebhooks() {
    setBusy('webhooks')
    try {
      await fetch('/api/facebook/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      await loadChannel()
    } finally {
      setBusy(null)
    }
  }

  const connected = !!data?.is_active
  const tokenExpiresAt = typeof data?.meta?.token_expires_at === 'string' ? data.meta.token_expires_at : null
  const connectedBanner = searchParams?.get('connected') === '1'
  const error = searchParams?.get('error')

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Admin Settings / Channels / Facebook</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Facebook Messenger</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Connect your Facebook Page to sync Messenger DMs and Page comments to your inbox.</div>
      </div>

      {connectedBanner && (
        <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(47,231,116,0.08)', border: '1px solid rgba(47,231,116,0.22)', color: 'var(--text-secondary)' }}>
          Facebook Page connected successfully. Your inbox is now ready to receive messages.
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(232,64,64,0.08)', border: '1px solid rgba(232,64,64,0.18)', color: 'var(--text-secondary)' }}>
          Connection issue: {decodeURIComponent(error)}
        </div>
      )}

      <div className="form-section" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {connected ? data?.name || 'Facebook Page' : 'No Facebook Page connected'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {connected
                ? `Category: ${data?.meta?.category || 'Business'}`
                : 'Use Facebook Login to connect a Facebook Page.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" disabled={busy === 'connect'} onClick={() => { setBusy('connect'); window.location.href = '/api/facebook/connect' }}>
              {connected ? 'Reconnect' : 'Connect Facebook'}
            </button>
            {connected && (
              <button className="btn btn-secondary" disabled={busy === 'disconnect'} onClick={disconnect}>
                {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>Loading channel status…</div>
        ) : connected ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Page ID</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{data?.external_id}</div>
            </div>
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Token Expires</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{tokenExpiresAt ? new Date(tokenExpiresAt).toLocaleString() : 'Not provided'}</div>
            </div>
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-surface)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Connection Mode</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{String(data?.meta?.login_mode || 'facebook_login')}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="form-section" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Permissions & Webhooks</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Webhook URL</div>
          <code style={{ display: 'block', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--accent)', fontSize: 12 }}>
            {origin}/api/webhooks/facebook
          </code>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Verify Token</div>
          <code style={{ display: 'block', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--accent3)', fontSize: 12 }}>
            META_WEBHOOK_VERIFY_TOKEN
          </code>
        </div>
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Webhook Subscription</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {data?.meta?.webhook_subscribed ? 'Page subscription is recorded for this channel.' : 'Page subscription has not been confirmed yet.'}
            </div>
          </div>
          <button className="btn btn-secondary" disabled={!connected || busy === 'webhooks'} onClick={repairWebhooks}>
            {busy === 'webhooks' ? 'Repairing…' : 'Repair Webhooks'}
          </button>
        </div>
      </div>
    </div>
  )
}
