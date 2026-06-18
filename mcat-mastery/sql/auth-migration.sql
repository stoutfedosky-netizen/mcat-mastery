-- ============================================
-- AUTH MIGRATION — Run this in Supabase SQL Editor
-- Only creates auth-related tables (profiles, exam_sessions, question_attempts)
-- Run this AFTER enabling Authentication in Supabase dashboard
-- ============================================

-- Profiles (auto-created on sign-up via trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Exam sessions (test results)
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  question_ids TEXT[] NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  flagged JSONB NOT NULL DEFAULT '{}',
  timed BOOLEAN NOT NULL DEFAULT false,
  score_correct INT,
  score_total INT,
  score_percent NUMERIC(5,2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.exam_sessions(user_id);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.exam_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.exam_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Question-level attempt tracking
CREATE TABLE IF NOT EXISTS public.question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  session_id UUID REFERENCES public.exam_sessions(id) ON DELETE SET NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON public.question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_question ON public.question_attempts(question_id);

ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts" ON public.question_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own attempts" ON public.question_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
