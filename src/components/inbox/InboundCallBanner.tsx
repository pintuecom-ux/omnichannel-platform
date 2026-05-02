'use client'
/**
 * src/components/inbox/InboundCallBanner.tsx
 *
 * Shown as a fixed bottom-right toast when an inbound WhatsApp call arrives.
 * Uses the existing useWhatsAppCall hook for WebRTC / answer / terminate.
 * Matches the inline-style pattern used throughout this codebase (no Tailwind).
 */

import { useEffect, useRef, useState } from 'react'
import type { InboundCallPayload } from '@/hooks/useInboundCall'
import { createClient } from '@/lib/supabase/client'

interface Props {
  call:      InboundCallPayload
  onDismiss: () => void
}

function fmtDur(s: number): string {
  const m   = Math.floor(s / 60)
  const sec = String(s % 60).padStart(2, '0')
  return `${String(m).padStart(2, '0')}:${sec}`
}

export default function InboundCallBanner({ call, onDismiss }: Props) {
  const [phase,    setPhase]    = useState<'ringing' | 'connected' | 'ended'>('ringing')
  const [duration, setDuration] = useState(0)
  const [isMuted,  setIsMuted]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const pcRef           = useRef<RTCPeerConnection | null>(null)
  const localStreamRef  = useRef<MediaStream | null>(null)
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const remoteAudioRef  = useRef<HTMLAudioElement | null>(null)

  // Play ringtone while ringing
  useEffect(() => {
    if (phase !== 'ringing') return
    // Use a repeating beep pattern via AudioContext (no file dependency)
    let stopped = false
    const ctx   = new AudioContext()
    const beep  = () => {
      if (stopped) return
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 440
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
      setTimeout(beep, 2000)
    }
    beep()
    return () => { stopped = true; ctx.close().catch(() => {}) }
  }, [phase])

  // Duration timer
  useEffect(() => {
    if (phase === 'connected') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current)
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause()
      remoteAudioRef.current.srcObject = null
    }
  }

  async function acceptCall() {
    setError(null)
    try {
      // 1. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      })
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      pc.ontrack = (ev) => {
        const [rs] = ev.streams
        if (rs) {
          const audio = new Audio()
          audio.srcObject = rs
          audio.autoplay  = true
          remoteAudioRef.current = audio
          audio.play().catch(() => {})
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setPhase('connected')
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
          setError('Connection lost')
          setPhase('ended')
        }
      }

      let answerSdp = ''

      if (call.sdp && call.sdp_type === 'offer') {
        // We have the SDP offer from the webhook — do proper WebRTC negotiation
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: call.sdp }))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        // Wait for ICE gathering (max 5s)
        await new Promise<void>(resolve => {
          if (pc.iceGatheringState === 'complete') { resolve(); return }
          const t = setTimeout(resolve, 5000)
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve() }
          }
        })

        answerSdp = pc.localDescription?.sdp ?? ''
      }

      // 3. Tell WhatsApp API we're accepting
      const res  = await fetch('/api/whatsapp/calls', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:          'accept',
          call_id:         call.call_id,
          conversation_id: call.conversation_id,
          sdp_answer:      answerSdp,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Accept failed')

      // If no SDP offer in webhook, state becomes connected when ICE resolves
      if (!call.sdp) setPhase('connected')

    } catch (e: any) {
      console.error('[InboundCallBanner] accept error:', e)
      setError(e.message)
      cleanup()
    }
  }

  async function rejectCall() {
    await fetch('/api/whatsapp/calls', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:          'reject',
        call_id:         call.call_id,
        conversation_id: call.conversation_id,
      }),
    }).catch(() => {})
    cleanup()
    onDismiss()
  }

  async function endCall() {
    await fetch('/api/whatsapp/calls', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:          'terminate',
        call_id:         call.call_id,
        conversation_id: call.conversation_id,
      }),
    }).catch(() => {})
    cleanup()
    setPhase('ended')
    setTimeout(onDismiss, 1500)
  }

  function toggleMute() {
    if (!localStreamRef.current) return
    const next = !isMuted
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next })
    setIsMuted(next)
  }

  const initials = call.contact_name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <>
      <style>{`
        @keyframes wa-banner-slide {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes wa-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,211,102,0.5); }
          50%       { box-shadow: 0 0 0 12px rgba(37,211,102,0); }
        }
      `}</style>

      <div style={{
        position:      'fixed',
        bottom:         24,
        right:          24,
        zIndex:         10000,
        width:          320,
        borderRadius:   20,
        background:     phase === 'connected'
          ? 'linear-gradient(145deg, #075e54 0%, #128c7e 100%)'
          : phase === 'ended'
          ? 'linear-gradient(145deg, #1f2937 0%, #111827 100%)'
          : 'linear-gradient(145deg, #1a2a2a 0%, #0d1f1c 100%)',
        border:         '1px solid rgba(255,255,255,0.1)',
        boxShadow:      '0 20px 60px rgba(0,0,0,0.6)',
        overflow:       'hidden',
        animation:      'wa-banner-slide 0.3s ease',
        transition:     'background 0.5s ease',
      }}>
        {/* Top indicator bar */}
        <div style={{
          background:  phase === 'connected' ? 'rgba(37,211,102,0.2)' : 'rgba(255,255,255,0.05)',
          padding:     '8px 16px',
          fontSize:     11,
          color:        phase === 'connected' ? '#86efac' : 'rgba(255,255,255,0.5)',
          fontWeight:   600,
          display:     'flex',
          alignItems:  'center',
          gap:          6,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background:  phase === 'connected' ? '#22c55e' : '#f59e0b',
            display:    'inline-block',
            animation:   phase === 'ringing' ? 'wa-ring-pulse 1.5s infinite' : 'none',
          }} />
          {phase === 'ringing'   && 'Incoming WhatsApp Call'}
          {phase === 'connected' && 'In Call'}
          {phase === 'ended'     && 'Call Ended'}
        </div>

        {/* Contact info */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width:          52, height: 52, borderRadius: '50%',
            background:     'rgba(255,255,255,0.15)',
            border:         '2px solid rgba(255,255,255,0.3)',
            display:        'flex', alignItems: 'center', justifyContent: 'center',
            fontSize:        20, fontWeight: 700, color: '#fff',
            flexShrink:      0,
            animation:       phase === 'ringing' ? 'wa-ring-pulse 1.5s infinite' : 'none',
          }}>
            {initials || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {call.contact_name}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              +{call.from_phone}
            </div>
            {phase === 'connected' && (
              <div style={{ fontSize: 13, color: '#86efac', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                {fmtDur(duration)}
              </div>
            )}
            {error && (
              <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 3 }}>{error}</div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding: '4px 20px 20px', display: 'flex', gap: 10 }}>
          {phase === 'ringing' && (
            <>
              {/* Decline */}
              <button
                onClick={rejectCall}
                style={{
                  flex: 1, padding: '11px 0',
                  borderRadius: 14, border: 'none',
                  background: '#ef4444',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A2 2 0 0 1 10.68 13.31z"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                Decline
              </button>
              {/* Accept */}
              <button
                onClick={acceptCall}
                style={{
                  flex: 1, padding: '11px 0',
                  borderRadius: 14, border: 'none',
                  background: '#25d366',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 15a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 4.18L6.6 4a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 11.56a16 16 0 0 0 6.15 6.15z"/>
                </svg>
                Accept
              </button>
            </>
          )}

          {phase === 'connected' && (
            <>
              {/* Mute */}
              <button
                onClick={toggleMute}
                style={{
                  width: 44, height: 44, borderRadius: '50%', border: 'none',
                  background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.15)',
                  color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isMuted ? (
                    <>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </>
                  ) : (
                    <>
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </>
                  )}
                </svg>
              </button>

              {/* End call */}
              <button
                onClick={endCall}
                style={{
                  flex: 1, padding: '11px 0',
                  borderRadius: 14, border: 'none',
                  background: '#ef4444',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A2 2 0 0 1 10.68 13.31z"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                End Call
              </button>
            </>
          )}

          {phase === 'ended' && (
            <div style={{ width: '100%', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)', padding: '4px 0' }}>
              Call ended
            </div>
          )}
        </div>

        {/* WhatsApp branding */}
        <div style={{ paddingBottom: 14, display: 'flex', justifyContent: 'center', gap: 5, color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" opacity={0.6}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.552 4.11 1.518 5.837L.057 23.88l6.204-1.628A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.032-1.383l-.36-.214-3.732.979.997-3.648-.234-.374A9.818 9.818 0 1 1 12 21.818z"/>
          </svg>
          WhatsApp Call
        </div>
      </div>
    </>
  )
}