import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import type { Earning } from '@/types/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, Calendar } from 'lucide-react';

const COLORS = ['hsl(262,83%,58%)', 'hsl(221,83%,53%)', 'hsl(142,72%,40%)', 'hsl(173,80%,40%)', 'hsl(280,70%,55%)'];

export default function EarningsPage() {
  const { profile, isActive } = useAuth();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from('earnings').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setEarnings(Array.isArray(data) ? data : []); setLoading(false); });
  }, [profile]);

  const bySource = earnings.reduce<Record<string, number>>((acc, e) => {
    acc[e.source] = (acc[e.source] || 0) + Number(e.amount);
    return acc;
  }, {});
  const pieData = Object.entries(bySource).map(([name, value]) => ({ name, value }));

  const chartData: { day: string; amount: number }[] = [];
  const grouped: Record<string, number> = {};
  earnings.forEach(e => {
    const day = new Date(e.created_at).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
    grouped[day] = (grouped[day] || 0) + Number(e.amount);
  });
  Object.entries(grouped).slice(0, 14).reverse().forEach(([day, amount]) => chartData.push({ day, amount }));

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-balance">Earnings</h1>
          <p className="text-muted-foreground text-sm text-pretty mt-1">Your earnings overview</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Earned', value: profile?.total_earnings || 0, icon: TrendingUp, color: 'from-purple-500 to-blue-500' },
            { label: "Today's Earnings", value: profile?.today_earnings || 0, icon: DollarSign, color: 'from-blue-500 to-cyan-500' },
            { label: 'This Week', value: profile?.weekly_earnings || 0, icon: Calendar, color: 'from-green-500 to-teal-500' },
            { label: 'This Month', value: profile?.monthly_earnings || 0, icon: TrendingUp, color: 'from-orange-500 to-pink-500' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <div className="bg-card border border-border rounded-2xl p-4 h-full">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                    <s.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-balance">KES {Number(s.value).toLocaleString()}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Earnings Over Time</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262,83%,58%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(262,83%,58%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }} />
                  <Area type="monotone" dataKey="amount" stroke="hsl(262,83%,58%)" fill="url(#earnGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No earnings data yet</div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Earnings by Source</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }} />
                  <Legend layout="horizontal" wrapperStyle={{ paddingTop: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No source data yet</div>
            )}
          </div>
        </div>

        {/* Earnings history */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Earnings History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Source</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Description</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-5 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))}
                {!loading && earnings.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">No earnings yet</td></tr>
                )}
                {!loading && earnings.map(e => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-sm capitalize whitespace-nowrap">{e.source}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground max-w-xs truncate">{e.description || '-'}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-green-500 text-right whitespace-nowrap">+KES {Number(e.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
