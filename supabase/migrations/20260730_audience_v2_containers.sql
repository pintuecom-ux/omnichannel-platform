-- Phase 3: Audience Segmentation & Containers (SDP 08 - 11)

-- ==========================================
-- 1. Tags Engine (SDP 10)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.tags (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    color text DEFAULT 'blue',
    icon text,
    category text,
    usage_count integer DEFAULT 0,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS tags_workspace_idx ON public.tags (workspace_id);

CREATE TABLE IF NOT EXISTS public.entity_tags (
    tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    entity_type text NOT NULL, -- 'contact', 'company', 'deal', etc.
    entity_id uuid NOT NULL,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY(tag_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS entity_tags_entity_idx ON public.entity_tags (entity_type, entity_id);

-- ==========================================
-- 2. Lists Engine (SDP 08)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.list_folders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.lists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    folder_id uuid REFERENCES public.list_folders(id) ON DELETE SET NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    color text,
    icon text,
    type text NOT NULL DEFAULT 'static', -- 'static', 'smart', 'system', 'integration'
    visibility text DEFAULT 'shared', -- 'private', 'shared'
    owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    contact_count integer DEFAULT 0,
    active_count integer DEFAULT 0,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS public.list_memberships (
    list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
    entity_type text NOT NULL DEFAULT 'contact',
    entity_id uuid NOT NULL,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'active', -- 'active', 'pending', 'unsubscribed', 'removed', 'suppressed'
    source text NOT NULL DEFAULT 'manual', -- 'manual', 'import', 'automation', 'api'
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    joined_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY(list_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS list_memberships_entity_idx ON public.list_memberships (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS list_memberships_status_idx ON public.list_memberships (status);

-- ==========================================
-- 3. Segment Engine (SDP 09)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.segments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    folder_id uuid REFERENCES public.list_folders(id) ON DELETE SET NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    type text NOT NULL DEFAULT 'live', -- 'live', 'snapshot', 'cached', 'system', 'ai'
    visibility text DEFAULT 'shared',
    owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    condition_set jsonb NOT NULL DEFAULT '{}'::jsonb, -- AST representing the query rules
    refresh_policy text DEFAULT 'manual',
    cached_count integer DEFAULT 0,
    last_calculated_at timestamp with time zone,
    version integer DEFAULT 1,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, slug)
);

-- ==========================================
-- 4. Enable RLS and Create Policies
-- ==========================================
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

-- Tags RLS
CREATE POLICY "Users can manage tags in their workspace" ON public.tags
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage entity tags in their workspace" ON public.entity_tags
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

-- Lists RLS
CREATE POLICY "Users can manage list folders in their workspace" ON public.list_folders
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage lists in their workspace" ON public.lists
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage list memberships in their workspace" ON public.list_memberships
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

-- Segments RLS
CREATE POLICY "Users can manage segments in their workspace" ON public.segments
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

