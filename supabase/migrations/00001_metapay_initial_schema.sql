
-- ENUMS
CREATE TYPE public.user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
CREATE TYPE public.account_status AS ENUM ('inactive', 'active', 'suspended');
CREATE TYPE public.package_name AS ENUM ('starter', 'bronze', 'silver', 'gold', 'vip');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.task_category AS ENUM ('surveys', 'watching_ads', 'app_testing', 'data_annotation', 'offers', 'video_tasks', 'daily_tasks', 'referrals');
CREATE TYPE public.task_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE public.notification_type AS ENUM ('info', 'success', 'warning', 'error', 'payment', 'withdrawal', 'task', 'referral');
CREATE TYPE public.activity_type AS ENUM ('registration', 'withdrawal', 'task_completion', 'earning', 'package_activation', 'manual');

-- PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE,
  email TEXT,
  phone TEXT UNIQUE,
  role public.user_role NOT NULL DEFAULT 'user',
  status public.account_status NOT NULL DEFAULT 'inactive',
  account_approved BOOLEAN NOT NULL DEFAULT false,
  current_package public.package_name,
  package_expiry TIMESTAMPTZ,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  withdrawal_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  today_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  weekly_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  monthly_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  referral_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  premium_referrals_used INTEGER NOT NULL DEFAULT 0,
  payment_verified BOOLEAN NOT NULL DEFAULT false,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  activation_date TIMESTAMPTZ,
  avatar_url TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PACKAGES TABLE
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name public.package_name NOT NULL UNIQUE,
  price NUMERIC(10,2) NOT NULL,
  daily_task_limit INTEGER NOT NULL DEFAULT 10,
  daily_earnings_estimate NUMERIC(10,2) NOT NULL DEFAULT 0,
  monthly_earnings_estimate NUMERIC(10,2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]',
  benefits JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TASKS TABLE
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category public.task_category NOT NULL,
  reward NUMERIC(10,2) NOT NULL,
  difficulty public.task_difficulty NOT NULL DEFAULT 'easy',
  time_estimate_minutes INTEGER NOT NULL DEFAULT 5,
  min_package public.package_name,
  task_limit_per_user INTEGER NOT NULL DEFAULT 1,
  total_completions INTEGER NOT NULL DEFAULT 0,
  max_completions INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  instructions TEXT,
  task_url TEXT,
  thumbnail_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TASK COMPLETIONS TABLE
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_amount NUMERIC(10,2) NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proof_url TEXT,
  notes TEXT
);

-- TRANSACTIONS TABLE
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  reference_id TEXT,
  payment_method TEXT,
  package_purchased public.package_name,
  receipt_data JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WITHDRAWALS TABLE
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL DEFAULT 'mpesa',
  phone_number TEXT NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- REFERRALS TABLE
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  reward_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- EARNINGS TABLE
CREATE TABLE public.earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  source TEXT NOT NULL,
  task_id UUID REFERENCES public.tasks(id),
  referral_id UUID REFERENCES public.referrals(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ACTIVATION LOGS TABLE
CREATE TABLE public.activation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_name public.package_name NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  payment_reference TEXT,
  payment_method TEXT NOT NULL DEFAULT 'paynecta',
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload JSONB
);

