import React from 'react'
import type { Template } from '@/types'

export function InputTemplateSelector({
  templates,
  templateSearch,
  setTemplateSearch,
  tplLoading,
  tplError,
  setShowTemplates,
  pickTemplate,
}: {
  templates: Template[]
  templateSearch: string
  setTemplateSearch: (s: string) => void
  tplLoading: boolean
  tplError: string
  setShowTemplates: (v: boolean) => void
  pickTemplate: (t: Template) => void
}) {
  const filteredTpls = templates.filter(t =>
    !templateSearch ||
    t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
    (t.body ?? '').toLowerCase().includes(templateSearch.toLowerCase())
  )

  function extractVars(t: Template) {
    return [...new Set([...(t.body ?? '').matchAll(/\{\{(\d+|[a-z_]+)\}\}/g)].map(m => m[0]))]
  }

  return (
    <div className="templates-panel open">
      <div className="templates-header">
        <span><i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', marginRight: 5 }} />Templates</span>
        <input className="tpl-search" type="text" placeholder="Search…" value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} autoFocus />
        <button className="icon-btn" onClick={() => setShowTemplates(false)}><i className="fa-solid fa-xmark" /></button>
      </div>
      {tplLoading && (
        <div style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Loading…
        </div>
      )}
      {!tplLoading && tplError && <div style={{ padding: 12, fontSize: 12, color: '#e84040' }}>{tplError}</div>}
      {!tplLoading && !tplError && filteredTpls.length === 0 && (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          No templates. <a href="/templates" style={{ color: 'var(--accent)' }}>Create one →</a>
        </div>
      )}
      {!tplLoading && filteredTpls.map(t => {
        const vars = extractVars(t)
        const isOTP = t.meta?.template_type === 'AUTHENTICATION' || t.category?.toUpperCase() === 'AUTHENTICATION'
        return (
          <div key={t.id} className="tpl-item" onClick={() => pickTemplate(t)}>
            <div className="tpl-name">
              <i className="fa-solid fa-bolt" style={{ color: 'var(--accent)', fontSize: 10, marginRight: 4 }} />
              {t.name}
              <span className="tpl-tag" style={{ marginLeft: 8 }}>{t.category}</span>
              {isOTP && <span style={{ fontSize: 10, color: 'var(--accent2)', marginLeft: 6 }}>🔑 OTP</span>}
              {!isOTP && vars.length > 0 && (
                <span style={{ fontSize: 10, color: 'var(--accent3)', marginLeft: 6 }}>
                  <i className="fa-solid fa-pen-to-square" style={{ marginRight: 2 }} />{vars.length} var{vars.length > 1 ? 's' : ''}
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: t.status === 'approved' ? 'var(--accent)' : 'var(--accent3)' }}>
                {t.status}
              </span>
            </div>
            <div className="tpl-body">{isOTP ? '[Authentication OTP — enter code when sending]' : t.body}</div>
          </div>
        )
      })}
    </div>
  )
}
