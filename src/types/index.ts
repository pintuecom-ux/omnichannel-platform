export type Platform = 'whatsapp' | 'instagram' | 'facebook'
export type ConversationStatus = 'open' | 'pending' | 'closed' | 'snoozed'
export type MessageDirection = 'inbound' | 'outbound'

// FIX: MessageStatus now typed as string union + 'deleted'
// 'deleted' comes from Meta webhook status updates but was missing from the type,
// causing ts(2367) "types have no overlap" when comparing msg.status === 'deleted'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'deleted'

export type UserRole = 'admin' | 'manager' | 'agent'

// FIX: Added 'unsupported' — Meta sends type='unsupported' for polls, voice calls,
// broadcast lists, and future message types the Cloud API doesn't support yet.
// Previously these fell through to content_type='text' with null body,
// showing "[unsupported]" in the conversation list and an empty bubble.
export type MessageContentType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'template'
  | 'sticker'
  | 'reaction'
  | 'location'
  | 'comment'
  | 'interactive'   // button/list replies, flow completions
  | 'button'        // quick-reply button press on template
  | 'flow'          // outbound flow message
  | 'order'         // product order
  | 'contacts'      // contact card
  | 'unsupported'   // polls, broadcast lists, unknown future types
  | 'call'          // WhatsApp voice call events (started, ended, missed, failed)

export interface Profile {
  id: string
  workspace_id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url: string | null
  is_online: boolean
  created_at: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
}

export interface Channel {
  id: string
  workspace_id: string
  platform: Platform
  name: string
  external_id: string
  access_token: string
  is_active: boolean
  meta: Record<string, any>
  created_at: string
}

export interface Contact {
  id: string
  workspace_id: string
  name: string | null
  phone: string | null
  email: string | null
  instagram_username: string | null
  facebook_id: string | null
  avatar_url: string | null
  tags: string[]
  notes: string | null
  meta: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  workspace_id: string
  contact_id: string
  channel_id: string
  platform: Platform
  external_id: string | null
  title: string | null
  status: ConversationStatus
  assigned_to: string | null
  is_pinned: boolean
  last_message: string | null
  last_message_at: string
  unread_count: number
  tags: string[]
  meta: Record<string, any>
  created_at: string
  updated_at: string
  // Joined fields
  contact?: Contact
  channel?: Channel
  assignee?: Profile
}

export interface Message {
  id: string
  conversation_id: string
  workspace_id: string
  external_id: string | null
  direction: MessageDirection
  content_type: MessageContentType
  body: string | null
  media_url: string | null
  media_mime: string | null
  sender_id: string | null
  status: MessageStatus
  is_note: boolean
  meta: Record<string, any>
  created_at: string
  // Joined fields
  sender?: Profile
}

export interface Template {
  id: string
  workspace_id: string
  platform: Platform
  name: string
  category: string
  language: string
  header_text: string | null
  // FIX: body is nullable — Auth templates have no body (Meta auto-generates it)
  body: string | null
  footer_text: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled'
  meta_template_id: string | null
  variables: string[]
  // meta holds: components, template_type, header_type, header_media_url,
  //             buttons, quality_score, rejected_reason, etc.
  meta?: Record<string, any>
  created_at: string
}

export interface ContactList {
  id: string
  workspace_id: string
  name: string
  platform: Platform | null
  description: string | null
  contact_count: number
  created_at: string
}

// WhatsApp Flows
export type FlowStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'BLOCKED' | 'THROTTLED'
export type FlowCategory =
  | 'SIGN_UP' | 'SIGN_IN' | 'APPOINTMENT_BOOKING' | 'LEAD_GENERATION'
  | 'CONTACT_US' | 'CUSTOMER_SUPPORT' | 'SURVEY' | 'OTHER'

export interface WhatsAppFlow {
  id: string
  workspace_id: string
  meta_flow_id: string | null
  name: string
  status: FlowStatus | string
  categories: FlowCategory[] | string[]
  validation_errors: any[]
  json_version: string | null
  data_api_version: string | null
  data_channel_uri: string | null
  health_status: Record<string, any> | null
  flow_json: Record<string, any> | null
  preview_url: string | null
  created_at: string
  updated_at: string
}
