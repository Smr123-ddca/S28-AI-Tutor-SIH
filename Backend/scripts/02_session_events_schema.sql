-- Backend/scripts/02_session_events_schema.sql

-- Create session_events table
CREATE TABLE public.session_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    chunk_id TEXT NOT NULL,
    correct BOOLEAN NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

-- Policies for session_events
CREATE POLICY "Students can insert their own events"
ON public.session_events FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can read their own events"
ON public.session_events FOR SELECT
USING (auth.uid() = student_id);
