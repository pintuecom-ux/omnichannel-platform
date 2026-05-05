import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { InstagramClient } from '@/lib/platforms/instagram'
import { getAuthenticatedUser, getWorkspaceProfile } from '@/lib/instagram/helpers'

const DEFAULT_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
  'instagram_business_content_publish',
]

function encodeState(payload: Record<string, string | number>) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getWorkspaceProfile(user.id)
  if (!profile?.workspace_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const appId = process.env.INSTAGRAM_APP_ID
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI
  if (!appId || !redirectUri) {
    return NextResponse.json({ error: 'Instagram app credentials are not configured' }, { status: 500 })
  }

  const scopes = (process.env.INSTAGRAM_SCOPES ?? DEFAULT_SCOPES.join(','))
    .split(',')
    .map(scope => scope.trim())
    .filter(Boolean)

  const state = encodeState({
    user_id: user.id,
    workspace_id: profile.workspace_id,
    nonce: crypto.randomUUID(),
    issued_at: Date.now(),
  })

  return NextResponse.redirect(InstagramClient.buildLoginUrl({
    appId,
    redirectUri,
    state,
    scopes,
  }))
}
