-- Migration to add missing columns from v2 schema if the tables were already created in v1
-- This handles the case where `CREATE TABLE IF NOT EXISTS` skipped column creation.

DO $$ 
BEGIN 
    -- 1. Alter lists table
    BEGIN
        ALTER TABLE public.lists
        ADD COLUMN folder_id uuid REFERENCES public.list_folders(id) ON DELETE SET NULL,
        ADD COLUMN slug text,
        ADD COLUMN color text,
        ADD COLUMN icon text,
        ADD COLUMN type text NOT NULL DEFAULT 'static',
        ADD COLUMN visibility text DEFAULT 'shared',
        ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN active_count integer DEFAULT 0;
        
        -- Update slug for existing rows
        UPDATE public.lists SET slug = lower(regexp_replace(name, '\s+', '-', 'g')) WHERE slug IS NULL;
        ALTER TABLE public.lists ALTER COLUMN slug SET NOT NULL;
        ALTER TABLE public.lists ADD CONSTRAINT lists_workspace_id_slug_key UNIQUE(workspace_id, slug);
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;

    -- 2. Alter segments table
    BEGIN
        ALTER TABLE public.segments
        ADD COLUMN folder_id uuid REFERENCES public.list_folders(id) ON DELETE SET NULL,
        ADD COLUMN slug text,
        ADD COLUMN type text NOT NULL DEFAULT 'live',
        ADD COLUMN visibility text DEFAULT 'shared',
        ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN refresh_policy text DEFAULT 'manual',
        ADD COLUMN cached_count integer DEFAULT 0,
        ADD COLUMN version integer DEFAULT 1;

        -- Update slug for existing rows
        UPDATE public.segments SET slug = lower(regexp_replace(name, '\s+', '-', 'g')) WHERE slug IS NULL;
        ALTER TABLE public.segments ALTER COLUMN slug SET NOT NULL;
        ALTER TABLE public.segments ADD CONSTRAINT segments_workspace_id_slug_key UNIQUE(workspace_id, slug);
    EXCEPTION
        WHEN duplicate_column THEN null;
    END;
END $$;

-- Make sure to reload the schema cache so PostgREST picks up the new columns immediately
NOTIFY pgrst, 'reload schema';
