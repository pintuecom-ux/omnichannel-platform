-- Phase 2: Metadata & Fields Engineering (Backend - SDP 04 & 07)

-- 1. Create custom_field_definitions table
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    entity_type text NOT NULL, -- 'contact', 'company', 'deal', etc.
    key text NOT NULL,
    label text NOT NULL,
    description text,
    field_group text, -- 'personal', 'business', 'marketing', 'custom'
    field_type text NOT NULL, -- 'text', 'number', 'date', 'dropdown', 'boolean'
    options jsonb, -- For dropdown/choice types
    validation jsonb, -- { min, max, regex }
    default_value jsonb,
    is_system boolean DEFAULT false, -- If true, users cannot delete it
    is_searchable boolean DEFAULT false,
    is_filterable boolean DEFAULT false,
    is_segmentable boolean DEFAULT false,
    is_required boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, entity_type, key)
);

CREATE INDEX IF NOT EXISTS custom_field_definitions_workspace_entity_idx ON public.custom_field_definitions (workspace_id, entity_type);

-- 2. Create custom_field_values table
CREATE TABLE IF NOT EXISTS public.custom_field_values (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    field_id uuid NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL, -- Logical FK, could be contacts.id, companies.id, etc.
    value jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(field_id, entity_id)
);

CREATE INDEX IF NOT EXISTS custom_field_values_workspace_entity_idx ON public.custom_field_values (workspace_id, entity_id);
CREATE INDEX IF NOT EXISTS custom_field_values_field_value_idx ON public.custom_field_values USING gin (value);

-- 3. Enable RLS
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for custom_field_definitions
CREATE POLICY "Users can view field definitions in their workspace"
    ON public.custom_field_definitions FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert field definitions in their workspace"
    ON public.custom_field_definitions FOR INSERT
    WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update field definitions in their workspace"
    ON public.custom_field_definitions FOR UPDATE
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete field definitions in their workspace"
    ON public.custom_field_definitions FOR DELETE
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()) AND is_system = false);

-- 5. RLS Policies for custom_field_values
CREATE POLICY "Users can view field values in their workspace"
    ON public.custom_field_values FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert field values in their workspace"
    ON public.custom_field_values FOR INSERT
    WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update field values in their workspace"
    ON public.custom_field_values FOR UPDATE
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete field values in their workspace"
    ON public.custom_field_values FOR DELETE
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));
