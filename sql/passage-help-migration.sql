-- Add passage_help column to questions table
-- Run this in the Supabase SQL Editor before importing updated batches
alter table public.questions
  add column if not exists passage_help text;

comment on column public.questions.passage_help is
  'Optional reasoning guidance shown in a collapsible Get Help panel below the passage';
