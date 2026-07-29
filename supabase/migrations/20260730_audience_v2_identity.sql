-- Phase 1: Audience Module v2.0 - Core Foundation & Identity Resolution

-- 1. Create contact_identities table
CREATE TABLE IF NOT EXISTS public.contact_identities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    provider text NOT NULL, -- 'whatsapp', 'instagram', 'facebook', 'email', 'custom', 'external_crm'
    identifier text NOT NULL,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, provider, identifier)
);

CREATE INDEX IF NOT EXISTS contact_identities_workspace_id_idx ON public.contact_identities (workspace_id);
CREATE INDEX IF NOT EXISTS contact_identities_contact_id_idx ON public.contact_identities (contact_id);
CREATE INDEX IF NOT EXISTS contact_identities_provider_identifier_idx ON public.contact_identities (provider, identifier);

-- 2. Create contact_merge_history table
CREATE TABLE IF NOT EXISTS public.contact_merge_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    merged_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    from_contact_id uuid NOT NULL, -- We don't use a strict FK constraint here in case the old contact is hard deleted
    reason text,
    merged_by uuid REFERENCES auth.users(id),
    fields_changed jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS contact_merge_history_workspace_id_idx ON public.contact_merge_history (workspace_id);
CREATE INDEX IF NOT EXISTS contact_merge_history_merged_contact_id_idx ON public.contact_merge_history (merged_contact_id);

-- 3. Modify contacts table to ensure meta JSONB column exists (it should already exist, but making sure)
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- 4. Enable RLS
ALTER TABLE public.contact_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_merge_history ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS Policies for contact_identities
CREATE POLICY "Users can view contact identities in their workspace"
    ON public.contact_identities FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert contact identities in their workspace"
    ON public.contact_identities FOR INSERT
    WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update contact identities in their workspace"
    ON public.contact_identities FOR UPDATE
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete contact identities in their workspace"
    ON public.contact_identities FOR DELETE
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

-- 6. Add RLS Policies for contact_merge_history
CREATE POLICY "Users can view contact merge history in their workspace"
    ON public.contact_merge_history FOR SELECT
    USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert contact merge history in their workspace"
    ON public.contact_merge_history FOR INSERT
    WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

-- Merge history should be immutable (no UPDATE/DELETE policies by standard users)
