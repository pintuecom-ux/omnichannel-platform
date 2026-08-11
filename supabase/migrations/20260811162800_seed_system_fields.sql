-- Phase 2.3: Seed System Fields for Contacts

DO $$ 
DECLARE
    ws_id uuid;
BEGIN
    FOR ws_id IN SELECT id FROM public.workspaces LOOP
        -- First Name
        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'first_name', 'First Name', 'text', true, true, false)
        ON CONFLICT (workspace_id, entity_type, key) DO NOTHING;
        
        -- Last Name
        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'last_name', 'Last Name', 'text', true, true, false)
        ON CONFLICT (workspace_id, entity_type, key) DO NOTHING;
        
        -- Phone
        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'phone', 'Phone (Mobile Number)', 'text', true, true, false)
        ON CONFLICT (workspace_id, entity_type, key) DO NOTHING;
        
        -- Email
        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'email', 'Email Address', 'text', true, true, false)
        ON CONFLICT (workspace_id, entity_type, key) DO NOTHING;
        
        -- WhatsApp Opt-in
        INSERT INTO public.custom_field_definitions (workspace_id, entity_type, key, label, field_type, is_system, is_quick_add, is_required)
        VALUES (ws_id, 'contact', 'wa_opt_in_status', 'WhatsApp Opt-in', 'boolean', true, true, false)
        ON CONFLICT (workspace_id, entity_type, key) DO NOTHING;
    END LOOP;
END $$;
