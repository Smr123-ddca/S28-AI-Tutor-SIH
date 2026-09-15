-- Backend/scripts/08_course_rag_schema.sql

-- 1. Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending_review', 'approved', 'needs_revision', 'published', 'draft')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create documents table (maps to Supabase Storage)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create chunks table
CREATE TABLE IF NOT EXISTS public.chunks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_alias TEXT NOT NULL, -- e.g. 'chunk_12' for backwards compatibility
    topic TEXT,
    chapter TEXT,
    section TEXT,
    page_start INT,
    page_end INT,
    text_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Create concepts table
CREATE TABLE IF NOT EXISTS public.concepts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    concept_alias TEXT NOT NULL, -- e.g. 'concept_0001'
    name TEXT NOT NULL,
    description TEXT,
    confidence NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Create concept_evidence table
CREATE TABLE IF NOT EXISTS public.concept_evidence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE NOT NULL,
    chunk_id UUID REFERENCES public.chunks(id) ON DELETE CASCADE NOT NULL,
    classification TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Create prerequisite_relationships table
CREATE TABLE IF NOT EXISTS public.prerequisite_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    target_concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE NOT NULL,
    prerequisite_concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE NOT NULL,
    relationship_type TEXT, -- e.g. 'REQUIRED'
    confidence NUMERIC,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'candidate' CHECK (status IN ('candidate', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(target_concept_id, prerequisite_concept_id)
);

-- 7. Create ingestion_jobs table
CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('processing', 'failed', 'completed')),
    stage TEXT,
    error_log TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 8. Indexes for performance and compatibility mapping
CREATE INDEX IF NOT EXISTS idx_courses_name ON public.courses(name);
CREATE INDEX IF NOT EXISTS idx_chunks_course_id ON public.chunks(course_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_alias ON public.chunks(chunk_alias);
CREATE INDEX IF NOT EXISTS idx_concepts_course_id ON public.concepts(course_id);
CREATE INDEX IF NOT EXISTS idx_concepts_concept_alias ON public.concepts(concept_alias);
CREATE INDEX IF NOT EXISTS idx_prereqs_course_id ON public.prerequisite_relationships(course_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_course_id ON public.ingestion_jobs(course_id);

-- 9. Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prerequisite_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
-- Courses: Anyone can view published courses, only teachers can create/manage
CREATE POLICY "Anyone can view published courses"
ON public.courses FOR SELECT
USING (auth.role() = 'authenticated' AND status = 'published');

CREATE POLICY "Teachers can view all courses"
ON public.courses FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

CREATE POLICY "Teachers can manage their own courses"
ON public.courses FOR ALL
USING (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

-- Note: The rest of the tables are read-mostly by students and managed strictly by backend service_role during ingestion.
-- Students can read all chunks, concepts, prerequisites related to published courses.
CREATE POLICY "Students can read chunks for published courses"
ON public.chunks FOR SELECT
USING (EXISTS (SELECT 1 FROM public.courses WHERE id = chunks.course_id AND status = 'published' AND auth.role() = 'authenticated'));

CREATE POLICY "Teachers can read all chunks"
ON public.chunks FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

CREATE POLICY "Students can read concepts for published courses"
ON public.concepts FOR SELECT
USING (EXISTS (SELECT 1 FROM public.courses WHERE id = concepts.course_id AND status = 'published' AND auth.role() = 'authenticated'));

CREATE POLICY "Teachers can read all concepts"
ON public.concepts FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

CREATE POLICY "Students can read concept_evidence for published courses"
ON public.concept_evidence FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.concepts c 
    JOIN public.courses crs ON c.course_id = crs.id 
    WHERE c.id = concept_evidence.concept_id AND crs.status = 'published' AND auth.role() = 'authenticated'
));

CREATE POLICY "Teachers can read all concept_evidence"
ON public.concept_evidence FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

CREATE POLICY "Students can read approved prerequisites for published courses"
ON public.prerequisite_relationships FOR SELECT
USING (status = 'approved' AND EXISTS (SELECT 1 FROM public.courses WHERE id = prerequisite_relationships.course_id AND status = 'published' AND auth.role() = 'authenticated'));

CREATE POLICY "Teachers can view/manage all prerequisites"
ON public.prerequisite_relationships FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

CREATE POLICY "Teachers can view ingestion jobs"
ON public.ingestion_jobs FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'));

-- 11. Configure Storage Bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage
CREATE POLICY "Anyone authenticated can download course documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Teachers can upload course documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'documents' 
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);

CREATE POLICY "Teachers can delete course documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'documents' 
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
);
