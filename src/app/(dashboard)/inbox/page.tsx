'use client'
import { useEffect, useCallback } from 'react'
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

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (!profile) return
    setProfile(profile)

    const { data: conversations } = await supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts(*),
        channel:channels(*),
        assignee:profiles(id, full_name, avatar_url, role, email, workspace_id, is_online, created_at)
      `)
      .eq('workspace_id', profile.workspace_id)
      .order('last_message_at', { ascending: false })
      .limit(100)

    if (conversations) setConversations(conversations as Conversation[])
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime subscription
  useEffect(() => {
    let workspaceId: string | null = null

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', session.user.id)
        .single()

      if (!profile) return
      workspaceId = profile.workspace_id

      const channel = supabase
        .channel('inbox-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `workspace_id=eq.${workspaceId}`,
        }, () => loadData())
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }

    init()
  }, [loadData])

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