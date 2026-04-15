import axios from 'axios'

const BASE = 'https://graph.facebook.com/v19.0'

export class WhatsAppClient {
  constructor(
    private token: string,
    private phoneNumberId: string
  ) {}

  async sendText(to: string, body: string) {
    const res = await axios.post(
      `${BASE}/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body, preview_url: false },
      },
      { headers: { Authorization: `Bearer ${this.token}` } }
    )
    return res.data.messages[0].id as string
  }

  async sendTemplate(to: string, name: string, langCode = 'en', components: any[] = []) {
    const res = await axios.post(
      `${BASE}/${this.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name, language: { code: langCode }, components },
      },
      { headers: { Authorization: `Bearer ${this.token}` } }
    )
    return res.data.messages[0].id as string
  }

  async markRead(messageId: string) {
    await axios.post(
      `${BASE}/${this.phoneNumberId}/messages`,
      { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
      { headers: { Authorization: `Bearer ${this.token}` } }
    )
  }
}

// ─── Webhook payload parser ───────────────────────────────────────────────────

export interface ParsedWAEvent {
  type: 'message' | 'status'
  phoneNumberId: string
  data: any
}

export function parseWhatsAppWebhook(body: any): ParsedWAEvent[] {
  const events: ParsedWAEvent[] = []

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const val = change.value
      if (!val) continue
      const phoneNumberId: string = val.metadata?.phone_number_id ?? ''

      // Incoming messages
      for (const msg of val.messages ?? []) {
        const contact = (val.contacts ?? []).find((c: any) => c.wa_id === msg.from)
        events.push({
          type: 'message',
          phoneNumberId,
          data: {
            external_id: msg.id,
            from: msg.from,
            from_name: contact?.profile?.name ?? msg.from,
            timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
            type: msg.type,
            text: msg.text?.body ?? null,
            image: msg.image ?? null,
            audio: msg.audio ?? null,
            document: msg.document ?? null,
            sticker: msg.sticker ?? null,
            location: msg.location ?? null,
            reaction: msg.reaction ?? null,
          },
        })
      }

      // Status updates (sent/delivered/read)
      for (const st of val.statuses ?? []) {
        events.push({
          type: 'status',
          phoneNumberId,
          data: {
            external_id: st.id,
            status: st.status,
            timestamp: new Date(parseInt(st.timestamp) * 1000).toISOString(),
          },
        })
      }
    }
  }

  return events
}