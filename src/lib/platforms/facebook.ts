import axios from 'axios'
import crypto from 'crypto'

// ── Bumped from v19.0 → v22.0 (current stable as of 2025) ──────────────────
const BASE = 'https://graph.facebook.com/v22.0'

export class FacebookClient {
  constructor(
    private accessToken: string,
    private pageId: string
  ) {}

  /** Send a Messenger DM to a Page-scoped user ID (PSID) */
  async sendMessage(recipientId: string, text: string) {
    const res = await axios.post(
      `${BASE}/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'RESPONSE',
      },
      { params: { access_token: this.accessToken } }
    )
    return res.data // { recipient_id, message_id }
  }

  /** Reply to a Facebook Page post comment */
  async replyToComment(commentId: string, text: string) {
    const res = await axios.post(
      `${BASE}/${commentId}/comments`,
      { message: text },
      { params: { access_token: this.accessToken } }
    )
    return res.data // { id }
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
      const res = await axios.get(`${BASE}/${psid}`, {
        params: { fields: 'name,profile_pic', access_token: this.accessToken },
      })
      return res.data as { name: string; profile_pic?: string }
    } catch {
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