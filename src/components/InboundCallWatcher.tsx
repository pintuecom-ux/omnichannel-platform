'use client'
/**
 * InboundCallWatcher
 *
 * Mounted in the dashboard layout so it is always active.
 * Improvements:
 *  1. Retry logic if workspace_id fetch fails (network hiccup)
 *  2. Browser Notification API — fires a system notification even when
 *     the browser tab is in the background
 *  3. Subscription status logging for easier debugging
 */
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInboundCall } from '@/hooks/useInboundCall'
import InboundCallBanner from '@/components/inbox/InboundCallBanner'

export default function InboundCallWatcher() {
  const supabase = createClient()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [retries,     setRetries]     = useState(0)

  // ── Fetch workspace_id (with retry on failure) ─────────────────────────────
  const fetchWorkspace = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', userId)
        .single()

      if (error || !data?.workspace_id) {
        // Retry up to 3 times with 2s back-off
        if (retries < 3) {
          setTimeout(() => setRetries(r => r + 1), 2000)
          console.warn('[InboundCallWatcher] workspace_id fetch failed, retrying…', error?.message)
          return
        }
        console.error('[InboundCallWatcher] Could not resolve workspace_id after retries')
        return
      }

      console.log('[InboundCallWatcher] workspace_id resolved:', data.workspace_id)
      setWorkspaceId(data.workspace_id)
    } catch (e: any) {
      console.error('[InboundCallWatcher] fetchWorkspace error:', e.message)
    }
  }, [retries])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id && mounted) fetchWorkspace(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id && mounted) {
        fetchWorkspace(session.user.id)
      } else if (mounted) {
        setWorkspaceId(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchWorkspace])

  const { inboundCall, dismissCall } = useInboundCall(workspaceId)

  // ── Browser Notification API — system-level alert ─────────────────────────
  useEffect(() => {
    if (!inboundCall) return

    // Request permission if not already granted
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const notif = new Notification('Incoming WhatsApp Call', {
        body:  `${inboundCall.contactName || inboundCall.fromPhone} is calling…`,
        icon:  '/favicon.ico',
        tag:   `wa-call-${inboundCall.callId}`,
        requireInteraction: true,
      })
      notif.onclick = () => {
        window.focus()
        notif.close()
      }
      // Auto-close after 30s
      const t = setTimeout(() => notif.close(), 30000)
      return () => { clearTimeout(t); notif.close() }
    }
  }, [inboundCall?.callId])

  if (!inboundCall) return null
  return <InboundCallBanner call={inboundCall} onDismiss={dismissCall} />
}