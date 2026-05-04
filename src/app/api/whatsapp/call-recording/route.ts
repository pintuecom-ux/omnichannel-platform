/**
 * src/app/api/whatsapp/call-recording/route.ts
 *
 * Receives a recorded audio blob from the browser (via FormData),
 * uploads it to Supabase Storage 'recordings' bucket, and inserts
 * a row in call_recordings table with metadata.
 *
 * POST /api/whatsapp/call-recording
 *   FormData fields:
 *     audio          File   — the recorded audio blob (webm/ogg/mp4)
 *     conversation_id string
 *     call_id         string  (Meta call_id)
 *     duration        string  (seconds, integer)
 *     message_id      string? (optional — call message to link)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as serverClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'

const admin = adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (!user || authErr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse multipart form
  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const audioFile      = form.get('audio') as File | null
  const conversationId = form.get('conversation_id') as string | null
  const callId         = form.get('call_id')         as string | null
  const durationStr    = form.get('duration')        as string | null
  const messageId      = form.get('message_id')      as string | null

  if (!audioFile || !conversationId) {
    return NextResponse.json({ error: 'audio and conversation_id are required' }, { status: 400 })
  }

  // Get workspace_id from profile
  const { data: profile } = await admin
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const workspaceId = profile.workspace_id
  const duration    = durationStr ? parseInt(durationStr, 10) : null

  // Strip codec suffix — Supabase Storage rejects 'audio/webm;codecs=opus'
  // Only the base MIME type is allowed: 'audio/webm', 'audio/ogg', 'audio/mp4'
  const rawMime = audioFile.type || 'audio/webm'
  const mime    = rawMime.split(';')[0].trim()          // 'audio/webm;codecs=opus' → 'audio/webm'
  const ext     = mime.split('/')[1] ?? 'webm'          // 'audio/webm' → 'webm'
  const filename    = `${callId ?? Date.now()}.${ext}`
  const storagePath = `${workspaceId}/${conversationId}/${filename}`

  // Convert File → Buffer
  const buffer = Buffer.from(await audioFile.arrayBuffer())

  // Upload to Supabase Storage 'recordings' bucket
  const { error: uploadErr } = await admin.storage
    .from('recordings')
    .upload(storagePath, buffer, {
      contentType: mime,
      upsert:      true,
    })

  if (uploadErr) {
    console.error('[Recording] Upload error:', uploadErr.message)
    return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 })
  }

  // Create a signed URL valid for 1 hour (recordings are private)
  const { data: signedData, error: signedErr } = await admin.storage
    .from('recordings')
    .createSignedUrl(storagePath, 3600)

  if (signedErr) console.warn('[Recording] Signed URL error (non-critical):', signedErr.message)

  // Insert metadata row
  const { data: recording, error: dbErr } = await admin
    .from('call_recordings')
    .insert({
      workspace_id:     workspaceId,
      conversation_id:  conversationId,
      message_id:       messageId ?? null,
      call_id:          callId    ?? null,
      storage_path:     storagePath,
      file_size_bytes:  buffer.byteLength,
      duration_seconds: duration,
      mime_type:        mime,
      recorded_by:      user.id,
    })
    .select()
    .single()

  if (dbErr) {
    console.error('[Recording] DB insert error:', dbErr.message)
    // File is uploaded — don't fail entirely, just warn
    return NextResponse.json({
      ok:         true,
      warning:    'File uploaded but metadata not saved: ' + dbErr.message,
      storage_path: storagePath,
    })
  }

  console.log(`[Recording] ✅ Saved: ${storagePath} (${buffer.byteLength} bytes, ${duration}s)`)

  // ── Backlink recording to call_logs ─────────────────────────────────────────
  // Set call_logs.recording_id so the dashboard can show a Play button for the call.
  // Matched by call_id (primary) or conversation_id (fallback).
  if (callId) {
    const { error: linkErr } = await admin.from('call_logs')
      .update({ recording_id: recording.id, updated_at: new Date().toISOString() })
      .eq('call_id', callId)

    if (linkErr) console.warn('[Recording] call_logs backlink warning:', linkErr.message)
    else console.log('[Recording] ✅ call_logs.recording_id linked via call_id:', recording.id)
  } else if (conversationId) {
    // Fallback if callId is missing (shouldn't happen anymore, but just in case)
    // PostgREST doesn't support order() and limit() on update(), so we select first
    const { data: logToUpdate } = await admin.from('call_logs')
      .select('id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (logToUpdate) {
      const { error: linkErr } = await admin.from('call_logs')
        .update({ recording_id: recording.id, updated_at: new Date().toISOString() })
        .eq('id', logToUpdate.id)
        
      if (linkErr) console.warn('[Recording] call_logs fallback backlink warning:', linkErr.message)
      else console.log('[Recording] ✅ call_logs.recording_id linked via conversation_id fallback:', recording.id)
    }
  }

  return NextResponse.json({
    ok:          true,
    recording_id: recording.id,
    storage_path: storagePath,
    signed_url:   signedData?.signedUrl ?? null,
    duration,
  })
}

// GET — return a fresh signed URL for playback (1 hour expiry)
export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (!user || authErr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recordingId = req.nextUrl.searchParams.get('id')
  if (!recordingId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Get the recording row (RLS will enforce workspace scope)
  const { data: rec, error: recErr } = await supabase
    .from('call_recordings')
    .select('storage_path, duration_seconds, mime_type, created_at, call_id')
    .eq('id', recordingId)
    .single()

  if (recErr || !rec) return NextResponse.json({ error: 'Recording not found' }, { status: 404 })

  const { data: signedData, error: signedErr } = await admin.storage
    .from('recordings')
    .createSignedUrl(rec.storage_path, 3600)

  if (signedErr || !signedData) {
    return NextResponse.json({ error: 'Could not generate playback URL' }, { status: 500 })
  }

  return NextResponse.json({
    ok:         true,
    signed_url: signedData.signedUrl,
    duration:   rec.duration_seconds,
    mime_type:  rec.mime_type,
    created_at: rec.created_at,
    call_id:    rec.call_id,
  })
}