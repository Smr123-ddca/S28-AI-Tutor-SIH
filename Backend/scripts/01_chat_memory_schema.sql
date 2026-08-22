-- Backend/scripts/01_chat_memory_schema.sql

-- 1. Create chat_sessions table
CREATE TABLE public.chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_message_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create chat_messages table
CREATE TABLE public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    response_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Policies for chat_sessions
-- Students can select, insert, update, delete their own sessions
CREATE POLICY "Students can manage their own chat sessions"
ON public.chat_sessions FOR ALL
USING (auth.uid() = student_id);

-- 5. Policies for chat_messages
-- Students can manage messages for their own sessions
CREATE POLICY "Students can manage messages in their own sessions"
ON public.chat_messages FOR ALL
USING (
    session_id IN (
        SELECT id FROM public.chat_sessions WHERE student_id = auth.uid()
    )
);
