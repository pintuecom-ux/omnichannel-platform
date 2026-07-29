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
  | 'story_mention' // Instagram Story mention
  | 'share'         // Instagram Story share or shared post

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
  external_id?: string | null
  name: string | null
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  country?: string | null
  city?: string | null
  phone: string | null
  email: string | null
  instagram_username: string | null
  instagram_scoped_id?: string | null
  facebook_scoped_id?: string | null
  facebook_id: string | null
  avatar_url: string | null
  wa_opt_in_status?: 'subscribed' | 'unsubscribed' | 'pending' | 'never_opted_in' | 'suppressed' | string
  email_opt_in_status?: 'subscribed' | 'unsubscribed' | 'pending' | 'never_opted_in' | 'suppressed' | string
  sms_opt_in_status?: 'subscribed' | 'unsubscribed' | 'pending' | 'never_opted_in' | 'suppressed' | string
  fb_opt_in_status?: 'subscribed' | 'unsubscribed' | 'pending' | 'never_opted_in' | 'suppressed' | string
  ig_opt_in_status?: 'subscribed' | 'unsubscribed' | 'pending' | 'never_opted_in' | 'suppressed' | string
  first_seen_at?: string | null
  last_seen_at?: string | null
  source?: string | null
  is_suppressed?: boolean
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

export interface InstagramChannelMeta {
  login_mode?: 'instagram_login' | 'page_linked'
  username?: string | null
  account_type?: 'BUSINESS' | 'CREATOR' | string | null
  token_expires_at?: string | null
  granted_scopes?: string[]
  profile_picture_url?: string | null
  webhook_subscribed?: boolean
  page_id?: string | null
  legacy_page_id?: string | null
  legacy_page_name?: string | null
  app_scoped_user_id?: string | null
  permissions_health?: {
    missing: string[]
    granted: string[]
  }
  [key: string]: any
}

export interface InstagramIdentity {
  instagram_scoped_id: string
  facebook_scoped_id?: string | null
  username?: string | null
}

