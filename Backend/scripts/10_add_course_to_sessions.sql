-- Backend/scripts/10_add_course_to_sessions.sql

-- 1. Add `course` column to `chat_sessions`
-- Initially allow NULL so it can be added to existing tables
ALTER TABLE public.chat_sessions
ADD COLUMN course TEXT;

-- 2. Backfill existing sessions (set default course to something unharmful or nullified)
UPDATE public.chat_sessions
SET course = 'Unknown'
WHERE course IS NULL;

-- 3. Alter column to NOT NULL
ALTER TABLE public.chat_sessions
ALTER COLUMN course SET NOT NULL;
