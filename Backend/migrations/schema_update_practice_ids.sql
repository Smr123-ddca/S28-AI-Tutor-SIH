-- Phase 4A.6 Canonical Semantic Learning Tracker Additions

-- Add course_id referencing the courses payload
ALTER TABLE practice_questions
ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Add class_id referencing the classes payload
ALTER TABLE practice_questions
ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- Add concept_id referencing the concepts payload
ALTER TABLE practice_questions
ADD COLUMN concept_id UUID REFERENCES concepts(id) ON DELETE SET NULL;

-- DO NOT apply any destructive backfills here to preserve semantic integrity
-- DO NOT modify existing columns (subject, concept) to preserve RAG/Analytics dependencies.
