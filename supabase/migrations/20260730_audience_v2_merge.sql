-- Phase 4: Merge Engine (SDP 15)

-- ==========================================
-- 1. Merge Engine (SDP 15)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.contact_merges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    primary_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    secondary_contact_id uuid NOT NULL, -- Do not cascade, this is an audit log of a deleted/archived contact
    merged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    merge_strategy text NOT NULL DEFAULT 'manual', -- 'manual', 'most_complete', 'oldest', 'newest'
    conflict_resolution jsonb, -- Record of how field conflicts were resolved
    original_primary_data jsonb, -- Snapshot of primary contact before merge
    original_secondary_data jsonb, -- Snapshot of secondary contact before merge
    status text NOT NULL DEFAULT 'completed', -- 'completed', 'reverted'
    reverted_at timestamp with time zone,
    reverted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS contact_merges_workspace_idx ON public.contact_merges (workspace_id);
CREATE INDEX IF NOT EXISTS contact_merges_primary_idx ON public.contact_merges (primary_contact_id);
CREATE INDEX IF NOT EXISTS contact_merges_secondary_idx ON public.contact_merges (secondary_contact_id);

ALTER TABLE public.contact_merges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view merges in their workspace" ON public.contact_merges
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));
