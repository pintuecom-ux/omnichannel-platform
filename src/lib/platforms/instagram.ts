import axios from 'axios'

const BASE = 'https://graph.facebook.com/v19.0'

export class InstagramClient {
  constructor(
    private accessToken: string,
    private igAccountId: string
  ) {}

  async sendDM(recipientId: string, text: string) {
    const res = await axios.post(
      `${BASE}/${this.igAccountId}/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
      },
      { params: { access_token: this.accessToken } }
    )
    return res.data
  }

  async replyToComment(commentId: string, text: string) {
    const res = await axios.post(
      `${BASE}/${commentId}/replies`,
      { message: text },
      { params: { access_token: this.accessToken } }
    )
    return res.data
  }

  async hideComment(commentId: string, hide = true) {
    await axios.post(
      `${BASE}/${commentId}`,
      { is_hidden: hide },
      { params: { access_token: this.accessToken } }
    )
  }

  async likeComment(commentId: string) {
    await axios.post(
      `${BASE}/${commentId}/likes`,
      {},
      { params: { access_token: this.accessToken } }
    )
  }
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

    // Direct Messages
    for (const messaging of entry.messaging ?? []) {
      if (messaging.message) {
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
    }

    // Comments on posts
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
    }
  }

  return events
}