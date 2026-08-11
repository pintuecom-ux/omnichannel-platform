const fs = require('fs')

const CONTACT_FIELD_GROUPS = [
  {
    id: 'personal',
    label: 'Personal Information',
    fields: [
      { key: 'name', label: 'Full Name', type: 'string' },
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
      { key: 'last_whatsapp_message_at', label: 'Last WhatsApp Message', type: 'datetime' },
      { key: 'last_email_at', label: 'Last Email', type: 'datetime' },
      { key: 'last_sms_at', label: 'Last SMS', type: 'datetime' },
      { key: 'last_channel_used', label: 'Last Channel Used', type: 'string' },
      { key: 'last_seen_at', label: 'Last Seen', type: 'datetime' },
      { key: 'last_activity_at', label: 'Last Activity', type: 'datetime' },
      { key: 'last_login_at', label: 'Last Login', type: 'datetime' },
      { key: 'last_contacted_at', label: 'Last Contacted', type: 'datetime' },
      { key: 'ai_score', label: 'AI Score', type: 'number' },
      { key: 'churn_risk', label: 'Churn Risk (%)', type: 'number' },
      { key: 'created_at', label: 'Created Date', type: 'datetime' },
      { key: 'updated_at', label: 'Updated Date', type: 'datetime' },
      { key: 'created_by', label: 'Created By', type: 'string' },
      { key: 'updated_by', label: 'Updated By', type: 'string' },
      { key: 'subscription_channels', label: 'Subscription Channels & Types', type: 'paragraph' },
    ]
  }
]

const VALID_COLUMNS = [
  'id', 'workspace_id', 'name', 'phone', 'email', 'instagram_username', 'facebook_id', 'avatar_url', 'tags', 'notes', 'meta', 'created_at', 'updated_at', 'instagram_scoped_id', 'facebook_scoped_id', 'external_id', 'first_name', 'last_name', 'company_name', 'country', 'city', 'wa_opt_in_status', 'email_opt_in_status', 'sms_opt_in_status', 'fb_opt_in_status', 'ig_opt_in_status', 'last_seen_at', 'first_seen_at', 'source', 'is_suppressed', 'gender', 'date_of_birth', 'secondary_phone', 'secondary_email', 'facebook_url', 'instagram_url', 'linkedin_url', 'department', 'designation', 'job_title', 'state', 'area', 'landmark', 'pin_code', 'latitude', 'longitude', 'owner_id', 'lifecycle_stage', 'status', 'last_whatsapp_message_at', 'last_email_at', 'last_sms_at', 'last_channel_used', 'preferred_channel', 'last_activity_at', 'last_login_at', 'last_contacted_at', 'ai_score', 'churn_risk', 'campaign', 'medium', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'referrer', 'custom_fields', 'social_profiles'
];

let sql = `
-- Massive Seeding of Groups and Standard Contact Fields
DO $$ 
DECLARE
    ws_id uuid;
    grp_id uuid;
BEGIN
    FOR ws_id IN SELECT id FROM public.workspaces LOOP
`;

let orderIdx = 0;
for (const group of CONTACT_FIELD_GROUPS) {
  sql += `
        -- Group: ${group.label}
        INSERT INTO public.field_groups (workspace_id, entity_type, name, order_index)
        VALUES (ws_id, 'contact', '${group.label}', ${orderIdx})
        ON CONFLICT (workspace_id, entity_type, name) DO UPDATE SET order_index = EXCLUDED.order_index
        RETURNING id INTO grp_id;

        IF grp_id IS NULL THEN
            SELECT id INTO grp_id FROM public.field_groups WHERE workspace_id = ws_id AND entity_type = 'contact' AND name = '${group.label}';
        END IF;
`;

  for (const field of group.fields) {
    let type = field.type;
    if (type === 'string') type = 'text';
    if (type === 'url') type = 'text';
    if (type === 'datetime') type = 'date'; // approximate mapped to DB types
    let isQuickAdd = ['first_name', 'last_name', 'phone', 'email'].includes(field.key);
    let isSystem = VALID_COLUMNS.includes(field.key);
    sql += `
        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', '${field.key}', '${field.label.replace(/'/g, "''")}', '${type}', grp_id, ${isSystem}, ${isQuickAdd}, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;
`;
  }
  orderIdx++;
}

sql += `
    END LOOP;
END $$;
`;

fs.writeFileSync('supabase/migrations/20260811164000_seed_all_contact_fields.sql', sql);
console.log("SQL generated.")
