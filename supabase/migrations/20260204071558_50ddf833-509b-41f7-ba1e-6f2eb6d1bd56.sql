-- 1. Add promotion_status column to drafts table
ALTER TABLE public.drafts
ADD COLUMN promotion_status text NOT NULL DEFAULT 'none';

-- 2. Add check constraint for promotion_status values
ALTER TABLE public.drafts
ADD CONSTRAINT drafts_promotion_status_check 
CHECK (promotion_status IN ('none', 'promoting', 'promoted'));

-- 3. Add unique constraint on outputs (session_id, platform_type) if not exists
-- First check and drop if exists, then recreate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'outputs_session_platform_unique'
  ) THEN
    ALTER TABLE public.outputs
    ADD CONSTRAINT outputs_session_platform_unique UNIQUE (session_id, platform_type);
  END IF;
END $$;