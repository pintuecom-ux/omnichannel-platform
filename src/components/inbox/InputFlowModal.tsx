import React from 'react'
import type { FlowItem } from './InputFlowSelector'

export function InputFlowModal({
  flowSendModal,
  setFlowSendModal,
  sendFlow,
  sending,
}: {
  flowSendModal: { open: boolean; flow: FlowItem | null; bodyText: string; ctaText: string; mode: 'draft' | 'published' }
  setFlowSendModal: React.Dispatch<React.SetStateAction<{ open: boolean; flow: FlowItem | null; bodyText: string; ctaText: string; mode: 'draft' | 'published' }>>
  sendFlow: () => void
  sending: boolean
}) {
  if (!flowSendModal.open || !flowSendModal.flow) return null

  return (
    <div className="tpl-modal-overlay open" onClick={() => setFlowSendModal(v => ({ ...v, open: false }))}>
      <div className="tpl-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="tpl-modal-header">
          <div className="tpl-modal-title">
            <i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent2)', marginRight: 6 }} />
            Send Flow — {flowSendModal.flow.name}
          </div>
          <button className="icon-btn" onClick={() => setFlowSendModal(v => ({ ...v, open: false }))}><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="tpl-modal-body">
          {flowSendModal.flow.status === 'DRAFT' && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: 'var(--accent3)', marginBottom: 12 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 5 }} />Draft mode — only test numbers can receive this
            </div>
          )}
          <div className="form-group">
            <div className="form-label">Message Body *</div>
            <textarea className="form-input" rows={2} style={{ resize: 'none' }}
              value={flowSendModal.bodyText}
              onChange={e => setFlowSendModal(v => ({ ...v, bodyText: e.target.value }))}
              placeholder="Please fill out the form below" />
          </div>
          <div className="form-row">
            <div>
              <div className="form-label">Button Label</div>
              <input className="form-input" value={flowSendModal.ctaText}
                onChange={e => setFlowSendModal(v => ({ ...v, ctaText: e.target.value }))}
                placeholder="Open" />
            </div>
            <div>
              <div className="form-label">Mode</div>
              <select className="form-input" value={flowSendModal.mode}
                onChange={e => setFlowSendModal(v => ({ ...v, mode: e.target.value as any }))}>
                <option value="published">Published</option>
                <option value="draft">Draft (test)</option>
              </select>
            </div>
          </div>
        </div>
        <div className="tpl-modal-footer">
          <button className="btn btn-secondary" onClick={() => setFlowSendModal(v => ({ ...v, open: false }))}>Cancel</button>
          <button className="btn btn-primary" onClick={sendFlow} disabled={sending || !flowSendModal.bodyText.trim()}>
            <i className="fa-solid fa-paper-plane" style={{ marginRight: 5 }} />Send Flow
          </button>
        </div>
      </div>
    </div>
  )
}
