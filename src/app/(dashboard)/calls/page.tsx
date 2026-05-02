'use client'
/**
 * src/app/(dashboard)/calls/page.tsx
 *
 * Full Calls tab. Left: contact/call-log list. Right: rich panel with:
 *   ─ Active call controls (dial, mute, record, end)
 *   ─ Call insights: total, inbound, outbound, missed, avg duration, last call
 *   ─ Call history timeline per contact
 *   ─ Past recordings with inline audio player
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWhatsAppCall } from '@/hooks/useWhatsAppCall'
import type { Conversation } from '@/types'

/* ── Types ────────────────────────────────────────────────────────────────── */
interface CallLog {
  id:         string
  body:       string | null
  direction:  string
  created_at: string
  meta:       Record<string, any>
}
interface Recording {
  id:               string
  duration_seconds: number | null
  mime_type:        string
  created_at:       string
  call_id:          string | null
  storage_path:     string
}
interface Summary {
  total_calls:          number
  outbound_calls:       number
  inbound_calls:        number
  missed_calls:         number
  total_duration_seconds: number
  avg_duration_seconds:   number
  last_call_at:         string | null
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmtDur(s: number | null | undefined) {
  if (!s) return '—'
  const m = Math.floor(s / 60), sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const STATE_LABEL: Record<string, string> = {
  idle:                  'Ready to call',
  checking:              'Checking permissions…',
  permission_required:   'Permission required',
  requesting_permission: 'Sending request…',
  connecting:            'Connecting…',
  ringing:               'Ringing…',
  connected:             'Connected',
  ending:                'Ending…',
  error:                 'Call failed',
}

function logIcon(event: string, dir: string) {
  const e = (event ?? '').toLowerCase()
  if (['missed', 'no_answer', 'busy'].includes(e)) return { icon: 'fa-solid fa-phone-missed', color: '#ef4444', label: 'Missed' }
  if (['failed', 'rejected'].includes(e))          return { icon: 'fa-solid fa-phone-slash',  color: '#f97316', label: 'Failed' }
  if (dir === 'inbound')                           return { icon: 'fa-solid fa-phone-arrow-down-left', color: '#22c55e', label: 'Incoming' }
  return                                                  { icon: 'fa-solid fa-phone-arrow-up-right',  color: '#3b82f6', label: 'Outgoing' }
}

/* ── Component ────────────────────────────────────────────────────────────── */
export default function CallsPage() {
  const supabase     = createClient()
  const searchParams = useSearchParams()

  const [workspaceId,   setWorkspaceId]   = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [callLogs,      setCallLogs]      = useState<CallLog[]>([])
  const [recordings,    setRecordings]    = useState<Recording[]>([])
  const [summary,       setSummary]       = useState<Summary | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [search,        setSearch]        = useState('')
  const [playingId,     setPlayingId]     = useState<string | null>(null)
  const [playingUrl,    setPlayingUrl]    = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  /* Recording upload callback — refresh recordings list */
  const onRecordingUploaded = useCallback(() => {
    if (activeId) loadCallData(activeId)
  }, [activeId])

  const call = useWhatsAppCall(activeId, onRecordingUploaded)

  /* ── Load WA conversations ──────────────────────────────────────────────── */
  const loadConversations = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', session.user.id).single()
    if (!profile) return
    setWorkspaceId(profile.workspace_id)

    const { data } = await supabase
      .from('conversations')
      .select(`id, platform, status, last_message, last_message_at, unread_count,
               contact:contacts(id, name, phone, avatar_url, tags),
               channel:channels(id, name, platform, external_id)`)
      .eq('workspace_id', profile.workspace_id)
      .eq('platform', 'whatsapp')
      .order('last_message_at', { ascending: false })
      .limit(100)

    setConversations((data ?? []) as any)
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  /* ── Auto-select from ?cid= ─────────────────────────────────────────────── */
  useEffect(() => {
    const cid = searchParams.get('cid')
    if (cid) setActiveId(cid)
  }, [searchParams])

  /* ── When active conversation changes ───────────────────────────────────── */
  useEffect(() => {
    if (!activeId) return
    call.reset()
    call.checkPermission()
    loadCallData(activeId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  /* ── Load logs, recordings, summary ─────────────────────────────────────── */
  async function loadCallData(convId: string) {
    setLoading(true)
    const [logsRes, recsRes, sumRes] = await Promise.all([
      supabase.from('messages').select('id,body,direction,created_at,meta')
        .eq('conversation_id', convId).eq('content_type', 'call')
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('call_recordings').select('id,duration_seconds,mime_type,created_at,call_id,storage_path')
        .eq('conversation_id', convId).order('created_at', { ascending: false }).limit(20),
      supabase.from('call_summary').select('*').eq('conversation_id', convId).maybeSingle(),
    ])
    setCallLogs((logsRes.data ?? []) as CallLog[])
    setRecordings((recsRes.data ?? []) as Recording[])
    setSummary(sumRes.data as Summary ?? null)
    setLoading(false)
  }

  /* ── Playback ────────────────────────────────────────────────────────────── */
  async function playRecording(rec: Recording) {
    if (playingId === rec.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      setPlayingUrl(null)
      return
    }
    const res  = await fetch(`/api/whatsapp/call-recording?id=${rec.id}`)
    const data = await res.json()
    if (!data.ok || !data.signed_url) { alert('Could not load recording'); return }
    setPlayingId(rec.id)
    setPlayingUrl(data.signed_url)
    setTimeout(() => audioRef.current?.play(), 100)
  }

  /* ── Derived ─────────────────────────────────────────────────────────────── */
  const activeConv = conversations.find(c => c.id === activeId) ?? null
  const contact    = activeConv?.contact as any
  const name       = contact?.name || contact?.phone || 'Unknown'
  const filtered   = conversations.filter(c => {
    const q = search.toLowerCase()
    return !q || (c.contact as any)?.name?.toLowerCase().includes(q) || (c.contact as any)?.phone?.includes(q)
  })

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={playingUrl ?? undefined} onEnded={() => { setPlayingId(null); setPlayingUrl(null) }} />

      {/* ══ LEFT PANEL: Contact list ════════════════════════════════════════ */}
      <div style={{ width: 300, minWidth: 260, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>

        {/* Header */}
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-phone" style={{ color: '#25d366' }} />
              Calls
            </div>
            <button
              onClick={loadConversations}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
              title="Refresh"
            >
              <i className="fa-solid fa-rotate" />
            </button>
          </div>
          <input
            className="form-input"
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 12 }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {filtered.length} WhatsApp contact{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Contact rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No WhatsApp conversations</div>
          )}
          {filtered.map(conv => {
            const ct     = conv.contact as any
            const cname  = ct?.name || ct?.phone || 'Unknown'
            const phone  = ct?.phone ?? ''
            const isAct  = conv.id === activeId

            return (
              <div key={conv.id} onClick={() => setActiveId(conv.id)} style={{
                padding: '11px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                background:  isAct ? 'rgba(37,211,102,0.07)' : 'transparent',
                borderLeft:  isAct ? '3px solid #25d366' : '3px solid transparent',
                transition:  'background 0.1s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {cname.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cname}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{phone}</div>
                  </div>
                  <i className="fa-brands fa-whatsapp" style={{ color: '#25d366', fontSize: 14, flexShrink: 0 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ══ RIGHT PANEL ═════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {!activeId ? (
          <EmptyState />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* ── Contact bar ──────────────────────────────────────────────── */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg-secondary)', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', position: 'relative' }}>
                {name.charAt(0).toUpperCase()}
                {call.callState === 'connected' && (
                  <span style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: '2px solid var(--bg-secondary)' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {contact?.phone}
                  {' · '}
                  <span style={{ color: call.callState === 'connected' ? '#22c55e' : call.callState === 'error' ? '#ef4444' : 'var(--text-muted)', fontWeight: 500 }}>
                    {call.callState === 'connected' ? `Connected · ${fmtDur(call.duration)}` : STATE_LABEL[call.callState] ?? call.callState}
                  </span>
                </div>
              </div>
              {call.permission && (
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: call.permission.can_call ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)', color: call.permission.can_call ? '#22c55e' : '#ef4444' }}>
                  {call.permission.can_call ? '✓ Can call' : `Permission ${call.permission.status}`}
                </span>
              )}
            </div>

            {/* ── Scrollable body ──────────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── Call Controls Card ────────────────────────────────────── */}
              <Card title="📞 Call" icon="fa-solid fa-phone">
                {call.error && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13, marginBottom: 10 }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }} />
                    {call.error}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  {/* idle */}
                  {(call.callState === 'idle' || call.callState === 'checking') && (
                    <>
                      {call.permission?.can_call && (
                        <ActionBtn icon="fa-solid fa-phone" label="Call" color="#25d366" onClick={call.startCall} />
                      )}
                      <ActionBtn icon="fa-solid fa-rotate" label={call.callState === 'checking' ? 'Checking…' : 'Check Permission'} color="var(--bg-tertiary)" textColor="var(--text-primary)" onClick={call.checkPermission} disabled={call.callState === 'checking'} />
                    </>
                  )}

                  {/* permission_required */}
                  {call.callState === 'permission_required' && (
                    <>
                      <div style={{ width: '100%', fontSize: 13, color: 'var(--text-muted)' }}>
                        {call.permission?.status === 'pending'
                          ? '🕐 Permission request sent — waiting for contact to approve in WhatsApp.'
                          : `Contact hasn't granted call permission (${call.permission?.status}). Send them a request.`}
                      </div>
                      {call.permission?.can_request && (
                        <ActionBtn icon="fa-solid fa-paper-plane" label="Send Permission Request" color="#f59e0b" onClick={call.requestPermission} />
                      )}
                      <ActionBtn icon="fa-solid fa-rotate" label="Re-check" color="var(--bg-tertiary)" textColor="var(--text-primary)" onClick={call.checkPermission} />
                    </>
                  )}

                  {/* requesting */}
                  {call.callState === 'requesting_permission' && (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Sending…</span>
                  )}

                  {/* connecting / ringing */}
                  {(call.callState === 'connecting' || call.callState === 'ringing') && (
                    <>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />{call.callState === 'connecting' ? 'Connecting…' : 'Ringing…'}</span>
                      <ActionBtn icon="fa-solid fa-phone-slash" label="Cancel" color="#ef4444" onClick={call.endCall} />
                    </>
                  )}

                  {/* connected */}
                  {call.callState === 'connected' && (
                    <>
                      {/* Timer */}
                      <span style={{ fontSize: 22, fontWeight: 700, color: '#22c55e', fontVariantNumeric: 'tabular-nums', minWidth: 72 }}>
                        {fmtDur(call.duration)}
                      </span>
                      {/* Mute */}
                      <ActionBtn icon={call.isMuted ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone'} label={call.isMuted ? 'Unmute' : 'Mute'} color={call.isMuted ? '#ef4444' : 'var(--bg-tertiary)'} textColor={call.isMuted ? '#fff' : 'var(--text-primary)'} onClick={call.toggleMute} />
                      {/* Record */}
                      {!call.isRecording
                        ? <ActionBtn icon="fa-solid fa-circle-dot" label="Record" color="#8b5cf6" onClick={call.startRecording} />
                        : <ActionBtn icon="fa-solid fa-stop" label="Stop Recording" color="#ef4444" onClick={call.stopRecording} pulse />}
                      {/* End */}
                      <ActionBtn icon="fa-solid fa-phone-slash" label="End Call" color="#ef4444" onClick={call.endCall} />
                    </>
                  )}

                  {/* ending */}
                  {call.callState === 'ending' && (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Ending…</span>
                  )}

                  {/* error */}
                  {call.callState === 'error' && (
                    <ActionBtn icon="fa-solid fa-rotate" label="Retry" color="var(--bg-tertiary)" textColor="var(--text-primary)" onClick={call.checkPermission} />
                  )}
                </div>

                {/* Recording upload status */}
                {call.recordingUploading && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#8b5cf6' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />
                    Uploading recording…
                  </div>
                )}
                {call.recordingUrl && !call.recordingUploading && (
                  <div style={{ marginTop: 10, fontSize: 12, color: '#22c55e' }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />
                    Recording saved successfully
                  </div>
                )}
              </Card>

              {/* ── Insights Card ─────────────────────────────────────────── */}
              <Card title="📊 Call Insights" icon="fa-solid fa-chart-simple">
                {!summary ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {loading ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Loading…</> : 'No calls with this contact yet'}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <Stat label="Total Calls"   value={summary.total_calls}      color="var(--text-primary)" />
                    <Stat label="Outbound"       value={summary.outbound_calls}   color="#3b82f6" />
                    <Stat label="Inbound"        value={summary.inbound_calls}    color="#22c55e" />
                    <Stat label="Missed"         value={summary.missed_calls}     color="#ef4444" />
                    <Stat label="Total Duration" value={fmtDur(summary.total_duration_seconds)} color="var(--text-primary)" isStr />
                    <Stat label="Avg Duration"   value={fmtDur(Math.round(summary.avg_duration_seconds))} color="var(--text-primary)" isStr />
                    {summary.last_call_at && (
                      <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-muted)', paddingTop: 4 }}>
                        Last call: {fmtDate(summary.last_call_at)} at {fmtTime(summary.last_call_at)}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* ── Recordings Card ───────────────────────────────────────── */}
              {recordings.length > 0 && (
                <Card title="🎙️ Recordings" icon="fa-solid fa-record-vinyl">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {recordings.map(rec => (
                      <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                        <button
                          onClick={() => playRecording(rec)}
                          style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: playingId === rec.id ? '#ef4444' : '#8b5cf6', color: '#fff', cursor: 'pointer', flexShrink: 0, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title={playingId === rec.id ? 'Pause' : 'Play'}
                        >
                          <i className={`fa-solid ${playingId === rec.id ? 'fa-pause' : 'fa-play'}`} />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                            {fmtDate(rec.created_at)} · {fmtTime(rec.created_at)}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {fmtDur(rec.duration_seconds)} · {rec.mime_type.split('/')[1] ?? 'audio'}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/whatsapp/call-recording?id=${rec.id}`)
                            const d = await res.json()
                            if (d.signed_url) window.open(d.signed_url, '_blank')
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: 4 }}
                          title="Download"
                        >
                          <i className="fa-solid fa-download" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* ── Call History Timeline ─────────────────────────────────── */}
              <Card title="🕐 Call History" icon="fa-solid fa-clock-rotate-left">
                {loading && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }} />Loading…</div>}
                {!loading && callLogs.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                    No call history yet
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {callLogs.map((log, i) => {
                    const event = (log.meta?.call_event ?? '').toLowerCase()
                    const { icon, color, label } = logIcon(event, log.direction)
                    const dur = log.meta?.duration

                    return (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < callLogs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={icon} style={{ color, fontSize: 14 }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                            {log.body ?? `${label} call`}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {label}
                            {dur != null && ` · ${fmtDur(dur)}`}
                            {log.meta?.reason && ` · ${log.meta.reason}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{fmtTime(log.created_at)}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(log.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--text-muted)' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-phone" style={{ fontSize: 32, color: '#25d366' }} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>WhatsApp Calls</div>
      <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
        Select a contact on the left to view call history, insights, and recordings — or start a new call.
      </div>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className={icon} style={{ fontSize: 12, color: 'var(--text-muted)' }} />
        {title}
      </div>
      {children}
    </div>
  )
}

function Stat({ label, value, color, isStr }: { label: string; value: number | string; color: string; isStr?: boolean }) {
  return (
    <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function ActionBtn({ icon, label, color, textColor = '#fff', onClick, disabled, pulse }: {
  icon: string; label: string; color: string; textColor?: string;
  onClick: () => void; disabled?: boolean; pulse?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background:   color,
        color:        textColor,
        border:       'none',
        borderRadius: 24,
        padding:      '9px 18px',
        fontSize:     13,
        fontWeight:   600,
        cursor:       disabled ? 'not-allowed' : 'pointer',
        opacity:      disabled ? 0.6 : 1,
        display:      'flex',
        alignItems:   'center',
        gap:          7,
        animation:    pulse ? 'wa-pulse 1s ease-in-out infinite' : undefined,
        transition:   'opacity 0.15s',
      }}
    >
      <i className={icon} />
      {label}
      <style>{`@keyframes wa-pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
    </button>
  )
}