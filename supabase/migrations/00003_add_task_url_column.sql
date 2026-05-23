
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_url TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completion_proof TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS required_time_seconds INTEGER DEFAULT 0;
