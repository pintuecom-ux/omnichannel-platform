-- Phase 2.1: Comprehensive Contact Fields (SDP Audience Model Extension)

DO $$ 
BEGIN 
    -- Alter contacts table to include all requested standard fields natively
    BEGIN
        ALTER TABLE public.contacts
        -- Personal
        ADD COLUMN gender text,
        ADD COLUMN date_of_birth date,
        -- Communication
        ADD COLUMN secondary_phone text,
        ADD COLUMN secondary_email text,
        -- Social Links
        ADD COLUMN facebook_url text,
        ADD COLUMN instagram_url text,
        ADD COLUMN linkedin_url text,
        -- Business
        ADD COLUMN department text,
        ADD COLUMN designation text,
        ADD COLUMN job_title text,
        -- Location extension
        ADD COLUMN state text,
        ADD COLUMN area text,
        ADD COLUMN landmark text,
        ADD COLUMN pin_code text,
        ADD COLUMN latitude numeric,
        ADD COLUMN longitude numeric,
        -- CRM & Ownership
        ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN lifecycle_stage text,
        ADD COLUMN status text,
        -- Activity & Metrics
        ADD COLUMN last_whatsapp_message_at timestamp with time zone,
        ADD COLUMN last_email_at timestamp with time zone,
        ADD COLUMN last_sms_at timestamp with time zone,
        ADD COLUMN last_channel_used text,
        ADD COLUMN preferred_channel text,
        ADD COLUMN last_activity_at timestamp with time zone,
        ADD COLUMN last_login_at timestamp with time zone,
        ADD COLUMN last_contacted_at timestamp with time zone,
        -- AI & Intelligence
        ADD COLUMN ai_score numeric,
        ADD COLUMN churn_risk numeric,
        -- Marketing & Tracking
        ADD COLUMN campaign text,
        ADD COLUMN medium text,
        ADD COLUMN utm_source text,
        ADD COLUMN utm_medium text,
        ADD COLUMN utm_campaign text,
        ADD COLUMN utm_content text,
        ADD COLUMN utm_term text,
        ADD COLUMN referrer text,
        -- Custom Columns Storage
        ADD COLUMN custom_fields jsonb DEFAULT '{}'::jsonb;

        -- Create a GIN index on custom_fields to make it highly filterable/sortable in segments
        CREATE INDEX IF NOT EXISTS contacts_custom_fields_idx ON public.contacts USING gin (custom_fields);

        -- Enforce uniqueness on Phone or Email per workspace
        -- Note: We only enforce uniqueness where the value is NOT NULL. 
        CREATE UNIQUE INDEX IF NOT EXISTS contacts_workspace_phone_idx ON public.contacts (workspace_id, phone) WHERE phone IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS contacts_workspace_email_idx ON public.contacts (workspace_id, email) WHERE email IS NOT NULL;

    EXCEPTION
        WHEN duplicate_column THEN null;
    END;

    -- Create saved_views table for dynamic table configurations
    CREATE TABLE IF NOT EXISTS public.saved_views (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        entity_type text NOT NULL, -- e.g., 'contacts', 'lists'
        name text NOT NULL,
        is_default boolean DEFAULT false,
        is_shared boolean DEFAULT false,
        columns jsonb NOT NULL, -- Array of visible column keys
        filters jsonb, -- Array of active filters
        sorts jsonb, -- Array of sort configurations
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    
    -- RLS for saved_views
    ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
    
    -- Drop policy if exists to avoid errors on re-run
    DROP POLICY IF EXISTS "Users can view their own and shared views" ON public.saved_views;
    CREATE POLICY "Users can view their own and shared views"
        ON public.saved_views FOR SELECT
        USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()) AND (user_id = auth.uid() OR is_shared = true));

    DROP POLICY IF EXISTS "Users can insert their own views" ON public.saved_views;
    CREATE POLICY "Users can insert their own views"
        ON public.saved_views FOR INSERT
        WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()) AND user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can update their own views" ON public.saved_views;
    CREATE POLICY "Users can update their own views"
        ON public.saved_views FOR UPDATE
        USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "Users can delete their own views" ON public.saved_views;
    CREATE POLICY "Users can delete their own views"
        ON public.saved_views FOR DELETE
        USING (user_id = auth.uid());

END $$;

-- Make sure to reload the schema cache so PostgREST picks up the new columns immediately
NOTIFY pgrst, 'reload schema';
