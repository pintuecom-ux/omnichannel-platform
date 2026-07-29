-- Phase 6: Enterprise Architecture & Security (SDP 18 - 20)

-- ==========================================
-- 1. Roles & Permissions (SDP 18)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    is_system boolean DEFAULT false, -- If true, users cannot edit or delete this role
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, name)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    resource text NOT NULL, -- e.g., 'contacts', 'campaigns', 'settings'
    action text NOT NULL, -- 'create', 'read', 'update', 'delete', 'export'
    conditions jsonb, -- Attribute-based access control rules (e.g., {"department": "sales"})
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(role_id, resource, action)
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
    joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY(workspace_id, user_id)
);

-- ==========================================
-- 2. Audience Analytics (SDP 19)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.audience_metrics_snapshots (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    snapshot_date date NOT NULL,
    total_contacts integer DEFAULT 0,
    active_contacts integer DEFAULT 0,
    reachable_contacts integer DEFAULT 0,
    verified_contacts integer DEFAULT 0,
    duplicate_rate numeric DEFAULT 0.0,
    avg_completeness numeric DEFAULT 0.0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, snapshot_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS roles_workspace_idx ON public.roles (workspace_id);
CREATE INDEX IF NOT EXISTS audience_metrics_workspace_date_idx ON public.audience_metrics_snapshots (workspace_id, snapshot_date);

-- ==========================================
-- 3. Security (RLS Policies)
-- ==========================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_metrics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view roles in their workspace" ON public.roles
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view role_permissions in their workspace" ON public.role_permissions
    FOR SELECT USING (role_id IN (SELECT id FROM public.roles WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can view members in their workspace" ON public.workspace_members
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view analytics in their workspace" ON public.audience_metrics_snapshots
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
