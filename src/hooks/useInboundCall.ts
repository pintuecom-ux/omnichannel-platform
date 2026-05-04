
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface InboundCallPayload {
  call_id:         string
  from_phone:      string
  contact_name:    string
  conversation_id: string | null
  sdp:             string | null
  sdp_type:        string | null
}

export function useInboundCall(workspaceId: string | null) {
  const [inboundCall, setInboundCall] = useState<InboundCallPayload | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    const supabase = createClient()
    const channel  = supabase
      .channel(`workspace:${workspaceId}`)
      .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        console.log('[InboundCall] Incoming call:', payload)
        setInboundCall(payload as InboundCallPayload)
      })
      .subscribe((status, err) => {
        console.log(`[InboundCall] Subscription status for workspace:${workspaceId}:`, status, err || '')
      })
    return () => { supabase.removeChannel(channel) }
  }, [workspaceId])

  return { inboundCall, dismissCall: () => setInboundCall(null) }
}
