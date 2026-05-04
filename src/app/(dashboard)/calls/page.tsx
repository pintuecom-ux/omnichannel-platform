'use client'
/**
 * src/app/(dashboard)/calls/page.tsx
 *
 * Full Calls tab redesigned based on CallCenter Pro mockups.
 * 3-Column Layout:
 * 1. Left: Active Contacts Sidebar
 * 2. Middle: Today's Overview (Global) OR Contact Interaction History (Active)
 * 3. Right: Empty State OR Contact Profile details (Tags, Health)
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWhatsAppCall } from '@/hooks/useWhatsAppCall'
import type { Conversation } from '@/types'

/* ── Types ────────────────────────────────────────────────────────────────── */
interface CallLog {
  id:           string
  body:         string | null
  direction:    string
  created_at:   string
  content_type: string | null
  meta:         Record<string, any>
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
  idle:                  'Ready',
  checking:              'Checking…',
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
  if (['missed', 'no_answer', 'busy'].includes(e)) return { icon: 'fa-solid fa-phone-missed', color: '#ef4444', label: 'Missed', bg: 'rgba(239,68,68,0.1)' }
  if (['failed', 'rejected'].includes(e))          return { icon: 'fa-solid fa-phone-slash',  color: '#f97316', label: 'Failed', bg: 'rgba(249,115,22,0.1)' }
  if (dir === 'inbound')                           return { icon: 'fa-solid fa-phone-arrow-down-left', color: '#10b981', label: 'Incoming', bg: 'rgba(16,185,129,0.1)' }
  return                                                  { icon: 'fa-solid fa-phone-arrow-up-right',  color: '#3b82f6', label: 'Outgoing', bg: 'rgba(59,130,246,0.1)' }
}

