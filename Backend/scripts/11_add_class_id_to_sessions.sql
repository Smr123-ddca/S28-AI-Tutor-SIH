-- Migration: Add class_id to chat_sessions
-- Run this in your Supabase SQL Editor

ALTER TABLE public.chat_sessions
ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.chat_sessions.class_id IS 'Associates this session strictly with a specific learning class environment if launched from a dashboard.';
