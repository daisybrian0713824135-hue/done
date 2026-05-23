import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Package } from '@/types/types';
import { PACKAGE_CONFIG } from '@/types/types';
import { Zap, CheckCircle, Lock, X, ExternalLink, ShieldCheck, CreditCard } from 'lucide-react';

const PAYNECTA_URL = 'https://paynecta.co.ke/pay/metapay-agencies';

interface PaymentModalProps {
  pkg: Package | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentModal({ pkg, open, onClose, onSuccess }: PaymentModalProps) {
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<'confirm' | 'paying' | 'verifying' | 'success'>('confirm');
  const [transactionRef, setTransactionRef] = useState('');

  useEffect(() => { if (open) setStep('confirm'); }, [open]);

  const startPayment = () => setStep('paying');

  const verifyPayment = async () => {
    if (!profile || !pkg) return;
    setStep('verifying');
    try {
      // Create transaction record
      const { data: tx } = await supabase.from('transactions').insert({
        user_id: profile.id, amount: pkg.price, type: 'package_activation',
        status: 'completed', package_purchased: pkg.name,
        payment_method: 'paynecta', reference_id: transactionRef || `MP-${Date.now()}`,
        description: `Package activation: ${pkg.name}`,
      }).select().maybeSingle();

      // Activate user profile
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      await supabase.from('profiles').update({
        status: 'active', account_approved: true, payment_verified: true,
        current_package: pkg.name, activation_date: new Date().toISOString(),
        package_expiry: expiryDate.toISOString(),
      }).eq('id', profile.id);

      // Activation log
      await supabase.from('activation_logs').insert({
        user_id: profile.id, package_name: pkg.name, amount_paid: pkg.price,
        payment_method: 'paynecta', payment_reference: transactionRef || `MP-${Date.now()}`,
      });

      // Notification
      await supabase.from('notifications').insert({
        user_id: profile.id, title: 'Account Activated!',
        message: `Your ${PACKAGE_CONFIG[pkg.name].label} package has been activated. Start earning now!`,
        type: 'payment',
      });

      // Live activity
      await supabase.from('live_activity').insert({
        activity_type: 'package_activation',
        message: `${profile.full_name?.split(' ')[0]} activated ${PACKAGE_CONFIG[pkg.name].label} package`,
        amount: pkg.price,
      });

      await refreshProfile();
      setStep('success');
      toast.success('🎉 Account activated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Verification failed. Please contact support.');
      setStep('paying');
    }
  };

  if (!pkg) return null;
  const config = PACKAGE_CONFIG[pkg.name];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-balance">Activate {config.label} Package</DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="space-y-4">
                <div className="bg-muted rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Package</span><span className={`font-semibold ${config.color}`}>{config.label}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Daily Task Limit</span><span className="font-semibold">{pkg.daily_task_limit} tasks</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Est. Daily Earnings</span><span className="font-semibold text-green-500">KES {pkg.daily_earnings_estimate.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm font-bold text-base border-t border-border pt-2 mt-2"><span>Total</span><span>KES {pkg.price.toLocaleString()}</span></div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground text-pretty">Payment is processed securely via Paynecta. The payment form will open inside this window.</p>
                </div>

                <Button onClick={startPayment} className="w-full gradient-bg-primary text-white font-semibold h-11">
                  <CreditCard className="h-4 w-4 mr-2" /> Proceed to Payment — KES {pkg.price.toLocaleString()}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'paying' && (
            <motion.div key="paying" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="space-y-4">
                <div className="bg-muted rounded-2xl p-4 text-sm space-y-2">
                  <p className="font-medium text-balance">Complete your payment:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground text-pretty">
                    <li>Click the button below to open the secure payment form</li>
                    <li>Complete the M-Pesa or card payment of <strong>KES {pkg.price.toLocaleString()}</strong></li>
                    <li>Note your transaction reference number</li>
                    <li>Return here and click "I've Paid" to activate</li>
                  </ol>
                </div>

                {/* Embedded payment via iframe inside the modal */}
                <div className="rounded-xl overflow-hidden border border-border" style={{ height: '320px' }}>
                  <iframe
                    src={PAYNECTA_URL}
                    title="Paynecta Payment"
                    className="w-full h-full border-0"
                    sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation-by-user-activation"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Transaction Reference (optional)</label>
                  <input
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    placeholder="e.g. QHK2ZXAB12"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  />
                </div>

                <Button onClick={verifyPayment} className="w-full gradient-bg-primary text-white font-semibold h-11">
                  <CheckCircle className="h-4 w-4 mr-2" /> I've Paid — Activate My Account
                </Button>
                <Button variant="outline" onClick={() => setStep('confirm')} className="w-full">Back</Button>
              </div>
            </motion.div>
          )}

