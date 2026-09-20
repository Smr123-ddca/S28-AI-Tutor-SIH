-- Backend/scripts/12_class_management_schema.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    section TEXT,
    join_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: user_courses already maps course ownership. We enforce ownership primarily in the backend controller 
-- but also via RLS for safety. The teacher_id must match the auth.uid().

-- Create class_members table
CREATE TABLE IF NOT EXISTS public.class_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, student_id)
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

-- CLASSES RLS

-- 1. Teachers can SELECT own classes
CREATE POLICY "Teachers can view own classes"
ON public.classes FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

-- 2. Teachers can INSERT own classes (Backend should also verify course ownership)
CREATE POLICY "Teachers can insert own classes"
ON public.classes FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid());

-- 3. Teachers can UPDATE own classes
CREATE POLICY "Teachers can update own classes"
ON public.classes FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- 4. Students can SELECT active classes (for discovery)
CREATE POLICY "Students can view active classes"
ON public.classes FOR SELECT
TO authenticated
USING (status = 'active');

-- CLASS_MEMBERS RLS

-- 1. Teachers can SELECT members of their own classes
CREATE POLICY "Teachers can view members of their classes"
ON public.class_members FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.classes
        WHERE classes.id = class_members.class_id
        AND classes.teacher_id = auth.uid()
    )
);

-- 2. Students can SELECT their own memberships
CREATE POLICY "Students can view true memberships"
ON public.class_members FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Note: We rely on the Supabase service role / Backend logic to INSERT into class_members securely,
-- verifying the join_code and course existence natively. We do NOT allow generic INSERT by authenticated users
-- for class_members to prevent brute force ID bypassing natively.

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_classes_course_id ON public.classes(course_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_join_code ON public.classes(join_code);
CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON public.class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_student_id ON public.class_members(student_id);
