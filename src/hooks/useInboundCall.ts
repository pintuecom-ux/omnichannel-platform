
'use client'
/**
 * useInboundCall
 *
 * Subscribes to Supabase Realtime broadcast channel for incoming call events.
 * The channel name matches what the webhook handler broadcasts to:
 *   `workspace:{workspaceId}` with event `incoming_call`
 *
 * Improvements:
 *  - Normalises both snake_case (server) and camelCase field names
 *  - Exposes `callId` and `contactName` in camelCase for convenience
 *  - Logs subscription lifecycle events
 */
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface InboundCallPayload {
  // snake_case from server broadcast
  call_id:         string
  from_phone:      string
  contact_name:    string
  conversation_id: string | null
  sdp:             string | null
  sdp_type:        string | null
  // camelCase aliases (normalised by hook)
  callId:          string
  fromPhone:       string
  contactName:     string
  conversationId:  string | null
}

export function useInboundCall(workspaceId: string | null) {
  const [inboundCall, setInboundCall] = useState<InboundCallPayload | null>(null)

  useEffect(() => {
    if (!workspaceId) return

    const supabase = createClient()
    const channel  = supabase
      .channel(`workspace:${workspaceId}`)
      .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        console.log('[useInboundCall] ✅ incoming_call received:', payload)

        // Normalise both snake_case and camelCase variants
        const normalised: InboundCallPayload = {
          call_id:         payload.call_id         ?? payload.callId         ?? '',
          from_phone:      payload.from_phone       ?? payload.fromPhone       ?? '',
          contact_name:    payload.contact_name     ?? payload.contactName     ?? '',
          conversation_id: payload.conversation_id  ?? payload.conversationId  ?? null,
          sdp:             payload.sdp              ?? null,
          sdp_type:        payload.sdp_type         ?? payload.sdpType         ?? null,
          // camelCase aliases
          callId:          payload.call_id          ?? payload.callId          ?? '',
          fromPhone:       payload.from_phone        ?? payload.fromPhone        ?? '',
          contactName:     payload.contact_name      ?? payload.contactName      ?? '',
          conversationId:  payload.conversation_id   ?? payload.conversationId   ?? null,
        }

        setInboundCall(normalised)
      })
      .subscribe((status, err) => {
        if (err) {
          console.error(`[useInboundCall] Subscription error for workspace:${workspaceId}:`, err)
        } else {
          console.log(`[useInboundCall] Channel workspace:${workspaceId} status:`, status)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [workspaceId])

  return {
    inboundCall,
    dismissCall: () => setInboundCall(null),
  }
}
