-- Phase 4: Data Portability & Governance (SDP 12 - 14)

-- ==========================================
-- 1. Consent Engine (SDP 14)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.contact_consents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    channel text NOT NULL, -- 'whatsapp', 'email', 'sms', 'push'
    purpose text NOT NULL, -- 'marketing', 'transactional', 'promotions'
    status text NOT NULL DEFAULT 'pending', -- 'granted', 'withdrawn', 'pending'
    source text NOT NULL, -- 'website', 'import', 'manual', 'webhook'
    legal_basis text NOT NULL DEFAULT 'legitimate_interest', -- 'consent', 'contract', 'legitimate_interest'
    granted_at timestamp with time zone,
    withdrawn_at timestamp with time zone,
    expires_at timestamp with time zone,
    evidence text, -- URL or JSON proof of opt-in
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(contact_id, channel, purpose)
);

CREATE INDEX IF NOT EXISTS contact_consents_contact_idx ON public.contact_consents (contact_id);
CREATE INDEX IF NOT EXISTS contact_consents_status_idx ON public.contact_consents (status);

-- ==========================================
-- 2. Import Engine (SDP 12)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.import_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'parsing', 'mapping', 'running', 'completed', 'failed'
    source text NOT NULL DEFAULT 'csv',
    file_url text,
    file_name text,
    mapping_config jsonb, -- Maps CSV headers to platform fields
    default_tags text[],
    default_lists uuid[],
    total_rows integer DEFAULT 0,
    processed_rows integer DEFAULT 0,
    error_count integer DEFAULT 0,
    error_log_url text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS import_jobs_workspace_idx ON public.import_jobs (workspace_id);

-- ==========================================
-- 3. Export Engine (SDP 13)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.export_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    format text NOT NULL DEFAULT 'csv',
    dataset text NOT NULL DEFAULT 'contacts', -- 'contacts', 'lists', 'segments'
    query_config jsonb NOT NULL, -- The AST / filter logic to execute
    field_selection text[], -- The specific columns to export
    file_url text,
    total_records integer DEFAULT 0,
    expires_at timestamp with time zone, -- Auto-delete link after 7 days
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS export_jobs_workspace_idx ON public.export_jobs (workspace_id);

-- ==========================================
-- 4. Enable RLS and Create Policies
-- ==========================================
ALTER TABLE public.contact_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- Consent RLS
CREATE POLICY "Users can manage consent in their workspace" ON public.contact_consents
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

-- Imports RLS
CREATE POLICY "Users can manage imports in their workspace" ON public.import_jobs
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

-- Exports RLS
CREATE POLICY "Users can manage exports in their workspace" ON public.export_jobs
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

