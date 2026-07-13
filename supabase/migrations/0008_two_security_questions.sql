-- -----------------------------------------------------------------------------
-- 0008_two_security_questions.sql
-- Replaces the single security question with two, both self-authored by the
-- user. Adds the new columns alongside the old ones from 0007 (harmless,
-- unused leftovers — consistent with never destroying data casually here).
-- -----------------------------------------------------------------------------

alter table public.user_profiles
  add column if not exists security_question_1 text,
  add column if not exists security_answer_hash_1 text,
  add column if not exists security_question_2 text,
  add column if not exists security_answer_hash_2 text;
