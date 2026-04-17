import axios from 'axios'

const BASE = 'https://graph.facebook.com/v25.0'

export function normalizePhone(p: string): string {
  return p.replace(/[\s\-\+\(\)]/g, '')
}

export class WhatsAppClient {
  private token: string
  private phoneNumberId: string

  constructor(token: string, phoneNumberId: string) {
    this.token = (token?.length > 20 ? token : null) ?? process.env.WHATSAPP_TOKEN ?? ''
    this.phoneNumberId = phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
  }

  private get h() {
    return { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }
  }

  private async post(url: string, data: any): Promise<any> {
    try {
      return (await axios.post(url, data, { headers: this.h })).data
    } catch (err: any) {
      const e = err?.response?.data?.error
      throw new Error(e ? `[${e.code}] ${e.message}` : err.message)
    }
  }

  private msgId(data: any): string {
    const id = data?.messages?.[0]?.id
    if (!id) throw new Error('No message_id in WA response')
    return id
  }

  async sendText(to: string, body: string): Promise<string> {
    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp', recipient_type: 'individual',
      to: normalizePhone(to), type: 'text',
      text: { body, preview_url: true },
    })
    return this.msgId(res)
  }

  async sendTemplate(to: string, name: string, langCode = 'en_US', components: any[] = []): Promise<string> {
    const payload: any = {
      messaging_product: 'whatsapp', recipient_type: 'individual',
      to: normalizePhone(to), type: 'template',
      template: { name, language: { code: langCode } },
    }
    if (components.length) payload.template.components = components
    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, payload)
    return this.msgId(res)
  }

  // Upload a file buffer to WA media servers → returns media_id
  async uploadMedia(fileBuffer: Buffer, mimeType: string, filename: string): Promise<string> {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('file', fileBuffer, { filename, contentType: mimeType })
    form.append('type', mimeType)
    form.append('messaging_product', 'whatsapp')
    const res = await axios.post(`${BASE}/${this.phoneNumberId}/media`, form, {
      headers: { Authorization: `Bearer ${this.token}`, ...form.getHeaders() },
    })
    const id = res.data?.id
    if (!id) throw new Error('No media_id from WA upload')
    return id as string
  }

  // Send an already-uploaded media by its media_id
  async sendMedia(
    to: string,
    mediaId: string,
    mediaType: 'image' | 'video' | 'audio' | 'document' | 'sticker',
    caption?: string,
    filename?: string
  ): Promise<string> {
    const obj: any = { id: mediaId }
    if (caption && ['image', 'video', 'document'].includes(mediaType)) obj.caption = caption
    if (filename && mediaType === 'document') obj.filename = filename
    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp', recipient_type: 'individual',
      to: normalizePhone(to), type: mediaType, [mediaType]: obj,
    })
    return this.msgId(res)
  }

  // Fetch the temporary download URL for a media_id received via webhook
  async getMediaUrl(mediaId: string): Promise<{ url: string; mime_type: string }> {
    const res = await axios.get(`${BASE}/${mediaId}`, { headers: this.h })
    return { url: res.data.url, mime_type: res.data.mime_type ?? '' }
  }

  // Download media bytes (call getMediaUrl first, then this)
  async downloadMedia(url: string): Promise<Buffer> {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${this.token}` },
      responseType: 'arraybuffer',
    })
    return Buffer.from(res.data)
  }

  async markRead(messageId: string): Promise<void> {
    try {
      await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp', status: 'read', message_id: messageId,
      })
    } catch { /* non-critical */ }
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
          type: 'message', phoneNumberId,
          data: {
            external_id: msg.id, from: msg.from,
            from_name: contact?.profile?.name ?? msg.from,
            timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
            type: msg.type,
            text: msg.text?.body ?? null,
            image: msg.image ?? null,
            audio: msg.audio ?? null,
            video: msg.video ?? null,
            document: msg.document ?? null,
            sticker: msg.sticker ?? null,
            location: msg.location ?? null,
            reaction: msg.reaction ?? null,
          },
        })
      }
      for (const st of val.statuses ?? []) {
        events.push({
          type: 'status', phoneNumberId,
          data: {
            external_id: st.id, status: st.status,
            timestamp: new Date(parseInt(st.timestamp) * 1000).toISOString(),
          },
        })
      }
    }
  }
  return events
}
