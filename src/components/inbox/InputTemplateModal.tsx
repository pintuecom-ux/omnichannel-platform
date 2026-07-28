'use client'

import React from 'react'
import type { Template } from '@/types'

export function InputTemplateModal({
  varModal,
  setVarModal,
  sendTemplate,
}: {
  varModal: { open: boolean; template: Template | null; vars: string[]; values: string[] }
  setVarModal: React.Dispatch<React.SetStateAction<{ open: boolean; template: Template | null; vars: string[]; values: string[] }>>
  sendTemplate: (template: Template, vals: string[]) => void
}) {
  if (!varModal.open || !varModal.template) return null

  const isOTP = varModal.template.category?.toUpperCase() === 'AUTHENTICATION' || varModal.template.meta?.template_type === 'AUTHENTICATION'

  const previewBody = varModal.vars.reduce(
    (body, v, i) => body.replaceAll(v, varModal.values[i] || `[${v}]`),
    varModal.template.body ?? ''
  )

  return (
    <div className="tpl-modal-overlay open" onClick={() => setVarModal(v => ({ ...v, open: false }))}>
      <div className="tpl-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="tpl-modal-header">
          <div className="tpl-modal-title">
            <i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', marginRight: 6, fontSize: 13 }} />
            {isOTP ? `Send OTP — ${varModal.template.name}` : `Configure Template — ${varModal.template.name}`}
          </div>
          <button className="icon-btn" onClick={() => setVarModal(v => ({ ...v, open: false }))}><i className="fa-solid fa-xmark" /></button>
        </div>

        <div className="tpl-modal-body" style={{ padding: '16px' }}>
          {isOTP ? (
            <div>
              <div style={{ background: 'rgba(0,168,232,0.08)', border: '1px solid rgba(0,168,232,0.2)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 600, marginBottom: 4 }}>
                  <i className="fa-solid fa-shield-halved" style={{ marginRight: 5 }} /> Authentication Template
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  WhatsApp auto-formats OTP authentication messages. Enter the 6-digit OTP code below to populate the Copy Code button.
                </div>
              </div>
              <div className="form-group">
                <div className="form-label" style={{ color: 'var(--accent)', fontWeight: 600 }}>OTP Code to Send</div>
                <input
                  className="form-input"
                  placeholder="e.g. 482913"
                  maxLength={8}
                  value={varModal.values[0] ?? ''}
                  onChange={e => setVarModal(vm => { const vals = [...vm.values]; vals[0] = e.target.value; return { ...vm, values: vals } })}
                  autoFocus
                  style={{ fontSize: '14px', letterSpacing: '1px', fontWeight: '600' }}
                />
              </div>
            </div>
          ) : (
            <>
              {varModal.vars.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Template Variables ({varModal.vars.length})
                  </div>
                  {varModal.vars.map((v, i) => (
                    <div key={v} className="form-group" style={{ marginBottom: 8 }}>
                      <div className="form-label" style={{ color: 'var(--accent3)', fontSize: 11 }}>Variable {v}</div>
                      <input
                        className="form-input"
                        placeholder={`Value for ${v}`}
                        value={varModal.values[i] ?? ''}
                        onChange={e => setVarModal(vm => { const vals = [...vm.values]; vals[i] = e.target.value; return { ...vm, values: vals } })}
                        style={{ fontSize: 12 }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── WhatsApp Live Chat Bubble Mockup Preview ── */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
              WhatsApp Live Preview
            </div>
            <div style={{ background: '#0b141a', borderRadius: 12, padding: 12, border: '1px solid #202c33' }}>
              <div style={{ background: '#005c4b', borderRadius: '10px 10px 10px 2px', padding: '10px 12px', color: '#e9edef', fontSize: 13, lineHeight: '1.4', position: 'relative' }}>
                {/* Header text */}
                {varModal.template.header_text && (
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#ffffff' }}>
                    {varModal.template.header_text}
                  </div>
                )}

                {/* Body text */}
                <div>
                  {isOTP ? `Your verification code is ${varModal.values[0] || '******'}. Do not share this code with anyone.` : previewBody}
                </div>

                {/* Footer text */}
                {varModal.template.footer_text && (
                  <div style={{ fontSize: 11, color: '#8696a0', marginTop: 6 }}>
                    {varModal.template.footer_text}
                  </div>
                )}

                {/* WhatsApp Timestamp & ticks */}
                <div style={{ textAlign: 'right', fontSize: 10, color: '#8696a0', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <span>10:45 AM</span>
                  <span style={{ color: '#53bdeb' }}>✓✓</span>
                </div>

                {/* Interactive Button Chips */}
                {isOTP ? (
                  <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 6, textAlign: 'center', color: '#53bdeb', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    📋 Copy Code: {varModal.values[0] || '******'}
                  </div>
                ) : varModal.template.category === 'UTILITY' ? (
                  <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 6, textAlign: 'center', color: '#53bdeb', fontWeight: 600, fontSize: 12 }}>
                    🔗 View Details
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="tpl-modal-footer" style={{ padding: '12px 16px' }}>
          <button className="btn btn-secondary" onClick={() => setVarModal(v => ({ ...v, open: false }))}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => { sendTemplate(varModal.template!, varModal.values); setVarModal(v => ({ ...v, open: false })) }}
            style={{ background: '#25d366', borderColor: '#25d366', color: '#ffffff' }}
          >
            <i className="fa-solid fa-paper-plane" style={{ marginRight: 5 }} />
            {isOTP ? 'Send OTP Message' : 'Send WhatsApp Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
