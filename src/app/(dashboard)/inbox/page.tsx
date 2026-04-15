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

    // Step 1: get session
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr || !session) {
      setLoadError('Not logged in')
      return
    }

    // Step 2: get profile + workspace_id
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileErr || !profile) {
      setLoadError(`Profile not found for user ${session.user.id}. Run the SQL from Step 3 of the guide.`)
      console.error('[Inbox] Profile error:', profileErr)
      return
    }

    setProfile(profile)
    setWorkspaceId(profile.workspace_id)

    // Step 3: load conversations
    const { data: conversations, error: convErr } = await supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts(*),
        channel:channels(*),
        assignee:profiles!conversations_assigned_to_fkey(id, full_name, avatar_url, role, email, workspace_id, is_online, created_at)
      `)
      .eq('workspace_id', profile.workspace_id)
      .order('last_message_at', { ascending: false })
      .limit(100)

    if (convErr) {
      console.error('[Inbox] Conversations error:', convErr)
      setLoadError(`Could not load conversations: ${convErr.message}`)
      return
    }

    console.log(`[Inbox] Loaded ${conversations?.length ?? 0} conversations for workspace ${profile.workspace_id}`)
    setConversations((conversations ?? []) as Conversation[])
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return

    const channel = supabase
      .channel(`inbox-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Realtime] Conversation change:', payload.eventType)
          loadData()
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [workspaceId, loadData])

  if (loadError) {
    return (
      <div className="page-inbox" style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 32, color: 'var(--accent4)', opacity: 0.6 }} />
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400 }}>
          {loadError}
        </p>
        <button className="btn btn-secondary" onClick={loadData} style={{ marginTop: 8 }}>
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