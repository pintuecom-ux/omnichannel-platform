/**
 * src/hooks/useWhatsAppCall.ts
 *
 * React hook that orchestrates a complete WhatsApp WebRTC voice call session.
 *
 * Flow:
 *  1. checkPermission()      → GET /api/whatsapp/calls?conversation_id=
 *  2. requestPermission()    → POST { action: "request_permission" }
 *  3. startCall()            → creates RTCPeerConnection, generates SDP offer,
 *                              POSTs { action: "initiate", sdp_offer }
 *                              subscribes to Supabase Realtime for SDP answer
 *  4. [webhook fires]        → SDP answer arrives via Realtime broadcast
 *  5. endCall()              → POST { action: "terminate", call_id }
 *                              closes RTCPeerConnection + Realtime subscription
 *
 * State machine:
 *   idle → checking → permission_required → requesting_permission
 *        → connecting → ringing → connected → ending → idle
 *        → error (at any stage)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────
export type CallState =
  | 'idle'
  | 'checking'
  | 'permission_required'
  | 'requesting_permission'
  | 'connecting'
  | 'ringing'
  | 'connected'
  | 'ending'
  | 'error'

export interface CallPermission {
  status: 'granted' | 'pending' | 'denied' | 'expired'
  can_call: boolean
  can_request: boolean
}

export interface UseWhatsAppCallReturn {
  callState:          CallState
  callId:             string | null
  permission:         CallPermission | null
  duration:           number          // seconds, increments when connected
  isMuted:            boolean
  error:              string | null
  checkPermission:    () => Promise<void>
  requestPermission:  () => Promise<void>
  startCall:          () => Promise<void>
  endCall:            () => Promise<void>
  toggleMute:         () => void
  reset:              () => void
}

// ── STUN servers (Google's free STUN — suitable for most deployments) ─────────
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useWhatsAppCall(conversationId: string | null): UseWhatsAppCallReturn {
  const [callState,  setCallState]  = useState<CallState>('idle')
  const [callId,     setCallId]     = useState<string | null>(null)
  const [permission, setPermission] = useState<CallPermission | null>(null)
  const [duration,   setDuration]   = useState(0)
  const [isMuted,    setIsMuted]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Refs — not reactive, used internally
  const pcRef             = useRef<RTCPeerConnection | null>(null)
  const localStreamRef    = useRef<MediaStream | null>(null)
  const realtimeChannelRef = useRef<ReturnType<typeof createClient>['channel'] extends (...args: any[]) => infer R ? R : any | null>(null)
  const durationTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const callIdRef         = useRef<string | null>(null)

  // Keep callIdRef in sync
  useEffect(() => { callIdRef.current = callId }, [callId])

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanupResources()
    }
  }, [])

  // ── Duration timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'connected') {
      setDuration(0)
      durationTimerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
        durationTimerRef.current = null
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    }
  }, [callState])

  // ── Internal helpers ─────────────────────────────────────────────────────
  function cleanupResources() {
    // Close RTCPeerConnection
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }

    // Stop local mic stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }

    // Unsubscribe from Realtime
    if (realtimeChannelRef.current) {
      const supabase = createClient()
      supabase.removeChannel(realtimeChannelRef.current as any)
      realtimeChannelRef.current = null
    }

    // Clear duration timer
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
  }

  function setErr(msg: string) {
    console.error('[useWhatsAppCall] Error:', msg)
    setError(msg)
    setCallState('error')
    cleanupResources()
  }

  // ── Subscribe to Supabase Realtime for SDP answer ────────────────────────
  function subscribeToCallEvents(newCallId: string) {
    const supabase = createClient()

    const channel = supabase.channel(`call:${newCallId}`, {
      config: { broadcast: { ack: false } },
    })

    channel
      .on('broadcast', { event: 'sdp_answer' }, async ({ payload }) => {
        console.log('[useWhatsAppCall] SDP answer received from webhook relay')
        if (!pcRef.current) return

        try {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription({ type: payload.sdp_type, sdp: payload.sdp })
          )
          console.log('[useWhatsAppCall] Remote description set ✅')
          setCallState('ringing')
        } catch (e: any) {
          setErr(`Failed to set remote description: ${e.message}`)
        }
      })
      .subscribe(status => {
        console.log(`[useWhatsAppCall] Realtime subscription status: ${status}`)
      })

    realtimeChannelRef.current = channel as any
  }

  // ── checkPermission ──────────────────────────────────────────────────────
  const checkPermission = useCallback(async () => {
    if (!conversationId) return
    setCallState('checking')
    setError(null)

    try {
      const res = await fetch(`/api/whatsapp/calls?conversation_id=${conversationId}`)
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'calling_not_enabled') {
          setErr('WhatsApp Calling is not enabled for this channel. Contact your admin.')
          return
        }
        setErr(data.error ?? 'Failed to check call permission')
        return
      }

      const perm = data.permission
      const canCall    = perm?.actions?.find((a: any) => a.action_name === 'start_call')?.can_perform_action ?? false
      const canRequest = perm?.actions?.find((a: any) => a.action_name === 'send_call_permission_request')?.can_perform_action ?? false

      const parsed: CallPermission = {
        status:      perm?.status ?? 'denied',
        can_call:    canCall,
        can_request: canRequest,
      }

      setPermission(parsed)
      setCallState(canCall ? 'idle' : 'permission_required')
    } catch (e: any) {
      setErr(e.message)
    }
  }, [conversationId])

  // ── requestPermission ────────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (!conversationId) return
    setCallState('requesting_permission')
    setError(null)

    try {
      const res = await fetch('/api/whatsapp/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_permission', conversation_id: conversationId }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setErr(data.error ?? 'Failed to send permission request')
        return
      }

      // Permission request sent — go back to idle with a note
      setCallState('permission_required')
      setPermission(prev => prev ? { ...prev, status: 'pending' } : null)
    } catch (e: any) {
      setErr(e.message)
    }
  }, [conversationId])

  // ── startCall ────────────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (!conversationId) return
    setCallState('connecting')
    setError(null)
    setDuration(0)

    // 1. Request microphone access
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
    } catch (e: any) {
      const msg = e.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access and try again.'
        : `Microphone error: ${e.message}`
      setErr(msg)
      return
    }

    // 2. Create RTCPeerConnection
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc

    // Add local audio tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    // Handle remote audio track (play the other person's voice)
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (remoteStream) {
        const audio = new Audio()
        audio.srcObject = remoteStream
        audio.autoplay  = true
        // Store on window temporarily so it doesn't get GC'd
        ;(window as any).__waCallAudio = audio
        audio.play().catch(e => console.warn('[useWhatsAppCall] Audio play:', e))
      }
    }

    // ICE state changes
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      console.log('[useWhatsAppCall] ICE state:', state)
      if (state === 'connected' || state === 'completed') {
        setCallState('connected')
      } else if (state === 'failed' || state === 'closed') {
        if (callState !== 'ending' && callState !== 'idle') {
          setErr('Call connection lost')
        }
      } else if (state === 'disconnected') {
        console.warn('[useWhatsAppCall] ICE disconnected — may reconnect')
      }
    }

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[useWhatsAppCall] Connection state:', pc.connectionState)
    }

    // 3. Create SDP offer
    let offer: RTCSessionDescriptionInit
    try {
      offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)
    } catch (e: any) {
      setErr(`Failed to create SDP offer: ${e.message}`)
      return
    }

    // 4. Wait for ICE gathering to complete (max 3s)
    await new Promise<void>(resolve => {
      if (pc.iceGatheringState === 'complete') { resolve(); return }
      const timeout = setTimeout(resolve, 3000)
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout)
          resolve()
        }
      }
    })

    const sdpOffer = pc.localDescription?.sdp
    if (!sdpOffer) {
      setErr('Failed to gather ICE candidates')
      return
    }

    // 5. Send SDP offer to Meta via our API
    try {
      const res = await fetch('/api/whatsapp/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:          'initiate',
          conversation_id: conversationId,
          sdp_offer:       sdpOffer,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setErr(data.error ?? data.message ?? 'Failed to initiate call')
        return
      }

      const newCallId = data.call_id
      setCallId(newCallId)

      // 6. Subscribe to Realtime to receive the SDP answer
      subscribeToCallEvents(newCallId)

      console.log(`[useWhatsAppCall] Call initiated ✅  call_id: ${newCallId}`)
    } catch (e: any) {
      setErr(`Failed to initiate call: ${e.message}`)
    }
  }, [conversationId, callState])

  // ── endCall ──────────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    const activeCallId = callIdRef.current
    setCallState('ending')

    if (activeCallId) {
      try {
        await fetch('/api/whatsapp/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action:          'terminate',
            conversation_id: conversationId,
            call_id:         activeCallId,
          }),
        })
      } catch (e: any) {
        console.warn('[useWhatsAppCall] endCall API error (non-critical):', e.message)
      }
    }

    // Clean up audio element
    const audio = (window as any).__waCallAudio
    if (audio) {
      audio.pause()
      audio.srcObject = null
      delete (window as any).__waCallAudio
    }

    cleanupResources()
    setCallId(null)
    setCallState('idle')
    setDuration(0)
    setIsMuted(false)
    setError(null)
  }, [conversationId])

  // ── toggleMute ───────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const newMuted = !isMuted
    stream.getAudioTracks().forEach(t => { t.enabled = !newMuted })
    setIsMuted(newMuted)
  }, [isMuted])

  // ── reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    cleanupResources()
    setCallState('idle')
    setCallId(null)
    setPermission(null)
    setDuration(0)
    setIsMuted(false)
    setError(null)
  }, [])

  return {
    callState,
    callId,
    permission,
    duration,
    isMuted,
    error,
    checkPermission,
    requestPermission,
    startCall,
    endCall,
    toggleMute,
    reset,
  }
}
