-- Phase 5: Engagement & Integration (SDP 16 - 17)

-- ==========================================
-- 1. Unified Event Store (SDP 16)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.platform_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    event_type text NOT NULL, -- e.g., 'contact.created', 'contact.merged'
    entity_type text NOT NULL, -- e.g., 'contact', 'order', 'segment'
    entity_id uuid NOT NULL, -- the specific entity this event relates to
    actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Who performed the action (null if system/api)
    source text NOT NULL DEFAULT 'system', -- 'ui', 'api', 'import', 'webhook', 'system'
    metadata jsonb, -- The payload, e.g., changed fields, previous state
    correlation_id text, -- A shared ID for tracing workflows across multiple events
    schema_version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for lightning-fast timeline queries
CREATE INDEX IF NOT EXISTS platform_events_workspace_idx ON public.platform_events (workspace_id);
CREATE INDEX IF NOT EXISTS platform_events_entity_idx ON public.platform_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS platform_events_event_type_idx ON public.platform_events (event_type);
CREATE INDEX IF NOT EXISTS platform_events_correlation_idx ON public.platform_events (correlation_id);

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events in their workspace" ON public.platform_events
    FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

-- Only system/service roles should typically insert, but we will allow workspace users to log UI events
CREATE POLICY "Users can insert events in their workspace" ON public.platform_events
    FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));
