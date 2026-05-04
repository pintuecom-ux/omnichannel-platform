'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInboundCall } from '@/hooks/useInboundCall'
import InboundCallBanner from '@/components/inbox/InboundCallBanner'

export default function InboundCallWatcher() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    async function fetchWorkspace(userId: string) {
      const { data } = await supabase.from('profiles').select('workspace_id').eq('id', userId).single()
      if (mounted) setWorkspaceId(data?.workspace_id ?? null)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id && mounted) fetchWorkspace(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id && mounted) fetchWorkspace(session.user.id)
      else if (mounted) setWorkspaceId(null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const { inboundCall, dismissCall } = useInboundCall(workspaceId)

  if (!inboundCall) return null
  return <InboundCallBanner call={inboundCall} onDismiss={dismissCall} />
}