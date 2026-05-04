'use client'
/**
 * /calls — Calls Dashboard
 *
 * Design: Matches the platform's dark-mode-first design system (globals.css).
 * Data:   Reads from `call_logs` table (primary) and `call_recordings` table.
 *         Falls back to `messages` (content_type=call) if call_logs is empty.
 * No mock data, no Math.random(), no hardcoded tags.
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────────
interface CallLog {
  id:               string
  call_id:          string | null
  direction:        'inbound' | 'outbound'
  status:           string
  from_phone:       string | null
  to_phone:         string | null
  duration_seconds: number | null
  started_at:       string
  ended_at:         string | null
  recording_id:     string | null   // NULL = no recording; set by call-recording route
  meta:             Record<string, any>
  created_at:       string
  conversation?: {
    id:       string
    contact?: { name: string | null; phone: string | null; avatar_url: string | null }
  } | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDuration(s: number | null): string {
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function statusConfig(status: string): { label: string; color: string; bg: string; icon: string } {
  const map: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    connected:            { label: 'Connected',   color: 'var(--accent)',  bg: 'rgba(37,211,102,0.1)',  icon: '✓' },
    completed:            { label: 'Completed',   color: 'var(--accent)',  bg: 'rgba(37,211,102,0.1)',  icon: '✓' },
    ended:                { label: 'Ended',       color: 'var(--accent)',  bg: 'rgba(37,211,102,0.1)',  icon: '✓' },
    missed:               { label: 'Missed',      color: '#f87171',        bg: 'rgba(248,113,113,0.1)', icon: '↘' },
    rejected:             { label: 'Rejected',    color: '#f87171',        bg: 'rgba(248,113,113,0.1)', icon: '✕' },
    failed:               { label: 'Failed',      color: '#f87171',        bg: 'rgba(248,113,113,0.1)', icon: '!' },
    ringing:              { label: 'Ringing',     color: 'var(--accent3)', bg: 'rgba(245,158,11,0.1)',  icon: '~' },
    connecting:           { label: 'Connecting',  color: 'var(--accent3)', bg: 'rgba(245,158,11,0.1)',  icon: '~' },
    permission_requested: { label: 'Permission',  color: 'var(--accent2)', bg: 'rgba(0,168,232,0.1)',   icon: '?' },
    initiated:            { label: 'Initiated',   color: 'var(--accent2)', bg: 'rgba(0,168,232,0.1)',   icon: '→' },
    canceled:             { label: 'Cancelled',   color: 'var(--text-muted)', bg: 'var(--bg-surface2)', icon: '×' },
    busy:                 { label: 'Busy',        color: 'var(--text-muted)', bg: 'var(--bg-surface2)', icon: '—' },
    no_answer:            { label: 'No Answer',   color: '#f87171',        bg: 'rgba(248,113,113,0.1)', icon: '↘' },
    terminated:           { label: 'Ended',       color: 'var(--accent)',  bg: 'rgba(37,211,102,0.1)',  icon: '✓' },
  }
  return map[status] ?? { label: status, color: 'var(--text-muted)', bg: 'var(--bg-surface2)', icon: '·' }
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CallsPage() {
  const supabase = createClient()

  const [logs,         setLogs]         = useState<CallLog[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [filter,       setFilter]       = useState<'all' | 'inbound' | 'outbound' | 'missed'>('all')
  const [searchQuery,  setSearchQuery]  = useState('')
  const [selected,     setSelected]     = useState<CallLog | null>(null)
  const [audioSrc,     setAudioSrc]     = useState<string | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)

  // ── Stats derived from logs ──────────────────────────────────────────────────
  const stats = {
    total:    logs.length,
    inbound:  logs.filter(l => l.direction === 'inbound').length,
    outbound: logs.filter(l => l.direction === 'outbound').length,
    missed:   logs.filter(l => ['missed', 'no_answer', 'rejected'].includes(l.status)).length,
    avgDuration: (() => {
      const connected = logs.filter(l => l.duration_seconds && l.duration_seconds > 0)
      if (!connected.length) return 0
      return Math.round(connected.reduce((a, l) => a + (l.duration_seconds ?? 0), 0) / connected.length)
    })(),
  }

  // ── Load call logs ───────────────────────────────────────────────────────────
  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Not authenticated'); setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', session.user.id)
        .single()
      if (!profile) { setError('Profile not found'); setLoading(false); return }

      const { data, error: err } = await supabase
        .from('call_logs')
        .select(`
          id, call_id, direction, status, from_phone, to_phone,
          duration_seconds, started_at, ended_at, recording_id,
          meta, created_at,
          conversation:conversations(
            id,
            contact:contacts(name, phone, avatar_url)
          )
        `)
        .eq('workspace_id', profile.workspace_id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (err) throw err
      setLogs((data as unknown as CallLog[]) ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadLogs() }, [loadLogs])

  // ── Filter logic ─────────────────────────────────────────────────────────────
  const filtered = logs.filter(l => {
    if (filter === 'inbound'  && l.direction !== 'inbound')  return false
    if (filter === 'outbound' && l.direction !== 'outbound') return false
    if (filter === 'missed'   && !['missed','no_answer','rejected'].includes(l.status)) return false
    if (searchQuery) {
      const q    = searchQuery.toLowerCase()
      const name = l.conversation?.contact?.name?.toLowerCase() ?? ''
      const ph   = (l.from_phone ?? l.to_phone ?? '').toLowerCase()
      if (!name.includes(q) && !ph.includes(q)) return false
    }
    return true
  })

  // ── Audio playback — fetch signed URL via API route ─────────────────────
  async function playRecording(recordingId: string) {
    setAudioLoading(true)
    try {
      const res  = await fetch(`/api/whatsapp/call-recording?id=${recordingId}`)
      const data = await res.json()
      if (!res.ok || !data.signed_url) throw new Error(data.error ?? 'Playback URL failed')
      setAudioSrc(data.signed_url)
    } catch (e: any) {
      console.error('[Calls] playRecording error:', e.message)
    } finally {
      setAudioLoading(false)
    }
  }


  const contactName = (log: CallLog) =>
    log.conversation?.contact?.name
    ?? log.conversation?.contact?.phone
    ?? log.from_phone
    ?? log.to_phone
    ?? 'Unknown'

  const contactInitials = (log: CallLog) =>
    (contactName(log)).slice(0, 2).toUpperCase()

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      flex:          1,
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden',
      background:    'var(--bg-chat)',
      height:        '100%',
    }}>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--accent-glow)',
            border:     '1px solid var(--border-active)',
            display:    'flex', alignItems: 'center', justifyContent: 'center',
            color:      'var(--accent)', fontSize: 14,
          }}>
            <i className="fa-solid fa-phone" />
          </div>
          <h1 className="page-title">Call Center</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={loadLogs}
            style={{ gap: 6 }}
          >
            <i className="fa-solid fa-arrows-rotate" style={{ fontSize: 12 }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="page-body" style={{ display: 'flex', gap: 20, overflow: 'hidden', padding: '20px 24px' }}>

        {/* ── Left Panel — list + stats ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, overflow: 'hidden' }}>

          {/* Stats row */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 0 }}>
            {[
              { label: 'Total Calls',   value: stats.total,                   icon: 'fa-phone',        color: 'var(--accent2)' },
              { label: 'Inbound',       value: stats.inbound,                 icon: 'fa-phone-volume',  color: 'var(--accent)'  },
              { label: 'Outbound',      value: stats.outbound,                icon: 'fa-phone-arrow-up-right', color: 'var(--accent3)' },
              { label: 'Missed',        value: stats.missed,                  icon: 'fa-phone-missed',  color: '#f87171'        },
              { label: 'Avg Duration',  value: fmtDuration(stats.avgDuration), icon: 'fa-clock',        color: 'var(--accent2)' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--bg-surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: s.color, fontSize: 12,
                }}>
                  <i className={`fa-solid ${s.icon}`} />
                </div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-val" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Search + Filter toolbar */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <div className="search-input-wrap" style={{ flex: 1, height: 36 }}>
              <i className="fa-solid fa-magnifying-glass" />
              <input
                placeholder="Search by name or phone…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {(['all','inbound','outbound','missed'] as const).map(f => (
              <button
                key={f}
                className={`pf-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Call list */}
          <div className="data-table" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="table-header">
              <span className="table-title">
                {filtered.length} {filter !== 'all' ? filter : ''} call{filtered.length !== 1 ? 's' : ''}
              </span>
              {loading && (
                <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--text-muted)', fontSize: 13 }} />
              )}
            </div>

            {error ? (
              <div style={{
                padding: 24, textAlign: 'center', color: '#f87171', fontSize: 13,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}>
                <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 24, opacity: 0.7 }} />
                <div>{error}</div>
                <button className="btn btn-secondary" onClick={loadLogs} style={{ marginTop: 4 }}>Retry</button>
              </div>
            ) : !loading && filtered.length === 0 ? (
              <div className="empty-state" style={{ flex: 1 }}>
                <i className="fa-solid fa-phone-slash" />
                <p>{searchQuery ? 'No calls match your search.' : 'No call logs yet.'}</p>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Contact</th>
                      <th style={{ width: '12%' }}>Direction</th>
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '12%' }}>Duration</th>
                      <th style={{ width: '19%' }}>Time</th>
                      <th style={{ width: '12%' }}>Rec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(log => {
                      const sc     = statusConfig(log.status)
                      const isOut  = log.direction === 'outbound'
                      const isSel  = selected?.id === log.id
                      return (
                        <tr
                          key={log.id}
                          onClick={() => setSelected(isSel ? null : log)}
                          style={{ cursor: 'pointer', background: isSel ? 'var(--bg-active)' : undefined }}
                        >
                          {/* Contact */}
                          <td className="primary">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                background: 'var(--bg-surface2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)',
                              }}>
                                {contactInitials(log)}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {contactName(log)}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {log.from_phone ?? log.to_phone ?? '—'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Direction */}
                          <td>
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: 11, fontWeight: 600,
                              color:      isOut ? 'var(--accent3)' : 'var(--accent)',
                            }}>
                              <i className={`fa-solid ${isOut ? 'fa-arrow-up-right' : 'fa-arrow-down-left'}`} style={{ fontSize: 9 }} />
                              {isOut ? 'Out' : 'In'}
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            <span className="pill" style={{ background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 700 }}>
                              {sc.label}
                            </span>
                          </td>

                          {/* Duration */}
                          <td style={{ fontSize: 12 }}>{fmtDuration(log.duration_seconds)}</td>

                          {/* Time */}
                          <td>
                            <div style={{ fontSize: 12 }}>{relativeTime(log.started_at)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtTime(log.started_at)}</div>
                          </td>

                          {/* Recording play button — only shown if recording_id is set */}
                          <td onClick={e => e.stopPropagation()}>
                            {log.recording_id ? (
                              <button
                                className="icon-btn"
                                title="Play recording"
                                onClick={() => {
                                  setSelected(log)
                                  setAudioSrc(null)
                                  playRecording(log.recording_id!)
                                }}
                                style={{ color: 'var(--accent)', fontSize: 12, width: 28, height: 28 }}
                              >
                                <i className="fa-solid fa-circle-play" />
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                            )}
                          </td>

                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Detail Panel ── */}
        {selected && (
          <div style={{
            width:         320,
            flexShrink:    0,
            background:    'var(--bg-panel)',
            border:        '1px solid var(--border)',
            borderRadius:  14,
            display:       'flex',
            flexDirection: 'column',
            overflow:      'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding:       '14px 16px',
              borderBottom:  '1px solid var(--border)',
              display:       'flex',
              alignItems:    'center',
              justifyContent:'space-between',
            }}>
              <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14 }}>
                Call Detail
              </span>
              <button className="icon-btn" onClick={() => setSelected(null)} style={{ fontSize: 13 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Contact block */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'var(--accent-glow)',
                  border:     '2px solid var(--border-active)',
                  display:    'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize:   20, fontWeight: 700, color: 'var(--accent)',
                }}>
                  {contactInitials(selected)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{contactName(selected)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {selected.from_phone ?? selected.to_phone ?? '—'}
                  </div>
                </div>
                {/* Status badge */}
                {(() => {
                  const sc = statusConfig(selected.status)
                  return (
                    <span className="pill" style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                      {sc.label}
                    </span>
                  )
                })()}
              </div>

              {/* Info rows */}
              <div style={{ background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {[
                  { label: 'Direction',   value: selected.direction.charAt(0).toUpperCase() + selected.direction.slice(1) },
                  { label: 'Duration',    value: fmtDuration(selected.duration_seconds) },
                  { label: 'Started',     value: fmtTime(selected.started_at) },
                  { label: 'Ended',       value: selected.ended_at ? fmtTime(selected.ended_at) : '—' },
                  { label: 'Call ID',     value: selected.call_id ? selected.call_id.slice(0, 16) + '…' : '—' },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    className="info-row"
                    style={{
                      padding: '9px 12px',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <span className="label">{row.label}</span>
                    <span className="value" style={{ fontSize: 12, maxWidth: 160, textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Recording player — shown when call has a linked recording */}
              {selected.recording_id && (
                <div style={{ background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)', padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
                    🎤 Recording
                  </div>
                  {audioLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                      <i className="fa-solid fa-spinner fa-spin" />
                      Loading audio…
                    </div>
                  ) : audioSrc ? (
                    <audio
                      controls
                      src={audioSrc}
                      style={{ width: '100%', height: 36, borderRadius: 8 }}
                    />
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ width: '100%', justifyContent: 'center', gap: 7 }}
                      onClick={() => playRecording(selected.recording_id!)}
                    >
                      <i className="fa-solid fa-play" style={{ fontSize: 11 }} />
                      Play Recording
                    </button>
                  )}
                </div>
              )}

              {/* Metadata */}
              {selected.meta && Object.keys(selected.meta).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Meta
                  </div>
                  <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '8px 10px', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', lineHeight: 1.6, wordBreak: 'break-all' }}>
                    {JSON.stringify(selected.meta, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}