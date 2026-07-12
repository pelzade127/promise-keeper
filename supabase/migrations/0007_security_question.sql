-- -----------------------------------------------------------------------------
-- 0007_security_question.sql
-- Adds an optional security question + hashed answer to each profile, used as
-- a password-reset path that doesn't depend on sending email.
-- -----------------------------------------------------------------------------

alter table public.user_profiles
  add column if not exists security_question text,
  add column if not exists security_answer_hash text;
