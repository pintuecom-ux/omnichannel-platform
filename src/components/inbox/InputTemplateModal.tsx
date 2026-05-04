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

  return (
    <div className="tpl-modal-overlay open" onClick={() => setVarModal(v => ({ ...v, open: false }))}>
      <div className="tpl-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="tpl-modal-header">
          <div className="tpl-modal-title">
            <i className="fa-solid fa-pen-to-square" style={{ color: 'var(--accent)', marginRight: 6, fontSize: 12 }} />
            {varModal.template.meta?.template_type === 'AUTHENTICATION' || varModal.template.category?.toUpperCase() === 'AUTHENTICATION'
              ? `Send OTP — ${varModal.template.name}`
              : `Fill Variables — ${varModal.template.name}`}
          </div>
          <button className="icon-btn" onClick={() => setVarModal(v => ({ ...v, open: false }))}><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="tpl-modal-body">
          {varModal.template.category?.toUpperCase() === 'AUTHENTICATION' || varModal.template.meta?.template_type === 'AUTHENTICATION' ? (
            // OTP special UI
            <div>
              <div style={{ background: 'rgba(0,168,232,0.08)', border: '1px solid rgba(0,168,232,0.2)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 600, marginBottom: 6 }}>
                  <i className="fa-solid fa-shield-halved" style={{ marginRight: 5 }} />Authentication Template
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  WhatsApp will auto-generate the message. Enter the OTP code below — it will be sent as the Copy Code button value.
                </div>
              </div>
              <div className="form-group">
                <div className="form-label" style={{ color: 'var(--accent3)' }}>OTP Code to Send</div>
                <input
                  className="form-input"
                  placeholder="e.g. 482913"
                  maxLength={8}
                  value={varModal.values[0] ?? ''}
                  onChange={e => setVarModal(vm => { const vals = [...vm.values]; vals[0] = e.target.value; return { ...vm, values: vals } })}
                  autoFocus
                />
              </div>
            </div>
          ) : (
            // Standard variable UI
            <>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Template: <code style={{ color: 'var(--accent3)' }}>{varModal.template.body}</code>
              </div>
              {varModal.vars.map((v, i) => (
                <div key={v} className="form-group" style={{ marginBottom: 10 }}>
                  <div className="form-label" style={{ color: 'var(--accent3)' }}>{v}</div>
                  <input
                    className="form-input"
                    placeholder={`Value for ${v}`}
                    value={varModal.values[i] ?? ''}
                    onChange={e => setVarModal(vm => { const vals = [...vm.values]; vals[i] = e.target.value; return { ...vm, values: vals } })}
                  />
                </div>
              ))}
              <div className="form-group">
                <div className="form-label">Preview</div>
                <div className="tpl-preview-box" style={{ fontFamily: 'inherit', fontSize: 13 }}>
                  {varModal.vars.reduce(
                    (body, v, i) => body.replaceAll(v, varModal.values[i] || v),
                    varModal.template.body ?? ''
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="tpl-modal-footer">
          <button className="btn btn-secondary" onClick={() => setVarModal(v => ({ ...v, open: false }))}>Cancel</button>
          <button className="btn btn-primary"
            onClick={() => { sendTemplate(varModal.template!, varModal.values); setVarModal(v => ({ ...v, open: false })) }}>
            <i className="fa-solid fa-paper-plane" style={{ marginRight: 5 }} />
            {varModal.template.category?.toUpperCase() === 'AUTHENTICATION' ? 'Send OTP' : 'Send Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
