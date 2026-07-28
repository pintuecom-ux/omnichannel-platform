import axios from 'axios'
import crypto from 'crypto'

// ── Bumped from v19.0 → v25.0 (current stable as of 2025) ──────────────────
const BASE = 'https://graph.facebook.com/v25.0'

export class FacebookClient {
  constructor(
    private accessToken: string,
    private pageId: string
  ) {}

  static buildLoginUrl(opts: { appId: string; redirectUri: string; state: string; scopes: string[]; configId?: string }) {
    const url = new URL(`https://www.facebook.com/v25.0/dialog/oauth`)
    url.searchParams.set('client_id', opts.appId)
    url.searchParams.set('redirect_uri', opts.redirectUri)
    url.searchParams.set('state', opts.state)
    url.searchParams.set('scope', opts.scopes.join(','))
    url.searchParams.set('response_type', 'code')
    if (opts.configId) url.searchParams.set('config_id', opts.configId)
    return url.toString()
  }

  static async exchangeToken(code: string, appId: string, appSecret: string, redirectUri: string) {
    const res = await axios.get(`${BASE}/oauth/access_token`, {
      params: {
        client_id: appId,
        redirect_uri: redirectUri,
        client_secret: appSecret,
        code,
      },
    })
    return res.data as { access_token: string; token_type: string; expires_in?: number }
  }

  static async getLongLivedToken(shortToken: string, appId: string, appSecret: string) {
    const res = await axios.get(`${BASE}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortToken,
      },
    })
    return res.data as { access_token: string; token_type: string; expires_in?: number }
  }

  static async getPageAccounts(userToken: string) {
    const res = await axios.get(`${BASE}/me/accounts`, {
      params: { access_token: userToken },
    })
    return res.data.data as Array<{ id: string; name: string; access_token: string; category: string; tasks: string[] }>
  }

  static async subscribePageWebhook(pageId: string, pageToken: string) {
    // Subscribe page to webhooks for messages, comments, feed
    await axios.post(
      `${BASE}/${pageId}/subscribed_apps`,
      { subscribed_fields: ['messages', 'messaging_postbacks', 'messaging_optins', 'message_deliveries', 'message_reads', 'feed'] },
      { params: { access_token: pageToken } }
    )
  }

  static async unsubscribePageWebhook(pageId: string, pageToken: string) {
    await axios.delete(
      `${BASE}/${pageId}/subscribed_apps`,
      { params: { access_token: pageToken } }
    )
  }

  /** Send a Messenger DM to a Page-scoped user ID (PSID) */
  async sendMessage(recipientId: string, text: string, opts?: { useHumanAgentTag?: boolean }) {
    try {
      const res = await axios.post(
        `${BASE}/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          message: { text },
          ...(opts?.useHumanAgentTag ? { messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' } : { messaging_type: 'RESPONSE' }),
        },
        { params: { access_token: this.accessToken } }
      )
      return res.data // { recipient_id, message_id }
    } catch (err: any) {
      const fbError = err?.response?.data?.error?.message || err?.response?.data || err.message
      console.error(`[FB sendMessage Error] To ${recipientId}:`, fbError)
      throw new Error(`Meta API Error: ${typeof fbError === 'string' ? fbError : JSON.stringify(fbError)}`)
    }
  }

