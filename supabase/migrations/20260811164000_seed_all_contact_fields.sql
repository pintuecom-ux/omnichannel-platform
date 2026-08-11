
-- Massive Seeding of Groups and Standard Contact Fields
DO $$ 
DECLARE
    ws_id uuid;
    grp_id uuid;
BEGIN
    FOR ws_id IN SELECT id FROM public.workspaces LOOP

        -- Group: Personal Information
        INSERT INTO public.field_groups (workspace_id, entity_type, name, order_index)
        VALUES (ws_id, 'contact', 'Personal Information', 0)
        ON CONFLICT (workspace_id, entity_type, name) DO UPDATE SET order_index = EXCLUDED.order_index
        RETURNING id INTO grp_id;

        IF grp_id IS NULL THEN
            SELECT id INTO grp_id FROM public.field_groups WHERE workspace_id = ws_id AND entity_type = 'contact' AND name = 'Personal Information';
        END IF;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'name', 'Full Name', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'first_name', 'First Name', 'text', grp_id, true, true, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'last_name', 'Last Name', 'text', grp_id, true, true, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'gender', 'Gender', 'dropdown', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'date_of_birth', 'Date of Birth', 'date', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        -- Group: Communication
        INSERT INTO public.field_groups (workspace_id, entity_type, name, order_index)
        VALUES (ws_id, 'contact', 'Communication', 1)
        ON CONFLICT (workspace_id, entity_type, name) DO UPDATE SET order_index = EXCLUDED.order_index
        RETURNING id INTO grp_id;

        IF grp_id IS NULL THEN
            SELECT id INTO grp_id FROM public.field_groups WHERE workspace_id = ws_id AND entity_type = 'contact' AND name = 'Communication';
        END IF;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'phone', 'Primary Phone', 'text', grp_id, true, true, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'secondary_phone', 'Secondary Phone', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'email', 'Email', 'text', grp_id, true, true, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'secondary_email', 'Secondary Email', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'preferred_channel', 'Preferred Channel', 'dropdown', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'wa_opt_in_status', 'WhatsApp Status', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        -- Group: Social Profiles
        INSERT INTO public.field_groups (workspace_id, entity_type, name, order_index)
        VALUES (ws_id, 'contact', 'Social Profiles', 2)
        ON CONFLICT (workspace_id, entity_type, name) DO UPDATE SET order_index = EXCLUDED.order_index
        RETURNING id INTO grp_id;

        IF grp_id IS NULL THEN
            SELECT id INTO grp_id FROM public.field_groups WHERE workspace_id = ws_id AND entity_type = 'contact' AND name = 'Social Profiles';
        END IF;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'facebook_url', 'Facebook Profile Link', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'instagram_url', 'Instagram Profile Link', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'linkedin_url', 'LinkedIn Profile Link', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        -- Group: Business
        INSERT INTO public.field_groups (workspace_id, entity_type, name, order_index)
        VALUES (ws_id, 'contact', 'Business', 3)
        ON CONFLICT (workspace_id, entity_type, name) DO UPDATE SET order_index = EXCLUDED.order_index
        RETURNING id INTO grp_id;

        IF grp_id IS NULL THEN
            SELECT id INTO grp_id FROM public.field_groups WHERE workspace_id = ws_id AND entity_type = 'contact' AND name = 'Business';
        END IF;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'company_name', 'Company', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'department', 'Department', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'designation', 'Designation', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'job_title', 'Job Title', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        -- Group: Location
        INSERT INTO public.field_groups (workspace_id, entity_type, name, order_index)
        VALUES (ws_id, 'contact', 'Location', 4)
        ON CONFLICT (workspace_id, entity_type, name) DO UPDATE SET order_index = EXCLUDED.order_index
        RETURNING id INTO grp_id;

        IF grp_id IS NULL THEN
            SELECT id INTO grp_id FROM public.field_groups WHERE workspace_id = ws_id AND entity_type = 'contact' AND name = 'Location';
        END IF;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'country', 'Country', 'dropdown', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'state', 'State', 'dropdown', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'city', 'City', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'area', 'Area', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'landmark', 'Landmark', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'pin_code', 'PIN Code', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'latitude', 'Latitude', 'number', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'longitude', 'Longitude', 'number', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        -- Group: CRM & Ownership
        INSERT INTO public.field_groups (workspace_id, entity_type, name, order_index)
        VALUES (ws_id, 'contact', 'CRM & Ownership', 5)
        ON CONFLICT (workspace_id, entity_type, name) DO UPDATE SET order_index = EXCLUDED.order_index
        RETURNING id INTO grp_id;

        IF grp_id IS NULL THEN
            SELECT id INTO grp_id FROM public.field_groups WHERE workspace_id = ws_id AND entity_type = 'contact' AND name = 'CRM & Ownership';
        END IF;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'owner_id', 'Contact Owner', 'dropdown', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'lifecycle_stage', 'Lifecycle Stage', 'dropdown', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'status', 'Status', 'dropdown', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'lists', 'Lists', 'multiselect', grp_id, false, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'segments', 'Segments', 'multiselect', grp_id, false, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'tags', 'Tags', 'multiselect', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'notes', 'Notes', 'paragraph', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        -- Group: Marketing & Source
        INSERT INTO public.field_groups (workspace_id, entity_type, name, order_index)
        VALUES (ws_id, 'contact', 'Marketing & Source', 6)
        ON CONFLICT (workspace_id, entity_type, name) DO UPDATE SET order_index = EXCLUDED.order_index
        RETURNING id INTO grp_id;

        IF grp_id IS NULL THEN
            SELECT id INTO grp_id FROM public.field_groups WHERE workspace_id = ws_id AND entity_type = 'contact' AND name = 'Marketing & Source';
        END IF;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'source', 'Source', 'dropdown', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'campaign', 'Campaign', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'medium', 'Medium', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'utm_source', 'UTM Source', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'utm_medium', 'UTM Medium', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'utm_campaign', 'UTM Campaign', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'utm_term', 'UTM Term', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'utm_content', 'UTM Content', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'referrer', 'Referrer', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        -- Group: Activity & Metrics (System)
        INSERT INTO public.field_groups (workspace_id, entity_type, name, order_index)
        VALUES (ws_id, 'contact', 'Activity & Metrics (System)', 7)
        ON CONFLICT (workspace_id, entity_type, name) DO UPDATE SET order_index = EXCLUDED.order_index
        RETURNING id INTO grp_id;

        IF grp_id IS NULL THEN
            SELECT id INTO grp_id FROM public.field_groups WHERE workspace_id = ws_id AND entity_type = 'contact' AND name = 'Activity & Metrics (System)';
        END IF;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'last_whatsapp_message_at', 'Last WhatsApp Message', 'date', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'last_email_at', 'Last Email', 'date', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'last_sms_at', 'Last SMS', 'date', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'last_channel_used', 'Last Channel Used', 'text', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'last_seen_at', 'Last Seen', 'date', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'last_activity_at', 'Last Activity', 'date', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'last_login_at', 'Last Login', 'date', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'last_contacted_at', 'Last Contacted', 'date', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'ai_score', 'AI Score', 'number', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'churn_risk', 'Churn Risk (%)', 'number', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'created_at', 'Created Date', 'date', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'updated_at', 'Updated Date', 'date', grp_id, true, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'created_by', 'Created By', 'text', grp_id, false, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'updated_by', 'Updated By', 'text', grp_id, false, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, group_id, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'subscription_channels', 'Subscription Channels & Types', 'paragraph', grp_id, false, false, false)
        ON CONFLICT (workspace_id, entity_type, key) DO UPDATE 
        SET group_id = EXCLUDED.group_id, label = EXCLUDED.label, is_system = EXCLUDED.is_system;

    END LOOP;
END $$;
