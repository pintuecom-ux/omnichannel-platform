import axios from 'axios'

// Updated to v25.0 to match Meta's current API
// (your Postman was using v25.0, code was on v19.0)
const BASE = 'https://graph.facebook.com/v25.0'

export function normalizePhone(phone: string): string {
  // Remove +, spaces, dashes, parentheses — WA API wants raw digits
  return phone.replace(/[\s\-\+\(\)]/g, '')
}

export class WhatsAppClient {
  private token: string
  private phoneNumberId: string

  constructor(token: string, phoneNumberId: string) {
    // If the token from DB looks expired/empty, fall back to env var
this.token = token ?? process.env.WHATSAPP_TOKEN ?? ''

this.phoneNumberId =
  phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''

    if (!this.token) console.error('[WA] WARNING: No token available')
    if (!this.phoneNumberId) console.error('[WA] WARNING: No phone_number_id available')
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    }
  }

  async sendText(to: string, body: string): Promise<string> {
    const phone = normalizePhone(to)
    console.log(`[WA] sendText → ${phone} | phoneNumberId: ${this.phoneNumberId}`)

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
      console.log(`[WA] sendText ✅ message_id: ${msgId}`)
      return msgId
    } catch (err: any) {
      const apiErr = err?.response?.data?.error
      const detail = apiErr
        ? `code ${apiErr.code} (${apiErr.error_subcode ?? 'no subcode'}): ${apiErr.message}`
        : err.message
      console.error(`[WA] sendText FAILED — ${detail}`)
      console.error(`[WA] to: ${phone} | phoneNumberId: ${this.phoneNumberId} | tokenStart: ${this.token.slice(0, 20)}`)
      throw new Error(`WhatsApp API error — ${detail}`)
    }
  }

  async sendTemplate(
    to: string,
    name: string,
    langCode = 'en_US',
    components: any[] = []
  ): Promise<string> {
    const phone = normalizePhone(to)
    console.log(`[WA] sendTemplate "${name}" → ${phone}`)

    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name,
          language: { code: langCode },
        },
      }
      if (components.length > 0) payload.template.components = components

      const res = await axios.post(
        `${BASE}/${this.phoneNumberId}/messages`,
        payload,
        { headers: this.headers }
      )
      const msgId = res.data?.messages?.[0]?.id
      if (!msgId) throw new Error('No message_id in API response')
      console.log(`[WA] sendTemplate ✅ message_id: ${msgId}`)
      return msgId
    } catch (err: any) {
      const apiErr = err?.response?.data?.error
      const detail = apiErr
        ? `code ${apiErr.code} (${apiErr.error_subcode ?? 'no subcode'}): ${apiErr.message}`
        : err.message
      console.error(`[WA] sendTemplate FAILED — ${detail}`)
      console.error(`[WA] to: ${phone} | template: ${name} | lang: ${langCode} | phoneNumberId: ${this.phoneNumberId}`)
      throw new Error(`WhatsApp API error — ${detail}`)
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
      // Non-critical — log and continue
      console.warn('[WA] markRead failed (non-critical):', err?.response?.data?.error?.message ?? err.message)
    }
  }
}

// ── Webhook parser ────────────────────────────────────────────────────────────

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
            text:     msg.text?.body ?? null,
            image:    msg.image      ?? null,
            audio:    msg.audio      ?? null,
            document: msg.document   ?? null,
            sticker:  msg.sticker    ?? null,
            location: msg.location   ?? null,
            reaction: msg.reaction   ?? null,
          },
        })
      }

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
