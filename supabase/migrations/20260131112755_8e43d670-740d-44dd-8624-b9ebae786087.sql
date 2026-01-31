-- Drop existing constraint
ALTER TABLE public.drafts DROP CONSTRAINT IF EXISTS drafts_status_check;

-- Recreate with all allowed values including 'processing'
ALTER TABLE public.drafts ADD CONSTRAINT drafts_status_check 
CHECK (status IN ('idle', 'processing', 'completed', 'failed'));