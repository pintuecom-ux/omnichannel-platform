'use client'
/**
 * src/app/(dashboard)/calls/page.tsx
 *
 * Dedicated Calls tab — shows call history from the messages table
 * (content_type = 'call') and allows initiating new calls.
 *
 * Issue 1: Call functionality moved out of the inline ChatWindow modal
 * and into its own page. The phone icon in ChatWindow header now navigates
 * here with ?conversation_id=... pre-selected.
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

const CallModal = dynamic(() => import('@/components/inbox/CallModal'), { ssr: false })

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface CallLog {
  id:              string
  conversation_id: string
  body:            string
  direction:       'inbound' | 'outbound'
  created_at:      string
  meta: {
    call_event?: string
    call_id?:    string
    from_phone?: string
    to_phone?:   string
    duration?:   number
    reason?:     string
  }
  conversation?: {
    id:          string
    platform:    string
    contact?: {
      name?:   string
      phone?:  string
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function fmtDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  return isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const EVENT_ICON: Record<string, { icon: string; color: string }> = {
  call_started:       { icon: 'fa-solid fa-phone',          color: '#22c55e' },
  ringing:            { icon: 'fa-solid fa-phone-volume',   color: '#3b82f6' },
  connected:          { icon: 'fa-solid fa-phone',          color: '#22c55e' },
  call_ended:         { icon: 'fa-solid fa-phone-slash',    color: '#6b7280' },
  ended:              { icon: 'fa-solid fa-phone-slash',    color: '#6b7280' },
  completed:          { icon: 'fa-solid fa-phone-slash',    color: '#6b7280' },
  terminated:         { icon: 'fa-solid fa-phone-slash',    color: '#6b7280' },
  missed:             { icon: 'fa-solid fa-phone-missed',   color: '#ef4444' },
  failed:             { icon: 'fa-solid fa-triangle-exclamation', color: '#ef4444' },
  rejected:           { icon: 'fa-solid fa-phone-slash',    color: '#ef4444' },
  cancelled:          { icon: 'fa-solid fa-phone-slash',    color: '#f59e0b' },
  permission_request: { icon: 'fa-solid fa-bell',           color: '#8b5cf6' },
}

function getEventStyle(event?: string) {
  return EVENT_ICON[event ?? ''] ?? { icon: 'fa-solid fa-phone', color: '#6b7280' }
}

/* -------------------------------------------------------------------------- */
/* Page Component                                                             */
/* -------------------------------------------------------------------------- */

