-- Run this once if you already created the tables BEFORE the monthly check-in feature.
-- (New setups using supabase-schema.sql already include this column.)
alter table public.profiles add column if not exists plan_month date;
