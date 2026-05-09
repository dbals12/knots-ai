ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS input_guide_type text,
  ADD COLUMN IF NOT EXISTS selected_example_id text,
  ADD COLUMN IF NOT EXISTS selected_example_text text,
  ADD COLUMN IF NOT EXISTS input_length_chars integer,
  ADD COLUMN IF NOT EXISTS recording_duration_seconds integer;