export default function CallsPage() {
  const supabase     = createClient()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [callLogs,         setCallLogs]         = useState<CallLog[]>([])
  const [loading,          setLoading]          = useState(true)
  const [selectedConvId,   setSelectedConvId]   = useState<string | null>(null)
  const [selectedContact,  setSelectedContact]  = useState<{ name: string; phone?: string } | null>(null)
  const [showCallModal,    setShowCallModal]     = useState(false)
  const [filter,           setFilter]           = useState<'all' | 'missed' | 'outbound' | 'inbound'>('all')

  // If navigated here with ?conversation_id=xxx, auto-open the call modal
  useEffect(() => {
    const convId = searchParams.get('conversation_id')
    if (convId) {
      setSelectedConvId(convId)
      loadConversationContact(convId)
      setShowCallModal(true)
    }
  }, [searchParams])

  async function loadConversationContact(convId: string) {
    const { data } = await supabase
      .from('conversations')
      .select('contact:contacts(name, phone)')
      .eq('id', convId)
      .maybeSingle()
    if (data?.contact) {
      const c = Array.isArray(data.contact) ? data.contact[0] : data.contact
      setSelectedContact({ name: c?.name ?? c?.phone ?? 'Unknown', phone: c?.phone })
    }
  }

  // Load call logs
  const loadCallLogs = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, conversation_id, body, direction, created_at, meta,
        conversation:conversations(
          id, platform,
          contact:contacts(name, phone)
        )
      `)
      .eq('content_type', 'call')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[Calls Page] load error:', error.message)
    } else {
      setCallLogs((data ?? []) as any)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadCallLogs()

    // Real-time subscription — new call events auto-appear
    const channel = supabase
      .channel('calls-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: "content_type=eq.call" },
        () => { loadCallLogs() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadCallLogs])

  // Apply filter
  const filtered = callLogs.filter(log => {
    if (filter === 'missed')   return log.meta?.call_event === 'missed'
    if (filter === 'outbound') return log.direction === 'outbound'
    if (filter === 'inbound')  return log.direction === 'inbound'
    return true
  })

  function openCallFor(log: CallLog) {
    const conv = Array.isArray(log.conversation) ? log.conversation[0] : log.conversation
    const contact = Array.isArray(conv?.contact) ? conv?.contact[0] : conv?.contact
    setSelectedConvId(log.conversation_id)
    setSelectedContact({
      name:  contact?.name ?? contact?.phone ?? 'Unknown',
      phone: contact?.phone,
    })
    setShowCallModal(true)
    // Update URL without full navigation
    router.replace(`/calls?conversation_id=${log.conversation_id}`, { scroll: false })
  }

  function handleModalClose() {
    setShowCallModal(false)
    setSelectedConvId(null)
    setSelectedContact(null)
    router.replace('/calls', { scroll: false })
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  const FILTERS = [
    { id: 'all',      label: 'All' },
    { id: 'missed',   label: 'Missed' },
    { id: 'inbound',  label: 'Inbound' },
    { id: 'outbound', label: 'Outbound' },
  ] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>

      {/* Header */}
      <div style={{
        padding:      '20px 24px 16px',
        borderBottom: '1px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        flexShrink:   0,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <i className="fa-solid fa-phone" style={{ color: '#25d366', marginRight: 10 }} />
            Calls
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            WhatsApp voice call history
          </p>
        </div>
        <button
          onClick={loadCallLogs}
          style={{
            background: 'var(--bg-secondary)',
            border:     '1px solid var(--border)',
            borderRadius: 8,
            padding:    '7px 14px',
            fontSize:   13,
            color:      'var(--text-secondary)',
            cursor:     'pointer',
            display:    'flex',
            alignItems: 'center',
            gap:        6,
          }}
        >
          <i className="fa-solid fa-rotate" />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{
        display:      'flex',
        gap:           4,
        padding:      '12px 24px',
        borderBottom: '1px solid var(--border)',
        flexShrink:   0,
      }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding:      '6px 14px',
              borderRadius:  20,
              border:        'none',
              fontSize:      13,
              fontWeight:    filter === f.id ? 600 : 400,
              background:    filter === f.id ? 'var(--accent)' : 'var(--bg-secondary)',
              color:         filter === f.id ? '#fff' : 'var(--text-secondary)',
              cursor:        'pointer',
              transition:    'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Call log list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24 }} />
            <div style={{ marginTop: 10, fontSize: 14 }}>Loading call history…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-phone-slash" style={{ fontSize: 36, opacity: 0.3 }} />
            <div style={{ marginTop: 12, fontSize: 15, fontWeight: 500 }}>No calls yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {filter !== 'all' ? `No ${filter} calls` : 'Call history will appear here'}
            </div>
          </div>
        ) : (
          filtered.map(log => {
            const conv    = Array.isArray(log.conversation) ? log.conversation[0] : log.conversation
            const contact = Array.isArray(conv?.contact) ? conv?.contact[0] : conv?.contact
            const name    = contact?.name ?? contact?.phone ?? log.meta?.from_phone ?? log.meta?.to_phone ?? 'Unknown'
            const phone   = contact?.phone ?? ''
            const evt     = log.meta?.call_event ?? ''
            const style   = getEventStyle(evt)
            const isMissed = evt === 'missed' || evt === 'rejected' || evt === 'failed'

            return (
              <div
                key={log.id}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:          14,
                  padding:     '12px 24px',
                  cursor:      'pointer',
                  transition:  'background 0.1s',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => openCallFor(log)}
              >
                {/* Event icon */}
                <div style={{
                  width:          44,
                  height:         44,
                  borderRadius:   '50%',
                  background:     `${style.color}18`,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexShrink:     0,
                }}>
                  <i className={style.icon} style={{ color: style.color, fontSize: 17 }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight:   600,
                    fontSize:     14,
                    color:        isMissed ? '#ef4444' : 'var(--text-primary)',
                    whiteSpace:   'nowrap',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i
                      className={log.direction === 'inbound' ? 'fa-solid fa-arrow-down-left' : 'fa-solid fa-arrow-up-right'}
                      style={{ fontSize: 10, color: log.direction === 'inbound' ? '#3b82f6' : '#22c55e' }}
                    />
                    {log.body}
                    {log.meta?.duration != null && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        · {fmtDuration(log.meta.duration)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Time + call-back button */}
                <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {fmtTime(log.created_at)}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); openCallFor(log) }}
                    style={{
                      background:   '#25d36618',
                      border:       '1px solid #25d36640',
                      borderRadius:  6,
                      padding:      '3px 10px',
                      fontSize:      11,
                      color:        '#25d366',
                      cursor:       'pointer',
                      fontWeight:    500,
                    }}
                  >
                    <i className="fa-solid fa-phone" style={{ marginRight: 4, fontSize: 10 }} />
                    Call
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Call Modal — opened when a call is initiated or re-called */}
      {showCallModal && selectedConvId && selectedContact && (
        <CallModal
          conversationId={selectedConvId}
          contactName={selectedContact.name}
          contactPhone={selectedContact.phone}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
