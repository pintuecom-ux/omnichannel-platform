/* eslint-disable @typescript-eslint/no-explicit-any */

const NUM_WORDS: Record<string, string> = {
  '0': 'ZERO', '1': 'ONE', '2': 'TWO', '3': 'THREE', '4': 'FOUR',
  '5': 'FIVE', '6': 'SIX', '7': 'SEVEN', '8': 'EIGHT', '9': 'NINE'
}

/**
 * Sanitizes screen and component IDs to strictly satisfy Meta WhatsApp Flow Schema.
 * Meta Rule: Property 'id' / screen names MUST consist ONLY of alphabets and underscores (^[a-zA-Z_]+$).
 */
export function sanitizeId(raw: string, fallback = 'SCREEN_STEP'): string {
  if (!raw || typeof raw !== 'string') return fallback
  let clean = raw.replace(/\d/g, m => `_${NUM_WORDS[m] || 'X'}_`)
  clean = clean.replace(/[^a-zA-Z_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
  if (!clean || !/^[a-zA-Z_]+$/.test(clean)) {
    return fallback
  }
  return clean.toUpperCase()
}

/**
 * Converts internal FlowBuilder screen structures into 100% Meta Schema v6.1 compliant Flow JSON.
 */
export function convertToMetaJSON(screens: any[]) {
  if (!Array.isArray(screens) || screens.length === 0) {
    return {
      version: '6.1',
      screens: [{
        id: 'WELCOME',
        title: 'Welcome',
        terminal: true,
        success: true,
        data: {},
        layout: {
          type: 'SingleColumnLayout',
          children: [{
            type: 'Form',
            name: 'form',
            children: [
              { type: 'TextHeading', text: 'Welcome' },
              { type: 'Footer', label: 'Submit', 'on-click-action': { name: 'complete', payload: {} } }
            ]
          }]
        }
      }]
    }
  }

  const waScreens = screens.map((screen, i) => {
    const isTerminal = i === screens.length - 1
    const rawId = screen.id || (i === 0 ? 'WELCOME' : `SCREEN_${i + 1}`)
    const screenId = sanitizeId(rawId, `SCREEN_${i + 1}`)

    const nextRawId = screen.nextScreen || screens[i + 1]?.id
    const nextScreenId = nextRawId ? sanitizeId(nextRawId, `SCREEN_${i + 2}`) : null

    const formChildren: any[] = []

    const blocks = Array.isArray(screen.blocks) ? screen.blocks : []

    blocks.forEach((b: any, bIdx: number) => {
      const fieldName = b.id ? b.id.replace(/[^a-zA-Z0-9_]/g, '_') : `field_${bIdx}`

      switch (b.type) {
        case 'heading':
          formChildren.push({ type: 'TextHeading', text: b.label || 'Heading' })
          break

        case 'text':
          formChildren.push({ type: 'TextBody', text: b.label || 'Body text' })
          break

        case 'input':
        case 'phone':
        case 'email':
          formChildren.push({
            type: 'TextInput',
            label: b.label || 'Input',
            name: fieldName,
            required: b.required ?? false,
            'input-type': b.type === 'email' ? 'email' : b.type === 'phone' ? 'phone' : 'text',
            ...(b.placeholder ? { 'helper-text': b.placeholder } : {})
          })
          break

        case 'dropdown':
          formChildren.push({
            type: 'Dropdown',
            label: b.label || 'Select option',
            name: fieldName,
            required: b.required ?? false,
            'data-source': Array.isArray(b.options)
              ? b.options.map((o: any, oIdx: number) => ({
                  id: o.id ? String(o.id).replace(/[^a-zA-Z0-9_]/g, '_') : `opt_${oIdx}`,
                  title: o.title || `Option ${oIdx + 1}`
                }))
              : []
          })
          break

        case 'date':
          formChildren.push({
            type: 'DatePicker',
            label: b.label || 'Select date',
            name: fieldName,
            required: b.required ?? false
          })
          break

        case 'button':
          formChildren.push({
            type: 'Footer',
            label: b.label || (isTerminal ? 'Submit' : 'Next'),
            'on-click-action': !isTerminal && nextScreenId
              ? { name: 'navigate', next: { type: 'screen', name: nextScreenId }, payload: {} }
              : { name: 'complete', payload: {} }
          })
          break

        default:
          break
      }
    })

    // Guarantee Footer button exists on every screen
    if (!blocks.some((b: any) => b.type === 'button')) {
      formChildren.push({
        type: 'Footer',
        label: !isTerminal ? 'Next' : 'Submit',
        'on-click-action': !isTerminal && nextScreenId
          ? { name: 'navigate', next: { type: 'screen', name: nextScreenId }, payload: {} }
          : { name: 'complete', payload: {} }
      })
    }

    const screenObj: any = {
      id: screenId,
      title: screen.title || screenId,
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children: [{
          type: 'Form',
          name: 'form',
          children: formChildren
        }]
      }
    }

    // Meta Schema Rule: 'terminal' and 'success' MUST ONLY be present on terminal screens!
    if (isTerminal) {
      screenObj.terminal = true
      screenObj.success = true
    } else {
      screenObj.terminal = false
      // CRITICAL FIX: Do NOT set 'success' property on non-terminal screens!
    }

    return screenObj
  })

  return {
    version: '6.1',
    screens: waScreens
  }
}