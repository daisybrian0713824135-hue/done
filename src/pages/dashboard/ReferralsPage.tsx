import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Referral } from '@/types/types';
import { Users, Copy, Gift, CheckCircle, Lock, Share2 } from 'lucide-react';

export default function ReferralsPage() {
  const { profile, isActive } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from('referrals').select('*, referred:profiles!referrals_referred_id_fkey(full_name,status,current_package)').eq('referrer_id', profile.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setReferrals(Array.isArray(data) ? data : []); setLoading(false); });
  }, [profile]);

  const referralLink = `${window.location.origin}/register?ref=${profile?.referral_code || ''}`;
  const remaining = 3 - (profile?.premium_referrals_used || 0);

  const copyCode = () => {
    navigator.clipboard.writeText(profile?.referral_code || '').then(() => toast.success('Referral code copied!'));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => toast.success('Referral link copied!'));
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-balance">Referrals</h1>
          <p className="text-muted-foreground text-sm text-pretty mt-1">Earn 10% when your referrals complete tasks</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Referral Earnings', value: `KES ${(profile?.referral_earnings || 0).toLocaleString()}`, icon: Gift, color: 'from-purple-500 to-blue-500' },
            { label: 'Total Referrals', value: referrals.length.toString(), icon: Users, color: 'from-blue-500 to-cyan-500' },
            { label: 'Active Referrals', value: referrals.filter(r => r.referred?.status === 'active').length.toString(), icon: CheckCircle, color: 'from-green-500 to-teal-500' },
            { label: 'Premium Left', value: `${Math.max(0, remaining)}/3`, icon: Share2, color: 'from-orange-500 to-pink-500' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <div className="bg-card border border-border rounded-2xl p-4 h-full">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                    <s.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-balance">{s.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Referral code & link */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-sm font-medium mb-3">Your Referral Code</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 bg-muted rounded-xl px-4 py-3 font-mono font-bold text-lg text-primary tracking-widest">
                {profile?.referral_code || '--------'}
              </div>
              <Button size="icon" variant="outline" onClick={copyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-sm font-medium mb-3">Referral Link</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 bg-muted rounded-xl px-3 py-3 text-xs text-muted-foreground font-mono truncate">
                {referralLink}
              </div>
              <Button size="icon" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <h3 className="font-semibold mb-3">How Referrals Work</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /><span className="text-pretty">Share your referral code or link with friends</span></li>
            <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /><span className="text-pretty">They register using your code and activate an account</span></li>
            <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /><span className="text-pretty">You earn <strong>10%</strong> of their earnings automatically</span></li>
            <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" /><span className="text-pretty">Maximum <strong>3 premium referrals</strong> allowed per account</span></li>
          </ul>
        </div>

        {/* Referral list */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Your Referrals ({referrals.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Package</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Reward</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))}
                {!loading && referrals.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No referrals yet. Share your code to start earning!</td></tr>
                )}
                {!loading && referrals.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 text-sm font-medium whitespace-nowrap">{r.referred?.full_name || 'Unknown'}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.referred?.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {r.referred?.status || 'inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm capitalize text-muted-foreground whitespace-nowrap">{r.referred?.current_package || 'none'}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-green-500 text-right whitespace-nowrap">KES {Number(r.reward_amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
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
