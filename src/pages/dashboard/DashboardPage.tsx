import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import LiveActivityTicker from '@/components/shared/LiveActivityTicker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Transaction, Announcement, Earning } from '@/types/types';
import { PACKAGE_CONFIG } from '@/types/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import {
  Zap, TrendingUp, DollarSign, Calendar, Users, CheckCircle,
  Package, Clock, Lock, ArrowRight, Star, Bell
} from 'lucide-react';

interface EarningsChartData { day: string; amount: number; }

export default function DashboardPage() {
  const { profile, isActive } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [earningsChart, setEarningsChart] = useState<EarningsChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetchData = async () => {
      const [txRes, annRes, earningsRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('announcements').select('*').eq('is_published', true).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3),
        supabase.from('earnings').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(30),
      ]);
      if (txRes.data) setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      if (annRes.data) setAnnouncements(Array.isArray(annRes.data) ? annRes.data : []);
      if (earningsRes.data && Array.isArray(earningsRes.data)) {
        const grouped: Record<string, number> = {};
        earningsRes.data.forEach((e: Earning) => {
          const day = new Date(e.created_at).toLocaleDateString('en-KE', { weekday: 'short' });
          grouped[day] = (grouped[day] || 0) + Number(e.amount);
        });
        setEarningsChart(Object.entries(grouped).map(([day, amount]) => ({ day, amount })).slice(0, 7));
      }
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  const statCards = [
    { label: 'Wallet Balance', value: `KES ${(profile?.withdrawal_balance || 0).toLocaleString()}`, icon: DollarSign, gradient: 'from-purple-500 to-blue-500', change: 'Available to withdraw' },
    { label: "Today's Earnings", value: `KES ${(profile?.today_earnings || 0).toLocaleString()}`, icon: TrendingUp, gradient: 'from-blue-500 to-cyan-500', change: 'Updated in realtime' },
    { label: 'Weekly Earnings', value: `KES ${(profile?.weekly_earnings || 0).toLocaleString()}`, icon: Calendar, gradient: 'from-green-500 to-teal-500', change: 'This week' },
    { label: 'Monthly Earnings', value: `KES ${(profile?.monthly_earnings || 0).toLocaleString()}`, icon: Star, gradient: 'from-orange-500 to-pink-500', change: 'This month' },
    { label: 'Referral Earnings', value: `KES ${(profile?.referral_earnings || 0).toLocaleString()}`, icon: Users, gradient: 'from-pink-500 to-rose-500', change: '10% per referral' },
    { label: 'Completed Tasks', value: (profile?.completed_tasks || 0).toString(), icon: CheckCircle, gradient: 'from-violet-500 to-purple-500', change: 'Total tasks done' },
  ];

  if (!profile && loading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 space-y-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Welcome banner */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className={`rounded-2xl p-5 md:p-6 text-white relative overflow-hidden ${isActive ? 'gradient-bg-primary' : 'bg-muted'}`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white, transparent)' }} />
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <h2 className={`text-xl md:text-2xl font-bold text-balance ${isActive ? 'text-white' : 'text-foreground'}`}>
                  Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}! 👋
                </h2>
                <p className={`text-sm mt-1 text-pretty ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {isActive
                    ? `You're on the ${profile?.current_package ? PACKAGE_CONFIG[profile.current_package].label : ''} plan. Keep earning!`
                    : 'Activate your account to start earning money today.'}
                </p>
              </div>
              {!isActive && (
                <Link to="/dashboard/packages">
                  <Button className="gradient-bg-primary text-white font-semibold shrink-0">
                    <Zap className="h-4 w-4 mr-2" /> Activate Account
                  </Button>
                </Link>
              )}
              {isActive && profile?.current_package && (
                <div className="shrink-0 text-right hidden md:block">
                  <p className="text-white/70 text-xs">Active Package</p>
                  <p className="text-white font-bold text-lg">{PACKAGE_CONFIG[profile.current_package].label}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Inactive lock banner */}
        {!isActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-start gap-3">
              <Lock className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-balance">Account Not Activated</p>
                <p className="text-muted-foreground text-xs mt-0.5 text-pretty">Activate your account to unlock tasks, earnings, and withdrawals. Starting from just KES 399.</p>
              </div>
              <Link to="/dashboard/packages" className="shrink-0">
                <Button size="sm" className="gradient-bg-primary text-white text-xs">Activate</Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Live ticker */}
        <LiveActivityTicker />

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <div className="bg-card border border-border rounded-2xl p-4 md:p-5 h-full flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-xs text-muted-foreground text-pretty leading-tight">{card.label}</p>
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0`}>
                    <card.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className={`text-xl md:text-2xl font-bold text-balance ${!isActive && i > 0 ? 'blur-sm select-none' : ''}`}>
                  {!isActive && i > 0 ? '***' : card.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1 text-pretty">{card.change}</p>
                {!isActive && i > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Activate to unlock</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Earnings chart */}
          <div className="bg-card border border-border rounded-2xl p-5 h-full">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Earnings Overview
            </h3>
            {isActive && earningsChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={earningsChart}>
                  <defs>
                    <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262,83%,58%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(262,83%,58%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }} />
                  <Area type="monotone" dataKey="amount" stroke="hsl(262,83%,58%)" fill="url(#earningsGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-3">
                <Lock className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground text-center text-pretty">Activate your account to see earnings data</p>
                {!isActive && <Link to="/dashboard/packages"><Button size="sm" className="gradient-bg-primary text-white text-xs">Activate Now</Button></Link>}
              </div>
            )}
          </div>

          {/* Recent transactions */}
          <div className="bg-card border border-border rounded-2xl p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Recent Transactions
              </h3>
              <Link to="/dashboard/earnings"><Button variant="ghost" size="sm" className="text-xs h-7">View All <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
            </div>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'withdrawal' ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                      <DollarSign className={`h-4 w-4 ${tx.type === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${tx.type === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}KES {Number(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-2">
                <Clock className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground text-center text-pretty">No transactions yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Announcements & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Announcements
              </h3>
              <div className="space-y-3">
                {announcements.map(ann => (
                  <div key={ann.id} className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-start gap-2">
                      {ann.is_pinned && <Badge className="text-xs shrink-0 gradient-bg-primary text-white border-0">Pinned</Badge>}
                      <p className="font-medium text-sm text-balance">{ann.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-pretty line-clamp-2">{ann.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Complete Tasks', icon: CheckCircle, path: '/dashboard/tasks', locked: !isActive, color: 'text-purple-500 bg-purple-500/10' },
                { label: 'View Packages', icon: Package, path: '/dashboard/packages', locked: false, color: 'text-blue-500 bg-blue-500/10' },
                { label: 'Withdraw', icon: DollarSign, path: '/dashboard/withdrawals', locked: !isActive, color: 'text-green-500 bg-green-500/10' },
                { label: 'Refer Friends', icon: Users, path: '/dashboard/referrals', locked: !isActive, color: 'text-orange-500 bg-orange-500/10' },
              ].map((action, i) => (
                <Link key={i} to={action.locked ? '/dashboard/packages' : action.path}>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors text-center cursor-pointer relative overflow-hidden h-full">
                    {action.locked && (
                      <div className="absolute top-1.5 right-1.5">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-balance">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