-- LIVE ACTIVITY TABLE
CREATE TABLE public.live_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type public.activity_type NOT NULL DEFAULT 'manual',
  message TEXT NOT NULL,
  user_display_name TEXT,
  amount NUMERIC(10,2),
  location TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ANNOUNCEMENTS TABLE
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ADMIN SETTINGS TABLE
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_task_completions_user ON public.task_completions(user_id);
CREATE INDEX idx_task_completions_task ON public.task_completions(task_id);
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX idx_earnings_user ON public.earnings(user_id);
CREATE INDEX idx_earnings_created ON public.earnings(created_at DESC);
CREATE INDEX idx_live_activity_created ON public.live_activity(created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('admin', 'super_admin') FROM profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT COUNT(*) > 0 INTO exists FROM public.profiles WHERE referral_code = code;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$;

-- HANDLE NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  ref_by UUID;
BEGIN
  ref_code := generate_referral_code();
  
  -- Check if referred_by metadata is present
  IF NEW.raw_user_meta_data->>'referred_by_code' IS NOT NULL THEN
    SELECT id INTO ref_by FROM public.profiles WHERE referral_code = NEW.raw_user_meta_data->>'referred_by_code';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, username, email, phone, role, status,
    account_approved, completed_tasks, withdrawal_balance,
    total_earnings, premium_referrals_used, payment_verified,
    referral_code, referred_by
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'username',
    NEW.email,
    NEW.phone,
    'user'::public.user_role,
    'inactive'::public.account_status,
    false, 0, 0, 0, 0, false,
    ref_code,
    ref_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- UPDATE UPDATED_AT FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES: PROFILES
CREATE POLICY "admins_full_profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "users_view_own_profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users_update_own_profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (role IS NOT DISTINCT FROM public.get_user_role(auth.uid()));

-- RLS POLICIES: PACKAGES
CREATE POLICY "packages_public_read" ON public.packages FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admins_manage_packages" ON public.packages FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS POLICIES: TASKS
CREATE POLICY "tasks_public_read" ON public.tasks FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admins_manage_tasks" ON public.tasks FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS POLICIES: TASK COMPLETIONS
CREATE POLICY "users_view_own_completions" ON public.task_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_completions" ON public.task_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins_manage_completions" ON public.task_completions FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS POLICIES: TRANSACTIONS
CREATE POLICY "users_view_own_transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins_manage_transactions" ON public.transactions FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS POLICIES: WITHDRAWALS
CREATE POLICY "users_view_own_withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_withdrawals" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins_manage_withdrawals" ON public.withdrawals FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS POLICIES: REFERRALS
CREATE POLICY "users_view_own_referrals" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "admins_manage_referrals" ON public.referrals FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS POLICIES: EARNINGS
CREATE POLICY "users_view_own_earnings" ON public.earnings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins_manage_earnings" ON public.earnings FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS POLICIES: NOTIFICATIONS
CREATE POLICY "users_view_own_notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_broadcast = true);
CREATE POLICY "users_update_own_notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins_manage_notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS POLICIES: ACTIVATION LOGS
CREATE POLICY "users_view_own_activation" ON public.activation_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins_manage_activation" ON public.activation_logs FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS POLICIES: LIVE ACTIVITY
CREATE POLICY "live_activity_public_read" ON public.live_activity FOR SELECT TO anon, authenticated USING (is_visible = true);
CREATE POLICY "admins_manage_live_activity" ON public.live_activity FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS POLICIES: ANNOUNCEMENTS
CREATE POLICY "announcements_public_read" ON public.announcements FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "admins_manage_announcements" ON public.announcements FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- RLS POLICIES: ADMIN SETTINGS
CREATE POLICY "admin_settings_public_read" ON public.admin_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins_manage_settings" ON public.admin_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_completions;

-- SEED PACKAGES
INSERT INTO public.packages (name, price, daily_task_limit, daily_earnings_estimate, monthly_earnings_estimate, features, benefits, sort_order) VALUES
('starter', 399, 5, 100, 3000, '["5 tasks per day","Basic surveys","Watching ads","Daily rewards"]', '["Referral code","Basic support"]', 1),
('bronze', 1000, 10, 250, 7500, '["10 tasks per day","Surveys & Ads","App Testing","Data Annotation","Daily rewards"]', '["Referral earnings","Priority support","Bronze badge"]', 2),
('silver', 2000, 20, 500, 15000, '["20 tasks per day","All Bronze tasks","Video tasks","Offers","Premium surveys"]', '["Higher referral rate","Email support","Silver badge","Leaderboard access"]', 3),
('gold', 3500, 40, 1000, 30000, '["40 tasks per day","All Silver tasks","Premium offers","VIP surveys","Bonus tasks"]', '["Top referral earnings","Dedicated support","Gold badge","Leaderboard priority","Exclusive tasks"]', 4),
('vip', 5500, 100, 2000, 60000, '["Unlimited tasks","All Gold tasks","VIP-only tasks","Exclusive offers","Priority queue"]', '["Maximum referral earnings","VIP support 24/7","VIP badge","Top leaderboard","Exclusive bonuses","Early access"]', 5);

-- SEED ADMIN SETTINGS
INSERT INTO public.admin_settings (key, value, description) VALUES
('site_name', '"MetaPay"', 'Platform name'),
('site_logo', '""', 'Platform logo URL'),
('support_email', '"support@metapay.co.ke"', 'Support email'),
('live_activity_enabled', 'true', 'Enable live activity feed'),
('maintenance_mode', 'false', 'Maintenance mode toggle'),
('min_withdrawal', '500', 'Minimum withdrawal amount in KES'),
('referral_rate', '0.10', 'Referral reward rate (10%)'),
('max_premium_referrals', '3', 'Maximum premium referrals allowed'),
('terms_url', '"/terms"', 'Terms and conditions URL'),
('privacy_url', '"/privacy"', 'Privacy policy URL');

-- SEED TASKS
INSERT INTO public.tasks (title, description, category, reward, difficulty, time_estimate_minutes, min_package, task_limit_per_user, instructions) VALUES
('Daily Check-in Survey', 'Complete a short daily survey about your experience', 'surveys', 50, 'easy', 3, 'starter', 1, 'Answer all questions honestly. Survey resets daily.'),
('Watch Product Ad - TechBrand', 'Watch a 30-second product advertisement and answer questions', 'watching_ads', 30, 'easy', 2, 'starter', 3, 'Watch the full ad without skipping, then answer the comprehension questions.'),
('Test Expense Tracker App', 'Install and test the ExpenseTracker mobile app, report bugs and usability issues', 'app_testing', 200, 'medium', 15, 'bronze', 1, 'Download the app, create an account, add 5 expenses, and submit a detailed report.'),
('Label Product Images', 'Annotate e-commerce product images with correct category labels', 'data_annotation', 150, 'easy', 10, 'bronze', 2, 'Label each image with the correct product category from the provided list.'),
('Sign Up for Free Trial - CloudService', 'Register for a free cloud storage trial offer', 'offers', 300, 'easy', 5, 'bronze', 1, 'Use your real email to sign up. Offer expires in 7 days.'),
('Watch Tutorial Video Series', 'Watch a 3-part educational video series on digital marketing', 'video_tasks', 180, 'medium', 20, 'silver', 1, 'Watch all 3 videos completely. Quiz at end required.'),
('Daily Login Bonus', 'Log in every day to claim your daily bonus reward', 'daily_tasks', 20, 'easy', 1, 'starter', 1, 'Simply log in to claim. Resets at midnight EAT.'),
('Premium Market Research Survey', 'Detailed survey on consumer spending habits in Kenya', 'surveys', 400, 'medium', 20, 'silver', 1, 'Complete all 25 questions. Takes approximately 20 minutes.'),
('Watch Multiple Tech Ads', 'Watch 5 different technology product ads', 'watching_ads', 100, 'easy', 10, 'starter', 2, 'Watch each ad fully. Answer yes/no questions after each.'),
('Test E-commerce Checkout Flow', 'Test a shopping app checkout process and report issues', 'app_testing', 350, 'hard', 30, 'gold', 1, 'Go through the full checkout flow, test payment options, and document all bugs.'),
('Annotate Sentiment in Reviews', 'Label customer reviews as positive, negative, or neutral', 'data_annotation', 250, 'medium', 15, 'silver', 2, 'Read each review carefully and select the most appropriate sentiment label.'),
('VIP Premium Survey Bundle', 'Complete a bundle of 5 premium surveys', 'surveys', 800, 'hard', 45, 'vip', 1, 'Complete all 5 surveys in the bundle. Each survey is about a different topic.'),
('Video Ad Campaign Testing', 'Evaluate the effectiveness of 3 video ad campaigns', 'video_tasks', 500, 'hard', 35, 'gold', 1, 'Watch each campaign video and rate effectiveness on provided criteria.'),
('Refer a Friend Task', 'Refer a friend and earn when they activate their account', 'referrals', 100, 'easy', 5, 'starter', 10, 'Share your referral link. Earn when your referral activates their account.'),
('App UI Feedback', 'Provide detailed feedback on a mobile app user interface', 'app_testing', 250, 'medium', 20, 'bronze', 1, 'Use the app for 15 minutes and complete the feedback form with screenshots.');

-- SEED LIVE ACTIVITY
INSERT INTO public.live_activity (activity_type, message, user_display_name, amount, location) VALUES
('earning', 'John from Nairobi earned KES 200', 'John M.', 200, 'Nairobi'),
('package_activation', 'Sarah activated Gold package', 'Sarah K.', 3500, 'Mombasa'),
('withdrawal', 'Kevin withdrew KES 3,500', 'Kevin O.', 3500, 'Kisumu'),
('registration', 'New member joined MetaPay', 'Lucy W.', NULL, 'Nakuru'),
('task_completion', 'Lucy completed App Testing', 'Lucy W.', 250, 'Nakuru'),
('earning', 'David earned KES 150 from surveys', 'David N.', 150, 'Eldoret'),
('package_activation', 'Grace activated Silver package', 'Grace A.', 2000, 'Thika'),
('withdrawal', 'Peter withdrew KES 1,000', 'Peter M.', 1000, 'Nairobi'),
('registration', 'New member joined from Mombasa', 'James K.', NULL, 'Mombasa'),
('earning', 'Alice earned KES 300 completing video tasks', 'Alice O.', 300, 'Nairobi');
