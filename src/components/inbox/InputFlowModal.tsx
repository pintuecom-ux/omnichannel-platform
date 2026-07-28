'use client'

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
      <div className="tpl-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="tpl-modal-header">
          <div className="tpl-modal-title">
            <i className="fa-solid fa-diagram-project" style={{ color: 'var(--accent2)', marginRight: 6 }} />
            Send Flow — {flowSendModal.flow.name}
          </div>
          <button className="icon-btn" onClick={() => setFlowSendModal(v => ({ ...v, open: false }))}><i className="fa-solid fa-xmark" /></button>
        </div>

        <div className="tpl-modal-body" style={{ padding: '16px' }}>
          {flowSendModal.flow.status === 'DRAFT' && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--accent3)', marginBottom: 12 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 5 }} /> Draft mode — only Meta test phone numbers can receive this flow
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 10 }}>
            <div className="form-label" style={{ fontWeight: 600 }}>Message Body *</div>
            <textarea
              className="form-input"
              rows={2}
              style={{ resize: 'none', fontSize: 12 }}
              value={flowSendModal.bodyText}
              onChange={e => setFlowSendModal(v => ({ ...v, bodyText: e.target.value }))}
              placeholder="Please fill out the form below"
            />
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div className="form-label" style={{ fontWeight: 600 }}>Button Label</div>
              <input
                className="form-input"
                value={flowSendModal.ctaText}
                onChange={e => setFlowSendModal(v => ({ ...v, ctaText: e.target.value }))}
                placeholder="Open"
                style={{ fontSize: 12 }}
              />
            </div>
            <div>
              <div className="form-label" style={{ fontWeight: 600 }}>Mode</div>
              <select
                className="form-input"
                value={flowSendModal.mode}
                onChange={e => setFlowSendModal(v => ({ ...v, mode: e.target.value as any }))}
                style={{ fontSize: 12 }}
              >
                <option value="published">Published</option>
                <option value="draft">Draft (test)</option>
              </select>
            </div>
          </div>

          {/* ── WhatsApp Flow Message Live Preview ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
              WhatsApp Interactive Flow Preview
            </div>
            <div style={{ background: '#0b141a', borderRadius: 12, padding: 12, border: '1px solid #202c33' }}>
              <div style={{ background: '#005c4b', borderRadius: '10px 10px 10px 2px', padding: '10px 12px', color: '#e9edef', fontSize: 13, lineHeight: '1.4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#53bdeb', fontWeight: 600, marginBottom: 6 }}>
                  <i className="fa-solid fa-diagram-project" /> WhatsApp Flow
                </div>

                <div>
                  {flowSendModal.bodyText || `Check out: ${flowSendModal.flow.name}`}
                </div>

                <div style={{ textAlign: 'right', fontSize: 10, color: '#8696a0', marginTop: 4 }}>
                  <span>10:45 AM ✓✓</span>
                </div>

                {/* WhatsApp Interactive CTA Button Card */}
                <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 8, textAlign: 'center', color: '#53bdeb', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                  <i className="fa-solid fa-list-check" /> {flowSendModal.ctaText || 'Open'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="tpl-modal-footer" style={{ padding: '12px 16px' }}>
          <button className="btn btn-secondary" onClick={() => setFlowSendModal(v => ({ ...v, open: false }))}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={sendFlow}
            disabled={sending || !flowSendModal.bodyText.trim()}
            style={{ background: '#25d366', borderColor: '#25d366', color: '#ffffff' }}
          >
            <i className="fa-solid fa-paper-plane" style={{ marginRight: 5 }} /> Send WhatsApp Flow
          </button>
        </div>
      </div>
    </div>
  )
}
