/**
 * WhatsApp Cloud API v25.0 client + webhook parser
 *
 * Bugs fixed vs original:
 *  BUG-01: getMediaUrl now passes phone_number_id query param (required by Meta)
 *  BUG-02: parseWhatsAppWebhook now extracts interactive/button/order/contacts data
 *  BUG-07: Added sendFlow method for WhatsApp Flows
 *  BUG-08: sendText uses preview_url: false by default (matches official collection)
 *  BUG-09: Constructor checks for empty/null token instead of length
 */

import axios from 'axios'

const BASE = 'https://graph.facebook.com/v25.0'

export function normalizePhone(p: string): string {
  return p.replace(/[\s\-\+\(\)]/g, '')
}

export class WhatsAppClient {
  private token: string
  readonly phoneNumberId: string   // exposed so webhook handler can use it

  constructor(token: string, phoneNumberId: string) {
    // FIX BUG-09: use empty-string check instead of fragile length check
    this.token        = (token && token.trim().length > 0 ? token : null) ?? process.env.WHATSAPP_TOKEN ?? ''
    this.phoneNumberId = phoneNumberId || (process.env.WHATSAPP_PHONE_NUMBER_ID ?? '')

    if (!this.token)        console.warn('[WA] No token available')
    if (!this.phoneNumberId) console.warn('[WA] No phone_number_id available')
  }

  private get h() {
    return { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }
  }

  private async post<T = any>(url: string, data: any): Promise<T> {
    try {
      return (await axios.post<T>(url, data, { headers: this.h })).data
    } catch (err: any) {
      const e = err?.response?.data?.error
      const msg = e ? `[${e.code}/${e.error_subcode ?? '-'}] ${e.message}` : err.message
      console.error(`[WA] POST ${url} FAILED: ${msg}`)
      throw new Error(`WhatsApp API error — ${msg}`)
    }
  }

  private msgId(data: any, method = 'call'): string {
    const id = data?.messages?.[0]?.id
    if (!id) throw new Error(`${method}: No message_id in WA response`)
    return id
  }

