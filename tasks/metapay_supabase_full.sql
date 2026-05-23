-- ============================================================
--  MetaPay — Complete Supabase SQL
--  Run this entire file in Supabase > SQL Editor
--  Order: Extensions → Enums → Tables → Indexes →
--         Triggers → RLS → Policies → Seed Data
-- ============================================================

-- ─── 0. Extensions ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. Enums ───────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role       AS ENUM ('user','moderator','admin','super_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_status  AS ENUM ('inactive','active','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE package_name    AS ENUM ('starter','bronze','silver','gold','vip');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_category   AS ENUM (
    'surveys','watching_ads','app_testing','data_annotation',
    'offers','video_tasks','daily_tasks','referrals'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE task_difficulty AS ENUM ('easy','medium','hard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE withdrawal_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM (
    'task_reward','referral_bonus','withdrawal','package_activation','bonus'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE earning_source AS ENUM ('task','referral','bonus','daily_login');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('payment','task','referral','system','withdrawal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. Tables ──────────────────────────────────────────────

-- profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name            TEXT NOT NULL,
  phone                TEXT UNIQUE,
  role                 user_role NOT NULL DEFAULT 'user',
  status               account_status NOT NULL DEFAULT 'inactive',
  referral_code        TEXT UNIQUE,
  referred_by          UUID REFERENCES public.profiles(id),
  current_package      package_name,
  activation_date      TIMESTAMPTZ,
  package_expiry       TIMESTAMPTZ,
  withdrawal_balance   NUMERIC(12,2) NOT NULL DEFAULT 0,
  today_earnings       NUMERIC(12,2) NOT NULL DEFAULT 0,
  weekly_earnings      NUMERIC(12,2) NOT NULL DEFAULT 0,
  monthly_earnings     NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_earnings       NUMERIC(12,2) NOT NULL DEFAULT 0,
  referral_earnings    NUMERIC(12,2) NOT NULL DEFAULT 0,
  completed_tasks      INTEGER NOT NULL DEFAULT 0,
  account_approved     BOOLEAN NOT NULL DEFAULT FALSE,
  payment_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url           TEXT,
  mpesa_number         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- packages
CREATE TABLE IF NOT EXISTS public.packages (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    package_name UNIQUE NOT NULL,
  display_name            TEXT NOT NULL,
  price                   NUMERIC(10,2) NOT NULL,
  daily_task_limit        INTEGER NOT NULL DEFAULT 5,
  daily_earnings_estimate NUMERIC(10,2) NOT NULL DEFAULT 0,
  features                JSONB NOT NULL DEFAULT '[]',
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  category              task_category NOT NULL,
  reward                NUMERIC(10,2) NOT NULL,
  difficulty            task_difficulty NOT NULL DEFAULT 'easy',
  time_estimate_minutes INTEGER NOT NULL DEFAULT 5,
  instructions          TEXT,
  task_url              TEXT,
  completion_proof      TEXT,
  required_time_seconds INTEGER NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured           BOOLEAN NOT NULL DEFAULT FALSE,
  daily_limit           INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- task_completions
CREATE TABLE IF NOT EXISTS public.task_completions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id       UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reward_amount NUMERIC(10,2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'completed',
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

-- earnings
CREATE TABLE IF NOT EXISTS public.earnings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  source      earning_source NOT NULL DEFAULT 'task',
  task_id     UUID REFERENCES public.tasks(id),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- withdrawals
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount       NUMERIC(10,2) NOT NULL,
  phone_number TEXT NOT NULL,
  method       TEXT NOT NULL DEFAULT 'mpesa',
  status       withdrawal_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL,
  type              transaction_type NOT NULL,
  status            transaction_status NOT NULL DEFAULT 'pending',
  package_purchased package_name,
  payment_method    TEXT,
  reference_id      TEXT,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bonus_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_paid      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       notification_type NOT NULL DEFAULT 'system',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- live_activity
CREATE TABLE IF NOT EXISTS public.live_activity (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  message       TEXT NOT NULL,
  amount        NUMERIC(10,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- activation_logs
CREATE TABLE IF NOT EXISTS public.activation_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_name      package_name NOT NULL,
  amount_paid       NUMERIC(10,2) NOT NULL,
  payment_method    TEXT NOT NULL DEFAULT 'paynecta',
  payment_reference TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- admin_settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT UNIQUE NOT NULL,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_phone            ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code    ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_role             ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_task_completions_user     ON public.task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_task     ON public.task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_earnings_user             ON public.earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_created          ON public.earnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user          ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status        ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user         ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user        ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_live_activity_created     ON public.live_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_active              ON public.tasks(is_active, category);

-- ─── 4. Triggers ────────────────────────────────────────────

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone          TEXT;
  v_full_name      TEXT;
  v_referral_code  TEXT;
  v_referred_by_id UUID;
  v_referral_input TEXT;
BEGIN
  v_phone     := NEW.raw_user_meta_data->>'phone';
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  -- generate unique 8-char referral code
  LOOP
    v_referral_code := upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code);
  END LOOP;
  -- resolve referrer
  v_referral_input := NEW.raw_user_meta_data->>'referred_by';
  IF v_referral_input IS NOT NULL THEN
    SELECT id INTO v_referred_by_id
    FROM public.profiles
    WHERE referral_code = upper(trim(v_referral_input))
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, phone, referral_code, referred_by
  ) VALUES (
    NEW.id, v_full_name, v_phone, v_referral_code, v_referred_by_id
  );

  IF v_referred_by_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id)
    VALUES (v_referred_by_id, NEW.id)
    ON CONFLICT (referred_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 5. Realtime ────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ─── 6. Row Level Security ──────────────────────────────────
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_activity   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings  ENABLE ROW LEVEL SECURITY;

-- ─── 7. RLS Helper Functions ────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_own_profile(profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT auth.uid() = profile_id;
$$;

-- ─── 8. Policies ────────────────────────────────────────────

-- profiles
DROP POLICY IF EXISTS "profiles_select_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

CREATE POLICY "profiles_select_own"   ON public.profiles FOR SELECT TO authenticated USING (is_own_profile(id));
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE TO authenticated USING (is_own_profile(id));
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (is_admin());

-- packages (public read)
DROP POLICY IF EXISTS "packages_select_all"   ON public.packages;
DROP POLICY IF EXISTS "packages_manage_admin" ON public.packages;
CREATE POLICY "packages_select_all"   ON public.packages FOR SELECT USING (TRUE);
CREATE POLICY "packages_manage_admin" ON public.packages FOR ALL   TO authenticated USING (is_admin());

-- tasks (public read)
DROP POLICY IF EXISTS "tasks_select_all"   ON public.tasks;
DROP POLICY IF EXISTS "tasks_manage_admin" ON public.tasks;
CREATE POLICY "tasks_select_all"   ON public.tasks FOR SELECT USING (TRUE);
CREATE POLICY "tasks_manage_admin" ON public.tasks FOR ALL   TO authenticated USING (is_admin());

-- task_completions
DROP POLICY IF EXISTS "tc_select_own"   ON public.task_completions;
DROP POLICY IF EXISTS "tc_insert_own"   ON public.task_completions;
DROP POLICY IF EXISTS "tc_select_admin" ON public.task_completions;
CREATE POLICY "tc_select_own"   ON public.task_completions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "tc_insert_own"   ON public.task_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tc_select_admin" ON public.task_completions FOR SELECT TO authenticated USING (is_admin());

-- earnings
DROP POLICY IF EXISTS "earnings_select_own"   ON public.earnings;
DROP POLICY IF EXISTS "earnings_insert_own"   ON public.earnings;
DROP POLICY IF EXISTS "earnings_select_admin" ON public.earnings;
CREATE POLICY "earnings_select_own"   ON public.earnings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "earnings_insert_own"   ON public.earnings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "earnings_select_admin" ON public.earnings FOR SELECT TO authenticated USING (is_admin());

-- withdrawals
DROP POLICY IF EXISTS "wd_select_own"   ON public.withdrawals;
DROP POLICY IF EXISTS "wd_insert_own"   ON public.withdrawals;
DROP POLICY IF EXISTS "wd_select_admin" ON public.withdrawals;
DROP POLICY IF EXISTS "wd_update_admin" ON public.withdrawals;
CREATE POLICY "wd_select_own"   ON public.withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "wd_insert_own"   ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "wd_select_admin" ON public.withdrawals FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "wd_update_admin" ON public.withdrawals FOR UPDATE TO authenticated USING (is_admin());

-- transactions
DROP POLICY IF EXISTS "tx_select_own"   ON public.transactions;
DROP POLICY IF EXISTS "tx_insert_own"   ON public.transactions;
DROP POLICY IF EXISTS "tx_select_admin" ON public.transactions;
CREATE POLICY "tx_select_own"   ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "tx_insert_own"   ON public.transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tx_select_admin" ON public.transactions FOR SELECT TO authenticated USING (is_admin());

-- referrals
DROP POLICY IF EXISTS "ref_select_own"   ON public.referrals;
DROP POLICY IF EXISTS "ref_select_admin" ON public.referrals;
CREATE POLICY "ref_select_own"   ON public.referrals FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid());
CREATE POLICY "ref_select_admin" ON public.referrals FOR SELECT TO authenticated USING (is_admin());

-- notifications
DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert_own" ON public.notifications;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert_own" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- announcements (public read, admin write)
DROP POLICY IF EXISTS "ann_select_all"   ON public.announcements;
DROP POLICY IF EXISTS "ann_manage_admin" ON public.announcements;
CREATE POLICY "ann_select_all"   ON public.announcements FOR SELECT USING (is_published = TRUE);
CREATE POLICY "ann_manage_admin" ON public.announcements FOR ALL   TO authenticated USING (is_admin());

-- live_activity (public read, authenticated write)
DROP POLICY IF EXISTS "la_select_all"        ON public.live_activity;
DROP POLICY IF EXISTS "la_insert_auth"       ON public.live_activity;
DROP POLICY IF EXISTS "la_insert_admin"      ON public.live_activity;
CREATE POLICY "la_select_all"   ON public.live_activity FOR SELECT USING (TRUE);
CREATE POLICY "la_insert_auth"  ON public.live_activity FOR INSERT TO authenticated WITH CHECK (TRUE);

-- activation_logs
DROP POLICY IF EXISTS "al_select_own"   ON public.activation_logs;
DROP POLICY IF EXISTS "al_insert_own"   ON public.activation_logs;
DROP POLICY IF EXISTS "al_select_admin" ON public.activation_logs;
CREATE POLICY "al_select_own"   ON public.activation_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "al_insert_own"   ON public.activation_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "al_select_admin" ON public.activation_logs FOR SELECT TO authenticated USING (is_admin());

-- admin_settings (admin only)
DROP POLICY IF EXISTS "settings_admin" ON public.admin_settings;
CREATE POLICY "settings_admin" ON public.admin_settings FOR ALL TO authenticated USING (is_admin());

-- ─── 9. Seed: Packages ──────────────────────────────────────
INSERT INTO public.packages (name, display_name, price, daily_task_limit, daily_earnings_estimate, features, sort_order)
VALUES
  ('starter', 'Starter', 399, 5, 200,
   '["5 tasks per day","Basic task categories","M-Pesa withdrawals","Email support","Referral bonuses"]', 1),
  ('bronze', 'Bronze', 1000, 10, 500,
   '["10 tasks per day","All task categories","Priority withdrawals","Referral bonuses","Live chat support"]', 2),
  ('silver', 'Silver', 2000, 20, 1000,
   '["20 tasks per day","All task categories","Same-day withdrawals","10% referral bonus","Dedicated support"]', 3),
  ('gold', 'Gold', 3500, 40, 1800,
   '["40 tasks per day","Featured tasks access","Instant withdrawals","15% referral bonus","VIP support","Weekly bonuses"]', 4),
  ('vip', 'VIP', 5500, 100, 3500,
   '["Unlimited tasks","All premium tasks","Instant withdrawals","20% referral bonus","Personal manager","Daily bonuses","Exclusive tasks"]', 5)
ON CONFLICT (name) DO UPDATE SET
  price                   = EXCLUDED.price,
  daily_task_limit        = EXCLUDED.daily_task_limit,
  daily_earnings_estimate = EXCLUDED.daily_earnings_estimate,
  features                = EXCLUDED.features;

-- ─── 10. Seed: Tasks ────────────────────────────────────────
TRUNCATE public.tasks RESTART IDENTITY CASCADE;

INSERT INTO public.tasks
  (title, description, category, reward, difficulty, time_estimate_minutes,
   instructions, task_url, completion_proof, required_time_seconds, is_active, is_featured, daily_limit)
VALUES

-- SURVEYS
('Google Opinion Survey - Daily',
 'Complete a short daily product opinion survey. Answer questions about products and services you use.',
 'surveys', 50, 'easy', 3,
 'Click "Open Task". Answer all questions honestly. Return here and click "I have Completed" to earn your reward.',
 'https://docs.google.com/forms/d/e/1FAIpQLSf_placeholder_daily/viewform',
 'Screenshot of survey completion page', 120, TRUE, FALSE, 1),

('Market Research Survey - Consumer Habits',
 'Help global brands understand Kenyan consumer habits. Answer 25 questions about shopping, tech, and lifestyle.',
 'surveys', 400, 'medium', 20,
 'Click "Open Task". Complete all 25 questions honestly — partial completions are not rewarded. Return here once you see the thank-you confirmation page.',
 'https://docs.google.com/forms/d/e/1FAIpQLSf_placeholder_market/viewform',
 'Screenshot of the thank-you confirmation page', 900, TRUE, TRUE, 1),

('VIP Survey Bundle - Lifestyle & Finance',
 'Complete a comprehensive lifestyle and financial habits survey bundle used by top research firms across Africa.',
 'surveys', 800, 'hard', 45,
 'Click "Open Task". Complete ALL sections: Lifestyle, Finance, Tech, Health, and Transport. Return here once you see the completion page.',
 'https://docs.google.com/forms/d/e/1FAIpQLSf_placeholder_vip/viewform',
 'Screenshot of full completion confirmation', 2400, TRUE, TRUE, 1),

-- WATCHING ADS
('Watch & Rate: Coca-Cola Kenya Ad',
 'Watch the Coca-Cola Kenya TV commercial on YouTube and provide your honest feedback. Brands pay for genuine opinions.',
 'watching_ads', 30, 'easy', 2,
 'Click "Open Task" to open the YouTube video. Watch the FULL video without skipping. Return here and click "Mark Complete" to earn.',
 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 'Watch the complete video', 90, TRUE, FALSE, 3),

('Watch Ad Series - Safaricom 5G Campaign',
 'Watch a Safaricom 5G promotional video and answer brief comprehension questions. Your feedback improves ad campaigns.',
 'watching_ads', 100, 'easy', 10,
 'Click "Open Task". Watch the full video — do not skip. Return here and click "Mark Complete" to claim your reward.',
 'https://www.youtube.com/watch?v=9bZkp7q19f0',
 'Watch the full video', 540, TRUE, FALSE, 2),

-- APP TESTING
('Test & Review: MoneyManager App',
 'Download and test the MoneyManager app from Google Play. Add expense entries and submit an honest review.',
 'app_testing', 200, 'medium', 15,
 'Click "Open Task" to go to Google Play Store. Download MoneyManager (free). Open it, create an account, add 3 expense entries, then leave an honest review (min 3 sentences). Return here once done.',
 'https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree',
 'Screenshot of your submitted Play Store review', 720, TRUE, FALSE, 1),

('UI Feedback: Evaluate WhatsApp Mobile App',
 'Evaluate WhatsApp''s mobile UI and provide structured feedback. Rate navigation, readability, and overall design.',
 'app_testing', 250, 'medium', 20,
 'Click "Open Task" to visit the app page. Navigate through all main sections. Note usability issues and submit your feedback. Return here once done.',
 'https://play.google.com/store/apps/details?id=com.whatsapp',
 'Screenshot of submitted feedback', 900, TRUE, FALSE, 1),

('Test Checkout Flow: Jumia Kenya',
 'Go through Jumia Kenya''s full shopping and checkout process. Test payment options and document any UX issues.',
 'app_testing', 350, 'hard', 30,
 'Click "Open Task" to visit Jumia Kenya. Browse products, add 2 items to cart, go through checkout up to (NOT including) the final payment step. Test at least 2 payment options. Screenshot the checkout page reached.',
 'https://www.jumia.co.ke',
 'Screenshot of cart or checkout page', 1200, TRUE, TRUE, 1),

-- DATA ANNOTATION
('AI Training: Quick Draw with Google',
 'Help train Google AI by playing Quick Draw — you draw objects and the AI guesses them. Your drawings become training data.',
 'data_annotation', 150, 'easy', 10,
 'Click "Open Task" to open Quick Draw by Google. Play at least 6 rounds (draw 6 different objects). Return here after completing 6 rounds.',
 'https://quickdraw.withgoogle.com/',
 'Screenshot showing 6 completed rounds', 480, TRUE, FALSE, 2),

('Sentiment Labeling: Customer Reviews',
 'Read real customer reviews and label their sentiment. Your labels train ML models used by companies across Africa.',
 'data_annotation', 250, 'medium', 15,
 'Click "Open Task". You will see customer reviews. For each one select: Positive, Negative, or Neutral. Complete all annotations to earn your reward.',
 'https://text-annotator.com/',
 'Screenshot of completed annotations', 600, TRUE, FALSE, 1),

-- OFFERS
('Sign Up: Create a Free Google Account',
 'Create a new free Google account. You keep the account and all Google services — Gmail, Drive, YouTube, and more.',
 'offers', 300, 'easy', 5,
 'Click "Open Task" to go to Google signup. Create a brand new Google account using a new email address. Complete full signup including verification. Return here once your account is active.',
 'https://accounts.google.com/signup',
 'Screenshot of your new Gmail inbox', 240, TRUE, FALSE, 1),

-- VIDEO TASKS
('Watch Tutorial: Python Programming for Beginners',
 'Watch a Python programming tutorial for beginners on YouTube. Helps content creators understand audience engagement.',
 'video_tasks', 180, 'medium', 20,
 'Click "Open Task" to open the YouTube tutorial. Watch the full video without skipping. Like the video and leave any comment when done. Return here to claim.',
 'https://www.youtube.com/watch?v=ZbZSe6N_BXs',
 'Watch full video, like and comment', 1080, TRUE, FALSE, 1),

('Ad Effectiveness Tester: Kenya Brands 2024',
 'Watch and rate Kenyan brand advertisements. Your ratings help local brands understand which ads work best.',
 'video_tasks', 500, 'hard', 35,
 'Click "Open Task" to search YouTube for Kenyan ads. Watch 5 different Kenyan brand ads in full. For each ad note Clarity (1-5), Relevance (1-5), and Memorability (1-5). Return here after watching all 5.',
 'https://www.youtube.com/results?search_query=Kenya+brand+advertisement+2024',
 'Watch 5 full Kenyan brand ads', 1800, TRUE, TRUE, 1),

-- DAILY TASKS
('Daily Login Bonus',
 'Visit your dashboard every day to claim your daily login bonus. Consistent users earn extra rewards!',
 'daily_tasks', 20, 'easy', 1,
 'You are already here! Just click "Open Task" and then "Mark Complete" to claim your daily bonus. Resets every day at midnight EAT.',
 NULL,
 'Automatic on click', 5, TRUE, FALSE, 1),

-- REFERRALS
('Refer a Friend & Earn Bonus',
 'Share your unique MetaPay referral link. When your friend registers and activates, you both earn a bonus!',
 'referrals', 100, 'easy', 5,
 'Copy your referral link from the Referrals page. Share it via WhatsApp, SMS, or social media. Once your friend activates an account using your link, your reward is automatically credited.',
 NULL,
 'Automatic when referral activates', 10, TRUE, FALSE, 10);

-- ─── 11. Seed: Live Activity ────────────────────────────────
INSERT INTO public.live_activity (activity_type, message, amount) VALUES
  ('task_completion',   'John K. completed "Google Opinion Survey - Daily"',     50),
  ('package_activation','Grace M. activated Gold package',                       3500),
  ('withdrawal',        'Peter O. withdrew KES 2,500 via M-Pesa',               2500),
  ('task_completion',   'Mary W. completed "Watch & Rate: Coca-Cola Kenya Ad"',  30),
  ('referral',          'James N. earned referral bonus from 3 new signups',     300),
  ('task_completion',   'Faith A. completed "AI Training: Quick Draw"',          150),
  ('package_activation','Samuel L. activated VIP package',                       5500),
  ('task_completion',   'Ruth C. completed "Market Research Survey"',            400),
  ('withdrawal',        'David M. withdrew KES 5,000 via M-Pesa',               5000),
  ('task_completion',   'Alice B. completed "Daily Login Bonus"',                20),
  ('package_activation','Tom K. activated Bronze package',                       1000);

-- ─── 12. Seed: Announcements ────────────────────────────────
INSERT INTO public.announcements (title, content, is_published, is_pinned) VALUES
  ('Welcome to MetaPay!',
   'Start earning today by completing tasks. New tasks are added every week. Refer friends to earn even more!',
   TRUE, TRUE),
  ('Withdrawal Processing Times',
   'All M-Pesa withdrawals are processed within 24 hours Monday–Friday. Weekend withdrawals are processed on Monday.',
   TRUE, FALSE),
  ('New Video Tasks Added',
   'We have added 3 new high-paying video tasks. Check the Video Tasks category for tasks paying up to KES 500.',
   TRUE, FALSE);

-- ─── Done ───────────────────────────────────────────────────
-- Run the above SQL in Supabase > SQL Editor.
-- After running, disable email confirmation in:
--   Authentication > Settings > Email Auth > Confirm email = OFF
--
-- Default admin login (created separately via app signup):
--   Phone: 0700000001
--   Password: MetaPay@Admin2025!
--   Then run: UPDATE public.profiles SET role='super_admin', status='active',
--             current_package='vip', account_approved=TRUE, payment_verified=TRUE
--             WHERE phone='0700000001';
