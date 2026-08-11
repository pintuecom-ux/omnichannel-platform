-- Phase 2.2: Add Quick Add flag to Custom Field Definitions

ALTER TABLE public.custom_field_definitions
ADD COLUMN IF NOT EXISTS is_quick_add boolean DEFAULT false;

-- Notify pgrst to reload schema cache
NOTIFY pgrst, 'reload schema';
