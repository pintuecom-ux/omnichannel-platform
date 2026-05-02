'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInboundCall } from '@/hooks/useInboundCall'
import InboundCallBanner from '@/components/inbox/InboundCallBanner'

export default function InboundCallWatcher() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('profiles').select('workspace_id')
        .eq('id', session.user.id).single()
        .then(({ data }) => setWorkspaceId(data?.workspace_id ?? null))
    })
  }, [])

  const { inboundCall, dismissCall } = useInboundCall(workspaceId)

  if (!inboundCall) return null
  return <InboundCallBanner call={inboundCall} onDismiss={dismissCall} />
}