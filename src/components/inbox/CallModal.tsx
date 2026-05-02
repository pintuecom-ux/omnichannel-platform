/**
 * src/components/inbox/CallModal.tsx
 *
 * Full-screen call overlay that handles all states:
 *   idle → permission_required → requesting_permission
 *   → connecting → ringing → connected → ending → error
 *
 * Used by ChatWindow when the call icon button is clicked.
 * Props:
 *   conversationId  — active conversation
 *   contactName     — display name for the header
 *   contactPhone    — E.164 phone shown under name
 *   onClose         — callback when modal should be closed
 */

'use client'

import { useEffect } from 'react'
import { useWhatsAppCall, CallState } from '@/hooks/useWhatsAppCall'

interface CallModalProps {
  conversationId: string
  contactName:    string
  contactPhone?:  string
  onClose:        () => void
}

// ── Duration formatter ─────────────────────────────────────────────────────────
function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── State label ────────────────────────────────────────────────────────────────
function stateLabel(state: CallState): string {
  switch (state) {
    case 'checking':              return 'Checking…'
    case 'permission_required':   return 'Permission required'
    case 'requesting_permission': return 'Sending request…'
    case 'connecting':            return 'Connecting…'
    case 'ringing':               return 'Ringing…'
    case 'connected':             return 'Connected'
    case 'ending':                return 'Ending call…'
    case 'error':                 return 'Call failed'
    default:                      return ''
  }
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, pulse }: { name: string; pulse?: boolean }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {pulse && (
        <div style={{
          position:     'absolute',
          width:         120,
          height:        120,
          borderRadius: '50%',
          background:   'rgba(255,255,255,0.15)',
          animation:    'wa-call-pulse 1.8s ease-in-out infinite',
        }} />
      )}
      {pulse && (
        <div style={{
          position:      'absolute',
          width:          100,
          height:         100,
          borderRadius:  '50%',
          background:    'rgba(255,255,255,0.12)',
          animation:     'wa-call-pulse 1.8s ease-in-out 0.4s infinite',
        }} />
      )}
      <div style={{
        width:          80,
        height:         80,
        borderRadius:  '50%',
        background:    'rgba(255,255,255,0.25)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       28,
        fontWeight:     700,
        color:          '#fff',
        letterSpacing: '0.5px',
        position:       'relative',
        zIndex:         1,
        border:         '2px solid rgba(255,255,255,0.4)',
      }}>
        {initials || '?'}
      </div>
    </div>
  )
}

// ── Circular icon button ───────────────────────────────────────────────────────
function CircleBtn({
  onClick, disabled = false, danger = false, size = 56, children, label,
}: {
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  size?: number
  children: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        width:           size,
        height:          size,
        borderRadius:    '50%',
        border:          'none',
        background:      danger ? '#ef4444' : 'rgba(255,255,255,0.2)',
        color:           '#fff',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        cursor:          disabled ? 'not-allowed' : 'pointer',
        opacity:         disabled ? 0.5 : 1,
        transition:      'background 0.15s, transform 0.1s',
        backdropFilter:  'blur(4px)',
        flexShrink:      0,
      }}
      onMouseEnter={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background =
          danger ? '#dc2626' : 'rgba(255,255,255,0.3)'
      }}
      onMouseLeave={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background =
          danger ? '#ef4444' : 'rgba(255,255,255,0.2)'
      }}
    >
      {children}
    </button>
  )
}

// ── Icons (inline SVG — no extra deps) ────────────────────────────────────────
const MicIcon = ({ muted }: { muted: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {muted ? (
      <>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    ) : (
      <>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </>
    )}
  </svg>
)

const PhoneOffIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A2 2 0 0 1 10.68 13.31z" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 15a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 4.18L6.6 4a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 11.56a16 16 0 0 0 6.15 6.15l.54-.54a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.3 15.6l-.38 1.32z" />
  </svg>
)

