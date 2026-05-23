-- ============================================================
--  MetaPay — Complete Supabase SQL Setup
--  Paste this entire file into: Supabase > SQL Editor > Run
--  Covers: Extensions → Enums → Tables → Indexes →
--          Triggers → Realtime → RLS → Policies → Seed Data
-- ============================================================

-- ─── 0. Extensions ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. Enums ───────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE user_role       AS ENUM ('user','moderator','admin','super_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE account_status  AS ENUM ('inactive','active','suspended');          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE package_name    AS ENUM ('starter','bronze','silver','gold','vip'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_category   AS ENUM ('surveys','watching_ads','app_testing','data_annotation','offers','video_tasks','daily_tasks','referrals'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_difficulty AS ENUM ('easy','medium','hard');                   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE withdrawal_status AS ENUM ('pending','approved','rejected');        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE transaction_type AS ENUM ('task_reward','referral_bonus','withdrawal','package_activation','bonus'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE transaction_status AS ENUM ('pending','completed','failed');        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE earning_source  AS ENUM ('task','referral','bonus','daily_login');  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('payment','task','referral','system','withdrawal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. Tables ──────────────────────────────────────────────

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
  task_type             TEXT NOT NULL DEFAULT 'external',
  completion_proof      TEXT,
  required_time_seconds INTEGER NOT NULL DEFAULT 0,
  survey_questions      JSONB,
  media_url             TEXT,
  share_text            TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured           BOOLEAN NOT NULL DEFAULT FALSE,
  daily_limit           INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_completions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id       UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reward_amount NUMERIC(10,2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'completed',
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

CREATE TABLE IF NOT EXISTS public.earnings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  source      earning_source NOT NULL DEFAULT 'task',
  task_id     UUID REFERENCES public.tasks(id),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.referrals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bonus_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_paid      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referred_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       notification_type NOT NULL DEFAULT 'system',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.live_activity (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  message       TEXT NOT NULL,
  amount        NUMERIC(10,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activation_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_name      package_name NOT NULL,
  amount_paid       NUMERIC(10,2) NOT NULL,
  payment_method    TEXT NOT NULL DEFAULT 'paynecta',
  payment_reference TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT UNIQUE NOT NULL,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_phone           ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code   ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_task_completions_user    ON public.task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_today   ON public.task_completions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_user            ON public.earnings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user         ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_live_activity_created    ON public.live_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_active             ON public.tasks(is_active, category);

-- ─── 4. Triggers ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_phone          TEXT;
  v_full_name      TEXT;
  v_referral_code  TEXT;
  v_referred_by_id UUID;
  v_referral_input TEXT;
BEGIN
  v_phone     := NEW.raw_user_meta_data->>'phone';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
  LOOP
    v_referral_code := upper(substr(replace(gen_random_uuid()::TEXT,'-',''),1,8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referral_code);
  END LOOP;
  v_referral_input := NEW.raw_user_meta_data->>'referred_by';
  IF v_referral_input IS NOT NULL THEN
    SELECT id INTO v_referred_by_id FROM public.profiles
    WHERE referral_code = upper(trim(v_referral_input)) LIMIT 1;
  END IF;
  INSERT INTO public.profiles (id, full_name, phone, referral_code, referred_by)
  VALUES (NEW.id, v_full_name, v_phone, v_referral_code, v_referred_by_id);
  IF v_referred_by_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id)
    VALUES (v_referred_by_id, NEW.id) ON CONFLICT (referred_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- ─── 6. RLS ─────────────────────────────────────────────────
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_activity    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings   ENABLE ROW LEVEL SECURITY;

-- ─── 7. RLS Helpers ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'));
$$;

-- ─── 8. Policies ────────────────────────────────────────────
-- profiles
DROP POLICY IF EXISTS "profiles_select_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_select_own"   ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (is_admin());

-- packages / tasks (public read)
DROP POLICY IF EXISTS "packages_read"  ON public.packages;
DROP POLICY IF EXISTS "packages_admin" ON public.packages;
DROP POLICY IF EXISTS "tasks_read"     ON public.tasks;
DROP POLICY IF EXISTS "tasks_admin"    ON public.tasks;
CREATE POLICY "packages_read"  ON public.packages FOR SELECT USING (TRUE);
CREATE POLICY "packages_admin" ON public.packages FOR ALL   TO authenticated USING (is_admin());
CREATE POLICY "tasks_read"     ON public.tasks    FOR SELECT USING (TRUE);
CREATE POLICY "tasks_admin"    ON public.tasks    FOR ALL   TO authenticated USING (is_admin());

-- task_completions
DROP POLICY IF EXISTS "tc_own"   ON public.task_completions;
DROP POLICY IF EXISTS "tc_admin" ON public.task_completions;
CREATE POLICY "tc_own"   ON public.task_completions FOR ALL    TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "tc_admin" ON public.task_completions FOR SELECT TO authenticated USING (is_admin());

-- earnings
DROP POLICY IF EXISTS "earn_own"   ON public.earnings;
DROP POLICY IF EXISTS "earn_admin" ON public.earnings;
CREATE POLICY "earn_own"   ON public.earnings FOR ALL    TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "earn_admin" ON public.earnings FOR SELECT TO authenticated USING (is_admin());

-- withdrawals
DROP POLICY IF EXISTS "wd_own"         ON public.withdrawals;
DROP POLICY IF EXISTS "wd_admin_read"  ON public.withdrawals;
DROP POLICY IF EXISTS "wd_admin_write" ON public.withdrawals;
CREATE POLICY "wd_own"         ON public.withdrawals FOR ALL    TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "wd_admin_read"  ON public.withdrawals FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "wd_admin_write" ON public.withdrawals FOR UPDATE TO authenticated USING (is_admin());

-- transactions / referrals / notifications / activation_logs
DROP POLICY IF EXISTS "tx_own"     ON public.transactions;
DROP POLICY IF EXISTS "ref_own"    ON public.referrals;
DROP POLICY IF EXISTS "notif_own"  ON public.notifications;
DROP POLICY IF EXISTS "al_own"     ON public.activation_logs;
CREATE POLICY "tx_own"    ON public.transactions    FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ref_own"   ON public.referrals       FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid());
CREATE POLICY "notif_own" ON public.notifications   FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "al_own"    ON public.activation_logs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- announcements / live_activity
DROP POLICY IF EXISTS "ann_read"  ON public.announcements;
DROP POLICY IF EXISTS "ann_admin" ON public.announcements;
DROP POLICY IF EXISTS "la_read"   ON public.live_activity;
DROP POLICY IF EXISTS "la_write"  ON public.live_activity;
CREATE POLICY "ann_read"  ON public.announcements FOR SELECT USING (is_published = TRUE);
CREATE POLICY "ann_admin" ON public.announcements FOR ALL   TO authenticated USING (is_admin());
CREATE POLICY "la_read"   ON public.live_activity FOR SELECT USING (TRUE);
CREATE POLICY "la_write"  ON public.live_activity FOR INSERT TO authenticated WITH CHECK (TRUE);

-- admin_settings
DROP POLICY IF EXISTS "settings_admin" ON public.admin_settings;
CREATE POLICY "settings_admin" ON public.admin_settings FOR ALL TO authenticated USING (is_admin());

-- ─── 9. Seed: Packages ──────────────────────────────────────
INSERT INTO public.packages (name, display_name, price, daily_task_limit, daily_earnings_estimate, features, sort_order) VALUES
  ('starter','Starter',399,5,200,   '["5 tasks per day","All survey & video tasks","M-Pesa withdrawals","Email support","Referral bonuses"]'::jsonb,1),
  ('bronze','Bronze',1000,10,500,   '["10 tasks per day","All task categories","Priority withdrawals","Referral bonuses","Live chat support"]'::jsonb,2),
  ('silver','Silver',2000,20,1000,  '["20 tasks per day","All task categories","Same-day withdrawals","10% referral bonus","Dedicated support"]'::jsonb,3),
  ('gold','Gold',3500,40,1800,      '["40 tasks per day","Featured tasks access","Instant withdrawals","15% referral bonus","VIP support","Weekly bonuses"]'::jsonb,4),
  ('vip','VIP',5500,999,3500,       '["Unlimited tasks per day","All premium tasks","Instant withdrawals","20% referral bonus","Personal manager","Daily bonuses"]'::jsonb,5)
ON CONFLICT (name) DO UPDATE SET
  price=EXCLUDED.price, daily_task_limit=EXCLUDED.daily_task_limit,
  daily_earnings_estimate=EXCLUDED.daily_earnings_estimate, features=EXCLUDED.features;

-- ─── 10. Seed: Tasks ────────────────────────────────────────
TRUNCATE public.tasks RESTART IDENTITY CASCADE;
TRUNCATE public.task_completions RESTART IDENTITY CASCADE;

INSERT INTO public.tasks (title,description,category,reward,difficulty,time_estimate_minutes,instructions,task_url,task_type,completion_proof,required_time_seconds,is_active,is_featured,daily_limit,survey_questions,media_url,share_text) VALUES

-- SURVEYS (in-app)
('Kenya Geography Quiz','Answer 5 questions about Kenya geography. Score 4/5 to earn KES 80!','surveys',80,'easy',4,'Read each question and select the best answer. Score at least 4/5 to earn your reward.',NULL,'survey','4/5 correct',0,TRUE,TRUE,3,'[{"question":"What is the capital city of Kenya?","options":["Mombasa","Kisumu","Nairobi","Nakuru"],"correct":"Nairobi"},{"question":"Which is the largest lake bordering Kenya?","options":["Lake Nakuru","Lake Victoria","Lake Turkana","Lake Naivasha"],"correct":"Lake Victoria"},{"question":"What is the tallest mountain in Kenya?","options":["Mount Kenya","Mount Elgon","Mount Longonot","Kilimanjaro"],"correct":"Mount Kenya"},{"question":"Which county is Mombasa in?","options":["Kwale","Kilifi","Taita Taveta","Mombasa"],"correct":"Mombasa"},{"question":"National language of Kenya besides English?","options":["Luo","Kikuyu","Swahili","Somali"],"correct":"Swahili"}]'::jsonb,NULL,NULL),

('Mobile Money Knowledge Quiz','Test your M-Pesa knowledge! Score 4/5 and earn KES 120.','surveys',120,'easy',5,'Answer 5 questions about mobile money. Score at least 4 correct.',NULL,'survey','4/5 correct',0,TRUE,TRUE,3,'[{"question":"Who owns M-Pesa in Kenya?","options":["Airtel","Telkom","Safaricom","Equity Bank"],"correct":"Safaricom"},{"question":"What does Pesa mean in Swahili?","options":["Phone","Money","Transfer","Wallet"],"correct":"Money"},{"question":"Which year was M-Pesa launched?","options":["2005","2007","2010","2012"],"correct":"2007"},{"question":"Which service lets you save via M-Pesa?","options":["Fuliza","M-Shwari","Bonga","Lipa Na M-Pesa"],"correct":"M-Shwari"},{"question":"M-Pesa paybill for Kenya Power?","options":["888880","000200","200200","999990"],"correct":"888880"}]'::jsonb,NULL,NULL),

('General Knowledge Challenge','Science, sports, history! Score 4/5 and earn KES 100.','surveys',100,'medium',5,'Answer all 5 questions. Score 4 or more to earn.',NULL,'survey','4/5 correct',0,TRUE,FALSE,3,'[{"question":"How many continents are on Earth?","options":["5","6","7","8"],"correct":"7"},{"question":"Chemical symbol for Gold?","options":["Go","Gd","Au","Ag"],"correct":"Au"},{"question":"Which planet is the Red Planet?","options":["Jupiter","Venus","Saturn","Mars"],"correct":"Mars"},{"question":"Who invented the telephone?","options":["Thomas Edison","Nikola Tesla","Alexander Graham Bell","Guglielmo Marconi"],"correct":"Alexander Graham Bell"},{"question":"Year World War II ended?","options":["1943","1944","1945","1946"],"correct":"1945"}]'::jsonb,NULL,NULL),

('Smartphone & Tech IQ Quiz','5 tech questions — earn KES 150 if you score 4/5!','surveys',150,'medium',6,'Answer 5 tech questions. Score at least 4 correct to earn.',NULL,'survey','4/5 correct',0,TRUE,FALSE,2,'[{"question":"What does CPU stand for?","options":["Central Processing Unit","Computer Personal Unit","Core Power Unit","Central Program Utility"],"correct":"Central Processing Unit"},{"question":"Which company makes the iPhone?","options":["Samsung","Google","Apple","Huawei"],"correct":"Apple"},{"question":"What does Wi-Fi stand for?","options":["Wireless Fidelity","Wide Frequency","Wire-Free Internet","Wireless Fiber"],"correct":"Wireless Fidelity"},{"question":"What OS does Samsung Galaxy use?","options":["iOS","Windows","Android","HarmonyOS"],"correct":"Android"},{"question":"Most downloaded app globally in 2024?","options":["Facebook","WhatsApp","TikTok","Instagram"],"correct":"TikTok"}]'::jsonb,NULL,NULL),

('Health & Nutrition Quiz','5 health questions — earn KES 90 for scoring 4/5!','surveys',90,'easy',4,'Answer 5 health questions. Score 4 or more to earn.',NULL,'survey','4/5 correct',0,TRUE,FALSE,3,'[{"question":"Daily glasses of water for an adult?","options":["2-4","4-6","6-8","10-12"],"correct":"6-8"},{"question":"Vitamin mainly from sunlight?","options":["Vitamin A","Vitamin B12","Vitamin C","Vitamin D"],"correct":"Vitamin D"},{"question":"Fruit highest in Vitamin C?","options":["Banana","Orange","Mango","Guava"],"correct":"Guava"},{"question":"Adult sleep hours needed nightly?","options":["4-5","5-6","7-9","10-12"],"correct":"7-9"},{"question":"Which organ pumps blood?","options":["Liver","Kidney","Lungs","Heart"],"correct":"Heart"}]'::jsonb,NULL,NULL),

('Sports & Athletics Quiz','5 sports questions — earn KES 110 for scoring 4+!','surveys',110,'easy',4,'Answer 5 sports questions. Score at least 4 to earn.',NULL,'survey','4/5 correct',0,TRUE,FALSE,3,'[{"question":"Players on a football team?","options":["9","10","11","12"],"correct":"11"},{"question":"Where did Olympics originate?","options":["Italy","Greece","France","USA"],"correct":"Greece"},{"question":"Most FIFA World Cup wins?","options":["Germany","Argentina","Italy","Brazil"],"correct":"Brazil"},{"question":"Eliud Kipchoge competes in?","options":["Cycling","Swimming","Marathon running","High jump"],"correct":"Marathon running"},{"question":"How long is a marathon?","options":["21.1 km","30 km","42.195 km","50 km"],"correct":"42.195 km"}]'::jsonb,NULL,NULL),

('Finance & Savings Quiz','5 finance questions — earn KES 200 if you pass!','surveys',200,'hard',7,'Answer 5 personal finance questions. Score 4/5 to earn.',NULL,'survey','4/5 correct',0,TRUE,TRUE,2,'[{"question":"What is a budget?","options":["A bank account","A plan for spending and saving","A government tax","A loan"],"correct":"A plan for spending and saving"},{"question":"What does interest rate mean?","options":["How fast money grows","Cost of borrowing money","A bank fee","A govt charge"],"correct":"Cost of borrowing money"},{"question":"Safest way to save money?","options":["Under mattress","With a friend","In a regulated bank or SACCO","In crypto only"],"correct":"In a regulated bank or SACCO"},{"question":"What is a SACCO?","options":["A mobile app","Savings and Credit Cooperative","A bank branch","A govt fund"],"correct":"Savings and Credit Cooperative"},{"question":"What is inflation?","options":["Increase in money supply","Rise in general price levels","Fall in bank rates","Economy growth"],"correct":"Rise in general price levels"}]'::jsonb,NULL,NULL),

('Kenyan History & Culture Quiz','5 history questions — earn KES 130 for scoring 4+!','surveys',130,'medium',5,'Answer 5 questions about Kenyan history. Score 4 or more to earn.',NULL,'survey','4/5 correct',0,TRUE,FALSE,3,'[{"question":"Year Kenya gained independence?","options":["1960","1963","1965","1968"],"correct":"1963"},{"question":"Kenya''s first President?","options":["Daniel arap Moi","Mwai Kibaki","Jomo Kenyatta","Uhuru Kenyatta"],"correct":"Jomo Kenyatta"},{"question":"Kenya''s national animal?","options":["Elephant","Giraffe","Lion","Zebra"],"correct":"Lion"},{"question":"Kenya''s currency?","options":["Shilling","Pound","Franc","Dollar"],"correct":"Shilling"},{"question":"Kenyan Nobel Peace Prize winner 2004?","options":["Ngugi wa Thiong''o","Wangari Maathai","Lupita Nyong''o","Yvonne Adhiambo"],"correct":"Wangari Maathai"}]'::jsonb,NULL,NULL),

('Premium Survey: Kenyan Consumer Brands','5 brand questions — earn top reward of KES 400!','surveys',400,'medium',10,'Answer 5 brand preference questions. Score 4/5 to earn KES 400.',NULL,'survey','4/5 correct',0,TRUE,TRUE,1,'[{"question":"Most frequent supermarket?","options":["Naivas","Carrefour","Quickmart","Chandarana"],"correct":"Naivas"},{"question":"Best mobile network coverage?","options":["Safaricom","Airtel","Telkom","Faiba"],"correct":"Safaricom"},{"question":"How often use M-Pesa per week?","options":["Daily","2-3 times","Once","Rarely"],"correct":"Daily"},{"question":"Preferred delivery service?","options":["Glovo","Bolt Food","Jumia Food","Uber Eats"],"correct":"Glovo"},{"question":"Most important bank feature?","options":["Low fees","High interest","Mobile app","Branch locations"],"correct":"Low fees"}]'::jsonb,NULL,NULL),

('VIP Finance Knowledge Test','Advanced finance — score 4/5 and earn KES 500!','surveys',500,'hard',15,'Answer 5 advanced finance questions. Score 4/5 minimum.',NULL,'survey','4/5 correct',0,TRUE,TRUE,1,'[{"question":"What is compound interest?","options":["Interest on original only","Interest on principal plus accumulated interest","A bank charge","A government tax"],"correct":"Interest on principal plus accumulated interest"},{"question":"What does ROI stand for?","options":["Rate of Investment","Return on Investment","Risk of Income","Revenue over Inflation"],"correct":"Return on Investment"},{"question":"What is a bull market?","options":["Prices are falling","Prices are rising","A livestock market","A bond market"],"correct":"Prices are rising"},{"question":"What is diversification?","options":["All money in one stock","Spreading investments to reduce risk","Borrowing to invest","Withdrawing profits"],"correct":"Spreading investments to reduce risk"},{"question":"What does credit score measure?","options":["How much money you have","Ability to repay debt","Monthly income","Tax history"],"correct":"Ability to repay debt"}]'::jsonb,NULL,NULL),

-- YOUTUBE VIDEOS
('Watch: How M-Pesa Changed Kenya','Watch a documentary about M-Pesa revolutionising financial access. Earn KES 60!','watching_ads',60,'easy',8,'Click Open Task to watch on YouTube. Watch the FULL video without skipping. Return here once done.','https://www.youtube.com/watch?v=kbPBNFhFH-k','video_watch','Watch full video',120,TRUE,FALSE,3,NULL,NULL,NULL),
('Watch: Top Money Tips for Kenyans','Popular YouTube video on money saving tips. Educational and rewarding — KES 50!','watching_ads',50,'easy',5,'Click Open Task and watch all the way through. Return here to claim KES 50.','https://www.youtube.com/watch?v=Ks-_Mh1QhMc','video_watch','Watch full video',90,TRUE,FALSE,3,NULL,NULL,NULL),
('Watch: Safaricom 5G Kenya Ad','Watch Safaricom''s official 5G Kenya launch advertisement. Earn KES 40!','watching_ads',40,'easy',3,'Open the YouTube video. Watch completely. Do not skip. Return to claim.','https://www.youtube.com/watch?v=9bZkp7q19f0','video_watch','Watch full video',90,TRUE,FALSE,5,NULL,NULL,NULL),
('Watch: Jumia Kenya Sale Ad','Watch Jumia Kenya''s shopping sale ad on YouTube. Earn KES 35!','watching_ads',35,'easy',3,'Open the video in a new tab and watch completely. Return here after.','https://www.youtube.com/watch?v=dQw4w9WgXcQ','video_watch','Watch full video',90,TRUE,FALSE,5,NULL,NULL,NULL),
('Watch: Python Tutorial for Beginners','Watch 8 min of a Python tutorial and help creators grow. Earn KES 80!','video_tasks',80,'easy',10,'Open YouTube tutorial. Watch at least 8 minutes without skipping. Return to claim.','https://www.youtube.com/watch?v=ZbZSe6N_BXs','video_watch','Watch min 8 min',480,TRUE,FALSE,2,NULL,NULL,NULL),

-- TIKTOK VIDEOS
('Watch TikTok: Online Earning Tips','Watch a 60-sec TikTok on earning online. Like and follow the creator. Earn KES 45!','watching_ads',45,'easy',2,'Open TikTok. Watch the video fully, like it, and follow the creator. Return to claim.','https://www.tiktok.com/trending','video_watch','Watch, like and follow',60,TRUE,FALSE,4,NULL,NULL,NULL),
('Watch TikTok: Kenyan Street Food','Watch a viral Kenyan street food TikTok. Like and comment. Earn KES 40!','watching_ads',40,'easy',2,'Open TikTok. Watch the video, leave any comment, and like it. Return to claim.','https://www.tiktok.com/trending','video_watch','Watch, like and comment',60,TRUE,FALSE,4,NULL,NULL,NULL),
('Watch TikTok: 60-Second Finance Tips','Watch a quick TikTok on saving money. Like and follow the creator. Earn KES 55!','watching_ads',55,'easy',3,'Open TikTok and watch the finance tips video fully. Like it and follow. Return to claim.','https://www.tiktok.com/trending','video_watch','Watch, like and follow',60,TRUE,FALSE,3,NULL,NULL,NULL),

-- WHATSAPP TASKS
('Post MetaPay Ad on WhatsApp Status','Save the MetaPay image and post it on your WhatsApp Status for 24 hours. Earn KES 200!','offers',200,'easy',5,'Step 1: Save the image below to your phone. Step 2: Open WhatsApp → Status → Add → select the image. Step 3: Post it. Return here and tap Mark Complete. Keep it up 24 hrs.',NULL,'whatsapp_post','Screenshot of WhatsApp Status with MetaPay image',30,TRUE,TRUE,1,NULL,'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80','Join MetaPay and earn money daily! Register FREE: https://metapay.app'),

('Share MetaPay Link in WhatsApp Groups','Copy the message and send to at least 3 WhatsApp groups. Earn KES 150!','offers',150,'easy',5,'Step 1: Copy the message below. Step 2: Open WhatsApp. Step 3: Paste and send to at least 3 groups or contacts. Return here and tap Mark Complete.',NULL,'whatsapp_share','Screenshot of message sent to 3+ chats',30,TRUE,TRUE,1,NULL,NULL,'Have you heard of MetaPay? Earn real KES daily on your phone!

Complete simple tasks like:
- Answering surveys
- Watching short videos
- Sharing content

Get paid via M-Pesa!
Register FREE: https://metapay.app

Use my referral code for a bonus!'),

('Post MetaPay Flyer on WhatsApp Status','Post the MetaPay business flyer on your Status to advertise. Earn KES 180!','offers',180,'easy',5,'Step 1: Save the MetaPay flyer below. Step 2: Open WhatsApp → Status → Add → select flyer. Step 3: Post and keep up 24 hours. Return once posted.',NULL,'whatsapp_post','Screenshot of WhatsApp Status with MetaPay flyer',30,TRUE,FALSE,1,NULL,'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80','MetaPay — Earn KES Daily! Complete tasks. Get paid. Register FREE: https://metapay.app'),

('WhatsApp Group Promo Campaign','Send the MetaPay message to 5 contacts or groups. Earn KES 120!','offers',120,'easy',5,'Copy the message and send it to 5 different WhatsApp contacts or groups. Each must include the MetaPay link. Return after sending all 5.',NULL,'whatsapp_share','Screenshot showing message sent to 5+ contacts',30,TRUE,FALSE,2,NULL,NULL,'Have you joined MetaPay yet? Earn money from your phone daily!

Watch videos, answer quizzes, share content.
Paid directly to your M-Pesa!

Join free: https://metapay.app'),

-- APP TESTING
('Test & Review: MoneyManager App','Download MoneyManager, add 3 expenses, leave a Play Store review. Earn KES 200!','app_testing',200,'medium',15,'Open Google Play, download MoneyManager (free). Add 3 expense entries. Leave an honest review (min 3 sentences). Return once done.','https://play.google.com/store/apps/details?id=com.realbyteapps.moneymanagerfree','external','Screenshot of your Play Store review',720,TRUE,FALSE,1,NULL,NULL,NULL),
('Test Checkout: Jumia Kenya','Browse Jumia, add 2 items to cart, go through checkout. Earn KES 300!','app_testing',300,'hard',20,'Open Jumia Kenya. Add 2 items to cart, proceed to checkout (do NOT pay). Screenshot checkout page. Return here.','https://www.jumia.co.ke','external','Screenshot of cart or checkout',900,TRUE,FALSE,1,NULL,NULL,NULL),
('Test Kilimall Shopping','Visit Kilimall, add a product to cart, screenshot. Earn KES 180!','app_testing',180,'medium',12,'Visit kilimall.co.ke. Add any product to cart. Screenshot the cart page. Return to claim.','https://www.kilimall.co.ke','external','Screenshot of Kilimall cart',600,TRUE,FALSE,1,NULL,NULL,NULL),

-- DATA ANNOTATION
('AI Drawing: Quick Draw with Google','Help train Google AI by drawing 6 objects. Fun! Earn KES 150.','data_annotation',150,'easy',8,'Open Quick Draw by Google. Play 6 rounds. Return here after completing 6 rounds.','https://quickdraw.withgoogle.com/','external','Screenshot of 6 completed rounds',360,TRUE,FALSE,2,NULL,NULL,NULL),

-- DAILY TASKS
('Daily Login Bonus','Claim your KES 20 daily bonus just for showing up!','daily_tasks',20,'easy',1,'You are already here! Tap Claim Bonus to get your KES 20. Resets daily at midnight.',NULL,'instant','Automatic',0,TRUE,FALSE,1,NULL,NULL,NULL),
('Daily Check-In: Share Your Mood','Tell us how you feel today and earn KES 15 instantly!','daily_tasks',15,'easy',1,'Tap Claim Bonus — KES 15 credited instantly.',NULL,'instant','Automatic',0,TRUE,FALSE,1,NULL,NULL,NULL),
('Rate MetaPay Today','Give MetaPay a star rating and earn KES 25!','daily_tasks',25,'easy',1,'Tap Claim Bonus to submit your rating and earn KES 25 instantly.',NULL,'instant','Automatic',0,TRUE,FALSE,1,NULL,NULL,NULL),

-- REFERRALS
('Refer a Friend & Earn KES 100','Share your referral link. When your friend activates, you both earn!','referrals',100,'easy',5,'Go to the Referrals page, copy your unique link, share via WhatsApp or SMS. Once your friend activates, KES 100 is credited automatically.',NULL,'instant','Automatic when friend activates',0,TRUE,FALSE,10,NULL,NULL,NULL),
('Share Referral on Social Media','Post your referral link on Facebook, Instagram, or Twitter/X. Earn KES 80!','referrals',80,'easy',5,'Copy your referral link. Post it on any social media. Screenshot the post. Return here and mark complete.',NULL,'instant','Screenshot of your social media post',0,TRUE,FALSE,3,NULL,NULL,NULL);

-- ─── 11. Seed: Announcements ────────────────────────────────
INSERT INTO public.announcements (title, content, is_published, is_pinned) VALUES
  ('Welcome to MetaPay!','Start earning today by completing tasks. New tasks are added every week. Refer friends to earn even more!',TRUE,TRUE),
  ('Withdrawal Times','All M-Pesa withdrawals are processed within 24 hours Monday–Friday. Weekend withdrawals processed on Monday.',TRUE,FALSE),
  ('New Survey Tasks Added','We have added 10 in-app quiz tasks. Answer correctly to earn — no external links needed!',TRUE,FALSE)
ON CONFLICT DO NOTHING;

-- ─── 12. Seed: Live Activity ────────────────────────────────
INSERT INTO public.live_activity (activity_type, message, amount) VALUES
  ('task_completion','John K. completed "Kenya Geography Quiz"',80),
  ('package_activation','Grace M. activated Gold package',3500),
  ('withdrawal','Peter O. withdrew KES 2,500 via M-Pesa',2500),
  ('task_completion','Mary W. completed "Watch: Safaricom 5G Kenya Ad"',40),
  ('task_completion','James N. completed "Mobile Money Knowledge Quiz"',120),
  ('task_completion','Faith A. completed "AI Drawing: Quick Draw"',150),
  ('package_activation','Samuel L. activated VIP package',5500),
  ('task_completion','Ruth C. completed "Premium Survey: Consumer Brands"',400),
  ('withdrawal','David M. withdrew KES 5,000 via M-Pesa',5000),
  ('task_completion','Alice B. completed "Daily Login Bonus"',20),
  ('task_completion','Tom K. completed "VIP Finance Knowledge Test"',500);

-- ─── Done! ───────────────────────────────────────────────────
-- After running this SQL, disable email confirmation:
--   Authentication > Settings > Email Auth > Confirm email = OFF
--
-- To create admin account:
--   1. Register via the app (phone: 0700000001, password: MetaPay@Admin2025!)
--   2. Then run:
--      UPDATE public.profiles
--      SET role='super_admin', status='active', current_package='vip',
--          account_approved=TRUE, payment_verified=TRUE
--      WHERE phone='0700000001';
