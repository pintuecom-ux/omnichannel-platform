import React, { useRef, useState } from 'react'

export function AudioPlayer({ url, isOut }: { url: string; isOut: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing,  setPlaying]  = useState(false)
  const [duration, setDuration] = useState(0)
  const [current,  setCurrent]  = useState(0)

  function fmt(v: number) {
    const m = Math.floor(v / 60)
    const s = Math.floor(v % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  function toggle() {
    const el = ref.current
    if (!el) return
    if (el.paused) { el.play(); setPlaying(true) }
    else           { el.pause(); setPlaying(false) }
  }

  const progress = duration ? (current / duration) * 100 : 0

  return (
    <div style={{ display: 'flex', gap: 10, minWidth: 220, alignItems: 'center' }}>
      <audio
        ref={ref}
        src={url}
        style={{ display: 'none' }}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
        onTimeUpdate={(e) => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onEnded={() => setPlaying(false)}
      />

      <button
        onClick={toggle}
        style={{
          width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: isOut ? 'rgba(37,211,102,.2)' : 'rgba(255,255,255,.1)',
          color: isOut ? 'var(--accent)' : '#fff',
        }}
      >
        {playing ? '❚❚' : '▶'}
      </button>

      <div style={{ flex: 1 }}>
        <div
          onClick={(e) => {
            const el = ref.current
            if (!el || !duration) return
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            el.currentTime = ratio * duration
          }}
          style={{ height: 4, borderRadius: 2, cursor: 'pointer', position: 'relative', background: 'rgba(255,255,255,.15)' }}
        >
          <div style={{ position: 'absolute', inset: 0, width: `${progress}%`, background: playing ? 'var(--accent)' : 'rgba(255,255,255,.5)' }} />
        </div>

        <div style={{ fontSize: 10, marginTop: 3, color: 'rgba(255,255,255,.5)' }}>
          {playing ? fmt(current) : fmt(duration)} voice message
        </div>
      </div>
    </div>
  )
}
