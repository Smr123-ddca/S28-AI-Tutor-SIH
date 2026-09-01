-- Backend/scripts/06_alter_chunk_id_string.sql
-- The practice_questions table currently has 0 rows due to the 22P02 error blocking all inserts. 
-- It is safe to natively alter the column type to properly map against the string-based chunks (e.g., 'chunk_7').

ALTER TABLE public.practice_questions 
ALTER COLUMN chunk_id TYPE TEXT USING chunk_id::text;
