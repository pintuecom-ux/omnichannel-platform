'use client'
import { useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
type ComponentType =
  | 'heading' | 'text' | 'input' | 'email'
  | 'phone' | 'dropdown' | 'date' | 'button'

interface Block {
  id: string
  type: ComponentType
  label?: string
  value?: string
  required?: boolean
  placeholder?: string
  options?: { id: string; title: string }[]

  action?: 'next' | 'submit'
  targetScreen?: string
}

interface Screen {
  id: string
  title: string
  blocks: Block[]
  nextScreen?: string
}

// ── WhatsApp Flow JSON Generator ───────────────────────────────────────────────
// Maps Screen[] → Meta WhatsApp Flow JSON v6.1
// Usage: POST /api/flows { action: 'update_json', flow_json: generateFlowJSON(screens) }
export function generateFlowJSON(screens: Screen[]): object {
  const waScreens = screens.map((s, idx) => {
    const nextSc = s.nextScreen ?? screens[idx + 1]?.id ?? null
    const formChildren: any[] = []

    s.blocks.forEach(b => {
      switch (b.type) {
        case 'heading':
          formChildren.push({ type: 'TextHeading', text: b.label ?? '' })
          break
        case 'text':
          formChildren.push({ type: 'TextBody', text: b.label ?? '' })
          break
        case 'input':
        case 'email':
        case 'phone':
          formChildren.push({
            type: 'TextInput',
            label: b.label ?? '',
            name: b.id,
            required: b.required ?? false,
            'input-type': b.type === 'email' ? 'email' : b.type === 'phone' ? 'phone' : 'text',
            ...(b.placeholder ? { 'helper-text': b.placeholder } : {}),
          })
          break
        case 'dropdown':
          formChildren.push({
            type: 'Dropdown',
            label: b.label ?? '',
            name: b.id,
            required: b.required ?? false,
            'data-source': (b.options ?? []).map(o => ({ id: o.id, title: o.title })),
          })
          break
        case 'date':
          formChildren.push({
            type: 'DatePicker',
            label: b.label ?? '',
            name: b.id,
            required: b.required ?? false,
          })
          break
        case 'button':
          formChildren.push({
            type: 'Footer',
            label: b.label ?? (nextSc ? 'Next' : 'Submit'),
            'on-click-action': nextSc
              ? { name: 'navigate', next: { type: 'screen', name: nextSc }, payload: {} }
              : { name: 'complete', payload: {} },
          })
          break
      }
    })

    // Auto-insert Footer if no button block defined
    if (!s.blocks.some(b => b.type === 'button')) {
      formChildren.push({
        type: 'Footer',
        label: nextSc ? 'Next' : 'Submit',
        'on-click-action': nextSc
          ? { name: 'navigate', next: { type: 'screen', name: nextSc }, payload: {} }
          : { name: 'complete', payload: {} },
      })
    }

    return {
      id: s.id,
      title: s.title,
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children: [{
          type: 'Form',
          name: 'form',
          children: formChildren,
        }],
      },
    }
  })

  return { version: '6.1', screens: waScreens }
}

// ── Component Palette Config ───────────────────────────────────────────────────
const PALETTE: { type: ComponentType; icon: string; label: string; desc: string }[] = [
  { type: 'heading',  icon: 'H1', label: 'Heading',    desc: 'Bold title text'       },
  { type: 'text',     icon: '¶',  label: 'Body Text',  desc: 'Paragraph description'  },
  { type: 'input',    icon: 'Aa', label: 'Text Input', desc: 'Free text field'        },
  { type: 'email',    icon: '@',  label: 'Email',      desc: 'Email address field'    },
  { type: 'phone',    icon: '☎',  label: 'Phone',      desc: 'Phone number field'     },
  { type: 'dropdown', icon: '▾',  label: 'Dropdown',   desc: 'Single-select list'     },
  { type: 'date',     icon: '⬚',  label: 'Date',       desc: 'Date picker'            },
  { type: 'button',   icon: '▶',  label: 'CTA Button', desc: 'Navigate or submit'     },
]

const TYPE_COLOR: Record<ComponentType, string> = {
  heading:  '#00A884',
  text:     '#00A884',
  input:    '#25D366',
  email:    '#25D366',
  phone:    '#25D366',
  dropdown: '#128C7E',
  date:     '#128C7E',
  button:   '#075E54',
}

