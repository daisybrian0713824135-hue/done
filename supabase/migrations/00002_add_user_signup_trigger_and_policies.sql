
-- ============================================================
-- 1. Function to auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code TEXT;
  v_referrer_id   UUID;
  v_phone         TEXT;
  v_full_name     TEXT;
  v_username      TEXT;
  v_email         TEXT;
BEGIN
  v_referral_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_phone      := COALESCE(new.raw_user_meta_data->>'phone', '');
  v_full_name  := COALESCE(new.raw_user_meta_data->>'full_name', 'New User');
  v_username   := new.raw_user_meta_data->>'username';
  v_email      := new.raw_user_meta_data->>'email';

  IF new.raw_user_meta_data->>'referred_by_code' IS NOT NULL THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = new.raw_user_meta_data->>'referred_by_code'
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, username, email, phone, referral_code, referred_by, status, role
  ) VALUES (
    new.id, v_full_name, v_username, v_email, v_phone,
    v_referral_code, v_referrer_id, 'inactive', 'user'
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_amount, status)
    VALUES (v_referrer_id, new.id, 0, 'pending')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.live_activity (activity_type, message)
    VALUES ('registration'::activity_type, v_full_name || ' joined via referral');
  ELSE
    INSERT INTO public.live_activity (activity_type, message)
    VALUES ('registration'::activity_type, v_full_name || ' just joined MetaPay');
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. RLS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'moderator')
  );
$$;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin_user());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin_user());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "packages_public_read" ON public.packages;
DROP POLICY IF EXISTS "packages_admin_all" ON public.packages;
CREATE POLICY "packages_public_read" ON public.packages FOR SELECT USING (true);
CREATE POLICY "packages_admin_all" ON public.packages FOR ALL TO authenticated USING (public.is_admin_user());

DROP POLICY IF EXISTS "tasks_public_read" ON public.tasks;
DROP POLICY IF EXISTS "tasks_admin_all" ON public.tasks;
CREATE POLICY "tasks_public_read" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "tasks_admin_all" ON public.tasks FOR ALL TO authenticated USING (public.is_admin_user());

DROP POLICY IF EXISTS "completions_own_select" ON public.task_completions;
DROP POLICY IF EXISTS "completions_own_insert" ON public.task_completions;
DROP POLICY IF EXISTS "completions_admin_all" ON public.task_completions;
CREATE POLICY "completions_own_select" ON public.task_completions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_user());
CREATE POLICY "completions_own_insert" ON public.task_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "completions_admin_all" ON public.task_completions FOR ALL TO authenticated USING (public.is_admin_user());

DROP POLICY IF EXISTS "transactions_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_own_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_admin_all" ON public.transactions;
CREATE POLICY "transactions_own" ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_user());
CREATE POLICY "transactions_own_insert" ON public.transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "transactions_admin_all" ON public.transactions FOR ALL TO authenticated USING (public.is_admin_user());

DROP POLICY IF EXISTS "earnings_own" ON public.earnings;
DROP POLICY IF EXISTS "earnings_own_insert" ON public.earnings;
DROP POLICY IF EXISTS "earnings_admin_all" ON public.earnings;
CREATE POLICY "earnings_own" ON public.earnings FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_user());
CREATE POLICY "earnings_own_insert" ON public.earnings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "earnings_admin_all" ON public.earnings FOR ALL TO authenticated USING (public.is_admin_user());

DROP POLICY IF EXISTS "withdrawals_own" ON public.withdrawals;
DROP POLICY IF EXISTS "withdrawals_own_insert" ON public.withdrawals;
DROP POLICY IF EXISTS "withdrawals_admin_all" ON public.withdrawals;
CREATE POLICY "withdrawals_own" ON public.withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_user());
CREATE POLICY "withdrawals_own_insert" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "withdrawals_admin_all" ON public.withdrawals FOR ALL TO authenticated USING (public.is_admin_user());

DROP POLICY IF EXISTS "referrals_own" ON public.referrals;
DROP POLICY IF EXISTS "referrals_own_insert" ON public.referrals;
DROP POLICY IF EXISTS "referrals_admin_all" ON public.referrals;
CREATE POLICY "referrals_own" ON public.referrals FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_admin_user());
CREATE POLICY "referrals_own_insert" ON public.referrals FOR INSERT TO authenticated WITH CHECK (referrer_id = auth.uid());
CREATE POLICY "referrals_admin_all" ON public.referrals FOR ALL TO authenticated USING (public.is_admin_user());

DROP POLICY IF EXISTS "live_activity_public_read" ON public.live_activity;
DROP POLICY IF EXISTS "live_activity_auth_insert" ON public.live_activity;
DROP POLICY IF EXISTS "live_activity_admin_all" ON public.live_activity;
CREATE POLICY "live_activity_public_read" ON public.live_activity FOR SELECT USING (is_visible = true);
CREATE POLICY "live_activity_auth_insert" ON public.live_activity FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "live_activity_admin_all" ON public.live_activity FOR ALL TO authenticated USING (public.is_admin_user());

DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_own_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_insert" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_admin_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "announcements_public_read" ON public.announcements;
DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;
CREATE POLICY "announcements_public_read" ON public.announcements FOR SELECT USING (is_published = true);
CREATE POLICY "announcements_admin_all" ON public.announcements FOR ALL TO authenticated USING (public.is_admin_user());

DROP POLICY IF EXISTS "activation_logs_own" ON public.activation_logs;
DROP POLICY IF EXISTS "activation_logs_own_insert" ON public.activation_logs;
DROP POLICY IF EXISTS "activation_logs_admin_all" ON public.activation_logs;
CREATE POLICY "activation_logs_own" ON public.activation_logs FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_user());
CREATE POLICY "activation_logs_own_insert" ON public.activation_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "activation_logs_admin_all" ON public.activation_logs FOR ALL TO authenticated USING (public.is_admin_user());
