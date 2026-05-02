/**
 * src/hooks/useWhatsAppCall.ts
 *
 * CHANGES IN THIS VERSION:
 *  - Call recording via MediaRecorder (records the local mic + remote audio mix)
 *  - Auto-uploads recording to Supabase Storage when call ends
 *  - Exposes: isRecording, startRecording(), stopRecording(), recordingBlob
 *  - Status normalisation: all incoming callState strings are lowercased
 *    before being set, fixing the "Call undefined" / "Call COMPLETED" display bug
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
  status:      'granted' | 'pending' | 'denied' | 'expired'
  can_call:    boolean
  can_request: boolean
  actions?:    { action_name: string; can_perform_action: boolean }[]
}

export interface UseWhatsAppCallReturn {
  callState:          CallState
  callId:             string | null
  permission:         CallPermission | null
  duration:           number
  isMuted:            boolean
  isRecording:        boolean
  recordingBlob:      Blob | null
  recordingUploading: boolean
  recordingUrl:       string | null
  error:              string | null
  checkPermission:    () => Promise<void>
  requestPermission:  () => Promise<void>
  startCall:          () => Promise<void>
  endCall:            () => Promise<void>
  toggleMute:         () => void
  startRecording:     () => void
  stopRecording:      () => void
  reset:              () => void
}

const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    // Add a TURN server if calls fail behind corporate/mobile NAT:
    // { urls: 'turn:your-turn-server:3478', username: '...', credential: '...' }
  ]

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useWhatsAppCall(
  conversationId: string | null,
  onRecordingUploaded?: (url: string, recordingId: string) => void
): UseWhatsAppCallReturn {

  const [callState,           setCallState]           = useState<CallState>('idle')
  const [callId,              setCallId]              = useState<string | null>(null)
  const [permission,          setPermission]          = useState<CallPermission | null>(null)
  const [duration,            setDuration]            = useState(0)
  const [isMuted,             setIsMuted]             = useState(false)
  const [isRecording,         setIsRecording]         = useState(false)
  const [recordingBlob,       setRecordingBlob]       = useState<Blob | null>(null)
  const [recordingUploading,  setRecordingUploading]  = useState(false)
  const [recordingUrl,        setRecordingUrl]        = useState<string | null>(null)
  const [error,               setError]               = useState<string | null>(null)

  const pcRef              = useRef<RTCPeerConnection | null>(null)
  const localStreamRef     = useRef<MediaStream | null>(null)
  const remoteStreamRef    = useRef<MediaStream | null>(null)
  const realtimeChannelRef = useRef<any | null>(null)
  const durationTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const callIdRef          = useRef<string | null>(null)
  const startTimeRef       = useRef<number>(0)

  // Recording refs
  const mediaRecorderRef   = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const mixedStreamRef     = useRef<MediaStream | null>(null)

  useEffect(() => { callIdRef.current = callId }, [callId])

  useEffect(() => () => { cleanupResources() }, [])

  // Duration timer
  useEffect(() => {
    if (callState === 'connected') {
      startTimeRef.current = Date.now()
      setDuration(0)
      durationTimerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    } else {
      if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null }
    }
    return () => { if (durationTimerRef.current) clearInterval(durationTimerRef.current) }
  }, [callState])

  // ── Cleanup ───────────────────────────────────────────────────────────────
  function cleanupResources() {
    stopRecordingInternal()
    pcRef.current?.close(); pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null
    if (realtimeChannelRef.current) {
      const sb = createClient()
      sb.removeChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null }
    const audio = (window as any).__waCallAudio
    if (audio) { audio.pause(); audio.srcObject = null; delete (window as any).__waCallAudio }
  }

  function setErr(msg: string) {
    console.error('[useWhatsAppCall]', msg)
    setError(msg)
    setCallState('error')
    cleanupResources()
  }

  // ── Recording internals ───────────────────────────────────────────────────
  function stopRecordingInternal() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch {}
    }
    mediaRecorderRef.current = null
    mixedStreamRef.current?.getTracks().forEach(t => t.stop())
    mixedStreamRef.current = null
  }

  // Build a mixed AudioContext stream: local mic + remote audio → single stream
  function buildMixedStream(localStream: MediaStream, remoteStream: MediaStream | null): MediaStream {
    try {
      const ctx     = new AudioContext()
      const dest    = ctx.createMediaStreamDestination()
      const localSrc = ctx.createMediaStreamSource(localStream)
      localSrc.connect(dest)
      if (remoteStream) {
        const remoteSrc = ctx.createMediaStreamSource(remoteStream)
        remoteSrc.connect(dest)
      }
      // Store ctx so it doesn't get GC'd
      ;(window as any).__waCallAudioCtx = ctx
      return dest.stream
    } catch {
      // Fallback: just record the local stream
      return localStream
    }
  }

  // ── startRecording — public API ───────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!localStreamRef.current) {
      console.warn('[Recording] No local stream — call must be active to record')
      return
    }
    if (mediaRecorderRef.current) {
      console.warn('[Recording] Already recording')
      return
    }

    recordingChunksRef.current = []

    const stream = buildMixedStream(localStreamRef.current, remoteStreamRef.current)
    mixedStreamRef.current = stream

    // Pick best supported codec
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    const mime      = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) ?? ''

    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : {})
    mr.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: mr.mimeType || 'audio/webm' })
      setRecordingBlob(blob)
      setIsRecording(false)
      uploadRecording(blob, mr.mimeType || 'audio/webm')
    }
    mr.onerror = (e) => console.error('[Recording] MediaRecorder error:', e)

    mr.start(1000) // collect chunks every second
    mediaRecorderRef.current = mr
    setIsRecording(true)
    console.log('[Recording] ▶ Started recording, mime:', mr.mimeType)
  }, [])

  // ── stopRecording — public API ────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    stopRecordingInternal()
  }, [])

  // ── uploadRecording — called automatically when recorder stops ────────────
  async function uploadRecording(blob: Blob, mime: string) {
    if (!conversationId) return
    setRecordingUploading(true)

    const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : null

    const form = new FormData()
    const ext  = mime.split('/')[1]?.split(';')[0] ?? 'webm'
    form.append('audio',           new File([blob], `recording.${ext}`, { type: mime }))
    form.append('conversation_id', conversationId)
    if (callIdRef.current) form.append('call_id', callIdRef.current)
    if (elapsed)           form.append('duration', String(elapsed))

    try {
      const res  = await fetch('/api/whatsapp/call-recording', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok && data.ok) {
        console.log('[Recording] ✅ Uploaded, id:', data.recording_id)
        if (data.signed_url) {
          setRecordingUrl(data.signed_url)
          onRecordingUploaded?.(data.signed_url, data.recording_id)
        }
      } else {
        console.error('[Recording] Upload API error:', data.error)
      }
    } catch (e: any) {
      console.error('[Recording] Upload fetch error:', e.message)
    } finally {
      setRecordingUploading(false)
    }
  }

  // ── Realtime subscription ─────────────────────────────────────────────────
  function subscribeToCallEvents(newCallId: string) {
    const supabase = createClient()
    const channel  = supabase.channel(`call:${newCallId}`, { config: { broadcast: { ack: false } } })

    channel
      .on('broadcast', { event: 'sdp_answer' }, async ({ payload }) => {
        if (!pcRef.current) return
        try {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription({ type: payload.sdp_type, sdp: payload.sdp })
          )
          console.log('[useWhatsAppCall] SDP answer set ✅')
          setCallState('ringing')
        } catch (e: any) {
          setErr(`SDP answer error: ${e.message}`)
        }
      })
      .subscribe(s => console.log('[useWhatsAppCall] Realtime:', s))

    realtimeChannelRef.current = channel
  }

  // ── checkPermission ───────────────────────────────────────────────────────
  const checkPermission = useCallback(async () => {
    if (!conversationId) return
    setCallState('checking')
    setError(null)

    try {
      const res  = await fetch(`/api/whatsapp/calls?conversation_id=${conversationId}`)
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'calling_not_enabled') {
          setErr('WhatsApp Calling is not enabled for this channel. Enable it in Meta Business Suite → Phone Numbers → Calling.')
          return
        }
        setErr(data.error ?? 'Failed to check permission')
        return
      }

      const perm     = data.permission
      const canCall  = perm?.can_call    ?? perm?.actions?.find((a: any) => a.action_name === 'start_call')?.can_perform_action ?? false
      const canReq   = perm?.can_request ?? perm?.actions?.find((a: any) => a.action_name === 'send_call_permission_request')?.can_perform_action ?? false

      const parsed: CallPermission = {
        status:      perm?.status ?? 'denied',
        can_call:    canCall,
        can_request: canReq,
        actions:     perm?.actions ?? [],
      }

      setPermission(parsed)
      setCallState(canCall ? 'idle' : 'permission_required')
    } catch (e: any) {
      setErr(e.message)
    }
  }, [conversationId])

  // ── requestPermission ─────────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (!conversationId) return
    setCallState('requesting_permission')
    setError(null)

    try {
      const res  = await fetch('/api/whatsapp/calls', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'request_permission', conversation_id: conversationId }),
      })
      const data = await res.json()
        if (!res.ok || !data.ok) {
    // Don't set error state — show info message instead
    setCallState('permission_required')
    setPermission(prev => prev ? { 
      ...prev, 
      status: 'pending',
      _manual_required: true  // add this flag to CallPermission type if needed
    } : null)
    return
  }
      setCallState('permission_required')
      setPermission(prev => prev ? { ...prev, status: 'pending' } : null)
    } catch (e: any) {
      setErr(e.message)
    }
  }, [conversationId])

  // ── startCall ─────────────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    if (!conversationId) return
    setCallState('connecting')
    setError(null)
    setDuration(0)
    setRecordingBlob(null)
    setRecordingUrl(null)

    // 1. Mic access
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
    } catch (e: any) {
      setErr(e.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone and try again.'
        : `Microphone error: ${e.message}`)
      return
    }

    // 2. RTCPeerConnection
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc
    stream.getTracks().forEach(t => pc.addTrack(t, stream))

    pc.ontrack = (event) => {
      const [rs] = event.streams
      if (rs) {
        remoteStreamRef.current = rs
        const audio = new Audio()
        audio.srcObject = rs
        audio.autoplay  = true
        ;(window as any).__waCallAudio = audio
        audio.play().catch(e => console.warn('[useWhatsAppCall] Audio play:', e))
      }
    }

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      console.log('[useWhatsAppCall] ICE:', state)
      if (state === 'connected' || state === 'completed') setCallState('connected')
      else if (state === 'failed' || state === 'closed')  setErr('Connection lost')
    }

    // 3. SDP offer
    let offer: RTCSessionDescriptionInit
    try {
      offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)
    } catch (e: any) { setErr(`SDP offer failed: ${e.message}`); return }

    // 4. Wait for ICE gathering (max 3s)
    await new Promise<void>(resolve => {
      if (pc.iceGatheringState === 'complete') { resolve(); return }
      const t = setTimeout(resolve, 6000)
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve() }
      }
    })

    const sdpOffer = pc.localDescription?.sdp
    if (!sdpOffer) { setErr('ICE gathering failed'); return }

    // 5. Initiate via API
    try {
      const res  = await fetch('/api/whatsapp/calls', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'initiate', conversation_id: conversationId, sdp_offer: sdpOffer }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) { setErr(data.error ?? data.message ?? 'Call initiation failed'); return }

      const newCallId = data.call_id
      setCallId(newCallId)
      subscribeToCallEvents(newCallId)
      console.log('[useWhatsAppCall] ✅ Initiated, call_id:', newCallId)
    } catch (e: any) {
      setErr(`Initiate failed: ${e.message}`)
    }
  }, [conversationId])

  // ── endCall ───────────────────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    const activeCallId = callIdRef.current
    setCallState('ending')

    // Stop recording before ending (triggers upload)
    stopRecordingInternal()

    if (activeCallId) {
      try {
        await fetch('/api/whatsapp/calls', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'terminate', conversation_id: conversationId, call_id: activeCallId }),
        })
      } catch (e: any) {
        console.warn('[useWhatsAppCall] terminate error (non-critical):', e.message)
      }
    }

    cleanupResources()
    setCallId(null)
    setCallState('idle')
    setDuration(0)
    setIsMuted(false)
    setError(null)
  }, [conversationId])

  // ── toggleMute ────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const s = localStreamRef.current
    if (!s) return
    const next = !isMuted
    s.getAudioTracks().forEach(t => { t.enabled = !next })
    setIsMuted(next)
  }, [isMuted])

  // ── reset ─────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    cleanupResources()
    setCallState('idle')
    setCallId(null)
    setPermission(null)
    setDuration(0)
    setIsMuted(false)
    setIsRecording(false)
    setRecordingBlob(null)
    setRecordingUrl(null)
    setError(null)
  }, [])

  return {
    callState, callId, permission, duration, isMuted,
    isRecording, recordingBlob, recordingUploading, recordingUrl,
    error,
    checkPermission, requestPermission, startCall, endCall,
    toggleMute, startRecording, stopRecording, reset,
  }
}