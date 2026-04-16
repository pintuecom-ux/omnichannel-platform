'use client'
import { useEffect, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInboxStore } from '@/stores/useInboxStore'
import { useAuthStore } from '@/stores/useAuthStore'
import ConversationPanel from '@/components/inbox/ConversationPanel'
import ChatWindow from '@/components/inbox/ChatWindow'
import InfoPanel from '@/components/inbox/InfoPanel'
import type { Conversation } from '@/types'

export default function InboxPage() {
  const supabase = createClient()
  const { setConversations, activeConversationId } = useInboxStore()
  const { setProfile } = useAuthStore()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoadError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoadError('Not logged in'); return }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, workspace_id, full_name, email, role, avatar_url, is_online, created_at')
      .eq('id', session.user.id)
      .single()

    if (profileErr || !profile) {
      console.error('[Inbox] Profile error:', profileErr?.message)
      setLoadError(`Profile not found. Run supabase-fix-final.sql Block 3 in Supabase SQL Editor.`)
      return
    }

    setProfile(profile)
    setWorkspaceId(profile.workspace_id)

    // Load conversations WITHOUT the problematic FK hint
    const { data: convs, error: convErr } = await supabase
      .from('conversations')
      .select(`
        id, workspace_id, contact_id, channel_id, platform,
        external_id, title, status, assigned_to, is_pinned,
        last_message, last_message_at, unread_count, tags, meta,
        created_at, updated_at,
        contact:contacts(
          id, workspace_id, name, phone, email,
          instagram_username, facebook_id, avatar_url, tags,
          notes, meta, created_at, updated_at
        ),
        channel:channels(
          id, workspace_id, platform, name,
          external_id, is_active, meta, created_at
        )
      `)
      .eq('workspace_id', profile.workspace_id)
      .order('last_message_at', { ascending: false })
      .limit(100)

    if (convErr) {
      console.error('[Inbox] Conversations error:', convErr.message)
      setLoadError(`Error loading conversations: ${convErr.message}`)
      return
    }

    // Load assignees separately to avoid FK ambiguity
    const assigneeIds = [...new Set(
      (convs ?? []).map(c => c.assigned_to).filter(Boolean) as string[]
    )]

    let assigneeMap: Record<string, any> = {}
    if (assigneeIds.length > 0) {
      const { data: assignees } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .in('id', assigneeIds)
      if (assignees) assigneeMap = Object.fromEntries(assignees.map(a => [a.id, a]))
    }

    const merged = (convs ?? []).map(c => ({
      ...c,
      // Supabase returns joined relations as arrays; unwrap to single objects
      contact: Array.isArray(c.contact) ? (c.contact[0] ?? null) : c.contact,
      channel: Array.isArray(c.channel) ? (c.channel[0] ?? null) : c.channel,
      assignee: c.assigned_to ? (assigneeMap[c.assigned_to] ?? null) : null,
    }))

    console.log(`[Inbox] Loaded ${merged.length} conversations`)
    setConversations(merged as Conversation[])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  // Realtime subscription for new conversations / updates
  useEffect(() => {
    if (!workspaceId) return
    const ch = supabase
      .channel(`inbox-realtime-${workspaceId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [workspaceId, loadData])

  if (loadError) {
    return (
      <div className="page-inbox" style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 32 }}>
        <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 40, color: 'var(--accent4)', opacity: 0.7 }} />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 440, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
          {loadError}
        </p>
        <button className="btn btn-secondary" onClick={loadData}>
          <i className="fa-solid fa-rotate" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="page-inbox">
      <ConversationPanel onRefresh={loadData} />
      {activeConversationId ? (
        <>
          <ChatWindow />
          <InfoPanel />
        </>
      ) : (
        <div className="empty-inbox">
          <i className="fa-solid fa-comments" />
          <p>Select a conversation to start</p>
        </div>
      )}
    </div>
  )
}