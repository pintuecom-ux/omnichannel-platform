import axios from 'axios'
import crypto from 'crypto'

const BASE = 'https://graph.facebook.com/v19.0'

export class FacebookClient {
  constructor(
    private accessToken: string,
    private pageId: string
  ) {}

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
    return res.data
  }

  async replyToComment(commentId: string, text: string) {
    const res = await axios.post(
      `${BASE}/${commentId}/comments`,
      { message: text },
      { params: { access_token: this.accessToken } }
    )
    return res.data
  }

  async likeComment(commentId: string) {
    await axios.post(
      `${BASE}/${commentId}/likes`,
      {},
      { params: { access_token: this.accessToken } }
    )
  }

  async hideComment(commentId: string, hide = true) {
    await axios.post(
      `${BASE}/${commentId}`,
      { is_hidden: hide },
      { params: { access_token: this.accessToken } }
    )
  }
}

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

    // Messenger messages
    for (const messaging of entry.messaging ?? []) {
      if (messaging.message) {
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
    }

    // Page feed comments
    for (const change of entry.changes ?? []) {
      if (change.field === 'feed' && change.value?.item === 'comment') {
        const v = change.value
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