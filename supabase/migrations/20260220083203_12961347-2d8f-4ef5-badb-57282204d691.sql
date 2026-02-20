
-- 1) analytics_session_id 컬럼 추가 (idempotent)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS analytics_session_id TEXT NULL;

-- 2) db_session_id 컬럼 추가 (idempotent)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS db_session_id UUID NULL;

-- 3) 기존 session_id FK 드롭 (존재하면)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_session_id_fkey'
      AND table_name = 'events'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT events_session_id_fkey;
  END IF;
END
$$;

-- 4) db_session_id FK 추가 (존재하지 않을 때만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_db_session_id_fkey'
      AND table_name = 'events'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_db_session_id_fkey
      FOREIGN KEY (db_session_id)
      REFERENCES public.sessions(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- 5) 안전한 backfill: session_id가 유효한 UUID 형식이고 sessions에 존재할 때만 복사
UPDATE public.events e
SET db_session_id = e.session_id
WHERE e.session_id IS NOT NULL
  AND e.db_session_id IS NULL
  AND e.session_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.sessions s WHERE s.id = e.session_id
  );
