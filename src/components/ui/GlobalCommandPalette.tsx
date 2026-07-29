'use client'

import React, { useState, useEffect } from 'react'
import { CommandPalette } from './CommandPalette'

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return <CommandPalette open={open} onOpenChange={setOpen} />
}
