-- Add unique constraint on outputs(session_id, platform_type) for upsert support
ALTER TABLE public.outputs 
ADD CONSTRAINT outputs_session_platform_unique UNIQUE (session_id, platform_type);