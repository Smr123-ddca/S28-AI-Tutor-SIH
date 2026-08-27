-- Backend/scripts/03_practice_foundation_schema.sql

-- 1. Create practice_questions table
CREATE TABLE public.practice_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
    chunk_id UUID,
    subject VARCHAR(255),
    question TEXT NOT NULL,
    concept TEXT,
    hint_1 TEXT,
    hint_2 TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed_at TIMESTAMPTZ
);

-- 2. Create practice_attempts table
CREATE TABLE public.practice_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    practice_question_id UUID REFERENCES public.practice_questions(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    answer TEXT NOT NULL,
    evaluation VARCHAR(50) NOT NULL CHECK (evaluation IN ('correct', 'partial', 'incorrect')),
    attempt_number INTEGER NOT NULL,
    hints_used INTEGER DEFAULT 0 NOT NULL,
    answer_revealed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_practice_questions_student_id ON public.practice_questions(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_questions_session_id ON public.practice_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_practice_question_id ON public.practice_attempts(practice_question_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_student_id ON public.practice_attempts(student_id);

-- 4. Enable RLS
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;

-- 5. Policies for practice_questions
-- Students can manage their own practice questions
CREATE POLICY "Students can manage their own practice questions"
ON public.practice_questions FOR ALL
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- 6. Policies for practice_attempts
-- Students can manage their own attempts
CREATE POLICY "Students can manage their own practice attempts"
ON public.practice_attempts FOR ALL
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);
