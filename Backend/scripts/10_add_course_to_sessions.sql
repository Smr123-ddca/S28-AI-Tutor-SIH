-- Backend/scripts/10_add_course_to_sessions.sql

-- 1. Add `course` column to `chat_sessions`
-- Initially allow NULL to prevent corruption of legacy sessions.
ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS course TEXT;

