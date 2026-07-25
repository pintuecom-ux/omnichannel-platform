import axios from 'axios'
import crypto from 'crypto'

// ── Bumped from v19.0 → v22.0 (current stable as of 2025) ──────────────────
const BASE = 'https://graph.facebook.com/v22.0'

export class FacebookClient {
  constructor(
    private accessToken: string,
    private pageId: string
  ) {}

  static buildLoginUrl(opts: { appId: string; redirectUri: string; state: string; scopes: string[]; configId?: string }) {
    const url = new URL(`https://www.facebook.com/v22.0/dialog/oauth`)
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
  async sendMessage(recipientId: string, text: string) {
    try {
      const res = await axios.post(
        `${BASE}/${this.pageId}/messages`,
        {
          recipient: { id: recipientId },
          message: { text },
          messaging_type: 'RESPONSE',
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

  /** Fetch a user's public profile (name, profile_pic) via their PSID */
  async getUserProfile(psid: string) {
    try {
      let data: any
      try {
        const res = await axios.get(`${BASE}/${psid}`, {
          params: { fields: 'first_name,last_name,name,profile_pic', access_token: this.accessToken },
        })
        data = res.data
      } catch {
        const res = await axios.get(`${BASE}/${psid}`, {
          params: { fields: 'first_name,last_name,profile_pic', access_token: this.accessToken },
        })
        data = res.data
      }

      const fullName = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ') || psid
      const picture = typeof data.profile_pic === 'string'
        ? data.profile_pic
        : data.profile_pic?.data?.url ?? null

      console.log(`[FB getUserProfile] ✅ Success for psid=${psid}: name="${fullName}"`)
      return { name: fullName, profile_pic: picture }
    } catch (err: any) {
      console.warn(`[FB getUserProfile] ⚠️ Could not fetch profile for psid=${psid}:`, err?.response?.data?.error?.message || err.message)
      return null
    }
  }
}

/** Verify the x-hub-signature-256 header from Meta webhooks */
export function verifyFBSignature(rawBody: string, signature: string, appSecret: string): boolean {
  const hash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  return `sha256=${hash}` === signature
}

export interface ParsedFBEvent {
  type: 'message' | 'comment'
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
      // Skip delivery/read receipts — they have no .message
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