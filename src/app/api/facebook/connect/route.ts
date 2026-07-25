import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { FacebookClient } from '@/lib/platforms/facebook'
import { getAuthenticatedUser, getWorkspaceProfile } from '@/lib/instagram/helpers'

const DEFAULT_SCOPES = [
  'pages_show_list',
  'pages_messaging',
  'pages_manage_metadata',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_read_user_content',
]

function encodeState(payload: Record<string, string | number>) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getWorkspaceProfile(user.id)
  if (!profile?.workspace_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const appId = process.env.FACEBOOK_APP_ID ?? process.env.META_APP_ID
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI
  const configId = process.env.FACEBOOK_CONFIGURATION_ID ?? process.env.META_CONFIGURATION_ID

  if (!appId || !redirectUri) {
    return NextResponse.json({ error: 'Facebook app credentials are not configured' }, { status: 500 })
  }

  const scopes = (process.env.FACEBOOK_SCOPES ?? DEFAULT_SCOPES.join(','))
    .split(',')
    .map(scope => scope.trim())
    .filter(Boolean)

  const state = encodeState({
    user_id: user.id,
    workspace_id: profile.workspace_id,
    nonce: crypto.randomUUID(),
    issued_at: Date.now(),
  })

  return NextResponse.redirect(FacebookClient.buildLoginUrl({
    appId,
    redirectUri,
    state,
    scopes,
    configId: configId ?? undefined,
  }))
}