  // ── Text ──────────────────────────────────────────────────────────────────
  async sendText(to: string, body: string, previewUrl = false): Promise<string> {
    // FIX BUG-08: default preview_url to false (official collection uses false)
    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(to),
      type: 'text',
      text: { body, preview_url: previewUrl },
    })
    return this.msgId(res, 'sendText')
  }

  // ── Template ──────────────────────────────────────────────────────────────
  async sendTemplate(
    to: string,
    name: string,
    langCode = 'en_US',
    components: any[] = []
  ): Promise<string> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(to),
      type: 'template',
      template: { name, language: { code: langCode } },
    }
    if (components.length) payload.template.components = components
    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, payload)
    return this.msgId(res, 'sendTemplate')
  }

  // ── Flow (NEW — FIX BUG-07) ───────────────────────────────────────────────
  // Sends a WhatsApp Flow message (interactive type: "flow")
  // Official API: POST /{phone-number-id}/messages
  // Body type: "interactive", interactive.type: "flow"
  async sendFlow(
    to: string,
    opts: {
      flowId?: string           // use flowId OR flowName
      flowName?: string
      flowToken: string         // opaque token you generate per send
      headerText?: string
      bodyText: string          // required
      footerText?: string
      ctaText?: string          // call-to-action button label
      screenId?: string         // initial screen to navigate to
      mode?: 'draft' | 'published'
      actionPayload?: Record<string, any>  // initial screen data
    }
  ): Promise<string> {
    const {
      flowId, flowName, flowToken,
      headerText = '', bodyText, footerText = '',
      ctaText = 'Open', screenId, mode = 'published',
      actionPayload = {},
    } = opts

    const parameters: any = {
      flow_message_version: '3',
      flow_action: 'navigate',
      flow_token: flowToken,
      flow_cta: ctaText,
      mode,
    }

    if (flowId)   parameters.flow_id   = flowId
    if (flowName) parameters.flow_name = flowName
    if (screenId) {
      parameters.flow_action_payload = { screen: screenId, data: actionPayload }
    }

    const interactive: any = {
      type: 'flow',
      body: { text: bodyText },
      action: { name: 'flow', parameters },
    }
    if (headerText) interactive.header = { type: 'text', text: headerText }
    if (footerText) interactive.footer = { text: footerText }

    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(to),
      type: 'interactive',
      interactive,
    })
    return this.msgId(res, 'sendFlow')
  }

  // ── Interactive messages (list + buttons) ─────────────────────────────────
  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: { id: string; title: string }[],
    headerText?: string,
    footerText?: string
  ): Promise<string> {
    const interactive: any = {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map(b => ({
          type: 'reply', reply: { id: b.id, title: b.title },
        })),
      },
    }
    if (headerText) interactive.header = { type: 'text', text: headerText }
    if (footerText) interactive.footer = { text: footerText }

    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(to),
      type: 'interactive',
      interactive,
    })
    return this.msgId(res, 'sendInteractiveButtons')
  }

  // ── Media upload to WA servers ────────────────────────────────────────────
  async uploadMedia(fileBuffer: Buffer, mimeType: string, filename: string): Promise<string> {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('file', fileBuffer, { filename, contentType: mimeType })
    form.append('type', mimeType)
    form.append('messaging_product', 'whatsapp')
    const res = await axios.post(
      `${BASE}/${this.phoneNumberId}/media`,
      form,
      { headers: { Authorization: `Bearer ${this.token}`, ...form.getHeaders() } }
    )
    const id = res.data?.id
    if (!id) throw new Error('No media_id from WA upload')
    return id as string
  }

  // ── Send uploaded media ───────────────────────────────────────────────────
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
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(to),
      type: mediaType,
      [mediaType]: obj,
    })
    return this.msgId(res, `sendMedia(${mediaType})`)
  }

  // ── Fetch media URL from WA ───────────────────────────────────────────────
  // FIX BUG-01: include phone_number_id query param (required by Meta API)
  async getMediaUrl(mediaId: string): Promise<{ url: string; mime_type: string; file_size?: number }> {
    const res = await axios.get(`${BASE}/${mediaId}`, {
      params: { phone_number_id: this.phoneNumberId },  // ← CRITICAL FIX
      headers: { Authorization: `Bearer ${this.token}` },
    })
    return {
      url:       res.data.url,
      mime_type: res.data.mime_type ?? '',
      file_size: res.data.file_size ?? 0,
    }
  }

  // ── Download media bytes ──────────────────────────────────────────────────
  async downloadMedia(url: string): Promise<Buffer> {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${this.token}` },
      responseType: 'arraybuffer',
    })
    return Buffer.from(res.data)
  }

  // ── Mark message as read (POST — newer Meta API) ──────────────────────────
  async markRead(messageId: string): Promise<void> {
    try {
      await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      })
    } catch {
      // Non-critical — log but do not throw
    }
  }

  // ── Send typing indicator + read receipt (newer combined API) ─────────────
  async sendTypingIndicator(messageId: string): Promise<void> {
    try {
      await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: { type: 'text' },
      })
    } catch {
      // Non-critical
    }
  }
}

// ── Webhook parser ────────────────────────────────────────────────────────────

export interface ParsedWAEvent {
  type: 'message' | 'status'
  phoneNumberId: string
  data: any
}

// FIX BUG-02: Parse ALL message types including interactive, button, order, contacts
export function parseWhatsAppWebhook(body: any): ParsedWAEvent[] {
  const events: ParsedWAEvent[] = []

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const val = change.value
      if (!val) continue
      const phoneNumberId: string = val.metadata?.phone_number_id ?? ''

      // ── Inbound messages ──────────────────────────────────────────────────
      for (const msg of val.messages ?? []) {
        const contact = (val.contacts ?? []).find((c: any) => c.wa_id === msg.from)
        events.push({
          type: 'message',
          phoneNumberId,
          data: {
            external_id: msg.id,
            from:         msg.from,
            from_name:    contact?.profile?.name ?? msg.from,
            timestamp:    new Date(parseInt(msg.timestamp) * 1000).toISOString(),
            type:         msg.type,

            // Standard message types
            text:        msg.text?.body       ?? null,
            image:       msg.image            ?? null,
            audio:       msg.audio            ?? null,
            video:       msg.video            ?? null,
            document:    msg.document         ?? null,
            sticker:     msg.sticker          ?? null,
            location:    msg.location         ?? null,
            reaction:    msg.reaction         ?? null,

            // FIX BUG-02: Previously missing message types
            // interactive: includes button_reply, list_reply, nfm_reply (Flow response)
            interactive: msg.interactive      ?? null,
            // button: quick-reply button response from a template
            button:      msg.button           ?? null,
            // order: product order message
            order:       msg.order            ?? null,
            // contacts: contact card
            contacts:    msg.contacts         ?? null,

            // Context (reply reference)
            context:     msg.context          ?? null,
          },
        })
      }

      // ── Status updates ────────────────────────────────────────────────────
      for (const st of val.statuses ?? []) {
        events.push({
          type: 'status',
          phoneNumberId,
          data: {
            external_id: st.id,
            status:      st.status,   // sent | delivered | read | failed | deleted
            timestamp:   new Date(parseInt(st.timestamp) * 1000).toISOString(),
            errors:      st.errors ?? null,
            conversation: st.conversation ?? null,
            pricing:      st.pricing ?? null,
          },
        })
      }
    }
  }

  return events
}