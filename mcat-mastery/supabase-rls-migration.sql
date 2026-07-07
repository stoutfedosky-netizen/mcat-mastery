-- Enable RLS on all tables
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- QUESTIONS: read-only for any authenticated user (no client-side insert/update/delete)
CREATE POLICY "Authenticated users can read questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);

-- QUESTION_ATTEMPTS: users can only access their own rows
CREATE POLICY "Users can read own attempts"
  ON public.question_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON public.question_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- EXAM_SESSIONS: users can only access their own rows
CREATE POLICY "Users can read own sessions"
  ON public.exam_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.exam_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