// ── Phone Preview ──────────────────────────────────────────────────────────────
function BlockPreview({ b }: { b: Block }) {
  const mb = { marginBottom: 7 }
  const lbl: React.CSSProperties = { fontSize: 9, color: '#00A884', marginBottom: 3 }
  const inp: React.CSSProperties = {
    background: '#2A3942', borderRadius: 5, padding: '5px 7px',
    fontSize: 10, color: '#8696A0', border: '1px solid #374045',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  }
  switch (b.type) {
    case 'heading':  return <div style={{ ...mb, fontWeight: 700, fontSize: 13, color: '#E9EDEF' }}>{b.label || 'Heading'}</div>
    case 'text':     return <div style={{ ...mb, fontSize: 10, color: '#8696A0', lineHeight: 1.5 }}>{b.label || 'Body text'}</div>
    case 'input':    return <div style={mb}><div style={lbl}>{b.label}</div><div style={inp}>{b.placeholder || 'Enter text...'}</div></div>
    case 'email':    return <div style={mb}><div style={lbl}>{b.label}</div><div style={inp}>email@example.com</div></div>
    case 'phone':    return <div style={mb}><div style={lbl}>{b.label}</div><div style={inp}>+91 99999 99999</div></div>
    case 'dropdown': return <div style={mb}><div style={lbl}>{b.label}</div><div style={inp}><span>Select...</span><span>▾</span></div></div>
    case 'date':     return <div style={mb}><div style={lbl}>{b.label}</div><div style={inp}><span>DD / MM / YYYY</span><span style={{ fontSize: 9 }}>⬚</span></div></div>
    case 'button':   return <div style={{ background: '#00A884', borderRadius: 16, padding: '7px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 8 }}>{b.label || 'Submit'}</div>
    default:         return null
  }
}

function PhonePreview({ screen }: { screen: Screen }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px 14px' }}>
      <div style={{
        width: 188, background: '#0D1117', borderRadius: 22,
        padding: '8px 4px',
        border: '1px solid #2A3942',
        boxShadow: '0 0 0 4px #161b22, 0 8px 20px rgba(0,0,0,0.5)',
      }}>
        <div style={{ width: 30, height: 3, background: '#2A3942', borderRadius: 2, margin: '0 auto 5px' }} />
        <div style={{ background: '#0B141A', borderRadius: 14, overflow: 'hidden', minHeight: 300 }}>
          <div style={{ background: '#202C33', padding: '7px 9px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: '#00A884',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>B</div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#E9EDEF', lineHeight: 1.2 }}>BizInbox</div>
              <div style={{ fontSize: 7.5, color: '#8696A0' }}>Form · {screen.title}</div>
            </div>
          </div>
          <div style={{ padding: '10px 9px 6px' }}>
            {screen.blocks.length === 0
              ? <div style={{ textAlign: 'center', color: '#8696A0', fontSize: 10, paddingTop: 30 }}>No components yet</div>
              : screen.blocks.map(b => <BlockPreview key={b.id} b={b} />)
            }
          </div>
        </div>
        <div style={{ width: 40, height: 3, background: '#2A3942', borderRadius: 2, margin: '5px auto 0' }} />
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FlowBuilder({
  value,
  onChange,
}: {
  value: Screen[]
  onChange: (val: Screen[]) => void
}) {
  const [selectedScreen, setSelectedScreen] = useState(0)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  const screen = value?.[selectedScreen]
  const selectedBlock =
  screen?.blocks?.find((b) => b.id === selectedBlockId) ?? null

  if (!screen || !Array.isArray(screen.blocks)) {
  return (
    <div style={{ padding: 20, color: 'var(--text-muted)' }}>
      Invalid flow data. Please create or reload flow.
    </div>
  )
}

  // ── Helpers ────────────────────────────────────────────────────────────────
  function updateScreen(updated: Screen) {
    const ns = [...value]
    ns[selectedScreen] = updated
    onChange(ns)
  }

  function addBlock(type: ComponentType) {
    const pal = PALETTE.find(p => p.type === type)!
const newBlock: Block = {
  id: `blk_${Date.now()}`,
  type,
  label: pal.label,

  ...(type === 'button'
    ? {
        action: 'submit'
      }
    : {}),

  ...(type === 'dropdown'
    ? {
        options: [
          { id: 'opt1', title: 'Option 1' },
          { id: 'opt2', title: 'Option 2' }
        ]
      }
    : {})
}
    // Always insert before existing button blocks
    const btns   = screen.blocks.filter(b => b.type === 'button')
    const others  = screen.blocks.filter(b => b.type !== 'button')
    updateScreen({ ...screen, blocks: [...others, newBlock, ...btns] })
    setSelectedBlockId(newBlock.id)
  }

  function removeBlock(id: string) {
    updateScreen({ ...screen, blocks: screen.blocks.filter(b => b.id !== id) })
    if (selectedBlockId === id) setSelectedBlockId(null)
  }

  function moveBlock(id: string, dir: -1 | 1) {
    const blocks = [...screen.blocks]
    const idx = blocks.findIndex(b => b.id === id)
    const target = idx + dir
    if (target < 0 || target >= blocks.length) return
    ;[blocks[idx], blocks[target]] = [blocks[target], blocks[idx]]
    updateScreen({ ...screen, blocks })
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    updateScreen({ ...screen, blocks: screen.blocks.map(b => b.id === id ? { ...b, ...patch } : b) })
  }

  function addOption(blockId: string) {
    const b = screen.blocks.find(x => x.id === blockId)!
    updateBlock(blockId, { options: [...(b.options ?? []), { id: `opt_${Date.now()}`, title: 'New Option' }] })
  }

  function updateOption(blockId: string, optId: string, title: string) {
    const b = screen.blocks.find(x => x.id === blockId)!
    updateBlock(blockId, { options: (b.options ?? []).map(o => o.id === optId ? { ...o, title } : o) })
  }

  function removeOption(blockId: string, optId: string) {
    const b = screen.blocks.find(x => x.id === blockId)!
    updateBlock(blockId, { options: (b.options ?? []).filter(o => o.id !== optId) })
  }

  function deleteScreen(idx: number) {
    const ns = value.filter((_, i) => i !== idx)
    onChange(ns)
    setSelectedScreen(Math.max(0, idx - 1))
    setSelectedBlockId(null)
  }

  // ── Shared style tokens ────────────────────────────────────────────────────
  const fieldInput: React.CSSProperties = {
    width: '100%', background: 'var(--bg-active, #1a2730)',
    border: '1px solid var(--border, #2A3942)', borderRadius: 5,
    padding: '5px 8px', color: 'var(--text, #E9EDEF)',
    fontSize: 11, outline: 'none', boxSizing: 'border-box',
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: 10, color: 'var(--text-muted, #8696A0)', marginBottom: 4,
  }
  const sectionHead: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--text-muted, #8696A0)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>

      {/* ── LEFT — Screens + Palette ──────────────────────────────────────── */}
      <div style={{
        width: 176, borderRight: '1px solid var(--border, #2A3942)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0,
      }}>

        {/* Screen list */}
        <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid var(--border, #2A3942)' }}>
          <div style={sectionHead}>Screens</div>
          {value.map((s, i) => (
            <div
              key={s.id}
              onClick={() => { setSelectedScreen(i); setSelectedBlockId(null) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 7px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                background: selectedScreen === i ? 'var(--bg-active, #005C4B22)' : 'transparent',
                border: `1px solid ${selectedScreen === i ? '#00A884' : 'transparent'}`,
                transition: '.12s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', minWidth: 0 }}>
                {i === 0 && (
                  <span style={{ fontSize: 7, background: '#00A884', color: '#fff', padding: '1px 4px', borderRadius: 3, flexShrink: 0, fontWeight: 700 }}>
                    START
                  </span>
                )}
                <span style={{
                  fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: selectedScreen === i ? '#00A884' : 'var(--text, #E9EDEF)',
                }}>
                  {s.title}
                </span>
              </div>
              {i > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); deleteScreen(i) }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #8696A0)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, flexShrink: 0 }}
                >×</button>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              const ns: Screen = { id: `screen_${Date.now()}`, title: `Screen ${value.length + 1}`, blocks: [] }
              onChange([...value, ns])
              setSelectedScreen(value.length)
              setSelectedBlockId(null)
            }}
            style={{
              width: '100%', marginTop: 5, background: 'transparent',
              border: '1px dashed var(--border, #374045)', borderRadius: 6,
              padding: '5px', color: 'var(--text-muted, #8696A0)',
              cursor: 'pointer', fontSize: 11,
            }}
          >+ Add Screen</button>
        </div>

        {/* Component palette */}
        <div style={{ padding: '10px 10px 8px', flex: 1 }}>
          <div style={sectionHead}>Add Component</div>
          {PALETTE.map(p => (
            <div
              key={p.type}
              onClick={() => addBlock(p.type)}
              title={p.desc}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 6px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                border: '1px solid transparent', transition: '.12s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-active, #1a2730)'
                e.currentTarget.style.borderColor = 'var(--border, #2A3942)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                background: TYPE_COLOR[p.type] + '1A',
                border: `1px solid ${TYPE_COLOR[p.type]}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 700, color: TYPE_COLOR[p.type],
              }}>{p.icon}</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text, #E9EDEF)', lineHeight: 1.2 }}>{p.label}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted, #8696A0)' }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CENTER — Block list + property dock ───────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Screen title bar */}
        <div style={{
          padding: '8px 12px', borderBottom: '1px solid var(--border, #2A3942)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <input
            value={screen.title}
            onChange={e => updateScreen({ ...screen, title: e.target.value })}
            style={{
              flex: 1, background: 'transparent',
              border: '1px solid transparent', borderRadius: 5,
              padding: '3px 7px', color: 'var(--text, #E9EDEF)',
              fontSize: 12, fontWeight: 600, outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = '#00A884')}
            onBlur={e => (e.target.style.borderColor = 'transparent')}
            placeholder="Screen title"
          />
          <span style={{ fontSize: 10, color: 'var(--text-muted, #8696A0)', whiteSpace: 'nowrap' }}>
            {screen.blocks.length} block{screen.blocks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Block list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {screen.blocks.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '36px 16px',
              color: 'var(--text-muted, #8696A0)', fontSize: 11,
              border: '1px dashed var(--border, #2A3942)', borderRadius: 8,
            }}>
              Click a component on the left to add it to this screen
            </div>
          )}

          {screen.blocks.map((b, idx) => {
            const pal = PALETTE.find(p => p.type === b.type)!
            const isSel = selectedBlockId === b.id
            return (
              <div
                key={b.id}
                onClick={() => setSelectedBlockId(isSel ? null : b.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 9px', borderRadius: 7, cursor: 'pointer', marginBottom: 4,
                  background: isSel ? 'var(--bg-active, #005C4B1A)' : 'var(--bg-surface, #161b22)',
                  border: `1px solid ${isSel ? '#00A884' : 'var(--border, #2A3942)'}`,
                  transition: '.12s',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 5, flexShrink: 0,
                  background: TYPE_COLOR[b.type] + '1A',
                  border: `1px solid ${TYPE_COLOR[b.type]}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, color: TYPE_COLOR[b.type],
                }}>{pal?.icon}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, color: TYPE_COLOR[b.type], marginBottom: 1 }}>{pal?.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text, #E9EDEF)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.label || '(unlabeled)'}
                    {b.required && <span style={{ fontSize: 9, color: '#E74C3C', marginLeft: 4 }}>*</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => moveBlock(b.id, -1)} disabled={idx === 0}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #8696A0)', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: 11, padding: '2px 3px', opacity: idx === 0 ? 0.3 : 0.7 }}
                  >↑</button>
                  <button
                    onClick={() => moveBlock(b.id, 1)} disabled={idx === screen.blocks.length - 1}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #8696A0)', cursor: idx === screen.blocks.length - 1 ? 'not-allowed' : 'pointer', fontSize: 11, padding: '2px 3px', opacity: idx === screen.blocks.length - 1 ? 0.3 : 0.7 }}
                  >↓</button>
                  <button
                    onClick={() => removeBlock(b.id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #8696A0)', cursor: 'pointer', fontSize: 14, padding: '2px 3px' }}
                  >×</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Property editor dock — appears when a block is selected */}
        {selectedBlock && (
          <div style={{
            borderTop: '1px solid var(--border, #2A3942)',
            padding: '12px 14px',
            background: 'var(--bg-surface, #0d1117)',
            flexShrink: 0, maxHeight: 240, overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={sectionHead as any}>
                Edit · {PALETTE.find(p => p.type === selectedBlock.type)?.label}
              </div>
              <button
                onClick={() => setSelectedBlockId(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #8696A0)', cursor: 'pointer', fontSize: 14, padding: 0 }}
              >×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* Label / content */}
              <div>
                <div style={fieldLabel}>
                  {selectedBlock.type === 'heading' || selectedBlock.type === 'text' ? 'Text Content' : 'Label'}
                </div>
                <input
                  value={selectedBlock.label ?? ''}
                  onChange={e => updateBlock(selectedBlock.id, { label: e.target.value })}
                  style={fieldInput}
                  placeholder="Enter label"
                />
              </div>

              {selectedBlock.type === 'button' && (
  <div style={{ marginTop: 10 }}>
    <div style={fieldLabel}>Button Action</div>

    <select
      value={selectedBlock.action ?? 'submit'}
      onChange={e =>
        updateBlock(selectedBlock.id, {
          action: e.target.value as 'next' | 'submit'
        })
      }
      style={fieldInput}
    >
      <option value="submit">Submit Flow</option>
      <option value="next">Go To Next Screen</option>
    </select>

    {(selectedBlock.action ?? 'submit') === 'next' && (
      <>
        <div style={{ ...fieldLabel, marginTop: 8 }}>
          Target Screen
        </div>

        <select
          value={selectedBlock.targetScreen ?? ''}
          onChange={e =>
            updateBlock(selectedBlock.id, {
              targetScreen: e.target.value
            })
          }
          style={fieldInput}
        >
          <option value="">Select Screen</option>

          {value.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </>
    )}
  </div>
)}

              {/* Placeholder */}
              {['input', 'email', 'phone'].includes(selectedBlock.type) && (
                <div>
                  <div style={fieldLabel}>Placeholder</div>
                  <input
                    value={selectedBlock.placeholder ?? ''}
                    onChange={e => updateBlock(selectedBlock.id, { placeholder: e.target.value })}
                    style={fieldInput}
                    placeholder="Helper text"
                  />
                </div>
              )}

              {/* Required */}
              {!['heading', 'text', 'button'].includes(selectedBlock.type) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 18 }}>
                  <input
                    type="checkbox"
                    id={`req-${selectedBlock.id}`}
                    checked={selectedBlock.required ?? false}
                    onChange={e => updateBlock(selectedBlock.id, { required: e.target.checked })}
                    style={{ accentColor: '#00A884', cursor: 'pointer', width: 13, height: 13 }}
                  />
                  <label htmlFor={`req-${selectedBlock.id}`} style={{ ...fieldLabel, cursor: 'pointer', marginBottom: 0, userSelect: 'none' }}>
                    Required field
                  </label>
                </div>
              )}
            </div>

            {/* Dropdown options editor */}
            {selectedBlock.type === 'dropdown' && (
              <div style={{ marginTop: 10 }}>
                <div style={{ ...fieldLabel, marginBottom: 6 }}>Options</div>
                {(selectedBlock.options ?? []).map((o, oi) => (
                  <div key={o.id} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted, #8696A0)', width: 16, textAlign: 'right', flexShrink: 0 }}>{oi + 1}.</span>
                    <input
                      value={o.title}
                      onChange={e => updateOption(selectedBlock.id, o.id, e.target.value)}
                      style={{ ...fieldInput, padding: '4px 7px' }}
                      placeholder={`Option ${oi + 1}`}
                    />
                    <button
                      onClick={() => removeOption(selectedBlock.id, o.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #8696A0)', cursor: 'pointer', fontSize: 14, padding: '0 4px', flexShrink: 0 }}
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => addOption(selectedBlock.id)}
                  style={{
                    background: 'transparent', border: '1px dashed var(--border, #374045)',
                    borderRadius: 5, padding: '3px 10px', color: 'var(--text-muted, #8696A0)',
                    cursor: 'pointer', fontSize: 10, marginTop: 2,
                  }}
                >+ Add Option</button>
              </div>
            )}

            {/* Button → next screen selector */}
            {selectedBlock.type === 'button' && value.length > 1 && (
              <div style={{ marginTop: 10 }}>
                <div style={fieldLabel}>Navigate to Screen</div>
                <select
                  value={screen.nextScreen ?? ''}
                  onChange={e => updateScreen({ ...screen, nextScreen: e.target.value || undefined })}
                  style={{ ...fieldInput, cursor: 'pointer' } as any}
                >
                  <option value="">— Complete Flow —</option>
                  {value.filter((_, i) => i !== selectedScreen).map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT — Phone Preview ─────────────────────────────────────────── */}
      <div style={{
        width: 224, borderLeft: '1px solid var(--border, #2A3942)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0,
      }}>
        <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid var(--border, #2A3942)', ...sectionHead as any }}>
          Preview
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <PhonePreview screen={screen} />
        </div>
      </div>
    </div>
  )
}