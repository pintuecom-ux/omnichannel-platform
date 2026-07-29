'use client'
import { useEffect, useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInboxStore } from '@/stores/useInboxStore'
import { useAuthStore } from '@/stores/useAuthStore'
import ConversationPanel from '@/components/inbox/ConversationPanel'
import ChatWindow from '@/components/inbox/ChatWindow'
import InfoPanel from '@/components/inbox/InfoPanel'
import type { Conversation } from '@/types'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { MessageCircle, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function InboxPage() {
  const supabase = createClient()
  const { setConversations, activeConversationId } = useInboxStore()
  const { setProfile } = useAuthStore()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoadError(null)
    setIsLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { 
      setLoadError('Not logged in')
      setIsLoading(false)
      return 
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, workspace_id, full_name, email, role, avatar_url, is_online, created_at')
      .eq('id', session.user.id)
      .single()

    if (profileErr || !profile) {
      const code = profileErr?.code
      const msg = profileErr?.message ?? 'unknown error'
      console.error('[Inbox] Profile error:', code, msg)

      if (code === 'PGRST116') {
        setLoadError(`Profile row missing for user ${session.user.id}.\nCheck the profiles table in Supabase.`)
      } else {
        setLoadError(`Could not load profile.\nError [${code}]: ${msg}`)
      }
      setIsLoading(false)
      return
    }

    setProfile(profile)
    setWorkspaceId(profile.workspace_id)

    // Load conversations
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
      setIsLoading(false)
      return
    }

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
      contact: Array.isArray(c.contact) ? (c.contact[0] ?? null) : c.contact,
      channel: Array.isArray(c.channel) ? (c.channel[0] ?? null) : c.channel,
      assignee: c.assigned_to ? (assigneeMap[c.assigned_to] ?? null) : null,
    }))

    console.log(`[Inbox] Loaded ${merged.length} conversations`)
    setConversations(merged as Conversation[])
    setIsLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(async () => {
    if (workspaceId) {
      try {
        await fetch('/api/comments/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId }),
        })
      } catch (err) {
        console.warn('[Inbox Refresh Sync Error]', err)
      }
    }
    await loadData()
  }, [workspaceId, loadData])

  // Initial load
  useEffect(() => { loadData() }, [loadData])

  // 1. Supabase Realtime Subscription — auto-syncs conversations & inbound messages live
  useEffect(() => {
    if (!workspaceId) return
    const ch = supabase
      .channel(`inbox-realtime-${workspaceId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => loadData())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [workspaceId, loadData, supabase])

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 bg-neutral-50/50">
        <div className="max-w-md w-full flex flex-col gap-4">
          <Alert variant="error" title="Failed to load inbox">
            {loadError}
          </Alert>
          <Button variant="secondary" onClick={handleRefresh} className="self-center">
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full overflow-hidden bg-white">
        <div className="w-[340px] border-r border-neutral-200 flex flex-col p-4 gap-4">
          <div className="h-10 bg-neutral-100 rounded-lg animate-pulse" />
          <div className="flex-1 flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-neutral-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-neutral-50 border-l border-neutral-200">
          <div className="w-64 h-64 bg-neutral-100 rounded-full animate-pulse opacity-50" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      <ConversationPanel onRefresh={handleRefresh} />
      {activeConversationId ? (
        <>
          <ChatWindow />
          <InfoPanel />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-neutral-50 p-8 border-l border-neutral-200">
          <EmptyState 
            title="Your inbox is empty" 
            description="Select a conversation from the left to start chatting."
            icon={<MessageCircle />}
          />
        </div>
      )}
    </div>
  )
}