export interface ScheduledPublication {
  id: string
  workspace_id: string
  channel_id: string
  platform: 'instagram'
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'canceled'
  caption: string | null
  media_payload: Array<{
    storage_path?: string | null
    public_url?: string | null
    media_type: 'image' | 'video' | 'carousel'
    mime_type?: string | null
    file_name?: string | null
    alt_text?: string | null
  }>
  publish_at: string | null
  published_at?: string | null
  timezone?: string | null
  retry_count: number
  last_error?: string | null
  idempotency_key?: string | null
  resulting_media_id?: string | null
  meta: Record<string, any>
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface InstagramMediaItem {
  id: string
  workspace_id: string
  channel_id: string
  publication_id?: string | null
  instagram_media_id: string
  caption: string | null
  media_type: 'image' | 'video' | 'carousel'
  media_product_type?: string | null
  permalink?: string | null
  thumbnail_url?: string | null
  media_url?: string | null
  timestamp?: string | null
  comment_count: number
  like_count: number
  metrics?: Record<string, number | null>
  meta: Record<string, any>
  created_at: string
  updated_at: string
}

export interface InstagramAnalyticsSnapshot {
  id: string
  workspace_id: string
  channel_id: string
  snapshot_at: string
  range_start?: string | null
  range_end?: string | null
  account_metrics: Record<string, any>
  content_metrics: Array<Record<string, any>>
  operational_metrics: Record<string, any>
  meta: Record<string, any>
  created_at: string
}

export interface InstagramExecutiveMetrics {
  published_posts: number
  publish_failures: number
  impressions: number
  reach: number
  engagement: number
  engagement_rate: number
  inbound_dms: number
  inbound_comments: number
  response_rate: number
  avg_reply_minutes: number | null
  followers_count: number | null
  follower_growth: number | null
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

export interface ContactIdentity {
  id: string
  workspace_id: string
  contact_id: string
  provider: 'whatsapp' | 'instagram' | 'facebook' | 'email' | 'custom' | 'external_crm' | string
  identifier: string
  is_verified: boolean
  created_at: string
  updated_at: string
  contact?: Contact
}

export interface ContactMergeHistory {
  id: string
  workspace_id: string
  merged_contact_id: string
  from_contact_id: string
  reason?: string | null
  merged_by?: string | null
  fields_changed?: Record<string, any>
  created_at: string
  merged_contact?: Contact
}

export interface ContactMetadata {
  personal?: {
    prefix?: string
    middle_name?: string
    full_name?: string
    preferred_name?: string
    display_name?: string
    gender?: string
    birth_date?: string
    age?: number
    language?: string
    timezone?: string
    nationality?: string
  }
  business?: {
    job_title?: string
    department?: string
    designation?: string
    industry?: string
    gst_number?: string
    website?: string
    business_type?: string
  }
  location?: {
    address_line_1?: string
    address_line_2?: string
    postal_code?: string
    landmark?: string
    latitude?: number
    longitude?: number
  }
  communication?: {
    primary_phone?: string
    secondary_phone?: string
    primary_email?: string
    secondary_email?: string
    preferred_channel?: string
    preferred_language?: string
    preferred_contact_time?: string
  }
  consent?: {
    whatsapp?: { status: string; date: string; source?: string }
    email?: { status: string; date: string; source?: string }
    sms?: { status: string; date: string; source?: string }
  }
  marketing?: {
    lead_source?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
    referral?: string
  }
  commerce?: {
    customer_since?: string
    orders?: number
    revenue?: number
    average_order?: number
    last_order?: string
    currency?: string
    refund_amount?: number
  }
  crm?: {
    owner?: string
    sales_stage?: string
    lifecycle_stage?: string
    lead_score?: number
    priority?: string
    account_manager?: string
    last_contacted?: string
    next_follow_up?: string
  }
  social?: {
    instagram_followers?: number
    facebook_name?: string
    messenger_connected?: boolean
    whatsapp_business_user?: boolean
    social_verified?: boolean
  }
  ai?: {
    ai_summary?: string
    ai_persona?: string
    ai_intent?: string
    ai_engagement_score?: number
    ai_purchase_probability?: number
    ai_churn_risk?: number
    ai_suggested_segment?: string
    ai_tags?: string[]
  }
  [key: string]: any
}

export type EntityType = 'contact' | 'company' | 'deal' | 'conversation' | 'workspace' | string
export type FieldGroup = 'system' | 'identity' | 'personal' | 'business' | 'location' | 'communication' | 'marketing' | 'commerce' | 'crm' | 'social' | 'ai' | 'custom' | string
export type FieldType = 'text' | 'long_text' | 'number' | 'decimal' | 'currency' | 'percentage' | 'date' | 'time' | 'datetime' | 'dropdown' | 'multi_select' | 'radio' | 'checkbox' | 'url' | 'color' | 'json' | 'rich_text' | 'image' | 'file' | string

export interface CustomFieldDefinition {
  id: string
  workspace_id: string
  entity_type: EntityType
  key: string
  label: string
  description?: string | null
  field_group?: FieldGroup | null
  field_type: FieldType
  options?: any[] | null
  validation?: Record<string, any> | null
  default_value?: any | null
  is_system: boolean
  is_searchable: boolean
  is_filterable: boolean
  is_segmentable: boolean
  is_required: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface CustomFieldValue {
  id: string
  workspace_id: string
  field_id: string
  entity_id: string
  value: any
  created_at: string
  updated_at: string
  definition?: CustomFieldDefinition
}

// ─── AUDIENCE CONTAINERS (Phase 3) ───────────────────────────────────────

export interface Tag {
  id: string
  workspace_id: string
  name: string
  slug: string
  description?: string
  color?: string
  icon?: string
  category?: string
  usage_count: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface EntityTag {
  tag_id: string
  entity_type: string
  entity_id: string
  workspace_id: string
  created_at: string
}

export interface ListFolder {
  id: string
  workspace_id: string
  name: string
  created_at: string
}

export interface List {
  id: string
  workspace_id: string
  folder_id?: string
  name: string
  slug: string
  description?: string
  color?: string
  icon?: string
  type: 'static' | 'smart' | 'system' | 'integration'
  visibility: 'private' | 'shared'
  owner_id?: string
  contact_count: number
  active_count: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface ListMembership {
  list_id: string
  entity_type: string
  entity_id: string
  workspace_id: string
  status: 'active' | 'pending' | 'unsubscribed' | 'removed' | 'suppressed'
  source: string
  joined_at: string
  joined_by?: string
}

export interface ConditionSet {
  operator: 'AND' | 'OR'
  conditions: Array<{
    field: string
    operator: string
    value: any
  } | ConditionSet>
}

export interface Segment {
  id: string
  workspace_id: string
  folder_id?: string
  name: string
  slug: string
  description?: string
  type: 'live' | 'snapshot' | 'cached' | 'system' | 'ai'
  visibility: 'private' | 'shared'
  owner_id?: string
  condition_set: ConditionSet
  refresh_policy?: string
  cached_count: number
  last_calculated_at?: string
  version: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

// ─── DATA PORTABILITY & GOVERNANCE (Phase 4) ──────────────────────────

export interface ContactConsent {
  id: string
  workspace_id: string
  contact_id: string
  channel: 'whatsapp' | 'email' | 'sms' | 'push' | string
  purpose: 'marketing' | 'transactional' | 'promotions' | string
  status: 'granted' | 'withdrawn' | 'pending'
  source: string
  legal_basis: 'consent' | 'contract' | 'legitimate_interest' | string
  granted_at?: string
  withdrawn_at?: string
  expires_at?: string
  evidence?: string
  created_at: string
  updated_at: string
}

export interface ImportJob {
  id: string
  workspace_id: string
  created_by?: string
  status: 'pending' | 'parsing' | 'mapping' | 'running' | 'completed' | 'failed'
  source: string
  file_url?: string
  file_name?: string
  mapping_config?: Record<string, any>
  default_tags?: string[]
  default_lists?: string[]
  total_rows: number
  processed_rows: number
  error_count: number
  error_log_url?: string
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface ExportJob {
  id: string
  workspace_id: string
  created_by?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  format: 'csv' | 'json' | 'excel' | string
  dataset: string
  query_config: Record<string, any>
  field_selection?: string[]
  file_url?: string
  total_records: number
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface ContactMerge {
  id: string
  workspace_id: string
  primary_contact_id: string
  secondary_contact_id: string
  merged_by?: string
  merge_strategy: 'manual' | 'most_complete' | 'oldest' | 'newest' | string
  conflict_resolution?: Record<string, any>
  original_primary_data?: Record<string, any>
  original_secondary_data?: Record<string, any>
  status: 'completed' | 'reverted'
  reverted_at?: string
  reverted_by?: string
  created_at: string
}

// ─── ENGAGEMENT & INTEGRATION (Phase 5) ───────────────────────────────

export interface PlatformEvent {
  id: string
  workspace_id: string
  event_type: string
  entity_type: string
  entity_id: string
  actor_id?: string
  source: string
  metadata?: Record<string, any>
  correlation_id?: string
  schema_version: number
  created_at: string
}
