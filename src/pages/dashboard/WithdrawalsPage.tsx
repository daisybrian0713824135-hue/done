import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Withdrawal } from '@/types/types';
import { Wallet, Lock, Plus, Clock, CheckCircle, XCircle, Phone } from 'lucide-react';

const MIN_WITHDRAWAL = 500;

const schema = z.object({
  amount: z.coerce.number().min(MIN_WITHDRAWAL, `Minimum withdrawal is KES ${MIN_WITHDRAWAL}`),
  phone_number: z.string().min(9, 'Enter a valid M-Pesa number'),
});

type FormData = z.infer<typeof schema>;

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
};

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function WithdrawalsPage() {
  const { profile, isActive, refreshProfile } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { amount: MIN_WITHDRAWAL, phone_number: profile?.phone || '' },
  });

  const fetchWithdrawals = () => {
    if (!profile) return;
    supabase.from('withdrawals').select('*').eq('user_id', profile.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setWithdrawals(Array.isArray(data) ? data : []); setLoading(false); });
  };

  useEffect(() => { fetchWithdrawals(); }, [profile]);

  const onSubmit = async (data: FormData) => {
    if (!profile) return;
    if (!isActive) { toast.error('Activate your account to withdraw'); return; }
    if (data.amount > (profile.withdrawal_balance || 0)) { toast.error('Insufficient balance'); return; }
    const hasPending = withdrawals.some(w => w.status === 'pending');
    if (hasPending) { toast.error('You have a pending withdrawal. Wait for it to be processed.'); return; }

    setSubmitting(true);
    const { error } = await supabase.from('withdrawals').insert({
      user_id: profile.id, amount: data.amount, phone_number: data.phone_number, method: 'mpesa',
    });
    if (!error) {
      await supabase.from('profiles').update({ withdrawal_balance: (profile.withdrawal_balance || 0) - data.amount }).eq('id', profile.id);
      await supabase.from('live_activity').insert({ activity_type: 'withdrawal', message: `${profile.full_name?.split(' ')[0]} requested KES ${data.amount} withdrawal`, amount: data.amount });
      await refreshProfile();
      toast.success('Withdrawal request submitted! Processing within 24 hours.');
      setDialogOpen(false);
      fetchWithdrawals();
    } else {
      toast.error('Failed to submit: ' + error.message);
    }
    setSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-balance">Withdrawals</h1>
            <p className="text-muted-foreground text-sm text-pretty mt-1">Withdraw via M-Pesa</p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={!isActive}
            className="gradient-bg-primary text-white font-semibold shrink-0"
          >
            {isActive ? <><Plus className="h-4 w-4 mr-2" />Withdraw</> : <><Lock className="h-4 w-4 mr-2" />Locked</>}
          </Button>
        </div>

        {/* Balance card */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-bg-primary flex items-center justify-center shrink-0">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-3xl font-bold text-balance">KES {(profile?.withdrawal_balance || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Min withdrawal: KES {MIN_WITHDRAWAL}</p>
          </div>
        </div>

        {!isActive && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-start gap-3">
            <Lock className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-balance">Withdrawals Locked</p>
              <p className="text-muted-foreground text-xs mt-1 text-pretty">Activate your account to enable withdrawals.</p>
            </div>
          </div>
        )}

        {/* Withdrawal history */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Withdrawal History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Phone</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Method</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-5 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))}
                {!loading && withdrawals.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No withdrawals yet</td></tr>
                )}
                {!loading && withdrawals.map(w => (
                  <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-sm font-semibold whitespace-nowrap">KES {Number(w.amount).toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{w.phone_number}</td>
                    <td className="px-5 py-3 text-sm capitalize text-muted-foreground whitespace-nowrap">{w.method}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit ${statusColor[w.status]}`}>
                        {statusIcon[w.status]}
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Withdrawal dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-balance">Request Withdrawal</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="bg-muted/50 rounded-xl p-3 text-sm">
                  Balance: <strong>KES {(profile?.withdrawal_balance || 0).toLocaleString()}</strong>
                </div>
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (KES)</FormLabel>
                    <FormControl><Input type="number" min={MIN_WITHDRAWAL} placeholder={`Min KES ${MIN_WITHDRAWAL}`} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>M-Pesa Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-10" placeholder="0712345678" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={submitting} className="w-full gradient-bg-primary text-white font-semibold h-11">
                  {submitting ? 'Submitting...' : 'Submit Withdrawal'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
