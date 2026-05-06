/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios'
import crypto from 'crypto'
import { buildMetaGraphUrl, META_GRAPH_BASE } from './meta'

export interface InstagramOAuthTokenResponse {
  access_token: string
  user_id?: string
  permissions?: string[]
  expires_in?: number
}

export interface InstagramAccountProfile {
  id: string
  username?: string
  profile_picture_url?: string
  followers_count?: number
  media_count?: number
  account_type?: string
  page_id?: string
  page_name?: string
}

export interface InstagramMediaContainerPayload {
  image_url?: string
  video_url?: string
  media_type?: 'IMAGE' | 'VIDEO' | 'REELS' | 'CAROUSEL'
  is_carousel_item?: boolean
  children?: string[]
  caption?: string
  alt_text?: string
  thumb_offset?: number
}

export interface InstagramMediaListItem {
  id: string
  caption?: string
  media_type?: string
  media_product_type?: string
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
  comments_count?: number
  like_count?: number
}

export class InstagramClient {
  constructor(
    private accessToken: string,
    private igAccountId: string
  ) {}

  private async get<T = any>(path: string, params?: Record<string, any>) {
    const res = await axios.get<T>(buildMetaGraphUrl(path), {
      params: { access_token: this.accessToken, ...params },
    })
    return res.data
  }

  private async post<T = any>(path: string, body?: Record<string, any>, params?: Record<string, any>) {
    const res = await axios.post<T>(
      buildMetaGraphUrl(path),
      body ?? {},
      { params: { access_token: this.accessToken, ...params } }
    )
    return res.data
  }

  private async del<T = any>(path: string, params?: Record<string, any>) {
    const res = await axios.delete<T>(buildMetaGraphUrl(path), {
      params: { access_token: this.accessToken, ...params },
    })
    return res.data
  }

  /** Send an Instagram DM to a user (Instagram-scoped ID) */
  async sendDM(recipientId: string, text: string) {
    return this.post(`${this.igAccountId}/messages`, {
      recipient: { id: recipientId },
      message: { text },
    })
  }

  /** Reply to an Instagram media comment */
  async replyToComment(commentId: string, text: string) {
    return this.post(`${commentId}/replies`, { message: text })
  }

  /** Hide or un-hide a comment on this IG account's media */
  async hideComment(commentId: string, hide = true) {
    await this.post(`${commentId}`, { is_hidden: hide })
  }

  /** Like a comment on behalf of this IG account */
  async likeComment(commentId: string) {
    await this.post(`${commentId}/likes`, {})
  }

  /** Delete a comment (must be owner of post) */
  async deleteComment(commentId: string) {
    await this.del(`${commentId}`)
  }

  /** Fetch an IG user's public details via their scoped ID */
  async getUserProfile(igsid: string) {
    try {
      return await this.get<{ name?: string; username?: string; profile_pic?: string }>(igsid, {
        fields: 'name,username,profile_pic',
      })
    } catch {
      return null
    }
  }

  async getAccountProfile() {
    return this.get<InstagramAccountProfile>(this.igAccountId, {
      fields: 'id,username,profile_picture_url,followers_count,media_count',
    })
  }

  async listMedia(limit = 25) {
    const data = await this.get<{ data: InstagramMediaListItem[] }>(`${this.igAccountId}/media`, {
      fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,comments_count,like_count',
      limit,
    })
    return data.data ?? []
  }

  async getMedia(mediaId: string) {
    return this.get<InstagramMediaListItem & Record<string, any>>(mediaId, {
      fields: 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,comments_count,like_count,children{media_type,media_url,thumbnail_url},owner,shortcode',
    })
  }

  async listComments(mediaId: string, limit = 100) {
    const data = await this.get<{ data: any[] }>(`${mediaId}/comments`, {
      fields: 'id,text,hidden,like_count,media{id},from{id,username},timestamp,parent_id,replies{id,text,hidden,like_count,from{id,username},timestamp,parent_id}',
      limit,
    })
    return data.data ?? []
  }

