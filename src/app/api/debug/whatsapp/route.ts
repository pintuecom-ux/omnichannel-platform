import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This endpoint is for debugging only
// Hit: https://your-app.vercel.app/api/debug/whatsapp
// Remove or password-protect this before going to production

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const results: Record<string, any> = {}

  // 1. Check env vars are present (don't expose values)
  results.env = {
    NEXT_PUBLIC_SUPABASE_URL:       !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:      !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    WHATSAPP_TOKEN:                 !!process.env.WHATSAPP_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID:       process.env.WHATSAPP_PHONE_NUMBER_ID ?? 'MISSING',
    WHATSAPP_WEBHOOK_VERIFY_TOKEN:  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? 'MISSING',
    WHATSAPP_TOKEN_LENGTH:          process.env.WHATSAPP_TOKEN?.length ?? 0,
    WHATSAPP_TOKEN_START:           process.env.WHATSAPP_TOKEN?.slice(0, 15) ?? 'MISSING',
  }

  // 2. Check Supabase admin client works
  try {
    const { data: workspaces, error } = await admin
      .from('workspaces').select('id, name').limit(5)
    results.supabase_admin = error
      ? { ok: false, error: error.message }
      : { ok: true, workspaces: workspaces?.map(w => ({ id: w.id, name: w.name })) }
  } catch (e: any) {
    results.supabase_admin = { ok: false, error: e.message }
  }

  // 3. Check channels table
  try {
    const { data: channels, error } = await admin
      .from('channels')
      .select('id, platform, name, external_id, is_active')
      .eq('platform', 'whatsapp')

    results.whatsapp_channels = error
      ? { ok: false, error: error.message }
      : {
          ok: true,
          count: channels?.length ?? 0,
          channels: channels?.map(c => ({
            id: c.id,
            name: c.name,
            external_id: c.external_id,
            is_active: c.is_active,
            external_id_matches_env: c.external_id === process.env.WHATSAPP_PHONE_NUMBER_ID,
          }))
        }
  } catch (e: any) {
    results.whatsapp_channels = { ok: false, error: e.message }
  }

  // 4. Check token in DB vs env
  try {
    const { data: ch } = await admin
      .from('channels')
      .select('access_token')
      .eq('platform', 'whatsapp')
      .single()

    if (ch) {
      const dbToken = ch.access_token
      const envToken = process.env.WHATSAPP_TOKEN ?? ''
      results.token_comparison = {
        db_token_length: dbToken?.length ?? 0,
        db_token_start: dbToken?.slice(0, 15) ?? 'EMPTY',
        env_token_start: envToken.slice(0, 15) || 'MISSING',
        tokens_match: dbToken === envToken,
        db_token_looks_valid: (dbToken?.length ?? 0) > 100,
      }
    }
  } catch (e: any) {
    results.token_comparison = { ok: false, error: e.message }
  }

  // 5. Recent messages
  try {
    const { data: msgs, error } = await admin
      .from('messages')
      .select('id, direction, content_type, body, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    results.recent_messages = error
      ? { ok: false, error: error.message }
      : { ok: true, count: msgs?.length ?? 0, messages: msgs }
  } catch (e: any) {
    results.recent_messages = { ok: false, error: e.message }
  }

  // 6. Webhook URL (what Meta should be configured to POST to)
  const host = req.headers.get('host') ?? 'your-app.vercel.app'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  results.webhook_info = {
    correct_webhook_url: `${protocol}://${host}/api/webhooks/whatsapp`,
    verify_token: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? 'MISSING',
    note: 'This URL must match exactly what you entered in Meta Developer Console > WhatsApp > Configuration > Webhook',
  }

  return NextResponse.json(results, {
    headers: { 'Content-Type': 'application/json' }
  })
}
