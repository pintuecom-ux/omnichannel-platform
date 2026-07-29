-- Audience Module: Contacts Expansion, Lists, List Subscriptions, Segments

-- 1. Alter Contacts Table
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS wa_opt_in_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS email_opt_in_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sms_opt_in_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS fb_opt_in_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS ig_opt_in_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS first_seen_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS is_suppressed boolean DEFAULT false;

-- Add index on external_id for deduplication
CREATE INDEX IF NOT EXISTS contacts_external_id_idx ON public.contacts (workspace_id, external_id);
-- Add index on email and phone for deduplication (already has unique constraints on phone typically, but good for search)
CREATE INDEX IF NOT EXISTS contacts_email_idx ON public.contacts (workspace_id, email);
CREATE INDEX IF NOT EXISTS contacts_phone_idx ON public.contacts (workspace_id, phone);

-- 2. Create Lists Table
CREATE TABLE IF NOT EXISTS public.lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  list_type text DEFAULT 'standard', -- standard, signup_form, channel_master, suppression, import
  description text,
  tags text[] DEFAULT '{}',
  double_opt_in_enabled boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  contact_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS lists_workspace_id_idx ON public.lists (workspace_id);

-- 3. Create List Subscriptions Table
CREATE TABLE IF NOT EXISTS public.list_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status text DEFAULT 'subscribed', -- subscribed, unsubscribed, pending, cleaned
  channel text, -- Optional, if the list is channel-specific
  source text,
  unsubscribe_reason text,
  subscribed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  unsubscribed_at timestamp with time zone,
  UNIQUE(list_id, contact_id)
);

CREATE INDEX IF NOT EXISTS list_subscriptions_list_id_idx ON public.list_subscriptions (list_id);
CREATE INDEX IF NOT EXISTS list_subscriptions_contact_id_idx ON public.list_subscriptions (contact_id);

-- Trigger to update list contact_count (subscribed only)
CREATE OR REPLACE FUNCTION public.update_list_contact_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'subscribed' THEN
    UPDATE public.lists SET contact_count = contact_count + 1 WHERE id = NEW.list_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'subscribed' AND NEW.status != 'subscribed' THEN
      UPDATE public.lists SET contact_count = contact_count - 1 WHERE id = NEW.list_id;
    ELSIF OLD.status != 'subscribed' AND NEW.status = 'subscribed' THEN
      UPDATE public.lists SET contact_count = contact_count + 1 WHERE id = NEW.list_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'subscribed' THEN
    UPDATE public.lists SET contact_count = contact_count - 1 WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_list_contact_count ON public.list_subscriptions;
CREATE TRIGGER tr_update_list_contact_count
AFTER INSERT OR UPDATE OR DELETE ON public.list_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_list_contact_count();

-- 4. Create Segments Table
CREATE TABLE IF NOT EXISTS public.segments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  condition_set jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluation_model text DEFAULT 'realtime', -- realtime, lazy, batch
  contact_count integer DEFAULT 0,
  last_computed_at timestamp with time zone,
  is_archived boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS segments_workspace_id_idx ON public.segments (workspace_id);

-- Enable RLS
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

-- Policies for Lists
CREATE POLICY "Users can view lists in their workspace"
  ON public.lists FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert lists in their workspace"
  ON public.lists FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update lists in their workspace"
  ON public.lists FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete lists in their workspace"
  ON public.lists FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for List Subscriptions (inherit from list workspace_id)
CREATE POLICY "Users can view list subscriptions in their workspace"
  ON public.list_subscriptions FOR SELECT
  USING (list_id IN (SELECT id FROM public.lists WHERE workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can insert list subscriptions in their workspace"
  ON public.list_subscriptions FOR INSERT
  WITH CHECK (list_id IN (SELECT id FROM public.lists WHERE workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update list subscriptions in their workspace"
  ON public.list_subscriptions FOR UPDATE
  USING (list_id IN (SELECT id FROM public.lists WHERE workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "Users can delete list subscriptions in their workspace"
  ON public.list_subscriptions FOR DELETE
  USING (list_id IN (SELECT id FROM public.lists WHERE workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid())));

-- Policies for Segments
CREATE POLICY "Users can view segments in their workspace"
  ON public.segments FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert segments in their workspace"
  ON public.segments FOR INSERT
  WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update segments in their workspace"
  ON public.segments FOR UPDATE
  USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete segments in their workspace"
  ON public.segments FOR DELETE
  USING (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()));