  async createMediaContainer(payload: InstagramMediaContainerPayload) {
    return this.post<{ id: string }>(`${this.igAccountId}/media`, payload)
  }

  async publishMediaContainer(creationId: string) {
    return this.post<{ id: string }>(`${this.igAccountId}/media_publish`, {
      creation_id: creationId,
    })
  }

  async getContainerStatus(creationId: string) {
    return this.get<Record<string, any>>(creationId, {
      fields: 'id,status_code,status,error_message',
    })
  }

  async getAccountInsights(metric: string[], since?: string, until?: string) {
    return this.get<{ data: any[] }>(`${this.igAccountId}/insights`, {
      metric: metric.join(','),
      ...(since ? { since } : {}),
      ...(until ? { until } : {}),
    })
  }

  async getMediaInsights(mediaId: string, metric: string[]) {
    return this.get<{ data: any[] }>(`${mediaId}/insights`, {
      metric: metric.join(','),
    })
  }

  static buildLoginUrl(params: {
    appId: string
    redirectUri: string
    state: string
    scopes: string[]
    configId?: string
  }) {
    const url = new URL('https://www.facebook.com/v25.0/dialog/oauth')
    url.searchParams.set('client_id', params.appId)
    url.searchParams.set('redirect_uri', params.redirectUri)
    url.searchParams.set('state', params.state)

    if (params.configId) {
      url.searchParams.set('config_id', params.configId)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('override_default_response_type', 'true')
    } else {
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('scope', params.scopes.join(','))
    }

    return url.toString()
  }

  static async exchangeCodeForToken(params: {
    clientId: string
    clientSecret: string
    redirectUri: string
    code: string
  }) {
    const res = await axios.get<{ access_token: string; token_type: string }>(
      buildMetaGraphUrl('oauth/access_token'),
      {
        params: {
          client_id: params.clientId,
          client_secret: params.clientSecret,
          redirect_uri: params.redirectUri,
          code: params.code,
        },
      }
    )
    return { access_token: res.data.access_token, permissions: [] }
  }

  static async exchangeLongLivedToken(accessToken: string, clientId: string, clientSecret: string) {
    const res = await axios.get<{ access_token: string; token_type: string; expires_in?: number }>(
      buildMetaGraphUrl('oauth/access_token'),
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: accessToken,
        },
      }
    )
    return { access_token: res.data.access_token, expires_in: res.data.expires_in, permissions: [] }
  }

  static async getAuthorizedAccount(accessToken: string) {
    const pagesRes = await axios.get<{ data: Array<{ id: string; name: string; access_token?: string; instagram_business_account?: { id: string } }> }>(
      buildMetaGraphUrl('me/accounts'),
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,instagram_business_account',
        },
      }
    )

    for (const page of pagesRes.data?.data ?? []) {
      const igId = page.instagram_business_account?.id
      if (!igId) continue

      const accountRes = await axios.get<InstagramAccountProfile>(buildMetaGraphUrl(igId), {
        params: {
          access_token: accessToken,
          fields: 'id,username,media_count,followers_count,profile_picture_url',
        },
      })
      return {
        ...accountRes.data,
        account_type: 'PROFESSIONAL',
        page_id: page.id,
        page_name: page.name,
      }
    }

    throw new Error('No Instagram Business Account found on the connected Facebook Pages')
  }

  static async subscribeAppToPage(pageId: string, pageAccessToken: string) {
    // IMPORTANT: Only valid Page subscription fields are listed here.
    // 'comments' is NOT valid for /{page-id}/subscribed_apps — Meta returns #100.
    // Instagram comment events are delivered via the Instagram webhook object
    // configured separately in the Meta App Dashboard (not via page subscription).
    //
    // Valid page fields used here:
    //  messages           — DMs via Messenger Platform (page-linked Instagram DMs)
    //  messaging_postbacks — button taps / quick replies
    //  messaging_optins   — opt-in events
    //  message_deliveries  — delivery receipts
    //  message_reads      — read receipts
    //  messaging_referrals — referral payloads
    //  feed               — page post comments, likes (broad coverage)
    //  mention            — @mentions of the page
    const res = await axios.post<{ success?: boolean }>(
      buildMetaGraphUrl(`${pageId}/subscribed_apps`),
      null,
      {
        params: {
          access_token: pageAccessToken,
          subscribed_fields: [
            'messages',
            'messaging_postbacks',
            'messaging_optins',
            'message_deliveries',
            'message_reads',
            'messaging_referrals',
            'feed',
            'mention',
          ].join(','),
        },
      }
    )
    return res.data
  }

  static async getManagedPages(accessToken: string) {
    const res = await axios.get<{ data: Array<{ id: string; name: string; access_token?: string; instagram_business_account?: { id: string } }> }>(
      buildMetaGraphUrl('me/accounts'),
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,instagram_business_account',
        },
      }
    )
    return res.data?.data ?? []
  }
}

