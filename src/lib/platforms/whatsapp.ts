/**
 * WhatsApp Cloud API v25.0 client + webhook parser
 *
 * Added in this version:
 *  - sendReaction: send emoji reaction to a message
 *  - sendListMessage: send interactive list with sections
 *  - context (reply) parameter on sendText, sendTemplate, sendMedia
 *  - sendLocation: send location pin
 *  - blockUser / unblockUser: moderation
 *  - getBusinessProfile / updateBusinessProfile
 *  - getQRCodes / createQRCode / deleteQRCode
 *
 * CALLING ADDITIONS (v23 API):
 *  - checkCallPermission: check if you can call a user
 *  - sendCallPermissionRequest: request calling permission from user
 *  - initiateCall: start a WebRTC voice call (connect action + SDP offer)
 *  - terminateCall: end an active call
 *  - getCallingSettings: get calling feature config for a phone number
 *  - updateCallingSettings: enable/disable calling, set call_icon_visibility
 */

import axios from 'axios'

const BASE = 'https://graph.facebook.com/v25.0'

export function normalizePhone(p: string): string {
  return p.replace(/[\s\-\+\(\)]/g, '')
}

export class WhatsAppClient {
  private token: string
  readonly phoneNumberId: string

  constructor(token: string, phoneNumberId: string) {
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
      console.error(`[WA] POST FAILED: ${msg}`)
      throw new Error(`WhatsApp API error — ${msg}`)
    }
  }

  private msgId(data: any, method = 'call'): string {
    const id = data?.messages?.[0]?.id
    if (!id) throw new Error(`${method}: No message_id in WA response`)
    return id
  }

  // ── Text (with optional reply context) ────────────────────────────────────
  async sendText(
    to: string,
    body: string,
    opts?: { previewUrl?: boolean; replyToMessageId?: string }
  ): Promise<string> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(to),
      type: 'text',
      text: { body, preview_url: opts?.previewUrl ?? false },
    }
    if (opts?.replyToMessageId) {
      payload.context = { message_id: opts.replyToMessageId }
    }
    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, payload)
    return this.msgId(res, 'sendText')
  }

  // ── Template ───────────────────────────────────────────────────────────────
  async sendTemplate(
    to: string,
    name: string,
    langCode = 'en_US',
    components: any[] = [],
    opts?: { replyToMessageId?: string }
  ): Promise<string> {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(to),
      type: 'template',
      template: { name, language: { code: langCode } },
    }
    if (components.length) payload.template.components = components
    if (opts?.replyToMessageId) {
      payload.context = { message_id: opts.replyToMessageId }
    }
    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, payload)
    return this.msgId(res, 'sendTemplate')
  }

  // ── Flow ──────────────────────────────────────────────────────────────────
  async sendFlow(
    to: string,
    opts: {
      flowId?: string; flowName?: string
      flowToken: string; headerText?: string
      bodyText: string; footerText?: string
      ctaText?: string; screenId?: string
      mode?: 'draft' | 'published'
      actionPayload?: Record<string, any>
      replyToMessageId?: string
    }
  ): Promise<string> {
    const {
      flowId, flowName, flowToken,
      headerText, bodyText, footerText,
      ctaText = 'Open', screenId, mode = 'published',
      actionPayload = {}, replyToMessageId,
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
    if (screenId) parameters.flow_action_payload = { screen: screenId, data: actionPayload }

    const interactive: any = {
      type: 'flow',
      body: { text: bodyText },
      action: { name: 'flow', parameters },
    }
    if (headerText) interactive.header = { type: 'text', text: headerText }
    if (footerText) interactive.footer = { text: footerText }

    const payload: any = {
      messaging_product: 'whatsapp', recipient_type: 'individual',
      to: normalizePhone(to), type: 'interactive', interactive,
    }
    if (replyToMessageId) payload.context = { message_id: replyToMessageId }

    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, payload)
    return this.msgId(res, 'sendFlow')
  }

  // ── Interactive reply buttons ──────────────────────────────────────────────
  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: { id: string; title: string }[],
    opts?: { headerText?: string; footerText?: string; replyToMessageId?: string }
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
    if (opts?.headerText) interactive.header = { type: 'text', text: opts.headerText }
    if (opts?.footerText) interactive.footer = { text: opts.footerText }

    const payload: any = {
      messaging_product: 'whatsapp', recipient_type: 'individual',
      to: normalizePhone(to), type: 'interactive', interactive,
    }
    if (opts?.replyToMessageId) payload.context = { message_id: opts.replyToMessageId }

    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, payload)
    return this.msgId(res, 'sendInteractiveButtons')
  }

  // ── Interactive list message ───────────────────────────────────────────────
  async sendListMessage(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
    opts?: { headerText?: string; footerText?: string; replyToMessageId?: string }
  ): Promise<string> {
    const interactive: any = {
      type: 'list',
      body: { text: bodyText },
      action: { button: buttonText, sections },
    }
    if (opts?.headerText) interactive.header = { type: 'text', text: opts.headerText }
    if (opts?.footerText) interactive.footer = { text: opts.footerText }

    const payload: any = {
      messaging_product: 'whatsapp', recipient_type: 'individual',
      to: normalizePhone(to), type: 'interactive', interactive,
    }
    if (opts?.replyToMessageId) payload.context = { message_id: opts.replyToMessageId }

    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, payload)
    return this.msgId(res, 'sendListMessage')
  }

  // ── Reaction ───────────────────────────────────────────────────────────────
  async sendReaction(to: string, messageId: string, emoji: string): Promise<string> {
    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(to),
      type: 'reaction',
      reaction: { message_id: messageId, emoji },
    })
    return this.msgId(res, 'sendReaction')
  }

  async removeReaction(to: string, messageId: string): Promise<string> {
    return this.sendReaction(to, messageId, '')
  }

  // ── Location ───────────────────────────────────────────────────────────────
  async sendLocation(
    to: string,
    lat: number,
    lng: number,
    name?: string,
    address?: string
  ): Promise<string> {
    const location: any = { latitude: lat, longitude: lng }
    if (name)    location.name    = name
    if (address) location.address = address
    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp', recipient_type: 'individual',
      to: normalizePhone(to), type: 'location', location,
    })
    return this.msgId(res, 'sendLocation')
  }

  // ── Media ──────────────────────────────────────────────────────────────────
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

  async sendMedia(
    to: string,
    mediaId: string,
    mediaType: 'image' | 'video' | 'audio' | 'document' | 'sticker',
    caption?: string,
    filename?: string,
    opts?: { replyToMessageId?: string }
  ): Promise<string> {
    const obj: any = { id: mediaId }
    if (caption && ['image', 'video', 'document'].includes(mediaType)) obj.caption = caption
    if (filename && mediaType === 'document') obj.filename = filename
    const payload: any = {
      messaging_product: 'whatsapp', recipient_type: 'individual',
      to: normalizePhone(to), type: mediaType, [mediaType]: obj,
    }
    if (opts?.replyToMessageId) payload.context = { message_id: opts.replyToMessageId }
    const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, payload)
    return this.msgId(res, `sendMedia(${mediaType})`)
  }

  async getMediaUrl(mediaId: string): Promise<{ url: string; mime_type: string; file_size?: number }> {
    const res = await axios.get(`${BASE}/${mediaId}`, {
      params: { phone_number_id: this.phoneNumberId },
      headers: { Authorization: `Bearer ${this.token}` },
    })
    return {
      url:       res.data.url,
      mime_type: res.data.mime_type ?? '',
      file_size: res.data.file_size ?? 0,
    }
  }

  async downloadMedia(url: string): Promise<Buffer> {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${this.token}` },
      responseType: 'arraybuffer',
    })
    return Buffer.from(res.data)
  }

  // ── Read receipt + typing ──────────────────────────────────────────────────
  async markRead(messageId: string): Promise<void> {
    try {
      await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp', status: 'read', message_id: messageId,
      })
    } catch { /* non-critical */ }
  }

  async sendTypingIndicator(messageId: string): Promise<void> {
    try {
      await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp', status: 'read', message_id: messageId,
        typing_indicator: { type: 'text' },
      })
    } catch { /* non-critical */ }
  }

  // ── Block / Unblock ───────────────────────────────────────────────────────
  async blockUser(phone: string): Promise<void> {
    await this.post(`${BASE}/${this.phoneNumberId}/block_users`, {
      messaging_product: 'whatsapp',
      block_users: [{ user: normalizePhone(phone) }],
    })
  }

  async unblockUser(phone: string): Promise<void> {
    try {
      await axios.delete(`${BASE}/${this.phoneNumberId}/block_users`, {
        headers: this.h,
        data: {
          messaging_product: 'whatsapp',
          block_users: [{ user: normalizePhone(phone) }],
        },
      })
    } catch (err: any) {
      throw new Error(err?.response?.data?.error?.message ?? err.message)
    }
  }

  async getBlockedUsers(): Promise<any[]> {
    const res = await axios.get(`${BASE}/${this.phoneNumberId}/block_users`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
    return res.data?.block_users ?? []
  }

  // ── Business Profile ───────────────────────────────────────────────────────
  async getBusinessProfile(): Promise<any> {
    const res = await axios.get(
      `${BASE}/${this.phoneNumberId}/whatsapp_business_profile`,
      {
        params: { fields: 'about,address,description,email,profile_picture_url,websites,vertical' },
        headers: { Authorization: `Bearer ${this.token}` },
      }
    )
    return res.data?.data?.[0] ?? res.data
  }

  async updateBusinessProfile(updates: {
    about?: string; address?: string; description?: string
    email?: string; websites?: string[]; vertical?: string
    profile_picture_handle?: string
  }): Promise<void> {
    await this.post(`${BASE}/${this.phoneNumberId}/whatsapp_business_profile`, {
      messaging_product: 'whatsapp',
      ...updates,
    })
  }

  // ── QR Codes ──────────────────────────────────────────────────────────────
  async getQRCodes(): Promise<any[]> {
    const res = await axios.get(
      `${BASE}/${this.phoneNumberId}/message_qrdls`,
      {
        params: { fields: 'code,prefilled_message,deep_link_url,qr_image_url' },
        headers: { Authorization: `Bearer ${this.token}` },
      }
    )
    return res.data?.data ?? []
  }

  async createQRCode(prefilledMessage: string, generateQrImage: 'SVG' | 'PNG' = 'PNG'): Promise<any> {
    const res = await this.post(`${BASE}/${this.phoneNumberId}/message_qrdls`, {
      prefilled_message: prefilledMessage,
      generate_qr_image: generateQrImage,
    })
    return res
  }

  async deleteQRCode(qrCodeId: string): Promise<void> {
    await axios.delete(`${BASE}/${this.phoneNumberId}/message_qrdls/${qrCodeId}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  async getAnalytics(wabaId: string, startTs: number, endTs: number, granularity: 'DAY' | 'MONTH' = 'DAY'): Promise<any> {
    const res = await axios.get(`${BASE}/${wabaId}`, {
      params: {
        fields: `analytics.start(${startTs}).end(${endTs}).granularity(${granularity}).phone_numbers([${this.phoneNumberId}])`,
      },
      headers: { Authorization: `Bearer ${this.token}` },
    })
    return res.data?.analytics ?? {}
  }

  async getConversationAnalytics(wabaId: string, startTs: number, endTs: number, granularity: 'DAILY' | 'MONTHLY' = 'DAILY'): Promise<any> {
    const res = await axios.get(`${BASE}/${wabaId}`, {
      params: {
        fields: `conversation_analytics.start(${startTs}).end(${endTs}).granularity(${granularity}).dimensions(["conversation_type","conversation_direction"])`,
      },
      headers: { Authorization: `Bearer ${this.token}` },
    })
    return res.data?.conversation_analytics ?? {}
  }

  // ── ─────────────────────────────────────────────────────────────────────── ──
  // ── CALLING METHODS (v23 API additions)                                    ──
  // ── ─────────────────────────────────────────────────────────────────────── ──

  /**
   * Check if you have permission to call a specific WhatsApp user.
   *
   * Returns permission status (granted | pending | denied | expired)
   * and available actions (start_call | send_call_permission_request).
   *
   * Prerequisites:
   *  - WhatsApp Cloud API Calling must be enabled for your phone number
   *  - App must have calls webhook field subscribed
   *  - Business account requires calling feature enabled
   *
   * API: GET /{Phone-Number-ID}/call_permissions?user_wa_id={phone}
   */
  async checkCallPermission(userWaId: string): Promise<{
    status: 'granted' | 'pending' | 'denied' | 'expired'
    expiration_time?: number
    actions: {
      action_name: 'start_call' | 'send_call_permission_request'
      can_perform_action: boolean
      limits?: { time_period: string; current_usage: number; max_allowed: number }[]
    }[]
  }> {
    try {
      const res = await axios.get(
        `${BASE}/${this.phoneNumberId}/call_permissions`,
        {
          params: { user_wa_id: normalizePhone(userWaId) },
          headers: { Authorization: `Bearer ${this.token}` },
        }
      )
      return {
        status: res.data?.permission?.status ?? 'denied',
        expiration_time: res.data?.permission?.expiration_time,
        actions: res.data?.actions ?? [],
      }
    } catch (err: any) {
      const e = err?.response?.data?.error
      const msg = e ? `[${e.code}] ${e.message}` : err.message
      throw new Error(`checkCallPermission failed: ${msg}`)
    }
  }

  /**
   * Send a call permission request to a user via an interactive message.
   *
   * IMPORTANT: 'send_call_permission_request' is NOT a valid action on POST /calls.
   * Valid /calls actions are: accept | connect | media_update | pre_accept | reject | terminate.
   *
   * The correct approach is to send an interactive message with type 'call_permission_request'
   * via the standard /messages endpoint. This requires an open conversation window.
   *
   * API: POST /{Phone-Number-ID}/messages
   *      { messaging_product, to, type: "interactive",
   *        interactive: { type: "call_permission_request", body: { text: "..." } } }
   *
   * Limits: max 1 request per 24h, max 2 per 7 days per user. Resets on connected call.
   */
  async sendCallPermissionMessage(
    to: string,
    bodyText = "We'd like to call you to assist you better. Please allow us to call you."
  ): Promise<{ message_id: string }> {
    try {
      const res = await this.post(`${BASE}/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizePhone(to),
        type: 'interactive',
        interactive: {
          type: 'call_permission_request',
          body: { text: bodyText },
        },
      })
      const messageId = res?.messages?.[0]?.id
      if (!messageId) throw new Error('No message_id in WA response')
      console.log('[WA] ✅ Call permission request message sent, id:', messageId)
      return { message_id: messageId }
    } catch (err: any) {
      throw new Error(`sendCallPermissionMessage failed: ${err.message}`)
    }
  }

  /**
   * Initiate (connect) a WhatsApp voice call to a user.
   *
   * Flow:
   *  1. Browser creates RTCPeerConnection and generates SDP offer
   *  2. SDP offer is sent to this method
   *  3. Meta returns a call_id
   *  4. Meta sends SDP answer back via the `calls` webhook field
   *  5. Browser sets remote description from the webhook SDP answer
   *  6. ICE candidate exchange happens via webhooks
   *
   * Prerequisites: checkCallPermission must return action start_call = true
   *
   * API: POST /{Phone-Number-ID}/calls
   *      { messaging_product, to, action: "connect", session: { sdp_type, sdp } }
   */
  async initiateCall(
    to: string,
    sdpOffer: string,
    opts?: { callbackData?: string }
  ): Promise<string> {
    const payload: any = {
      messaging_product: 'whatsapp',
      to: normalizePhone(to),
      action: 'connect',
      session: {
        sdp_type: 'offer',
        sdp: sdpOffer,
      },
    }
    if (opts?.callbackData) {
      payload.biz_opaque_callback_data = opts.callbackData.slice(0, 512)
    }

    const res = await this.post(`${BASE}/${this.phoneNumberId}/calls`, payload)
    const callId = res?.calls?.[0]?.id
    if (!callId) throw new Error('initiateCall: No call_id in Meta response')
    return callId
  }

  /**
   * Terminate (hang up) an active WhatsApp call.
   *
   * API: POST /{Phone-Number-ID}/calls
   *      { messaging_product, call_id, action: "terminate" }
   */
  async terminateCall(callId: string): Promise<boolean> {
    try {
      const res = await this.post(`${BASE}/${this.phoneNumberId}/calls`, {
        messaging_product: 'whatsapp',
        call_id: callId,
        action: 'terminate',
      })
      return res?.success === true
    } catch (err: any) {
      console.error('[WA] terminateCall error:', err.message)
      return false
    }
  }

  /**
   * Get current calling settings for this phone number.
   *
   * Returns: status (enabled/disabled), call_icon_visibility,
   *          ip_addresses, callback_permission_status, srtp_protocol
   *
   * API: GET /{Phone-Number-ID}?fields=calling
   */
  async getCallingSettings(): Promise<{
    status: 'enabled' | 'disabled'
    call_icon_visibility: 'visible' | 'hidden'
    callback_permission_status?: 'enabled' | 'disabled'
    srtp_key_exchange_protocol?: 'DTLS-SRTP' | 'SDES-SRTP'
    ip_addresses?: { default: string[] }
  }> {
    try {
      const res = await axios.get(
        `${BASE}/${this.phoneNumberId}`,
        {
          params: { fields: 'calling' },
          headers: { Authorization: `Bearer ${this.token}` },
        }
      )
      return res.data?.calling ?? { status: 'disabled', call_icon_visibility: 'hidden' }
    } catch (err: any) {
      throw new Error(`getCallingSettings failed: ${err.message}`)
    }
  }

  /**
   * Enable or disable the calling feature for this phone number.
   *
   * API: POST /{Phone-Number-ID}
   *      { calling: { status: "enabled"|"disabled", call_icon_visibility: "visible"|"hidden" } }
   */
  async updateCallingSettings(settings: {
    status: 'enabled' | 'disabled'
    call_icon_visibility?: 'visible' | 'hidden'
  }): Promise<boolean> {
    try {
      const res = await this.post(`${BASE}/${this.phoneNumberId}`, {
        calling: {
          status: settings.status,
          call_icon_visibility: settings.call_icon_visibility ?? 'visible',
        },
      })
      return res?.success === true
    } catch (err: any) {
      throw new Error(`updateCallingSettings failed: ${err.message}`)
    }
  }
}

// ── Webhook parser ────────────────────────────────────────────────────────────
export interface ParsedWAEvent {
  type: 'message' | 'status' | 'call'
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

      // ── Inbound messages ──
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
            text:        msg.text?.body   ?? null,
            image:       msg.image        ?? null,
            audio:       msg.audio        ?? null,
            video:       msg.video        ?? null,
            document:    msg.document     ?? null,
            sticker:     msg.sticker      ?? null,
            location:    msg.location     ?? null,
            reaction:    msg.reaction     ?? null,
            interactive: msg.interactive  ?? null,
            button:      msg.button       ?? null,
            order:       msg.order        ?? null,
            contacts:    msg.contacts     ?? null,
            context:     msg.context      ?? null,
          },
        })
      }

      // ── Status updates ──
      for (const st of val.statuses ?? []) {
        events.push({
          type: 'status',
          phoneNumberId,
          data: {
            external_id:  st.id,
            status:       st.status,
            timestamp:    new Date(parseInt(st.timestamp) * 1000).toISOString(),
            errors:       st.errors ?? null,
            conversation: st.conversation ?? null,
            pricing:      st.pricing ?? null,
          },
        })
      }

      // ── Call events (NEW) ──
      // Fired when: call state changes (ringing, connected, ended, missed),
      // SDP answer arrives, ICE candidates are exchanged
      // Webhook field: "calls" — must be subscribed in Meta App Dashboard
      for (const callEvent of val.calls ?? []) {
        events.push({
          type: 'call',
          phoneNumberId,
          data: {
            call_id:   callEvent.id,
            // State: ringing | accepted | connecting | connected | ended | missed | failed
            status:    callEvent.status,
            from:      callEvent.from ?? null,
            to:        callEvent.to ?? null,
            timestamp: callEvent.timestamp
              ? new Date(parseInt(callEvent.timestamp) * 1000).toISOString()
              : new Date().toISOString(),
            // SDP answer delivered by Meta when call is connecting
            session:   callEvent.session ?? null,
            // Duration in seconds (on ended events)
            duration:  callEvent.duration ?? null,
            // Reason for ended/failed events
            reason:    callEvent.reason ?? null,
            // Echoes back biz_opaque_callback_data sent during initiateCall
            callback_data: callEvent.biz_opaque_callback_data ?? null,
          },
        })
      }
    }
  }

  return events
}
