-- Backend/scripts/04_practice_hints_schema.sql

-- Add the hints_requested column to track consecutive requests sequentially
ALTER TABLE public.practice_questions 
ADD COLUMN IF NOT EXISTS hints_requested INTEGER DEFAULT 0 NOT NULL;