          {step === 'verifying' && (
            <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full gradient-bg-primary mx-auto flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
                <h3 className="font-semibold text-balance">Activating your account...</h3>
                <p className="text-sm text-muted-foreground text-pretty">Please wait while we process your activation</p>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 mx-auto flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="font-bold text-xl text-balance">Payment Successful!</h3>
                <p className="text-muted-foreground text-pretty">Welcome to MetaPay! Your <span className={`font-bold ${config.color}`}>{config.label}</span> package is now active.</p>
                <Button onClick={() => { onSuccess(); onClose(); }} className="w-full gradient-bg-primary text-white font-semibold">
                  Go to Dashboard <Zap className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default function PackagesPage() {
  const { profile, isActive } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    supabase.from('packages').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setPackages(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-balance">Packages</h1>
          <p className="text-muted-foreground text-sm text-pretty mt-1">Choose a package to activate your earning account</p>
        </div>

        {isActive && profile?.current_package && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-sm">You're on the <span className={PACKAGE_CONFIG[profile.current_package].color}>{PACKAGE_CONFIG[profile.current_package].label}</span> plan</p>
              {profile.package_expiry && <p className="text-xs text-muted-foreground">Expires: {new Date(profile.package_expiry).toLocaleDateString()}</p>}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {packages.map((pkg, i) => {
              const config = PACKAGE_CONFIG[pkg.name];
              const isCurrent = profile?.current_package === pkg.name;
              const isPopular = pkg.name === 'gold';
              return (
                <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className={`bg-card border rounded-2xl p-5 h-full flex flex-col relative ${isCurrent ? 'border-green-500' : isPopular ? 'border-primary shadow-lg' : 'border-border'}`}>
                    {isPopular && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="gradient-bg-primary text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">POPULAR</span>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">CURRENT</span>
                      </div>
                    )}

                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-3 shadow-md`}>
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <h3 className={`font-bold text-lg ${config.color} text-balance`}>{config.label}</h3>
                    <div className="my-2">
                      <span className="text-2xl font-bold">KES {pkg.price.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">Daily tasks: <span className="font-semibold text-foreground">{pkg.daily_task_limit}</span></div>
                    <div className="text-xs text-muted-foreground mb-3">Est. daily: <span className="text-green-500 font-semibold">KES {pkg.daily_earnings_estimate.toLocaleString()}</span></div>

                    <ul className="space-y-1.5 flex-1 mb-4">
                      {(Array.isArray(pkg.features) ? pkg.features : []).map((f: string, fi: number) => (
                        <li key={fi} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-pretty">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="w-full bg-green-500/10 text-green-600 border border-green-500/30 font-medium rounded-md flex items-center justify-center py-2 text-sm cursor-not-allowed select-none">
                        <CheckCircle className="h-4 w-4 mr-2" /> Active
                      </div>
                    ) : (
                      <Button
                        onClick={() => { setSelectedPkg(pkg); setModalOpen(true); }}
                        className={`w-full font-semibold ${isPopular ? 'gradient-bg-primary text-white' : ''}`}
                        variant={isPopular ? 'default' : 'outline'}
                      >
                        <Zap className="h-4 w-4 mr-2" /> Activate — KES {pkg.price.toLocaleString()}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <PaymentModal
          pkg={selectedPkg}
          open={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedPkg(null); }}
          onSuccess={() => {}}
        />
      </div>
    </DashboardLayout>
  );
}
