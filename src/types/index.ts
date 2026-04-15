export type Platform = 'whatsapp' | 'instagram' | 'facebook'
export type ConversationStatus = 'open' | 'pending' | 'closed' | 'snoozed'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
export type UserRole = 'admin' | 'manager' | 'agent'

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
  content_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'sticker' | 'reaction' | 'location' | 'comment'
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
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  meta_template_id: string | null
  variables: string[]
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