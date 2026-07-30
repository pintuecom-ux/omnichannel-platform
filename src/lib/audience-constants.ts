// Exhaustive Field Group Configuration
export const CONTACT_FIELD_GROUPS = [
  {
    id: 'personal',
    label: 'Personal Information',
    fields: [
      { key: 'avatar_url', label: 'Contact Avatar', type: 'image' },
      { key: 'name', label: 'Full Name', type: 'string', readOnly: true },
      { key: 'first_name', label: 'First Name', type: 'string' },
      { key: 'last_name', label: 'Last Name', type: 'string' },
      { key: 'gender', label: 'Gender', type: 'dropdown', options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
    ]
  },
  {
    id: 'communication',
    label: 'Communication',
    fields: [
      { key: 'phone', label: 'Primary Phone', type: 'string' },
      { key: 'secondary_phone', label: 'Secondary Phone', type: 'string' },
      { key: 'email', label: 'Email', type: 'string' },
      { key: 'secondary_email', label: 'Secondary Email', type: 'string' },
      { key: 'preferred_channel', label: 'Preferred Channel', type: 'dropdown', options: ['WhatsApp', 'Email', 'SMS', 'Instagram', 'Facebook', 'Phone'] },
      { key: 'wa_opt_in_status', label: 'WhatsApp Status', type: 'string' },
    ]
  },
  {
    id: 'social',
    label: 'Social Profiles',
    fields: [
      { key: 'facebook_url', label: 'Facebook Profile Link', type: 'url' },
      { key: 'instagram_url', label: 'Instagram Profile Link', type: 'url' },
      { key: 'linkedin_url', label: 'LinkedIn Profile Link', type: 'url' },
    ]
  },
  {
    id: 'business',
    label: 'Business',
    fields: [
      { key: 'company_name', label: 'Company', type: 'string' },
      { key: 'department', label: 'Department', type: 'string' },
      { key: 'designation', label: 'Designation', type: 'string' },
      { key: 'job_title', label: 'Job Title', type: 'string' },
    ]
  },
  {
    id: 'location',
    label: 'Location',
    fields: [
      { key: 'country', label: 'Country', type: 'dropdown', options: ['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Other'] },
      { key: 'state', label: 'State', type: 'dropdown', options: ['California', 'New York', 'Texas', 'London', 'Ontario', 'Other'] },
      { key: 'city', label: 'City', type: 'string' },
      { key: 'area', label: 'Area', type: 'string' },
      { key: 'landmark', label: 'Landmark', type: 'string' },
      { key: 'pin_code', label: 'PIN Code', type: 'string' },
      { key: 'latitude', label: 'Latitude', type: 'number' },
      { key: 'longitude', label: 'Longitude', type: 'number' },
    ]
  },
  {
    id: 'crm',
    label: 'CRM & Ownership',
    fields: [
      { key: 'owner_id', label: 'Contact Owner', type: 'dropdown', options: ['Unassigned', 'John Doe', 'Jane Smith'] },
      { key: 'lifecycle_stage', label: 'Lifecycle Stage', type: 'dropdown', options: ['Subscriber', 'Lead', 'MQL', 'SQL', 'Opportunity', 'Customer', 'Evangelist', 'Other'] },
      { key: 'status', label: 'Status', type: 'dropdown', options: ['New', 'Open', 'In Progress', 'Unqualified', 'Attempted to Contact', 'Connected', 'Bad Timing'] },
      { key: 'lists', label: 'Lists', type: 'multiselect', options: ['Newsletter', 'VIP', 'Churned'] },
      { key: 'segments', label: 'Segments', type: 'multiselect', options: ['High Value', 'Engaged Last 30 Days'] },
      { key: 'tags', label: 'Tags', type: 'multiselect', options: ['urgent', 'b2b', 'enterprise'] },
      { key: 'notes', label: 'Notes', type: 'paragraph' },
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing & Source',
    fields: [
      { key: 'source', label: 'Source', type: 'dropdown', options: ['Organic Search', 'Direct Traffic', 'Social Media', 'Referral', 'Paid Search', 'Email Marketing', 'Offline'] },
      { key: 'campaign', label: 'Campaign', type: 'string' },
      { key: 'medium', label: 'Medium', type: 'string' },
      { key: 'utm_source', label: 'UTM Source', type: 'string' },
      { key: 'utm_medium', label: 'UTM Medium', type: 'string' },
      { key: 'utm_campaign', label: 'UTM Campaign', type: 'string' },
      { key: 'utm_term', label: 'UTM Term', type: 'string' },
      { key: 'utm_content', label: 'UTM Content', type: 'string' },
      { key: 'referrer', label: 'Referrer', type: 'url' },
    ]
  },
  {
    id: 'activity_metrics',
    label: 'Activity & Metrics (System)',
    fields: [
      { key: 'last_whatsapp_message_at', label: 'Last WhatsApp Message', type: 'datetime', readOnly: true },
      { key: 'last_email_at', label: 'Last Email', type: 'datetime', readOnly: true },
      { key: 'last_sms_at', label: 'Last SMS', type: 'datetime', readOnly: true },
      { key: 'last_channel_used', label: 'Last Channel Used', type: 'string', readOnly: true },
      { key: 'last_seen_at', label: 'Last Seen', type: 'datetime', readOnly: true },
      { key: 'last_activity_at', label: 'Last Activity', type: 'datetime', readOnly: true },
      { key: 'last_login_at', label: 'Last Login', type: 'datetime', readOnly: true },
      { key: 'last_contacted_at', label: 'Last Contacted', type: 'datetime', readOnly: true },
      { key: 'ai_score', label: 'AI Score', type: 'number', readOnly: true },
      { key: 'churn_risk', label: 'Churn Risk (%)', type: 'number', readOnly: true },
      { key: 'created_at', label: 'Created Date', type: 'datetime', readOnly: true },
      { key: 'updated_at', label: 'Updated Date', type: 'datetime', readOnly: true },
      { key: 'created_by', label: 'Created By', type: 'string', readOnly: true },
      { key: 'updated_by', label: 'Updated By', type: 'string', readOnly: true },
      { key: 'subscription_channels', label: 'Subscription Channels & Types', type: 'paragraph', readOnly: true },
    ]
  }
]

export const ALL_CONTACT_FIELDS = CONTACT_FIELD_GROUPS.flatMap(group => group.fields)
