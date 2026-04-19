'use client'
import { useState } from 'react'

type ComponentType =
  | 'heading'
  | 'text'
  | 'input'
  | 'email'
  | 'phone'
  | 'dropdown'
  | 'date'
  | 'button'

interface Block {
  id: string
  type: ComponentType
  label?: string
  value?: string
  required?: boolean
  options?: { id: string; title: string }[]
}

interface Screen {
  id: string
  title: string
  blocks: Block[]
}

export default function FlowBuilder({
  value,
  onChange,
}: {
  value: Screen[]
  onChange: (val: Screen[]) => void
}) {
  const [selectedScreen, setSelectedScreen] = useState(0)

  function updateScreen(updated: Screen) {
    const newScreens = [...value]
    newScreens[selectedScreen] = updated
    onChange(newScreens)
  }

  function addBlock(type: ComponentType) {
    const screen = value[selectedScreen]
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      label: type.toUpperCase(),
    }
    updateScreen({ ...screen, blocks: [...screen.blocks, newBlock] })
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      
      {/* LEFT PANEL — Screens */}
      <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: 10 }}>
        {value.map((s, i) => (
          <div
            key={s.id}
            onClick={() => setSelectedScreen(i)}
            style={{
              padding: 8,
              cursor: 'pointer',
              background: selectedScreen === i ? 'var(--bg-active)' : 'transparent',
            }}
          >
            {s.title}
          </div>
        ))}
        <button
          onClick={() =>
            onChange([
              ...value,
              { id: `screen_${Date.now()}`, title: 'New Screen', blocks: [] },
            ])
          }
        >
          + Add Screen
        </button>
      </div>

      {/* CENTER — Editor */}
      <div style={{ flex: 1, padding: 16 }}>
        <h3>{value[selectedScreen].title}</h3>

        {value[selectedScreen].blocks.map((b) => (
          <div key={b.id} style={{ marginBottom: 10 }}>
            <input
              value={b.label}
              onChange={(e) => {
                const updated = value[selectedScreen].blocks.map((blk) =>
                  blk.id === b.id ? { ...blk, label: e.target.value } : blk
                )
                updateScreen({ ...value[selectedScreen], blocks: updated })
              }}
            />
          </div>
        ))}

        <div style={{ marginTop: 20 }}>
          <button onClick={() => addBlock('heading')}>+ Heading</button>
          <button onClick={() => addBlock('text')}>+ Text</button>
          <button onClick={() => addBlock('input')}>+ Input</button>
          <button onClick={() => addBlock('phone')}>+ Phone</button>
          <button onClick={() => addBlock('email')}>+ Email</button>
          <button onClick={() => addBlock('dropdown')}>+ Dropdown</button>
          <button onClick={() => addBlock('date')}>+ Date</button>
          <button onClick={() => addBlock('button')}>+ Button</button>
        </div>
      </div>

      {/* RIGHT — Preview */}
      <div style={{ width: 260, borderLeft: '1px solid var(--border)', padding: 16 }}>
        <h4>Preview</h4>
        {value[selectedScreen].blocks.map((b) => (
          <div key={b.id} style={{ marginBottom: 10 }}>
            {b.type === 'heading' && <h3>{b.label}</h3>}
            {b.type === 'text' && <p>{b.label}</p>}
            {['input', 'email', 'phone'].includes(b.type) && (
              <input placeholder={b.label} />
            )}
            {b.type === 'button' && <button>{b.label}</button>}
          </div>
        ))}
      </div>
    </div>
  )
}