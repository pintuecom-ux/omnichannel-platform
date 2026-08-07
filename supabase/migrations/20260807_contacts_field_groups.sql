-- Phase 1.1: Custom Field Groups for Contacts Module

CREATE TABLE IF NOT EXISTS public.field_groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    order_index integer DEFAULT 0,
    parent_group_id uuid REFERENCES public.field_groups(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, name)
);

CREATE INDEX IF NOT EXISTS field_groups_workspace_idx ON public.field_groups (workspace_id);

ALTER TABLE public.field_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view field groups in their workspace"
    ON public.field_groups FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert field groups in their workspace"
    ON public.field_groups FOR INSERT
    WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update field groups in their workspace"
    ON public.field_groups FOR UPDATE
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete field groups in their workspace"
    ON public.field_groups FOR DELETE
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

-- Alter custom_field_definitions to link to the new field_groups table
-- It currently has `field_group text`. We will add a UUID column.
ALTER TABLE public.custom_field_definitions
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.field_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_unique boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_readonly boolean DEFAULT false;

-- Add social_profiles to contacts
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS social_profiles jsonb DEFAULT '{}'::jsonb;

-- Ensure conversations table can link to contacts (assuming it exists, otherwise add the column)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
        ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;
    END IF;
END $$;