  /** Mark messages as read ("seen") on Facebook Messenger */
  async markSeen(recipientId: string) {
    try {
      await axios.post(
        `${BASE}/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          sender_action: 'mark_seen',
        },
        { params: { access_token: this.accessToken } }
      )
    } catch (err: any) {
      console.warn(`[FB markSeen] Could not send read receipt to ${recipientId}:`, err?.response?.data?.error?.message || err.message)
    }
  }

  /** Send an emoji reaction to a Facebook Messenger DM message */
  async sendReaction(recipientId: string, messageId: string, emoji: string) {
    try {
      const isUnreact = !emoji || emoji === 'unreact' || emoji === ''
      const res = await axios.post(
        `${BASE}/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          sender_action: isUnreact ? 'unreact' : 'react',
          payload: {
            message_id: messageId,
            ...(isUnreact ? {} : { reaction: emoji }),
          },
        },
        { params: { access_token: this.accessToken } }
      )
      return res.data
    } catch (err: any) {
      const fbError = err?.response?.data?.error?.message || err?.response?.data || err.message
      console.error(`[FB sendReaction Error] To ${recipientId}:`, fbError)
      throw new Error(`Meta API Error: ${typeof fbError === 'string' ? fbError : JSON.stringify(fbError)}`)
    }
  }

  /** Reply to a Facebook Page post comment */
  async replyToComment(commentId: string, text: string) {
    try {
      const res = await axios.post(
        `${BASE}/${commentId}/comments`,
        { message: text },
        { params: { access_token: this.accessToken } }
      )
      return res.data // { id }
    } catch (err: any) {
      const fbError = err?.response?.data?.error?.message || err.message
      console.error(`[FB replyToComment Error]:`, fbError)
      throw new Error(`Meta API Error: ${fbError}`)
    }
  }

  /** Like a comment on behalf of the Page */
  async likeComment(commentId: string) {
    await axios.post(
      `${BASE}/${commentId}/likes`,
      {},
      { params: { access_token: this.accessToken } }
    )
  }

  /** Hide or un-hide a comment */
  async hideComment(commentId: string, hide = true) {
    await axios.post(
      `${BASE}/${commentId}`,
      { is_hidden: hide },
      { params: { access_token: this.accessToken } }
    )
  }

  /** Delete a comment (must be owner of the comment or the Page) */
  async deleteComment(commentId: string) {
    await axios.delete(
      `${BASE}/${commentId}`,
      { params: { access_token: this.accessToken } }
    )
  }

  /** Fetch a user's public profile (name, profile_pic, locale, timezone, gender) via their PSID */
  async getUserProfile(psid: string) {
    try {
      let data: any = {}
      try {
        const res = await axios.get(`${BASE}/${psid}`, {
          params: { fields: 'first_name,last_name,name,profile_pic,locale,timezone,gender', access_token: this.accessToken },
        })
        data = res.data
      } catch {
        try {
          const res = await axios.get(`${BASE}/${psid}`, {
            params: { fields: 'first_name,last_name,profile_pic', access_token: this.accessToken },
          })
          data = res.data
        } catch (e: any) {
          console.warn(`[FB getUserProfile] Fields query restricted for psid=${psid}:`, e?.response?.data?.error?.message || e.message)
        }
      }

      const fullName = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || null
      let picture = typeof data.profile_pic === 'string'
        ? data.profile_pic
        : data.profile_pic?.data?.url ?? null

      // Fetch direct CDN URL via Meta picture endpoint (redirect=false)
      try {
        const picRes = await axios.get(`${BASE}/${psid}/picture`, {
          params: { redirect: false, type: 'large', access_token: this.accessToken },
        })
        if (picRes.data?.data?.url) {
          picture = picRes.data.data.url
        }
      } catch {
        if (!picture) {
          picture = `${BASE}/${psid}/picture?type=large&access_token=${this.accessToken}`
        }
      }

      if (picture) picture = picture.replace(/&amp;/g, '&')

      let localTime: string | null = null
      if (typeof data.timezone === 'number') {
        const now = new Date()
        const utcMillis = now.getTime() + (now.getTimezoneOffset() * 60000)
        const customerDate = new Date(utcMillis + (3600000 * data.timezone))
        localTime = customerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      console.log(`[FB getUserProfile] ✅ Success for psid=${psid}: name="${fullName}", pic="${picture}", tz="${data.timezone}"`)
      return {
        name: fullName || `Facebook User (${psid.slice(-4)})`,
        profile_pic: picture,
        locale: data.locale ?? null,
        timezone: data.timezone ?? null,
        gender: data.gender ?? null,
        local_time: localTime,
      }
    } catch (err: any) {
      console.warn(`[FB getUserProfile] ⚠️ Error for psid=${psid}:`, err?.response?.data?.error?.message || err.message)
      const fallbackPic = `${BASE}/${psid}/picture?type=large&access_token=${this.accessToken}`.replace(/&amp;/g, '&')
      return { name: `Facebook User (${psid.slice(-4)})`, profile_pic: fallbackPic, locale: null, timezone: null, local_time: null }
    }
  }

  /** Dispatch transactional e-commerce notifications outside standard window via pages_utility_messaging */
  async sendUtilityMessage(recipientId: string, templateTitle: string, attributes: Record<string, string>) {
    try {
      const summaryText = `${templateTitle}\n\n` + Object.entries(attributes).map(([k, v]) => `• ${k}: ${v}`).join('\n')
      const res = await axios.post(
        `${BASE}/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          message: { text: summaryText },
          messaging_type: 'MESSAGE_TAG',
          tag: 'POST_PURCHASE_UPDATE',
        },
        { params: { access_token: this.accessToken } }
      )
      return res.data
    } catch (err: any) {
      const fbError = err?.response?.data?.error?.message || err.message
      console.error(`[FB sendUtilityMessage Error]:`, fbError)
      throw new Error(`Meta Utility Messaging Error: ${fbError}`)
    }
  }

  /** Retrieve engagement rate, impressions, and follower growth via read_insights permission */
  async getPageInsights(metrics: string[] = ['page_impressions', 'page_engaged_users', 'page_fans'], since?: string, until?: string, period = 'day') {
    try {
      const res = await axios.get(`${BASE}/${this.pageId}/insights`, {
        params: {
          metric: metrics.join(','),
          period,
          ...(since ? { since } : {}),
          ...(until ? { until } : {}),
          access_token: this.accessToken,
        },
      })
      return res.data?.data ?? []
    } catch (err: any) {
      console.warn(`[FB getPageInsights] Could not load insights:`, err?.response?.data?.error?.message || err.message)
      return []
    }
  }

  /** Publish organic photo, video, or text status directly to Facebook Page via pages_manage_posts */
  async publishMediaPost(opts: { message: string; mediaUrl?: string; isVideo?: boolean }) {
    try {
      let endpoint = `${BASE}/${this.pageId}/feed`
      const payload: Record<string, any> = { message: opts.message }

      if (opts.mediaUrl) {
        if (opts.isVideo) {
          endpoint = `${BASE}/${this.pageId}/videos`
          payload.file_url = opts.mediaUrl
          payload.description = opts.message
        } else {
          endpoint = `${BASE}/${this.pageId}/photos`
          payload.url = opts.mediaUrl
          payload.caption = opts.message
        }
      }

      const res = await axios.post(endpoint, payload, {
        params: { access_token: this.accessToken },
      })
      console.log(`[FB publishMediaPost] ✅ Deployed post to Page ${this.pageId} (ID: ${res.data.id})`)
      return res.data // { id }
    } catch (err: any) {
      const fbError = err?.response?.data?.error?.message || err.message
      console.error(`[FB publishMediaPost Error]:`, fbError)
      throw new Error(`Facebook Publishing Error: ${fbError}`)
    }
  }

  /** Delete an organic post from Facebook Page via pages_manage_posts */
  async deletePost(postId: string): Promise<void> {
    try {
      await axios.delete(`${BASE}/${postId}`, {
        params: { access_token: this.accessToken },
      })
      console.log(`[FB deletePost] Deleted post ${postId}`)
    } catch (err: any) {
      throw new Error(err?.response?.data?.error?.message || err.message)
    }
  }
}

/** Verify the x-hub-signature-256 header from Meta webhooks */
export function verifyFBSignature(rawBody: string, signature: string, appSecret: string): boolean {
  const hash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  return `sha256=${hash}` === signature
}

export interface ParsedFBEvent {
  type: 'message' | 'comment' | 'read'
  pageId: string
  data: any
}

export function parseFacebookWebhook(body: any): ParsedFBEvent[] {
  const events: ParsedFBEvent[] = []

  for (const entry of body.entry ?? []) {
    const pageId: string = entry.id ?? ''

    // ── Messenger messages ─────────────────────────────────────────────────
    for (const messaging of entry.messaging ?? []) {
      // FIX: skip echo messages (page messaging itself)
      if (messaging.sender?.id === pageId) continue

      // Read receipts sent when customer reads Page messages on Messenger
      if (messaging.read) {
        events.push({
          type: 'read',
          pageId,
          data: {
            sender_id: messaging.sender.id,
            watermark: messaging.read.watermark,
            timestamp: messaging.timestamp,
          },
        })
        continue
      }

      // Skip delivery receipts or non-message events
      if (!messaging.message) continue
      // Skip echoes sent by the page (echo flag)
      if (messaging.message.is_echo) continue

      events.push({
        type: 'message',
        pageId,
        data: {
          sender_id: messaging.sender.id,
          external_id: messaging.message.mid,
          text: messaging.message.text ?? null,
          attachments: messaging.message.attachments ?? null,
          timestamp: new Date(messaging.timestamp).toISOString(),
        },
      })
    }

    // ── Page feed comments ─────────────────────────────────────────────────
    for (const change of entry.changes ?? []) {
      if (change.field === 'feed' && change.value?.item === 'comment') {
        const v = change.value
        // Only handle new/add events, not edits or removals for simplicity
        if (v.verb && v.verb !== 'add') continue

        events.push({
          type: 'comment',
          pageId,
          data: {
            comment_id: v.comment_id,
            post_id: v.post_id,
            from: v.from ?? null,
            text: v.message ?? '',
            timestamp: new Date((v.created_time ?? Date.now() / 1000) * 1000).toISOString(),
          },
        })
      }
    }
  }

  return events
}