/** Verify the x-hub-signature-256 header from Meta webhooks */
export function verifyIGSignature(rawBody: string, signature: string, appSecret: string): boolean {
  const hash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  return `sha256=${hash}` === signature
}

export interface ParsedIGEvent {
  type: 'dm' | 'comment'
  igAccountId: string
  /** True when the webhook object was 'page' (Messenger Platform / page subscription).
   *  In this case igAccountId is the Facebook Page ID, not the IG account ID.
   *  Channel lookup must use meta->page_id instead of external_id. */
  isPageObject: boolean
  data: any
}

export function parseInstagramWebhook(body: any): ParsedIGEvent[] {
  const events: ParsedIGEvent[] = []
  const isPageObject = body.object === 'page'

  for (const entry of body.entry ?? []) {
    const igAccountId: string = entry.id ?? ''

    for (const messaging of entry.messaging ?? []) {
      if (messaging.message?.is_echo) continue
      if (!messaging.message) continue

      events.push({
        type: 'dm',
        igAccountId,
        isPageObject,
        data: {
          sender_id: messaging.sender.id,
          recipient_id: messaging.recipient.id,
          external_id: messaging.message.mid,
          text: messaging.message.text ?? null,
          attachments: messaging.message.attachments ?? null,
          timestamp: new Date(messaging.timestamp).toISOString(),
        },
      })
    }

    for (const change of entry.changes ?? []) {
      if (change.field === 'comments' && change.value) {
        const v = change.value
        events.push({
          type: 'comment',
          igAccountId,
          isPageObject,
          data: {
            comment_id: v.id,
            parent_comment_id: v.parent_id ?? null,
            post_id: v.media?.id ?? null,
            media_id: v.media?.id ?? null,
            from: v.from ?? null,
            text: v.text ?? '',
            hidden: v.hidden ?? false,
            timestamp: new Date((v.timestamp ?? Date.now() / 1000) * 1000).toISOString(),
          },
        })
      }

      if (change.field === 'mentions' && change.value) {
        const v = change.value
        events.push({
          type: 'comment',
          igAccountId,
          isPageObject,
          data: {
            comment_id: v.comment_id ?? v.id,
            parent_comment_id: v.parent_id ?? null,
            post_id: v.media_id ?? null,
            media_id: v.media_id ?? null,
            from: v.from ?? null,
            text: v.text ?? '',
            isMention: true,
            timestamp: new Date().toISOString(),
          },
        })
      }
    }
  }

  return events
}

export async function debugInstagramToken(accessToken: string) {
  const res = await axios.get<{ data: Record<string, any> }>(buildMetaGraphUrl('debug_token'), {
    params: {
      input_token: accessToken,
      access_token: accessToken,
    },
  })
  return res.data?.data ?? null
}

export { META_GRAPH_BASE }
