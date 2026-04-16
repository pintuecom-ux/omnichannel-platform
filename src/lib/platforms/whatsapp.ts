import axios from 'axios'

const BASE = 'https://graph.facebook.com/v19.0'

// Normalize phone for WhatsApp API (no +, digits only)
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\+\(\)]/g, '')
}

export class WhatsAppClient {
  constructor(
    private token: string,
    private phoneNumberId: string
  ) {}

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    }
  }

  async sendText(to: string, body: string): Promise<string> {
    const phone = normalizePhone(to)
    try {
      const res = await axios.post(
        `${BASE}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'text',
          text: { body, preview_url: false },
        },
        { headers: this.headers }
      )
      const msgId = res.data?.messages?.[0]?.id
      if (!msgId) throw new Error('No message_id in API response')
      return msgId
    } catch (err: any) {
      const apiErr = err?.response?.data?.error
      const msg = apiErr
        ? `WhatsApp API error ${apiErr.code}: ${apiErr.message}`
        : err.message
      console.error('[WA sendText]', msg)
      throw new Error(msg)
    }
  }

  async sendTemplate(
    to: string,
    name: string,
    langCode = 'en_US',
    components: any[] = []
  ): Promise<string> {
    const phone = normalizePhone(to)
    try {
      const res = await axios.post(
        `${BASE}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'template',
          template: {
            name,
            language: { code: langCode },
            ...(components.length > 0 ? { components } : {}),
          },
        },
        { headers: this.headers }
      )
      const msgId = res.data?.messages?.[0]?.id
      if (!msgId) throw new Error('No message_id in API response')
      return msgId
    } catch (err: any) {
      const apiErr = err?.response?.data?.error
      const msg = apiErr
        ? `WhatsApp API error ${apiErr.code}: ${apiErr.message}`
        : err.message
      console.error('[WA sendTemplate] HTTP status:', err?.response?.status)
      console.error('[WA sendTemplate] full body:', JSON.stringify(err?.response?.data ?? null))
      console.error('[WA sendTemplate] phone_number_id used:', this.phoneNumberId)
      console.error('[WA sendTemplate] to:', phone, '| template:', name, '| lang:', langCode)
      throw new Error(msg)
    }
  }

  async markRead(messageId: string): Promise<void> {
    try {
      await axios.post(
        `${BASE}/${this.phoneNumberId}/messages`,
        { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
        { headers: this.headers }
      )
    } catch (err: any) {
      console.warn('[WA markRead] Failed (non-critical):', err?.response?.data?.error?.message ?? err.message)
    }
  }
}

// ── Webhook payload parser ────────────────────────────────────────────────────

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
            text:     msg.text?.body    ?? null,
            image:    msg.image         ?? null,
            audio:    msg.audio         ?? null,
            document: msg.document      ?? null,
            sticker:  msg.sticker       ?? null,
            location: msg.location      ?? null,
            reaction: msg.reaction      ?? null,
          },
        })
      }

      // Status updates
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