const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CallModal({ conversationId, contactName, contactPhone, onClose }: CallModalProps) {
const {
    callState, callId, permission, duration, isMuted, error,
    isRecording, recordingUploading, recordingUrl,
    checkPermission, requestPermission, startCall, endCall, toggleMute, reset,
    startRecording, stopRecording,
  } = useWhatsAppCall(conversationId)

  // Check permission on open
  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  // ESC to close (only when not in an active call)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && callState !== 'connected' && callState !== 'connecting' && callState !== 'ringing') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [callState])

  function handleClose() {
    if (callState === 'connected' || callState === 'ringing' || callState === 'connecting') {
      endCall().then(onClose)
    } else {
      reset()
      onClose()
    }
  }

  const isPulse  = callState === 'ringing' || callState === 'connecting'
  const isActive = callState === 'connected'

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes wa-call-pulse {
          0%   { transform: scale(1);   opacity: 0.6; }
          50%  { transform: scale(1.35);opacity: 0; }
          100% { transform: scale(1);   opacity: 0; }
        }
        @keyframes wa-call-fadein {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        style={{
          position:       'fixed',
          inset:           0,
          background:     'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          zIndex:          9999,
        }}
      >
        {/* Card */}
        <div style={{
          width:          340,
          borderRadius:   24,
          background:     isActive
            ? 'linear-gradient(145deg, #075e54 0%, #128c7e 100%)'
            : callState === 'error'
              ? 'linear-gradient(145deg, #7f1d1d 0%, #b91c1c 100%)'
              : 'linear-gradient(145deg, #1a2a2a 0%, #0d1f1c 100%)',
          padding:        '36px 28px 28px',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:             20,
          boxShadow:      '0 32px 80px rgba(0,0,0,0.6)',
          animation:      'wa-call-fadein 0.25s ease',
          position:       'relative',
        }}>
          {/* Close button (top-right) */}
          {(callState === 'idle' || callState === 'permission_required' || callState === 'error' || callState === 'checking') && (
            <button
              onClick={handleClose}
              style={{
                position:   'absolute',
                top:         14,
                right:       16,
                background: 'transparent',
                border:     'none',
                color:      'rgba(255,255,255,0.55)',
                cursor:     'pointer',
                fontSize:    20,
                lineHeight: 1,
                padding:     4,
              }}
              aria-label="Close"
            >✕</button>
          )}

          {/* Avatar */}
          <Avatar name={contactName} pulse={isPulse} />

          {/* Contact info */}
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>{contactName}</div>
            {contactPhone && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                {contactPhone}
              </div>
            )}
            <div style={{
              fontSize:    13,
              color:       isActive ? '#86efac' : 'rgba(255,255,255,0.65)',
              marginTop:   6,
              fontVariant: 'tabular-nums',
            }}>
              {isActive ? fmtDuration(duration) : stateLabel(callState)}
            </div>
          </div>

          {/* ── Error state ── */}
          {callState === 'error' && (
            <div style={{
              background:   'rgba(255,255,255,0.1)',
              borderRadius:  12,
              padding:      '12px 16px',
              color:        '#fca5a5',
              fontSize:      13,
              textAlign:    'center',
              display:      'flex',
              gap:           8,
              alignItems:   'center',
            }}>
              <AlertIcon />
              {error ?? 'An error occurred'}
            </div>
          )}

          {/* ── Permission required state ── */}
          {callState === 'permission_required' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background:   'rgba(255,255,255,0.08)',
                borderRadius:  12,
                padding:      '12px 14px',
                color:        'rgba(255,255,255,0.8)',
                fontSize:      13,
                lineHeight:    1.5,
                textAlign:    'center',
              }}>
                {permission?.status === 'pending'
                  ? '⏳ Permission request sent. The contact will see a prompt in their WhatsApp to allow calls.'
                  : 'You need permission to call this contact. Send them a request and they can approve it in WhatsApp.'}
              </div>

              {permission?.can_request && permission?.status !== 'pending' && (
                <button
                  onClick={requestPermission}
                  style={{
                    background:   '#25d366',
                    border:       'none',
                    borderRadius:  12,
                    color:        '#fff',
                    fontSize:      14,
                    fontWeight:    600,
                    padding:      '13px 20px',
                    cursor:       'pointer',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    gap:            8,
                  }}
                >
                  <PhoneIcon />
                  Send Permission Request
                </button>
              )}

              <button
                onClick={handleClose}
                style={{
                  background:   'rgba(255,255,255,0.1)',
                  border:       'none',
                  borderRadius:  12,
                  color:        'rgba(255,255,255,0.7)',
                  fontSize:      13,
                  padding:      '10px 20px',
                  cursor:       'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── Requesting permission loading state ── */}
          {callState === 'requesting_permission' && (
            <div style={{
              color:      'rgba(255,255,255,0.7)',
              fontSize:    14,
              textAlign:  'center',
            }}>
              Sending request to {contactName}…
            </div>
          )}

          {/* ── Idle (can call) ── */}
          {callState === 'idle' && (
            <button
              onClick={startCall}
              style={{
                background:    '#25d366',
                border:        'none',
                borderRadius:   16,
                color:         '#fff',
                fontSize:       15,
                fontWeight:     600,
                padding:       '14px 28px',
                cursor:        'pointer',
                display:       'flex',
                alignItems:    'center',
                gap:            8,
                transition:    'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1db954')}
              onMouseLeave={e => (e.currentTarget.style.background = '#25d366')}
            >
              <PhoneIcon />
              Start Call
            </button>
          )}

          {/* ── Checking ── */}
          {callState === 'checking' && (
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              Checking permissions…
            </div>
          )}

          {/* ── Connecting / Ringing / Connected call controls ── */}
          {(callState === 'connecting' || callState === 'ringing' || callState === 'connected' || callState === 'ending') && (
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 4 }}>

              {/* Record */}
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
    <CircleBtn
      onClick={isRecording ? stopRecording : startRecording}
      disabled={callState !== 'connected'}
      danger={isRecording}
      label={isRecording ? 'Stop Recording' : 'Record'}
    >
      {isRecording ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8" />
        </svg>
      )}
    </CircleBtn>
    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
      {isRecording ? 'Stop' : 'Record'}
    </span>
  </div>

AND add recording status display after the controls section:
  {recordingUploading && (
    <div style={{ fontSize: 12, color: '#a78bfa', textAlign: 'center' }}>
      Uploading recording…
    </div>
  )}
  {recordingUrl && !recordingUploading && (
    <div style={{ fontSize: 12, color: '#86efac', textAlign: 'center' }}>
      ✓ Recording saved
    </div>
  )}

              {/* Mute */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <CircleBtn
                  onClick={toggleMute}
                  disabled={callState !== 'connected'}
                  label={isMuted ? 'Unmute' : 'Mute'}
                >
                  <MicIcon muted={isMuted} />
                </CircleBtn>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </span>
              </div>

              {/* End Call */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <CircleBtn
                  onClick={() => endCall().then(onClose)}
                  danger
                  size={64}
                  disabled={callState === 'ending'}
                  label="End call"
                >
                  <PhoneOffIcon />
                </CircleBtn>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>End</span>
              </div>
            </div>
          )}

          {/* Retry button on error */}
          {callState === 'error' && (
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                onClick={() => { reset(); checkPermission() }}
                style={{
                  flex:         1,
                  background:   'rgba(255,255,255,0.1)',
                  border:       'none',
                  borderRadius:  12,
                  color:        '#fff',
                  fontSize:      14,
                  fontWeight:    500,
                  padding:      '12px',
                  cursor:       'pointer',
                }}
              >
                Retry
              </button>
              <button
                onClick={handleClose}
                style={{
                  flex:         1,
                  background:   'rgba(255,255,255,0.06)',
                  border:       'none',
                  borderRadius:  12,
                  color:        'rgba(255,255,255,0.6)',
                  fontSize:      14,
                  padding:      '12px',
                  cursor:       'pointer',
                }}
              >
                Close
              </button>
            </div>
          )}

          {/* WhatsApp branding dot */}
          <div style={{
            display:       'flex',
            alignItems:    'center',
            gap:            5,
            color:         'rgba(255,255,255,0.3)',
            fontSize:       11,
            marginTop:     -4,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" opacity={0.6}>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.552 4.11 1.518 5.837L.057 23.88l6.204-1.628A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.032-1.383l-.36-.214-3.732.979 .997-3.648-.234-.374A9.818 9.818 0 1 1 12 21.818z" />
            </svg>
            WhatsApp Call
          </div>
        </div>
      </div>
    </>
  )
}
