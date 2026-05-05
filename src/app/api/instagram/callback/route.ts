/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { InstagramClient, debugInstagramToken } from '@/lib/platforms/instagram'
import { admin, getAuthenticatedUser, getInstagramChannel, getWorkspaceProfile, normalizeScopes } from '@/lib/instagram/helpers'

function decodeState(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error_description') ?? req.nextUrl.searchParams.get('error')
  const state = decodeState(req.nextUrl.searchParams.get('state'))

  if (error) {
    return NextResponse.redirect(new URL(`/settings/channels?tab=instagram&error=${encodeURIComponent(error)}`, req.url))
  }

  if (!code || !state?.workspace_id || !state?.user_id) {
    return NextResponse.redirect(new URL('/settings/channels?tab=instagram&error=missing_callback_data', req.url))
  }

  const user = await getAuthenticatedUser()
  if (!user || user.id !== state.user_id) {
    return NextResponse.redirect(new URL('/settings/channels?tab=instagram&error=auth_mismatch', req.url))
  }

  const profile = await getWorkspaceProfile(user.id)
  if (!profile || profile.workspace_id !== state.workspace_id) {
    return NextResponse.redirect(new URL('/settings/channels?tab=instagram&error=workspace_mismatch', req.url))
  }

  const clientId = process.env.INSTAGRAM_APP_ID
  const clientSecret = process.env.INSTAGRAM_APP_SECRET
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/settings/channels?tab=instagram&error=instagram_env_missing', req.url))
  }

  try {
    const shortToken = await InstagramClient.exchangeCodeForToken({
      clientId,
      clientSecret,
      redirectUri,
      code,
    })
    const longToken = await InstagramClient.exchangeLongLivedToken(shortToken.access_token, clientSecret)
    const account = await InstagramClient.getAuthorizedAccount(longToken.access_token)
    const debugToken = await debugInstagramToken(longToken.access_token).catch(() => null)
    const existing = await getInstagramChannel(profile.workspace_id)

    const meta = {
      ...(existing?.meta ?? {}),
      login_mode: 'instagram_login',
      username: account.username ?? existing?.meta?.username ?? null,
      account_type: account.account_type ?? existing?.meta?.account_type ?? null,
      token_expires_at: longToken.expires_in
        ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
        : null,
      granted_scopes: normalizeScopes(shortToken.permissions ?? debugToken?.scopes ?? []),
      webhook_subscribed: true,
      permissions_health: {
        granted: normalizeScopes(shortToken.permissions ?? debugToken?.scopes ?? []),
        missing: [],
      },
      auth_debug: debugToken,
    }

    if (existing?.id) {
      await admin.from('channels').update({
        name: account.username || existing.name,
        external_id: account.id,
        access_token: longToken.access_token,
        is_active: true,
        meta,
      }).eq('id', existing.id)
    } else {
      await admin.from('channels').insert({
        workspace_id: profile.workspace_id,
        platform: 'instagram',
        name: account.username || 'Instagram',
        external_id: account.id,
        access_token: longToken.access_token,
        is_active: true,
        meta,
      })
    }

    return NextResponse.redirect(new URL('/settings/channels?tab=instagram&connected=1', req.url))
  } catch (err: any) {
    const message = err?.response?.data?.error_message || err?.response?.data?.error?.message || err.message || 'instagram_callback_failed'
    return NextResponse.redirect(new URL(`/settings/channels?tab=instagram&error=${encodeURIComponent(message)}`, req.url))
  }
}
