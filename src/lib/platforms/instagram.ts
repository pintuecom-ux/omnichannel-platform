import axios from 'axios'
import crypto from 'crypto'

// ── Bumped from v19.0 → v22.0 (current stable as of 2025) ──────────────────
const BASE = 'https://graph.facebook.com/v22.0'

export class InstagramClient {
  constructor(
    private accessToken: string,
    private igAccountId: string
  ) {}

  /** Send an Instagram DM to a user (Instagram-Scoped ID / IGSID) */
  async sendDM(recipientId: string, text: string) {
    const res = await axios.post(
      `${BASE}/${this.igAccountId}/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
      },
      { params: { access_token: this.accessToken } }
    )
    return res.data // { message_id, recipient_id }
  }

  /** Reply to an Instagram media comment */
  async replyToComment(commentId: string, text: string) {
    const res = await axios.post(
      `${BASE}/${commentId}/replies`,
      { message: text },
      { params: { access_token: this.accessToken } }
    )
    return res.data // { id }
  }

  /** Hide or un-hide a comment on this IG account's media */
  async hideComment(commentId: string, hide = true) {
    await axios.post(
      `${BASE}/${commentId}`,
      { is_hidden: hide },
      { params: { access_token: this.accessToken } }
    )
  }

  /** Like a comment on behalf of this IG account */
  async likeComment(commentId: string) {
    await axios.post(
      `${BASE}/${commentId}/likes`,
      {},
      { params: { access_token: this.accessToken } }
    )
  }

  /** Delete a comment (must be owner of post) */
  async deleteComment(commentId: string) {
    await axios.delete(
      `${BASE}/${commentId}`,
      { params: { access_token: this.accessToken } }
    )
  }

  /** Fetch an IG user's name and profile pic via their IGSID */
  async getUserProfile(igsid: string) {
    try {
      const res = await axios.get(`${BASE}/${igsid}`, {
        params: { fields: 'name,profile_pic', access_token: this.accessToken },
      })
      return res.data as { name: string; profile_pic?: string }
    } catch {
      return null
    }
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
  data: any
}

export function parseInstagramWebhook(body: any): ParsedIGEvent[] {
  const events: ParsedIGEvent[] = []

  for (const entry of body.entry ?? []) {
    const igAccountId: string = entry.id ?? ''

    // ── Direct Messages ────────────────────────────────────────────────────
    for (const messaging of entry.messaging ?? []) {
      // Skip echoes (sent by the business account itself)
      if (messaging.message?.is_echo) continue
      if (!messaging.message) continue

      events.push({
        type: 'dm',
        igAccountId,
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

    // ── Comments on IG posts ───────────────────────────────────────────────
    for (const change of entry.changes ?? []) {
      if (change.field === 'comments' && change.value) {
        const v = change.value
        events.push({
          type: 'comment',
          igAccountId,
          data: {
            comment_id: v.id,
            post_id: v.media?.id ?? null,
            from: v.from ?? null,
            text: v.text ?? '',
            timestamp: new Date((v.timestamp ?? Date.now() / 1000) * 1000).toISOString(),
          },
        })
      }

      // ── Mentions (someone tags the account in a comment) ──────────────
      if (change.field === 'mentions' && change.value) {
        const v = change.value
        events.push({
          type: 'comment',
          igAccountId,
          data: {
            comment_id: v.comment_id ?? v.id,
            post_id: v.media_id ?? null,
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