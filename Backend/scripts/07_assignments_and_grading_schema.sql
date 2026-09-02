-- Backend/scripts/07_assignments_and_grading_schema.sql

-- 1. Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    rubric TEXT,
    max_score NUMERIC DEFAULT 100 NOT NULL,
    due_date TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create submissions table with grading extensions
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    submission_text TEXT NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    grade NUMERIC CHECK (grade >= 0 AND grade <= 100),
    feedback TEXT,
    ai_suggested_grade NUMERIC,
    ai_suggested_feedback TEXT,
    status VARCHAR(50) DEFAULT 'ungraded' CHECK (status IN ('ungraded', 'graded')),
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. Indexes for rapid lookups
CREATE INDEX IF NOT EXISTS idx_assignments_course_name ON public.assignments(course_name);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 5. Policies for assignments
-- All authenticated users can view assignments
CREATE POLICY "Anyone can view assignments"
ON public.assignments FOR SELECT
USING (auth.role() = 'authenticated');

-- Teachers can manage assignments
CREATE POLICY "Teachers can insert assignments"
ON public.assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'teacher'
    )
);

-- 6. Policies for submissions
-- Students can insert and view their own submissions
CREATE POLICY "Students can insert own submissions"
ON public.submissions FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own submissions"
ON public.submissions FOR SELECT
USING (
    auth.uid() = student_id OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'teacher'
    )
);

-- Teachers can update grades and feedback
CREATE POLICY "Teachers can update grades"
ON public.submissions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'teacher'
    )
);
