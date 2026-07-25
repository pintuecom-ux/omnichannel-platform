import { NextRequest, NextResponse } from 'next/server'
import { FacebookClient } from '@/lib/platforms/facebook'
import { admin, getAuthenticatedUser, getWorkspaceProfile, normalizeScopes } from '@/lib/instagram/helpers'

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
    return NextResponse.redirect(new URL(`/settings/channels?tab=facebook&error=${encodeURIComponent(error)}`, req.url))
  }

  if (!code || !state?.workspace_id || !state?.user_id) {
    return NextResponse.redirect(new URL('/settings/channels?tab=facebook&error=missing_callback_data', req.url))
  }

  const user = await getAuthenticatedUser()
  if (!user || user.id !== state.user_id) {
    return NextResponse.redirect(new URL('/settings/channels?tab=facebook&error=auth_mismatch', req.url))
  }

  const profile = await getWorkspaceProfile(user.id)
  if (!profile || profile.workspace_id !== state.workspace_id) {
    return NextResponse.redirect(new URL('/settings/channels?tab=facebook&error=workspace_mismatch', req.url))
  }

  const appId = process.env.FACEBOOK_APP_ID ?? process.env.META_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET ?? process.env.META_APP_SECRET
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI

  if (!appId || !appSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/settings/channels?tab=facebook&error=facebook_env_missing', req.url))
  }

  try {
    const shortToken = await FacebookClient.exchangeToken(code, appId, appSecret, redirectUri)
    const longToken = await FacebookClient.getLongLivedToken(shortToken.access_token, appId, appSecret)
    
    // Fetch pages the user manages
    const pages = await FacebookClient.getPageAccounts(longToken.access_token)
    
    if (pages.length === 0) {
      return NextResponse.redirect(new URL('/settings/channels?tab=facebook&error=no_pages_found', req.url))
    }

    // Connect the first page for simplicity
    const page = pages[0]

    try {
      await FacebookClient.subscribePageWebhook(page.id, page.access_token)
    } catch (err: any) {
      console.warn('[FB callback] Page subscription failed:', err?.response?.data ?? err?.message ?? err)
    }

    // Find existing channel
    const { data: existing } = await admin
      .from('channels')
      .select('*')
      .eq('workspace_id', profile.workspace_id)
      .eq('platform', 'facebook')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const meta = {
      ...(existing?.meta ?? {}),
      login_mode: 'facebook_login',
      page_name: page.name,
      page_id: page.id,
      category: page.category,
      token_expires_at: longToken.expires_in
        ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
        : null,
      webhook_subscribed: true,
    }

    if (existing?.id) {
      await admin.from('channels').update({
        name: page.name,
        external_id: page.id,
        access_token: page.access_token,
        is_active: true,
        meta,
      }).eq('id', existing.id)
    } else {
      await admin.from('channels').insert({
        workspace_id: profile.workspace_id,
        platform: 'facebook',
        name: page.name,
        external_id: page.id,
        access_token: page.access_token,
        is_active: true,
        meta,
      })
    }

    return NextResponse.redirect(new URL('/settings/channels?tab=facebook&connected=1', req.url))
  } catch (err: any) {
    const message = err?.response?.data?.error_message || err?.response?.data?.error?.message || err.message || 'facebook_callback_failed'
    return NextResponse.redirect(new URL(`/settings/channels?tab=facebook&error=${encodeURIComponent(message)}`, req.url))
  }
}
