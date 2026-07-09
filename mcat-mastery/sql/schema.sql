-- ============================================
-- MCAT MASTERY — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- SECTIONS
-- ============================================
create table public.sections (
  id text primary key,
  name text not null,
  abbreviation text not null,
  color text not null,
  sort_order int not null default 0
);

insert into public.sections (id, name, abbreviation, color, sort_order) values
  ('cp', 'Chemical & Physical Foundations of Biological Systems', 'C/P', '#0891b2', 1),
  ('cars', 'Critical Analysis and Reasoning Skills', 'CARS', '#7c3aed', 2),
  ('bb', 'Biological & Biochemical Foundations of Living Systems', 'B/B', '#059669', 3),
  ('ps', 'Psychological, Social & Biological Foundations of Behavior', 'P/S', '#e11d48', 4);

-- ============================================
-- QUESTIONS
-- ============================================
create table public.questions (
  id text primary key,
  section_id text not null references public.sections(id),
  batch text not null,
  topic text not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  passage text,                    -- null for discrete questions
  passage_image text,              -- base64 data URI for passage figure
  passage_image_caption text,      -- caption for the passage figure
  use_prev_passage boolean not null default false,
  stem text not null,
  choices jsonb not null,          -- [{label, text}, ...]
  correct_answer text not null,
  explanations jsonb not null,     -- {A: "...", B: "...", C: "...", D: "..."}
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_questions_section on public.questions(section_id);
create index idx_questions_batch on public.questions(batch);
create index idx_questions_topic on public.questions(topic);

-- ============================================
-- USER PROFILES
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro', 'lifetime')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- EXAM SESSIONS
-- ============================================
create table public.exam_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  section_id text not null references public.sections(id),
  mode text not null default 'practice' check (mode in ('practice', 'timed', 'review')),
  question_ids text[] not null,    -- ordered array of question IDs
  answers jsonb not null default '{}',  -- {question_id: "A"|"B"|"C"|"D"}
  flagged jsonb not null default '{}',  -- {question_id: true}
  current_index int not null default 0,
  time_remaining int,              -- seconds, null for untimed
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score_correct int,
  score_total int,
  score_percent numeric(5,2)
);

create index idx_sessions_user on public.exam_sessions(user_id);
create index idx_sessions_section on public.exam_sessions(section_id);

-- ============================================
-- QUESTION-LEVEL PERFORMANCE TRACKING
-- ============================================
create table public.question_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.questions(id),
  session_id uuid references public.exam_sessions(id) on delete set null,
  selected_answer text not null,
  is_correct boolean not null,
  time_spent_seconds int,
  attempted_at timestamptz not null default now()
);

create index idx_attempts_user on public.question_attempts(user_id);
create index idx_attempts_question on public.question_attempts(question_id);
create index idx_attempts_user_question on public.question_attempts(user_id, question_id);

-- ============================================
-- TOPIC PERFORMANCE VIEW (for dashboard analytics)
-- ============================================
-- security_invoker makes the view respect the querying user's RLS policies
create or replace view public.topic_performance
with (security_invoker = on)
as
select
  qa.user_id,
  q.section_id,
  q.topic,
  q.difficulty,
  count(*) as attempts,
  sum(case when qa.is_correct then 1 else 0 end) as correct,
  round(100.0 * sum(case when qa.is_correct then 1 else 0 end) / count(*), 1) as accuracy_pct
from public.question_attempts qa
join public.questions q on qa.question_id = q.id
group by qa.user_id, q.section_id, q.topic, q.difficulty;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.question_attempts enable row level security;

-- Profiles: users can read/update only their own
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Sessions: users can CRUD only their own
create policy "Users can view own sessions"
  on public.exam_sessions for select using (auth.uid() = user_id);
create policy "Users can create own sessions"
  on public.exam_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions"
  on public.exam_sessions for update using (auth.uid() = user_id);

-- Attempts: users can CRUD only their own
create policy "Users can view own attempts"
  on public.question_attempts for select using (auth.uid() = user_id);
create policy "Users can create own attempts"
  on public.question_attempts for insert with check (auth.uid() = user_id);

-- Questions: readable by all authenticated users
alter table public.questions enable row level security;
create policy "Authenticated users can read questions"
  on public.questions for select using (auth.role() = 'authenticated');

-- Sections: readable by everyone
alter table public.sections enable row level security;
create policy "Anyone can read sections"
  on public.sections for select using (true);