/* ── Component ────────────────────────────────────────────────────────────── */
export default function CallsPage() {
  const supabase     = createClient()
  const searchParams = useSearchParams()

  const [workspaceId,   setWorkspaceId]   = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId,      setActiveId]      = useState<string | null>(null)
  const [callLogs,      setCallLogs]      = useState<CallLog[]>([])
  const [globalLogs,    setGlobalLogs]    = useState<CallLog[]>([])
  const [recordings,    setRecordings]    = useState<Recording[]>([])
  const [summary,       setSummary]       = useState<Summary | null>(null)
  const [globalSummary, setGlobalSummary] = useState<Summary | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [search,        setSearch]        = useState('')
  const [tab,           setTab]           = useState<'all' | 'online' | 'vip'>('all')
  const [playingId,     setPlayingId]     = useState<string | null>(null)
  const [playingUrl,    setPlayingUrl]    = useState<string | null>(null)
  const [noteText,      setNoteText]      = useState('')
  const [noteLoading,   setNoteLoading]   = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  /* Recording upload callback — refresh recordings list */
  const onRecordingUploaded = useCallback(() => {
    if (activeId) loadCallData(activeId)
  }, [activeId])

  const call = useWhatsAppCall(activeId, onRecordingUploaded)

  /* ── Load WA conversations & global data ────────────────────────────────── */
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

    // Fetch Global Summary
    const sumRes = await supabase.from('call_summary').select('*').eq('workspace_id', profile.workspace_id).is('conversation_id', null).maybeSingle()
    if (sumRes.data) setGlobalSummary(sumRes.data as Summary)

    // Fetch Global Activity
    const logsRes = await supabase.from('messages').select('id,body,direction,created_at,meta,conversation:conversations(contact:contacts(name,phone))')
      .eq('workspace_id', profile.workspace_id).eq('content_type', 'call')
      .order('created_at', { ascending: false }).limit(20)
    setGlobalLogs((logsRes.data ?? []) as any)
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
      supabase.from('messages').select('id,body,direction,created_at,meta,content_type')
        .eq('conversation_id', convId).in('content_type', ['call', 'text']) // fetch notes too
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

  /* ── Quick Note ──────────────────────────────────────────────────────────── */
  async function submitNote() {
    if (!noteText.trim() || !activeId || !workspaceId) return
    setNoteLoading(true)
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeId,
      workspace_id:    workspaceId,
      direction:       'outbound',
      content_type:    'text',
      body:            noteText.trim(),
      status:          'delivered',
      is_note:         true,
      meta:            { note_type: 'quick_note' }
    })
    setNoteLoading(false)
    if (!error) {
      setNoteText('')
      loadCallData(activeId)
    }
  }

  /* ── Derived ─────────────────────────────────────────────────────────────── */
  const activeConv = conversations.find(c => c.id === activeId) ?? null
  const contact    = activeConv?.contact as any
  const name       = contact?.name || contact?.phone || 'Unknown'
  const tags       = contact?.tags || []
  
  const filtered = conversations.filter(c => {
    const ct = c.contact as any
    const q = search.toLowerCase()
    const matchesSearch = !q || ct?.name?.toLowerCase().includes(q) || ct?.phone?.includes(q)
    if (!matchesSearch) return false
    if (tab === 'vip') return ct?.tags?.includes('VIP')
    // online is mock for now
    if (tab === 'online') return Math.random() > 0.5 
    return true
  })

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8fafc', color: '#0f172a', fontFamily: '"Inter", sans-serif' }}>
      {/* Global CSS overrides for clean scrollbars */}
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        input:focus { outline: none; border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important; }
        textarea:focus { outline: none; border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.1) !important; }
      `}</style>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={playingUrl ?? undefined} onEnded={() => { setPlayingId(null); setPlayingUrl(null) }} />

      {/* ══ COLUMN 1: Active Contacts Sidebar ════════════════════════════════════ */}
      <div style={{ width: 320, minWidth: 320, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff', zIndex: 10 }}>
        
        {/* Header & Search */}
        <div style={{ padding: '24px 20px 16px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>Active Contacts</h2>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8', fontSize: 14 }} />
            <input
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, background: '#f8fafc', transition: 'all 0.2s' }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 20px 12px', borderBottom: '1px solid #e2e8f0', gap: 16 }}>
          {(['all', 'online', 'vip'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
              fontSize: 13, fontWeight: tab === t ? 600 : 500, textTransform: 'capitalize',
              color: tab === t ? '#3b82f6' : '#64748b',
              borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s'
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* Contact List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94a3b8', fontSize: 14 }}>No contacts found</div>}
          {filtered.map(conv => {
            const ct    = conv.contact as any
            const cname = ct?.name || ct?.phone || 'Unknown'
            const isAct = conv.id === activeId
            const lmsg  = conv.last_message as any
            const msgSnippet = typeof lmsg === 'string' ? lmsg : lmsg?.body ?? 'Interaction…'

            return (
              <div key={conv.id} onClick={() => setActiveId(conv.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px', cursor: 'pointer',
                borderRadius: 8, background: isAct ? '#eff6ff' : 'transparent',
                transition: 'background 0.2s', marginBottom: 4
              }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: isAct ? '#3b82f6' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: isAct ? '#fff' : '#64748b' }}>
                    {cname.charAt(0).toUpperCase()}
                  </div>
                  {/* Mock Online dot */}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: '#10b981', border: '2px solid #fff' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: isAct ? '#1e40af' : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cname}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>{fmtTime(conv.last_message_at)}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msgSnippet}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ══ COLUMN 2 & 3: Main Content Area ════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        
        {/* ── EMPTY STATE (No Contact Selected) ─────────────────────────────────── */}
        {!activeId ? (
          <>
            {/* Middle Column: Overview */}
            <div style={{ flex: 2, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
              <div style={{ padding: '32px 40px' }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 24px 0', color: '#0f172a' }}>Today's Overview</h1>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                  <StatCard title="Total Calls" value={globalSummary?.total_calls ?? 0} icon="fa-phone" color="#3b82f6" bg="#eff6ff" />
                  <StatCard title="Answered"    value={globalSummary?.inbound_calls ?? 0} icon="fa-check" color="#10b981" bg="#ecfdf5" />
                  <StatCard title="Missed"      value={globalSummary?.missed_calls ?? 0} icon="fa-phone-slash" color="#ef4444" bg="#fef2f2" />
                  <StatCard title="Avg Duration" value={fmtDur(globalSummary?.avg_duration_seconds)} icon="fa-clock" color="#8b5cf6" bg="#f5f3ff" />
                </div>

                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px 0', color: '#0f172a' }}>Recent Activity</h2>
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  {globalLogs.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No recent activity</div>}
                  {globalLogs.map((log: any, i) => {
                    const cname = log.conversation?.contact?.name || log.conversation?.contact?.phone || 'Unknown'
                    const { icon, color, label, bg } = logIcon(log.meta?.call_event, log.direction)
                    return (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: i < globalLogs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginRight: 16 }}>
                          <i className={icon} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{cname}</div>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{label} {log.meta?.duration ? `· ${fmtDur(log.meta.duration)}` : ''}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{fmtTime(log.created_at)}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(log.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            
            {/* Right Column: Empty State Illustration */}
            <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <i className="fa-solid fa-users" style={{ fontSize: 40, color: '#94a3b8' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>No Contact Selected</h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>Select a contact from the list on the left to view their interaction history, make calls, and add notes.</p>
            </div>
          </>
        ) : (
          /* ── ACTIVE STATE (Contact Selected) ──────────────────────────────────── */
          <>
            {/* Middle Column: Interaction History */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', background: '#f8fafc', borderRight: '1px solid #e2e8f0' }}>
              
              {/* Profile Header & Actions */}
              <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff' }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>{name}</h2>
                    <div style={{ fontSize: 14, color: '#64748b' }}>
                      <i className="fa-brands fa-whatsapp" style={{ color: '#25d366', marginRight: 6 }} />
                      +{contact?.phone}
                    </div>
                  </div>
                </div>

                {/* Call Control State Machine */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {call.callState === 'idle' || call.callState === 'checking' ? (
                     <button onClick={call.startCall} disabled={call.callState === 'checking'} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.2s' }}>
                       <i className="fa-solid fa-phone" />
                       {call.callState === 'checking' ? 'Checking...' : 'Initiate Call'}
                     </button>
                  ) : call.callState === 'permission_required' ? (
                     <button onClick={call.requestPermission} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                       <i className="fa-solid fa-bell" />
                       Request Permission
                     </button>
                  ) : call.callState === 'connected' ? (
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#ecfdf5', border: '1px solid #10b981', padding: '6px 16px', borderRadius: 30 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' }} />
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#065f46', width: 60 }}>{fmtDur(call.duration)}</span>
                        
                        <button onClick={call.toggleMute} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: call.isMuted ? '#ef4444' : 'transparent', color: call.isMuted ? '#fff' : '#065f46', cursor: 'pointer' }}>
                          <i className={call.isMuted ? "fa-solid fa-microphone-slash" : "fa-solid fa-microphone"} />
                        </button>
                        
                        <button onClick={call.isRecording ? call.stopRecording : call.startRecording} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: call.isRecording ? '#ef4444' : 'transparent', color: call.isRecording ? '#fff' : '#065f46', cursor: 'pointer' }}>
                          <i className={call.isRecording ? "fa-solid fa-stop" : "fa-solid fa-circle-dot"} />
                        </button>
                        
                        <button onClick={call.endCall} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}>
                          End Call
                        </button>
                     </div>
                  ) : (
                     <button onClick={call.endCall} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                       <i className="fa-solid fa-phone-slash" />
                       Cancel {call.callState}
                     </button>
                  )}
                  <button style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-calendar-alt" />
                  </button>
                </div>
              </div>

              {/* Interaction History */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 24px 0', color: '#0f172a' }}>Interaction History</h3>
                
                {loading ? <div style={{ color: '#94a3b8' }}>Loading...</div> : callLogs.length === 0 ? <div style={{ color: '#94a3b8' }}>No history found</div> : null}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative' }}>
                  {/* Timeline Line */}
                  <div style={{ position: 'absolute', left: 20, top: 20, bottom: 20, width: 2, background: '#e2e8f0', zIndex: 0 }} />
                  
                  {callLogs.map(log => {
                    const isNote = log.meta?.is_note || log.meta?.note_type === 'quick_note' || log.body?.startsWith('[Note]') || log.content_type === 'text'
                    
                    if (isNote) {
                      return (
                        <div key={log.id} style={{ display: 'flex', gap: 16, zIndex: 1 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f5f3ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #f8fafc', flexShrink: 0 }}>
                            <i className="fa-solid fa-sticky-note" style={{ fontSize: 14 }} />
                          </div>
                          <div style={{ flex: 1, background: '#fff', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Quick Note</div>
                              <div style={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(log.created_at)} at {fmtTime(log.created_at)}</div>
                            </div>
                            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.5 }}>{log.body}</div>
                          </div>
                        </div>
                      )
                    }

                    // Call Log
                    const event = (log.meta?.call_event ?? '').toLowerCase()
                    const { icon, color, label, bg } = logIcon(event, log.direction)
                    const rec = recordings.find(r => r.call_id === log.meta?.call_id)
                    
                    return (
                      <div key={log.id} style={{ display: 'flex', gap: 16, zIndex: 1 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #f8fafc', flexShrink: 0 }}>
                          <i className={icon} style={{ fontSize: 14 }} />
                        </div>
                        <div style={{ flex: 1, background: '#fff', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                              {log.direction === 'inbound' ? 'Inbound Call' : 'Outbound Call'}
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{fmtDate(log.created_at)} at {fmtTime(log.created_at)}</div>
                          </div>
                          <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 12 }}>
                            <span>Status: <strong style={{ color: '#334155' }}>{label}</strong></span>
                            {log.meta?.duration && <span>Duration: <strong style={{ color: '#334155' }}>{fmtDur(log.meta.duration)}</strong></span>}
                          </div>
                          
                          {/* Recording Player Inline */}
                          {rec && (
                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                              <button onClick={() => playRecording(rec)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: playingId === rec.id ? '#ef4444' : '#3b82f6', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className={playingId === rec.id ? "fa-solid fa-pause" : "fa-solid fa-play"} style={{ fontSize: 12 }} />
                              </button>
                              <div style={{ flex: 1, fontSize: 13, color: '#334155', fontWeight: 500 }}>Recording ({fmtDur(rec.duration_seconds)})</div>
                              <button onClick={async () => {
                                const r = await fetch(`/api/whatsapp/call-recording?id=${rec.id}`)
                                const d = await r.json()
                                if (d.signed_url) window.open(d.signed_url, '_blank')
                              }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
                                <i className="fa-solid fa-download" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quick Note Input */}
              <div style={{ padding: '24px 32px', background: '#fff', borderTop: '1px solid #e2e8f0', zIndex: 5 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 12px 0' }}>Quick Note</h4>
                <div style={{ position: 'relative' }}>
                  <textarea 
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add a note about this contact..."
                    style={{ width: '100%', height: 80, padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, resize: 'none', fontFamily: 'inherit', background: '#f8fafc' }}
                  />
                  <button 
                    onClick={submitNote}
                    disabled={noteLoading || !noteText.trim()}
                    style={{ position: 'absolute', bottom: 12, right: 12, background: noteText.trim() ? '#3b82f6' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: noteText.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
                  >
                    {noteLoading ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Profile */}
            <div style={{ flex: 1, background: '#fff', padding: 32, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 32 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>{name}</h2>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 4 }}>Account Tier: {tags.includes('VIP') ? 'Enterprise' : 'Standard'}</div>
                <div style={{ fontSize: 14, color: '#64748b' }}>Location: Shared Location</div>
              </div>

              {/* Tags */}
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Tags</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {tags.length === 0 ? <span style={{ fontSize: 13, color: '#94a3b8' }}>No tags assigned</span> : null}
                  {tags.map((tag: string) => (
                    <span key={tag} style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 500 }}>
                      {tag}
                    </span>
                  ))}
                  {/* Mock tags for UI fidelity */}
                  <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 500 }}>Decision Maker</span>
                  <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 500 }}>Q4 Renewal</span>
                </div>
              </div>

              {/* Account Health */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>Account Health</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, color: '#64748b' }}>Response Rate</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>94%</div>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: '94%', height: '100%', background: '#10b981' }} />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <div style={{ fontSize: 14, color: '#64748b' }}>Total Calls</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{summary?.total_calls ?? 0}</div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, color: '#64748b' }}>Avg Duration</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{fmtDur(summary?.avg_duration_seconds)}</div>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, bg }: { title: string, value: string | number, icon: string, color: string, bg: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>{title}</div>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`fa-solid ${icon}`} style={{ fontSize: 14 }} />
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    </div>
  )
}