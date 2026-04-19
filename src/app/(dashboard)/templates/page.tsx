'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import FlowBuilder from '@/components/flows/FlowBuilder'
import { convertToMetaJSON } from '@/lib/flowConverter'

const WA_LANGUAGES = [
  { code: 'en_US', label: 'English (US)' }, { code: 'en_GB', label: 'English (UK)' },
  { code: 'hi',    label: 'Hindi'         }, { code: 'mr',    label: 'Marathi'      },
  { code: 'gu',    label: 'Gujarati'      }, { code: 'ta',    label: 'Tamil'        },
  { code: 'te',    label: 'Telugu'        }, { code: 'kn',    label: 'Kannada'      },
  { code: 'bn',    label: 'Bengali'       }, { code: 'pa',    label: 'Punjabi'      },
  { code: 'ml',    label: 'Malayalam'     }, { code: 'ur',    label: 'Urdu'         },
  { code: 'ar',    label: 'Arabic'        }, { code: 'es',    label: 'Spanish'      },
  { code: 'pt_BR', label: 'Portuguese (BR)' }, { code: 'fr', label: 'French'       },
  { code: 'de',    label: 'German'        }, { code: 'it',    label: 'Italian'      },
  { code: 'id',    label: 'Indonesian'    }, { code: 'tr',    label: 'Turkish'      },
  { code: 'ms',    label: 'Malay'         }, { code: 'nl',    label: 'Dutch'        },
  { code: 'ru',    label: 'Russian'       }, { code: 'ja',    label: 'Japanese'     },
  { code: 'ko',    label: 'Korean'        }, { code: 'zh_CN', label: 'Chinese (Simplified)' },
]

// All supported header types
type HeaderType = 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION'

// All supported button types
type BtnKind = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'OTP' | 'CATALOG' | 'MPM'
interface Btn { type: BtnKind; text: string; url?: string; phone?: string; url_example?: string; otp_type?: 'COPY_CODE' | 'ONE_TAP' | 'ZERO_TAP' }

// Template types
type TemplateType = 'STANDARD' | 'AUTHENTICATION' | 'CATALOG' | 'MPM'

interface FormState {
  // Meta
  template_type: TemplateType
  name: string; category: string; language: string
  // Header
  header_type: HeaderType; header_text: string; header_examples: string[]
  // Body
  body_text: string; body_examples: string[]
  // Footer
  footer_text: string
  // Buttons
  buttons: Btn[]
  // Authentication specific
  add_security_recommendation: boolean
  code_expiration_minutes: number
  // Media
  media_file: File | null; media_preview: string | null
}

const EMPTY: FormState = {
  template_type: 'STANDARD',
  name: '', category: 'UTILITY', language: 'en_US',
  header_type: 'NONE', header_text: '', header_examples: [],
  body_text: '', body_examples: [],
  footer_text: '',
  buttons: [],
  add_security_recommendation: true,
  code_expiration_minutes: 10,
  media_file: null, media_preview: null,
}

