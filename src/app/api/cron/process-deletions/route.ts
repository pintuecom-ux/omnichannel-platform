// src/app/api/cron/process-deletions/route.ts
//
// Scheduled endpoint — runs daily to purge accounts past the 15-working-day window.
// Configure in vercel.json:
//
//   "crons": [{ "path": "/api/cron/process-deletions", "schedule": "0 2 * * *" }]
//
// Protected by CRON_SECRET env variable (set in Vercel dashboard).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // service role — bypasses RLS
)

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all deletion requests that are due and not yet executed / cancelled
  const { data: due, error } = await adminClient
    .from('account_deletion_requests')
    .select('id, user_id, workspace_id')
    .is('cancelled_at', null)
    .is('executed_at', null)
    .lte('scheduled_at', new Date().toISOString())

  if (error) {
    console.error('[process-deletions] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { id: string; status: string; error?: string }[] = []

  for (const req of (due ?? [])) {
    try {
      // Check: if the user logged in during the grace period, skip (the
      // settings UI should have already cancelled, but double-check here)
      const { data: lastSignIn } = await adminClient.auth.admin.getUserById(req.user_id)
      const lastActivity = lastSignIn?.user?.last_sign_in_at
      const scheduled = (due!.find(d => d.id === req.id) as any)?.scheduled_at

      if (lastActivity && scheduled && new Date(lastActivity) > new Date(scheduled)) {
        // User logged in after scheduling — treat as implicit cancellation
        await adminClient
          .from('account_deletion_requests')
          .update({ cancelled_at: new Date().toISOString() })
          .eq('id', req.id)
        results.push({ id: req.id, status: 'auto-cancelled (login detected)' })
        continue
      }

      // ── Execute deletion ──────────────────────────────────────────
      // 1. Delete conversations & messages (cascade should handle messages)
      await adminClient.from('conversations').delete().eq('workspace_id', req.workspace_id)

      // 2. Delete contacts
      await adminClient.from('contacts').delete().eq('workspace_id', req.workspace_id)

      // 3. Delete templates, flows, channels, canned responses
      for (const table of ['templates', 'flows', 'channels', 'canned_responses']) {
        await adminClient.from(table).delete().eq('workspace_id', req.workspace_id)
      }

      // 4. Delete workspace member profiles (except the owner — deleted with auth user)
      await adminClient.from('profiles').delete().eq('workspace_id', req.workspace_id)

      // 5. Delete workspace
      await adminClient.from('workspaces').delete().eq('id', req.workspace_id)

      // 6. Delete the auth user (cascades to profile via FK)
      await adminClient.auth.admin.deleteUser(req.user_id)

      // 7. Mark request as executed
      await adminClient
        .from('account_deletion_requests')
        .update({ executed_at: new Date().toISOString() })
        .eq('id', req.id)

      results.push({ id: req.id, status: 'deleted' })
    } catch (err: any) {
      console.error(`[process-deletions] error for request ${req.id}:`, err)
      results.push({ id: req.id, status: 'error', error: err.message })
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  })
}
