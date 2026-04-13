export type Platform = 'whatsapp' | 'instagram' | 'facebook'
export type ConversationStatus = 'open' | 'pending' | 'closed' | 'snoozed'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'

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
  created_at: string
}

export interface Channel {
  id: string
  workspace_id: string
  platform: Platform
  name: string
  external_id: string
  is_active: boolean
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
  content_type: string
  body: string | null
  media_url: string | null
  sender_id: string | null
  status: MessageStatus
  is_note: boolean
  meta: Record<string, any>
  created_at: string
  sender?: Profile
}

export interface Profile {
  id: string
  workspace_id: string
  full_name: string
  email: string
  role: 'admin' | 'manager' | 'agent'
  avatar_url: string | null
  is_online: boolean
}

export interface Template {
  id: string
  workspace_id: string
  platform: Platform
  name: string
  category: string
  language: string
  body: string
  header_text: string | null
  footer_text: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  variables: string[]
}