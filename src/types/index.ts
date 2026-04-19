export type Platform = 'whatsapp' | 'instagram' | 'facebook'
export type ConversationStatus = 'open' | 'pending' | 'closed' | 'snoozed'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
export type UserRole = 'admin' | 'manager' | 'agent'

// FIX BUG-05: expanded content_type to include all WA message types
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
  | 'interactive'   // button/list replies, flow responses
  | 'button'        // quick-reply template button response
  | 'flow'          // outbound flow message
  | 'order'         // product order
  | 'contacts'      // contact card

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
  content_type: MessageContentType  // FIX BUG-05
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
  body: string
  footer_text: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled'
  meta_template_id: string | null
  variables: string[]
  // FIX BUG-04: meta field was used throughout the app but not declared in the type
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

// ── NEW: WhatsApp Flows ───────────────────────────────────────────────────────
export type FlowStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'BLOCKED' | 'THROTTLED'
export type FlowCategory = 'SIGN_UP' | 'SIGN_IN' | 'APPOINTMENT_BOOKING' | 'LEAD_GENERATION' | 'CONTACT_US' | 'CUSTOMER_SUPPORT' | 'SURVEY' | 'OTHER'

export interface WhatsAppFlow {
  id: string
  workspace_id: string
  // Meta identifiers
  meta_flow_id: string | null
  name: string
  // Status from Meta: DRAFT | PUBLISHED | DEPRECATED | BLOCKED | THROTTLED
  status: FlowStatus | string
  categories: FlowCategory[] | string[]
  // Validation errors from Meta (present when flow JSON has issues)
  validation_errors: any[]
  // JSON version of the Flow spec (e.g. "6.1")
  json_version: string | null
  // Data API version (e.g. "3.0") — for endpoint-connected flows
  data_api_version: string | null
  // Your endpoint URL — for endpoint-connected flows
  data_channel_uri: string | null
  // Flow health metrics from Meta
  health_status: Record<string, any> | null
  // The actual Flow JSON definition
  flow_json: Record<string, any> | null
  // Preview URL (expires after use unless invalidate=false)
  preview_url: string | null
  created_at: string
  updated_at: string
}