const MEDIA_ACCEPT: Record<string, string> = {
  IMAGE:    'image/jpeg,image/png,image/webp',
  VIDEO:    'video/mp4,video/3gp',
  DOCUMENT: 'application/pdf',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function hlVars(t: string) {
  return (t ?? '').replace(/\{\{(\d+|[a-z_]+)\}\}/g, '<span class="tpl-var">{{$1}}</span>')
}

function countVars(text: string): number {
  const m = [...(text ?? '').matchAll(/\{\{(\d+)\}\}/g)]
  return m.length ? Math.max(...m.map(x => parseInt(x[1]))) : 0
}

function listVars(text: string): string[] {
  return [...new Set([...(text ?? '').matchAll(/\{\{(\d+|[a-z_]+)\}\}/g)].map(m => m[0]))]
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, [string, string]> = {
    approved: ['var(--accent)',     'fa-circle-check'],
    pending:  ['var(--accent3)',    'fa-clock'],
    draft:    ['var(--text-muted)', 'fa-pencil'],
    rejected: ['#e84040',           'fa-circle-xmark'],
    paused:   ['#a78bfa',           'fa-pause-circle'],
    disabled: ['#666',             'fa-ban'],
  }
  const [color, icon] = cfg[status] ?? ['var(--text-muted)', 'fa-question']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color }}>
      <i className={`fa-solid ${icon}`} style={{ fontSize: 9 }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Send Template Modal  (send approved template to a WA conversation)
// ─────────────────────────────────────────────────────────────────────────────
function SendModal({ template, onClose }: { template: any; onClose: () => void }) {
  const supabase = createClient()
  const [convs,       setConvs]       = useState<any[]>([])
  const [search,      setSearch]      = useState('')
  const [selected,    setSelected]    = useState<any | null>(null)
  const [varVals,     setVarVals]     = useState<string[]>([])
  const [sending,     setSending]     = useState(false)
  const [result,      setResult]      = useState<{ ok?: boolean; error?: string } | null>(null)
  const [loadingConvs, setLoading]    = useState(true)

  const vars = listVars(template.body ?? '')
  useEffect(() => { setVarVals(vars.map(() => '')) }, [template.id])

  useEffect(() => {
    supabase.from('conversations')
      .select('id, platform, contact:contacts(name, phone)')
      .eq('platform', 'whatsapp')
      .order('last_message_at', { ascending: false })
      .limit(120)
      .then(({ data }) => { setConvs(data ?? []); setLoading(false) })
  }, [])

  const filtered = convs.filter(c => {
    if (!search) return true
    const n = (c.contact?.name ?? '').toLowerCase()
    const p = c.contact?.phone ?? ''
    return n.includes(search.toLowerCase()) || p.includes(search)
  })

  // Build preview text with variable substitution
  const previewBody = vars.reduce((t, v, i) => varVals[i] ? t.replaceAll(v, varVals[i]) : t, template.body ?? '')

  async function send() {
    if (!selected) return
    setSending(true); setResult(null)
    try {
      const components: any[] = vars.length > 0 && varVals.some(v => v)
        ? [{ type: 'body', parameters: varVals.map(v => ({ type: 'text', text: v || '' })) }]
        : []
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id:    selected.id,
          body:               previewBody,
          type:               'template',
          template_name:      template.name,
          template_language:  template.language ?? 'en_US',
          template_components: components,
        }),
      })
      const json = await res.json()
      if (!res.ok) setResult({ error: json.error })
      else { setResult({ ok: true }); setTimeout(onClose, 1500) }
    } finally { setSending(false) }
  }

  return (
    <div className="tpl-modal-overlay open" onClick={onClose}>
      <div className="tpl-modal" style={{ width: 600, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div className="tpl-modal-header">
          <div className="tpl-modal-title">
            <i className="fa-solid fa-paper-plane" style={{ color: 'var(--accent)', marginRight: 7 }} />
            Send Template
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>{template.name}</span>
          </div>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>

        <div className="tpl-modal-body">
          {/* Preview bubble */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Preview</div>
            <div style={{ maxWidth: 300 }}>
              {template.meta?.header_media_url && template.meta?.header_type === 'IMAGE' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={template.meta.header_media_url} alt="" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: '8px 8px 0 0', display: 'block' }} />
              )}
              <div style={{ background: '#1a3a2a', borderRadius: template.meta?.header_media_url ? '0 0 4px 10px' : '10px 10px 4px 10px', padding: '8px 12px', border: '1px solid rgba(37,211,102,0.15)' }}>
                {template.header_text && (
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{template.header_text}</div>
                )}
                <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#e8edf5', whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: hlVars(
                    previewBody.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => {
                      const v = varVals[parseInt(n) - 1]
                      return v ? `<span style="color:#25d366;font-weight:600">${v}</span>` : `<span style="color:rgba(245,158,11,0.8)">{{${n}}}</span>`
                    })
                  ) }} />
                {template.footer_text && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, fontStyle: 'italic' }}>{template.footer_text}</div>
                )}
              </div>
              {(template.meta?.buttons ?? []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                  {(template.meta.buttons as Btn[]).map((b, i) => (
                    <div key={i} style={{ background: '#1e2535', borderRadius: 6, padding: '5px 12px', fontSize: 11, color: 'var(--accent2)', textAlign: 'center', border: '1px solid rgba(0,168,232,0.2)' }}>
                      {b.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Variables */}
          {vars.length > 0 && (
            <div>
              <div className="form-label">Fill Variables</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
                {vars.map((v, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 10, color: 'var(--accent3)', fontWeight: 600, marginBottom: 3 }}>{v}</div>
                    <input className="form-input" style={{ padding: '6px 10px', fontSize: 12 }}
                      placeholder={`Value for ${v}`} value={varVals[i] ?? ''}
                      onChange={e => { const nv = [...varVals]; nv[i] = e.target.value; setVarVals(nv) }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversation picker */}
          <div>
            <div className="form-label">Send To *</div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                <input className="form-input" style={{ padding: '5px 10px', fontSize: 12 }}
                  placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {loadingConvs ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Loading…
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No WhatsApp conversations</div>
                ) : filtered.map(c => {
                  const sel = selected?.id === c.id
                  const init = (c.contact?.name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <button key={c.id} onClick={() => setSelected(c)} style={{
                      width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid var(--border)',
                      background: sel ? 'var(--bg-active)' : 'none', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit', color: sel ? 'var(--accent)' : 'var(--text-secondary)',
                    }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: sel ? 'var(--accent-glow)' : 'var(--bg-surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {init}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contact?.name ?? 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.contact?.phone ?? ''}</div>
                      </div>
                      {sel && <i className="fa-solid fa-circle-check" style={{ color: 'var(--accent)', fontSize: 13 }} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {result?.error && (
            <div style={{ background: 'rgba(232,64,64,0.1)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e84040' }}>
              <i className="fa-solid fa-circle-xmark" style={{ marginRight: 6 }} />{result.error}
            </div>
          )}
          {result?.ok && (
            <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--accent)' }}>
              <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />Template sent successfully!
            </div>
          )}
        </div>

        <div className="tpl-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={send} disabled={sending || !selected}>
            {sending ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Sending…</> : <><i className="fa-solid fa-paper-plane" style={{ marginRight: 6 }} />Send Template</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────
function DeleteModal({ template, onCancel, onConfirm }: { template: any; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="tpl-modal-overlay open" onClick={onCancel}>
      <div style={{ background: 'var(--bg-panel)', borderRadius: 14, padding: 24, maxWidth: 420, width: '90vw', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ color: '#e84040' }} />Delete Template?
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{template.name}</strong> from both your local database and WhatsApp.
          {template.status === 'approved' && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--accent3)' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 5 }} />
              <strong>Approved template:</strong> the name <strong>"{template.name}"</strong> cannot be reused for 30 days after deletion.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn" style={{ background: '#e84040', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }} onClick={onConfirm}>
            <i className="fa-solid fa-trash" />Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const [templates,     setTemplates]     = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [syncing,       setSyncing]       = useState(false)
  const [filter,        setFilter]        = useState<'all' | 'whatsapp' | 'instagram' | 'facebook'>('all')
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [search,        setSearch]        = useState('')
  const [showModal,     setShowModal]     = useState(false)
  const [editTpl,       setEditTpl]       = useState<any | null>(null)
  const [form,          setForm]          = useState<FormState>({ ...EMPTY })
  const [saving,        setSaving]        = useState(false)
  const [saveResult,    setSaveResult]    = useState<{ error?: string; meta_error?: string; success?: boolean; strategy?: string } | null>(null)
  const [hasWABA,       setHasWABA]       = useState<boolean | null>(null)
  const [syncError,     setSyncError]     = useState<string | null>(null)
  const [sendModal,     setSendModal]     = useState<any | null>(null)
  const [deleteModal,   setDeleteModal]   = useState<any | null>(null)

  const mediaRef = useRef<HTMLInputElement>(null)

  // ── Load from Supabase (default) or sync with Meta ───────────────────────
  const load = useCallback(async (sync = false) => {
    if (sync) setSyncing(true); else setLoading(true)
    setSyncError(null)
    try {
      const res  = await fetch(sync ? '/api/templates?sync=true' : '/api/templates')
      const json = await res.json()
      setTemplates(json.templates ?? [])
      setHasWABA(json.has_waba ?? false)
      if (json.sync_error) setSyncError(json.sync_error)
    } catch { /* ignore */ }
    finally { setLoading(false); setSyncing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Form helpers ──────────────────────────────────────────────────────────
  const upd = (k: keyof FormState, v: any) => setForm(f => ({ ...f, [k]: v }))

  function insertVar() {
    const n = countVars(form.body_text) + 1
    upd('body_text', form.body_text + `{{${n}}}`)
    upd('body_examples', [...form.body_examples, ''])
  }

  function addBtn(type: BtnKind) {
    if (form.buttons.length >= 10) { alert('Max 10 buttons'); return }
    const defaults: Partial<Btn> = type === 'OTP' ? { text: 'Copy Code', otp_type: 'COPY_CODE' } : type === 'CATALOG' ? { text: 'View catalog' } : type === 'MPM' ? { text: 'View items' } : {}
    upd('buttons', [...form.buttons, { type, text: '', ...defaults }])
  }

  function updBtn(i: number, u: Partial<Btn>) {
    const b = [...form.buttons]; b[i] = { ...b[i], ...u }; upd('buttons', b)
  }

  function clearMedia() {
    if (form.media_preview?.startsWith('blob:')) URL.revokeObjectURL(form.media_preview)
    upd('media_file', null); upd('media_preview', null)
  }

  function handleMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    clearMedia()
    upd('media_file', file)
    upd('media_preview', URL.createObjectURL(file))
    if (e.target) e.target.value = ''
  }

  function changeHeaderType(ht: HeaderType) {
    clearMedia(); upd('header_type', ht)
  }

  function changeTemplateType(tt: TemplateType) {
    // Set sensible defaults per type
    upd('template_type', tt)
    if (tt === 'AUTHENTICATION') {
      upd('category', 'AUTHENTICATION')
      upd('header_type', 'NONE')
      upd('buttons', [{ type: 'OTP', text: 'Copy Code', otp_type: 'COPY_CODE' }])
    } else if (tt === 'CATALOG') {
      upd('category', 'MARKETING')
      upd('buttons', [{ type: 'CATALOG', text: 'View catalog' }])
    } else if (tt === 'MPM') {
      upd('category', 'MARKETING')
      upd('buttons', [{ type: 'MPM', text: 'View items' }])
    } else {
      if (form.template_type !== 'STANDARD') upd('buttons', [])
    }
  }

  // ── Open modals ───────────────────────────────────────────────────────────
  function openNew() {
    setEditTpl(null); setForm({ ...EMPTY }); setSaveResult(null); setShowModal(true)
  }

  function openEdit(t: any) {
    const meta = t.meta ?? {}
    setEditTpl(t)
    setForm({
      template_type:              (meta.template_type ?? 'STANDARD') as TemplateType,
      name:                       t.name ?? '',
      category:                   t.category ?? 'UTILITY',
      language:                   t.language ?? 'en_US',
      header_type:                (meta.header_type ?? 'NONE') as HeaderType,
      header_text:                t.header_text ?? '',
      header_examples:            [],
      body_text:                  t.body ?? '',
      body_examples:              [],
      footer_text:                t.footer_text ?? '',
      buttons:                    meta.buttons ?? [],
      add_security_recommendation: meta.add_security_recommendation ?? true,
      code_expiration_minutes:    meta.code_expiration_minutes ?? 10,
      media_file:                 null,
      media_preview:              meta.header_media_url ?? null,
    })
    setSaveResult(null); setShowModal(true)
  }

  // ── Save (create or edit) ─────────────────────────────────────────────────
  async function save() {
    const nameClean = form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    if (!nameClean) { alert('Template name is required'); return }
    if (form.template_type !== 'AUTHENTICATION' && !form.body_text.trim()) { alert('Message body is required'); return }

    setSaving(true); setSaveResult(null)
    try {
      const isEdit = !!editTpl
      const method = isEdit ? 'PATCH' : 'POST'

      // Build payload — use FormData if there is a media file
      let res: Response
      if (form.media_file) {
        const fd = new FormData()
        fd.append('template_type',                form.template_type)
        fd.append('name',                         nameClean)
        fd.append('category',                     form.category)
        fd.append('language',                     form.language)
        fd.append('header_type',                  form.header_type)
        fd.append('header_text',                  form.header_text)
        fd.append('header_examples',              JSON.stringify(form.header_examples.filter(Boolean)))
        fd.append('body_text',                    form.body_text)
        fd.append('body_examples',                JSON.stringify(form.body_examples.filter(Boolean)))
        fd.append('footer_text',                  form.footer_text)
        fd.append('buttons',                      JSON.stringify(form.buttons))
        fd.append('add_security_recommendation',  String(form.add_security_recommendation))
        fd.append('code_expiration_minutes',      String(form.code_expiration_minutes))
        fd.append('media_file',                   form.media_file)
        if (isEdit) {
          fd.append('template_id',      editTpl.id)
          fd.append('meta_template_id', editTpl.meta_template_id ?? '')
        }
        res = await fetch('/api/templates', { method, body: fd })
      } else {
        const body: any = {
          template_type:               form.template_type,
          name:                        nameClean,
          category:                    form.category,
          language:                    form.language,
          header_type:                 form.header_type,
          header_text:                 form.header_text,
          header_examples:             form.header_examples.filter(Boolean),
          body_text:                   form.body_text,
          body_examples:               form.body_examples.filter(Boolean),
          footer_text:                 form.footer_text,
          buttons:                     form.buttons,
          add_security_recommendation: form.add_security_recommendation,
          code_expiration_minutes:     form.code_expiration_minutes,
        }
        if (isEdit) { body.template_id = editTpl.id; body.meta_template_id = editTpl.meta_template_id }
        res = await fetch('/api/templates', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }

      const json = await res.json()
      if (!res.ok) {
        setSaveResult({ error: json.error })
      } else {
        setSaveResult({ success: true, meta_error: json.meta_error ?? null, strategy: json.edit_strategy })
        await load(false)
        if (!json.meta_error) {
          setTimeout(() => { setShowModal(false); setForm({ ...EMPTY }); setEditTpl(null) }, 800)
        }
      }
    } finally { setSaving(false) }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function doDelete(t: any) {
    const res = await fetch('/api/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: t.id, template_name: t.name, meta_template_id: t.meta_template_id }),
    })
    const json = await res.json()
    if (json.success) { setTemplates(prev => prev.filter(x => x.id !== t.id)); setDeleteModal(null) }
    else alert('Delete failed: ' + (json.error ?? json.meta_error ?? 'unknown'))
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const varCount = countVars(form.body_text)
  const isApproved  = editTpl?.status === 'approved'
  const nameLocked  = !!(editTpl?.meta_template_id)   // name locked once on Meta
  const catLocked   = isApproved                       // category locked for approved

  const filtered = templates.filter(t => {
    if (filter !== 'all' && t.platform !== filter) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !(t.body ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // ── Preview substitution ──────────────────────────────────────────────────
  const previewBody = form.body_text.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => {
    const ex = form.body_examples[parseInt(n) - 1]
    return ex ? `<span style="color:#25d366;font-weight:600">${ex}</span>` : `<span style="color:rgba(245,158,11,0.8)">{{${n}}}</span>`
  })

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="generic-page">

      {/* ── Header row ── */}
      <div className="page-header">
        <span className="page-title">
          <i className="fa-solid fa-file-code" style={{ color: 'var(--accent)', marginRight: 8 }} />Templates
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasWABA === false && (
            <span style={{ fontSize: 11, color: 'var(--accent3)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fa-solid fa-triangle-exclamation" />Set WHATSAPP_WABA_ID to enable Meta sync
            </span>
          )}
          {syncError && (
            <span style={{ fontSize: 11, color: '#e84040', display: 'flex', alignItems: 'center', gap: 5 }} title={syncError}>
              <i className="fa-solid fa-circle-xmark" />Sync error
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => load(true)} disabled={syncing || !hasWABA}
            title={!hasWABA ? 'Configure WHATSAPP_WABA_ID first' : 'Fetch all templates from Meta and update local DB'}
          >
            <i className={`fa-solid fa-rotate ${syncing ? 'fa-spin' : ''}`} />
            {syncing ? ' Syncing…' : ' Sync from Meta'}
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <i className="fa-solid fa-plus" /> New Template
          </button>
        </div>
      </div>

      {/* ── Platform tabs ── */}
      <div className="tpl-page-tabs">
        {(['all','whatsapp','instagram','facebook'] as const).map(ch => (
          <div key={ch} className={`tpl-page-tab ${filter === ch ? 'active' : ''}`} onClick={() => setFilter(ch)}>
            {ch === 'all'       && 'All'}
            {ch === 'whatsapp'  && <><i className="fa-brands fa-whatsapp"  style={{ color: '#25d366', marginRight: 5 }} />WhatsApp</>}
            {ch === 'instagram' && <><i className="fa-brands fa-instagram" style={{ color: '#e1306c', marginRight: 5 }} />Instagram</>}
            {ch === 'facebook'  && <><i className="fa-brands fa-facebook"  style={{ color: '#1877f2', marginRight: 5 }} />Facebook</>}
            <span className="tpl-page-badge">{ch === 'all' ? templates.length : templates.filter(t => t.platform === ch).length}</span>
          </div>
        ))}
      </div>

      <div className="page-body">
        {syncError && (
          <div style={{ background: 'rgba(232,64,64,0.07)', border: '1px solid rgba(232,64,64,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#e84040', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-triangle-exclamation" />Meta sync error: {syncError}
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input-wrap" style={{ width: 240 }}>
            <i className="fa-solid fa-magnifying-glass" />
            <input type="text" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none' }}>
            <option value="all">All Status</option>
            <option value="approved">✅ Approved</option>
            <option value="pending">🕒 Pending Review</option>
            <option value="draft">📝 Draft</option>
            <option value="rejected">❌ Rejected</option>
            <option value="paused">⏸ Paused</option>
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
            {filtered.length} template{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />Loading templates…
          </div>
        ) : (
          <div className="tpl-grid">
            {filtered.map(t => {
              const meta  = t.meta ?? {}
              const btns: Btn[] = meta.buttons ?? []
              const quality = meta.quality_score?.score ?? null
              const canSend  = t.status === 'approved' && t.platform === 'whatsapp'
              const canEdit  = ['approved','rejected','paused','draft'].includes(t.status)
              const tType    = meta.template_type ?? 'STANDARD'

              return (
                <div className="tpl-card" key={t.id}>
                  <div className="tpl-card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                        <div className="tpl-card-category">{t.category}</div>
                      </div>
                      <div className="tpl-card-name">{t.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        {t.language}
                        {t.meta_template_id && <span style={{ marginLeft: 5 }}>· <i className="fa-brands fa-meta" style={{ marginRight: 2 }} />{t.meta_template_id}</span>}
                      </div>
                    </div>
                    <span className={`tpl-card-channel ${t.platform === 'whatsapp' ? 'tpl-ch-wa' : t.platform === 'instagram' ? 'tpl-ch-ig' : 'tpl-ch-fb'}`}>
                      <i className={t.platform === 'whatsapp' ? 'fa-brands fa-whatsapp' : t.platform === 'instagram' ? 'fa-brands fa-instagram' : 'fa-brands fa-facebook'} />
                    </span>
                  </div>

                  {/* Header indicator */}
                  {meta.header_type && meta.header_type !== 'NONE' && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className={{ TEXT: 'fa-solid fa-font', IMAGE: 'fa-solid fa-image', VIDEO: 'fa-solid fa-video', DOCUMENT: 'fa-solid fa-file', LOCATION: 'fa-solid fa-location-dot' }[meta.header_type as string] ?? 'fa-solid fa-paperclip'} style={{ fontSize: 9 }} />
                      {meta.header_type === 'TEXT' ? (t.header_text ?? 'Text header') : `${meta.header_type} header`}
                      {meta.header_media_url && (
                        <a href={meta.header_media_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', fontSize: 9, marginLeft: 3 }}>
                          <i className="fa-solid fa-eye" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Body */}
                  {t.body ? (
                    <div className="tpl-card-body" dangerouslySetInnerHTML={{ __html: hlVars(t.body) }} />
                  ) : tType === 'AUTHENTICATION' ? (
                    <div className="tpl-card-body" style={{ opacity: 0.6, fontStyle: 'italic' }}>
                      Authentication OTP message (auto-generated by WhatsApp)
                    </div>
                  ) : null}

                  {t.footer_text && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.footer_text}</div>}

                  {btns.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {btns.map((b, i) => {
                        const btnIcon: Record<string, string> = { QUICK_REPLY: '↩', URL: '🔗', PHONE_NUMBER: '📞', OTP: '🔑', CATALOG: '🛒', MPM: '📦' }
                        return (
                          <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'var(--bg-surface2)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            {btnIcon[b.type] ?? '⬡'} {b.text}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {t.status === 'rejected' && meta.rejected_reason && (
                    <div style={{ fontSize: 11, color: '#e84040', background: 'rgba(232,64,64,0.08)', borderRadius: 6, padding: '5px 8px' }}>
                      <i className="fa-solid fa-circle-xmark" style={{ marginRight: 4 }} />{meta.rejected_reason}
                    </div>
                  )}

                  {isApproved && t.status === 'approved' && t.meta_template_id && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <i className="fa-solid fa-info-circle" style={{ fontSize: 9 }} />Body editable (max 10×/month) · Name & category locked
                    </div>
                  )}

                  <div className="tpl-card-footer" style={{ marginTop: 'auto' }}>
                    <StatusBadge status={t.status} />
                    <div className="tpl-card-actions">
                      {canSend && (
                        <button className="icon-btn" title="Send to a conversation" onClick={() => setSendModal(t)} style={{ color: 'var(--accent)' }}>
                          <i className="fa-solid fa-paper-plane" style={{ fontSize: 11 }} />
                        </button>
                      )}
                      {canEdit && (
                        <button className="icon-btn" title={isApproved ? 'Edit (body only, max 10×/month)' : 'Edit and re-submit'} onClick={() => openEdit(t)}>
                          <i className="fa-solid fa-pen" style={{ fontSize: 11, color: 'var(--text-muted)' }} />
                        </button>
                      )}
                      <button className="icon-btn" title="Delete from WhatsApp and local DB" onClick={() => setDeleteModal(t)}>
                        <i className="fa-solid fa-trash" style={{ fontSize: 11, color: '#e84040' }} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && !loading && (
              <div style={{ gridColumn: '1/-1', padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <i className="fa-solid fa-file-code" style={{ fontSize: 32, opacity: 0.3, display: 'block', marginBottom: 12 }} />
                {templates.length === 0
                  ? hasWABA
                    ? <>No templates yet. Create one or click <strong>"Sync from Meta"</strong> to import existing ones.</>
                    : <>Add <code style={{ color: 'var(--accent)' }}>WHATSAPP_WABA_ID</code> to env to enable Meta sync.</>
                  : 'No templates match your filters.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Delete Modal ── */}
      {deleteModal && <DeleteModal template={deleteModal} onCancel={() => setDeleteModal(null)} onConfirm={() => doDelete(deleteModal)} />}

      {/* ── Send Modal ── */}
      {sendModal && <SendModal template={sendModal} onClose={() => setSendModal(null)} />}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="tpl-modal-overlay open" onClick={() => setShowModal(false)}>
          <div className="tpl-modal" style={{ width: 720, maxHeight: '93vh' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="tpl-modal-header">
              <div className="tpl-modal-title">
                <i className="fa-brands fa-whatsapp" style={{ color: '#25d366', marginRight: 6 }} />
                {editTpl ? 'Edit Template' : 'New WhatsApp Template'}
                {isApproved && <span style={{ fontSize: 10, color: 'var(--accent3)', marginLeft: 8 }}>Approved · body editable only</span>}
                {!hasWABA && <span style={{ fontSize: 10, color: 'var(--accent3)', marginLeft: 8 }}>No WABA_ID — will save as draft</span>}
              </div>
              <button className="icon-btn" onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark" /></button>
            </div>

            <div className="tpl-modal-body">
              {/* Result banners */}
              {saveResult?.error && (
                <div style={{ background: 'rgba(232,64,64,0.1)', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e84040' }}>
                  <i className="fa-solid fa-circle-xmark" style={{ marginRight: 6 }} />{saveResult.error}
                </div>
              )}
              {saveResult?.meta_error && !saveResult.error && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--accent3)' }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />Saved locally but Meta failed: {saveResult.meta_error}
                </div>
              )}
              {saveResult?.success && !saveResult.meta_error && (
                <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--accent)' }}>
                  <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />
                  {saveResult.strategy === 'inplace' ? 'Template updated and resubmitted for review!' : saveResult.strategy === 'recreated' ? 'Template recreated and submitted!' : 'Template submitted to WhatsApp for review!'}
                </div>
              )}

              {/* Template Type */}
              {!editTpl && (
                <div>
                  <div className="form-label">Template Type</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                    {([
                      { t: 'STANDARD',       icon: '💬', label: 'Standard',       desc: 'Text, media, buttons' },
                      { t: 'AUTHENTICATION', icon: '🔑', label: 'Authentication', desc: 'OTP / login codes' },
                      { t: 'CATALOG',        icon: '🛒', label: 'Catalog',        desc: 'Product catalog button' },
                      { t: 'MPM',            icon: '📦', label: 'Multi-Product',  desc: 'Multiple products' },
                    ] as const).map(({ t, icon, label, desc }) => (
                      <div key={t} onClick={() => changeTemplateType(t)} style={{
                        padding: '10px 12px', borderRadius: 10, border: '1px solid', cursor: 'pointer', textAlign: 'center',
                        borderColor: form.template_type === t ? 'var(--accent)' : 'var(--border)',
                        background:  form.template_type === t ? 'var(--accent-glow)' : 'var(--bg-surface)',
                      }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: form.template_type === t ? 'var(--accent)' : 'var(--text-secondary)' }}>{label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Name + Category + Language */}
              <div className="form-row">
                <div>
                  <div className="form-label">
                    Template Name *
                    {nameLocked && <span style={{ fontSize: 10, color: '#e84040', marginLeft: 5 }}>🔒 locked</span>}
                  </div>
                  <input className="form-input" value={form.name}
                    onChange={e => !nameLocked && upd('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="order_confirmation" disabled={nameLocked} style={nameLocked ? { opacity: 0.6 } : {}} />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {nameLocked ? 'Name cannot change after Meta submission' : 'lowercase + underscores only'}
                  </div>
                </div>
                <div>
                  <div className="form-label">
                    Category *
                    {catLocked && <span style={{ fontSize: 10, color: '#e84040', marginLeft: 5 }}>🔒 approved</span>}
                  </div>
                  <select className="form-input" value={form.category}
                    onChange={e => !catLocked && upd('category', e.target.value)}
                    disabled={catLocked || form.template_type === 'AUTHENTICATION'}
                    style={catLocked || form.template_type === 'AUTHENTICATION' ? { opacity: 0.6 } : {}}>
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </select>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {form.category === 'MARKETING' ? 'Promos — carefully reviewed by Meta' : form.category === 'UTILITY' ? 'Order/delivery updates — fastest approval' : 'OTPs only'}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div className="form-label">Language *</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select className="form-input" style={{ maxWidth: 240 }} value={form.language} onChange={e => upd('language', e.target.value)}>
                    {WA_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-info-circle" style={{ color: 'var(--accent)', marginRight: 4 }} />
                    Must exactly match your message language or Meta will reject it.
                  </span>
                </div>
              </div>

              {/* AUTHENTICATION special UI */}
              {form.template_type === 'AUTHENTICATION' && (
                <div style={{ background: 'rgba(0,168,232,0.08)', border: '1px solid rgba(0,168,232,0.2)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent2)', marginBottom: 10 }}>
                    <i className="fa-solid fa-shield-halved" style={{ marginRight: 6 }} />Authentication Template Settings
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                      <input type="checkbox" checked={form.add_security_recommendation} onChange={e => upd('add_security_recommendation', e.target.checked)} />
                      Add "For your security, do not share this code" footer
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>OTP expires after</span>
                      <input type="number" className="form-input" style={{ width: 60, padding: '4px 8px', fontSize: 12 }}
                        value={form.code_expiration_minutes} min={1} max={90}
                        onChange={e => upd('code_expiration_minutes', parseInt(e.target.value) || 10)} />
                      <span style={{ color: 'var(--text-secondary)' }}>minutes</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <div className="form-label" style={{ marginBottom: 4 }}>Button Type</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['COPY_CODE', 'ONE_TAP', 'ZERO_TAP'] as const).map(ot => {
                        const otpBtn = form.buttons.find(b => b.type === 'OTP')
                        const active = otpBtn?.otp_type === ot || (!otpBtn && ot === 'COPY_CODE')
                        return (
                          <button key={ot} onClick={() => upd('buttons', [{ type: 'OTP', text: ot === 'COPY_CODE' ? 'Copy Code' : ot === 'ONE_TAP' ? 'Autofill' : 'Auto-verify', otp_type: ot }])}
                            style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                              borderColor: active ? 'var(--accent2)' : 'var(--border)', background: active ? 'rgba(0,168,232,0.1)' : 'var(--bg-surface)', color: active ? 'var(--accent2)' : 'var(--text-secondary)' }}>
                            {ot === 'COPY_CODE' ? '🔑 Copy Code' : ot === 'ONE_TAP' ? '📱 One Tap' : '⚡ Zero Tap'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.7 }}>
                    WhatsApp auto-generates the body text for authentication templates. You cannot customize it.
                  </div>
                </div>
              )}

              {/* Header (only for STANDARD type) */}
              {form.template_type === 'STANDARD' && (
                <div>
                  <div className="form-label">Header <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 10 }}>(optional)</span></div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    {(['NONE','TEXT','IMAGE','VIDEO','DOCUMENT','LOCATION'] as HeaderType[]).map(h => (
                      <button key={h} onClick={() => changeHeaderType(h)} style={{
                        padding: '4px 12px', borderRadius: 8, border: '1px solid', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                        borderColor: form.header_type === h ? 'var(--accent)' : 'var(--border)',
                        background:  form.header_type === h ? 'var(--accent-glow)' : 'var(--bg-surface)',
                        color:       form.header_type === h ? 'var(--accent)' : 'var(--text-secondary)' }}>
                        {h === 'NONE' ? 'None' : h === 'TEXT' ? '📝 Text' : h === 'IMAGE' ? '🖼 Image' : h === 'VIDEO' ? '🎬 Video' : h === 'DOCUMENT' ? '📄 Document' : '📍 Location'}
                      </button>
                    ))}
                  </div>

                  {form.header_type === 'TEXT' && (
                    <div>
                      <input className="form-input" value={form.header_text} onChange={e => upd('header_text', e.target.value)} placeholder="Bold header text (max 60 chars)" maxLength={60} />
                      {countVars(form.header_text) > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <div className="form-label" style={{ fontSize: 10 }}>Header variable example (for Meta review)</div>
                          <input className="form-input" style={{ fontSize: 12 }} value={form.header_examples[0] ?? ''} onChange={e => upd('header_examples', [e.target.value])} placeholder="e.g. Summer Sale" />
                        </div>
                      )}
                    </div>
                  )}

                  {form.header_type === 'LOCATION' && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <i className="fa-solid fa-location-dot" style={{ color: 'var(--accent3)', marginRight: 6 }} />
                      Location header — coordinates are provided at send time via the API, not stored in the template.
                    </div>
                  )}

                  {/* Media upload */}
                  {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(form.header_type) && (
                    <div>
                      <input ref={mediaRef} type="file" accept={MEDIA_ACCEPT[form.header_type] ?? '*'} style={{ display: 'none' }} onChange={handleMedia} />
                      {form.media_preview ? (
                        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', maxWidth: 320 }}>
                          {form.header_type === 'IMAGE' && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={form.media_preview} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
                          )}
                          {form.header_type === 'VIDEO' && (
                            <div style={{ height: 100, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                              <span style={{ fontSize: 32 }}>🎬</span>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{form.media_file?.name}</span>
                            </div>
                          )}
                          {form.header_type === 'DOCUMENT' && (
                            <div style={{ height: 80, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                              <span style={{ fontSize: 28 }}>📄</span>
                              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{form.media_file?.name ?? 'Document'}</span>
                            </div>
                          )}
                          <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {form.media_file ? form.media_file.name : 'Existing media'}
                            </span>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button onClick={() => mediaRef.current?.click()} style={{ fontSize: 11, color: 'var(--accent2)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>Change</button>
                              <button onClick={clearMedia} style={{ fontSize: 11, color: '#e84040', background: 'none', border: '1px solid rgba(232,64,64,0.3)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => mediaRef.current?.click()} style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-surface)', transition: 'border-color 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                          <div style={{ fontSize: 30, marginBottom: 8 }}>{form.header_type === 'IMAGE' ? '🖼' : form.header_type === 'VIDEO' ? '🎬' : '📄'}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Click to upload {form.header_type.toLowerCase()}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {form.header_type === 'IMAGE'    && 'JPG, PNG or WebP · max 5 MB · uploaded to WhatsApp servers'}
                            {form.header_type === 'VIDEO'    && 'MP4 or 3GP · max 16 MB · uploaded to WhatsApp servers'}
                            {form.header_type === 'DOCUMENT' && 'PDF only · max 100 MB'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Body (not shown for auth) */}
              {form.template_type !== 'AUTHENTICATION' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <div className="form-label" style={{ marginBottom: 0 }}>
                      Message Body * <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>({form.body_text.length}/1024)</span>
                    </div>
                    <button onClick={insertVar} style={{ fontSize: 11, color: 'var(--accent3)', background: 'none', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      + Add Variable
                    </button>
                  </div>
                  <textarea className="form-input" rows={4} value={form.body_text}
                    onChange={e => {
                      upd('body_text', e.target.value)
                      const n = countVars(e.target.value)
                      const cur = form.body_examples
                      if (n > cur.length)      upd('body_examples', [...cur, ...Array(n - cur.length).fill('')])
                      else if (n < cur.length) upd('body_examples', cur.slice(0, n))
                    }}
                    placeholder="Hi {{1}}, your order {{2}} is confirmed. Total: ₹{{3}}"
                    maxLength={1024} style={{ resize: 'vertical' }} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Use {'{{1}}'}, {'{{2}}'} etc. for variables. Provide sample values below for Meta review.
                  </div>

                  {varCount > 0 && (
                    <div style={{ marginTop: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent3)', marginBottom: 8 }}>
                        <i className="fa-solid fa-pen-to-square" style={{ marginRight: 5 }} />
                        Sample Values (required by Meta for review)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 6 }}>
                        {Array.from({ length: varCount }, (_, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{`{{${i + 1}}}`} example:</div>
                            <input className="form-input" style={{ padding: '5px 8px', fontSize: 12 }}
                              value={form.body_examples[i] ?? ''} placeholder={`e.g. ${['Pintu', 'ORD-12345', '₹499', 'Monday'][i] ?? `Sample ${i + 1}`}`}
                              onChange={e => { const ex = [...form.body_examples]; ex[i] = e.target.value; upd('body_examples', ex) }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              {form.template_type !== 'AUTHENTICATION' && (
                <div>
                  <div className="form-label">Footer <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 10 }}>(optional · no variables · max 60 chars)</span></div>
                  <input className="form-input" value={form.footer_text} onChange={e => upd('footer_text', e.target.value)} placeholder="Not interested? Reply STOP" maxLength={60} />
                </div>
              )}

              {/* Buttons */}
              {form.template_type === 'STANDARD' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div className="form-label" style={{ marginBottom: 0 }}>Buttons <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 10 }}>(max 10, mix of types)</span></div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {([
                        ['QUICK_REPLY', '↩ Quick Reply'], ['URL', '🔗 URL'], ['PHONE_NUMBER', '📞 Phone'],
                        ['CATALOG', '🛒 Catalog'], ['MPM', '📦 Products'],
                      ] as [BtnKind, string][]).map(([type, label]) => (
                        <button key={type} className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: 10, height: 24 }} onClick={() => addBtn(type)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.buttons.map((btn, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, minWidth: 68 }}>
                        {btn.type === 'QUICK_REPLY' ? '↩ Reply' : btn.type === 'URL' ? '🔗 URL' : btn.type === 'PHONE_NUMBER' ? '📞 Phone' : btn.type === 'CATALOG' ? '🛒 Catalog' : '📦 Products'}
                      </span>
                      <input className="form-input" style={{ flex: 1 }} value={btn.text} onChange={e => updBtn(i, { text: e.target.value })} placeholder="Button label (max 25)" maxLength={25} />
                      {btn.type === 'URL' && (
                        <input className="form-input" style={{ flex: 2 }} value={btn.url ?? ''} onChange={e => updBtn(i, { url: e.target.value })} placeholder="https://example.com/order/{{1}}" />
                      )}
                      {btn.type === 'PHONE_NUMBER' && (
                        <input className="form-input" style={{ flex: 1 }} value={btn.phone ?? ''} onChange={e => updBtn(i, { phone: e.target.value })} placeholder="+919354231262" />
                      )}
                      <button className="icon-btn" onClick={() => upd('buttons', form.buttons.filter((_, j) => j !== i))}>
                        <i className="fa-solid fa-xmark" style={{ fontSize: 11, color: '#e84040' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Live Preview */}
              {form.template_type !== 'AUTHENTICATION' && (
                <div>
                  <div className="form-label">Live Preview</div>
                  <div style={{ background: 'var(--bg-chat)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                    <div style={{ maxWidth: 300, marginLeft: 'auto' }}>
                      <div style={{ background: '#1a3a2a', borderRadius: '12px 12px 4px 12px', padding: '8px 12px', border: '1px solid rgba(37,211,102,0.15)' }}>
                        {form.header_type === 'TEXT' && form.header_text && (
                          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{form.header_text}</div>
                        )}
                        {form.header_type === 'LOCATION' && (
                          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 6, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                            <i className="fa-solid fa-location-dot" style={{ color: 'var(--accent3)' }} />Location header
                          </div>
                        )}
                        {['IMAGE','VIDEO','DOCUMENT'].includes(form.header_type) && (
                          <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 8, background: 'rgba(0,0,0,0.25)', minHeight: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {form.media_preview && form.header_type === 'IMAGE'
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={form.media_preview} alt="" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block' }} />
                              : <span style={{ fontSize: 28 }}>{form.header_type === 'IMAGE' ? '🖼' : form.header_type === 'VIDEO' ? '🎬' : '📄'}</span>}
                          </div>
                        )}
                        {form.body_text ? (
                          <div style={{ fontSize: 13, lineHeight: 1.5, color: '#e8edf5', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: hlVars(previewBody) }} />
                        ) : (
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Your message body…</span>
                        )}
                        {form.footer_text && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, fontStyle: 'italic' }}>{form.footer_text}</div>
                        )}
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'right', marginTop: 4 }}>✓ sent</div>
                      </div>
                      {form.buttons.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                          {form.buttons.map((b, i) => (
                            <div key={i} style={{ background: '#1e2535', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: 'var(--accent2)', textAlign: 'center', border: '1px solid rgba(0,168,232,0.2)' }}>
                              {b.text || `Button ${i + 1}`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="tpl-modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving
                  ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Submitting…</>
                  : editTpl
                    ? <><i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} />{isApproved ? 'Save Changes' : 'Re-submit to WhatsApp'}</>
                    : <><i className="fa-brands fa-whatsapp" style={{ marginRight: 6 }} />Submit to WhatsApp</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}