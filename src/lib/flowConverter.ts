export function convertToMetaJSON(screens: any[]) {
  return {
    version: '6.1',
    screens: screens.map((screen, i) => ({
      id: screen.id,
      title: screen.title,
      terminal: i === screens.length - 1,
      success: i === screens.length - 1,
      layout: {
        type: 'SingleColumnLayout',
        children: screen.blocks.map((b: any) => {
          switch (b.type) {
            case 'heading':
              return { type: 'TextHeading', text: b.label }

            case 'text':
              return { type: 'TextBody', text: b.label }

            case 'input':
              return {
                type: 'TextInput',
                label: b.label,
                name: b.id,
              }

            case 'phone':
              return {
                type: 'TextInput',
                label: b.label,
                name: b.id,
                'input-type': 'phone',
              }

            case 'email':
              return {
                type: 'TextInput',
                label: b.label,
                name: b.id,
                'input-type': 'email',
              }

            case 'dropdown':
              return {
                type: 'Dropdown',
                label: b.label,
                name: b.id,
                'data-source': b.options || [],
              }

            case 'date':
              return {
                type: 'DatePicker',
                label: b.label,
                name: b.id,
              }

            case 'button':
              return {
                type: 'Footer',
                label: b.label,
                'on-click-action': { name: 'complete', payload: {} },
              }

            default:
              return null
          }
        }),
      },
    })),
  }
}