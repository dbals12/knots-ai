-- Add session_id column to drafts table for duplicate promotion prevention
ALTER TABLE public.drafts 
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL;