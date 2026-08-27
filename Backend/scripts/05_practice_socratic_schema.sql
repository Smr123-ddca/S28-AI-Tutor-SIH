-- Backend/scripts/05_practice_socratic_schema.sql

-- 1. Extend practice_attempts to store the Socratic tutor's guiding questions sequentially
ALTER TABLE public.practice_attempts 
ADD COLUMN IF NOT EXISTS tutor_response TEXT;

-- 2. Extend practice_questions to globally track if a student escaped the loop by revealing the answer
ALTER TABLE public.practice_questions 
ADD COLUMN IF NOT EXISTS answer_revealed BOOLEAN DEFAULT FALSE NOT NULL;
