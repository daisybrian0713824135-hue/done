// MetaPay — All shared TypeScript types

export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  status: 'inactive' | 'active' | 'suspended';
  current_package: string | null;
  activation_date: string | null;
  package_expiry: string | null;
  account_approved: boolean;
  payment_verified: boolean;
  referral_code: string | null;
  referred_by: string | null;
  avatar_url: string | null;
  withdrawal_balance: number;
  total_earnings: number;
  today_earnings: number;
  weekly_earnings: number;
  monthly_earnings: number;
  referral_earnings: number;
  completed_tasks: number;
  premium_referrals_used: number;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  daily_task_limit: number;
  daily_earnings_estimate: number;
  referral_bonus_percent: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type TaskType = 'survey' | 'video_watch' | 'whatsapp_post' | 'whatsapp_share' | 'external' | 'instant';

export interface SurveyQuestion {
  question: string;
  options: string[];
  correct: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  reward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  time_estimate_minutes: number;
  instructions: string | null;
  task_url: string | null;
  task_type: TaskType;
  completion_proof: string | null;
  required_time_seconds: number;
  survey_questions: SurveyQuestion[] | null;
  media_url: string | null;
  share_text: string | null;
  is_active: boolean;
  is_featured: boolean;
  daily_limit: number;
  created_at: string;
}

export const PACKAGE_DAILY_LIMITS: Record<string, number> = {
  starter: 5,
  bronze: 10,
  silver: 20,
  gold: 40,
  vip: 999,
};

export interface TaskCompletion {
  id: string;
  user_id: string;
  task_id: string;
  reward_amount: number;
  status: 'completed' | 'pending' | 'rejected';
  completed_at: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: 'pending' | 'completed' | 'failed';
  description: string | null;
  reference_id: string | null;
  payment_method: string | null;
  package_purchased: string | null;
  created_at: string;
}

export interface Earning {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  task_id: string | null;
  description: string | null;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  phone_number: string;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  reference_id: string | null;
  processed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  reward_amount: number;
  status: string;
  created_at: string;
  referred?: { full_name: string; status: string; current_package: string | null };
}

export interface LiveActivity {
  id: string;
  activity_type: string;
  message: string;
  amount: number | null;
  is_visible: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_published: boolean;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
}

export const PACKAGE_CONFIG: Record<string, { label: string; color: string; gradient: string }> = {
  starter: { label: 'Starter', color: 'text-slate-500', gradient: 'from-slate-400 to-slate-600' },
  bronze: { label: 'Bronze', color: 'text-orange-600', gradient: 'from-orange-400 to-amber-600' },
  silver: { label: 'Silver', color: 'text-slate-500', gradient: 'from-slate-300 to-slate-500' },
  gold: { label: 'Gold', color: 'text-yellow-600', gradient: 'from-yellow-400 to-amber-500' },
  vip: { label: 'VIP', color: 'text-purple-600', gradient: 'from-purple-500 to-pink-500' },
};
