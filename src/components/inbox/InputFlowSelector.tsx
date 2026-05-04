import React from 'react'

export interface FlowItem {
  id: string
  meta_flow_id: string | null
  name: string
  status: string
}

export function InputFlowSelector({
  flows,
  flowLoading,
  setShowFlowPicker,
  setFlowSendModal,
}: {
  flows: FlowItem[]
  flowLoading: boolean
  setShowFlowPicker: (v: boolean) => void
  setFlowSendModal: (opts: { open: boolean; flow: FlowItem | null; bodyText: string; ctaText: string; mode: 'draft' | 'published' }) => void
}) {
  return (
    <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px 12px 0 0', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)', zIndex: 200, maxHeight: 320, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          <i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent2)', marginRight: 6 }} />
          Send a WhatsApp Flow
        </span>
        <button className="icon-btn" onClick={() => setShowFlowPicker(false)}><i className="fa-solid fa-xmark" /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {flowLoading && (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Loading flows…
          </div>
        )}
        {!flowLoading && flows.length === 0 && (
          <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            No active flows. <a href="/flows" style={{ color: 'var(--accent2)' }}>Create one →</a>
          </div>
        )}
        {!flowLoading && flows.map(f => (
          <div key={f.id}
            onClick={() => {
              setFlowSendModal({ open: true, flow: f, bodyText: `Check out: ${f.name}`, ctaText: 'Open', mode: f.status === 'PUBLISHED' ? 'published' : 'draft' })
              setShowFlowPicker(false)
            }}
            style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'none' }}
          >
            <i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent2)', fontSize: 13, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</div>
              <div style={{ fontSize: 10, color: f.status === 'PUBLISHED' ? 'var(--accent)' : 'var(--accent3)' }}>
                ● {f.status}
                {f.status === 'DRAFT' && ' — test only'}
              </div>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ fontSize: 10, color: 'var(--text-muted)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
