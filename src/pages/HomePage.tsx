import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import type { Package, LiveActivity } from '@/types/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LiveActivityTicker from '@/components/shared/LiveActivityTicker';
import { useTheme } from 'next-themes';
import {
  Zap, CheckCircle, TrendingUp, Users, DollarSign, Star,
  ChevronRight, ArrowRight, Shield, Clock, Award, Moon, Sun,
  ClipboardList, Play, Gift, MessageCircle
} from 'lucide-react';
import { PACKAGE_CONFIG } from '@/types/types';

const stats = [
  { label: 'Active Members', value: '50,000+', icon: Users, color: 'text-blue-500' },
  { label: 'Total Paid Out', value: 'KES 15M+', icon: DollarSign, color: 'text-green-500' },
  { label: 'Tasks Available', value: '500+', icon: ClipboardList, color: 'text-purple-500' },
  { label: 'Avg Daily Earnings', value: 'KES 800', icon: TrendingUp, color: 'text-orange-500' },
];

const testimonials = [
  { name: 'John M.', location: 'Nairobi', text: 'I earned over KES 8,000 in my first month! MetaPay is legit and pays fast.', pkg: 'Gold', rating: 5 },
  { name: 'Sarah K.', location: 'Mombasa', text: 'Best earning platform in Kenya. The tasks are easy and withdrawals process same day!', pkg: 'Silver', rating: 5 },
  { name: 'Peter O.', location: 'Kisumu', text: 'I upgraded to VIP and my earnings tripled. Highly recommend to everyone.', pkg: 'VIP', rating: 5 },
  { name: 'Grace A.', location: 'Nakuru', text: 'I referred 10 friends and earn referral bonuses daily. Amazing system!', pkg: 'Bronze', rating: 5 },
];

const faqs = [
  { q: 'How do I start earning?', a: 'Register an account, activate it by purchasing a package, then start completing tasks to earn rewards immediately.' },
  { q: 'When do I get paid?', a: 'Withdrawals via M-Pesa are processed within 24 hours. Minimum withdrawal is KES 500.' },
  { q: 'Is MetaPay legitimate?', a: 'Yes! MetaPay is a registered earning platform operating in Kenya with thousands of verified members.' },
  { q: 'How does the referral program work?', a: 'Share your unique referral link. When someone registers and activates their account, you earn 10% of their earnings.' },
  { q: 'Can I earn without a smartphone?', a: 'Most tasks work on any device with an internet browser. A smartphone is recommended for the best experience.' },
];

const howItWorks = [
  { step: 1, title: 'Register', desc: 'Create your account with your phone number and name. Takes less than 2 minutes.', icon: Users },
  { step: 2, title: 'Activate', desc: 'Choose a package that fits your goals. Starting from just KES 399.', icon: Zap },
  { step: 3, title: 'Complete Tasks', desc: 'Pick from surveys, app testing, watching ads, and more tasks daily.', icon: ClipboardList },
  { step: 4, title: 'Withdraw', desc: 'Cash out your earnings via M-Pesa. Fast, reliable, no hidden fees.', icon: DollarSign },
];

const taskPreviews = [
  { title: 'Daily Survey', category: 'Surveys', reward: 50, time: '3 min', difficulty: 'Easy' },
  { title: 'Watch Product Ad', category: 'Watching Ads', reward: 30, time: '2 min', difficulty: 'Easy' },
  { title: 'Test Mobile App', category: 'App Testing', reward: 200, time: '15 min', difficulty: 'Medium' },
  { title: 'Label Images', category: 'Data Annotation', reward: 150, time: '10 min', difficulty: 'Easy' },
  { title: 'Sign Up Offer', category: 'Offers', reward: 300, time: '5 min', difficulty: 'Easy' },
  { title: 'Watch Tutorial', category: 'Video Tasks', reward: 180, time: '20 min', difficulty: 'Medium' },
];

const recentWinners = [
  { name: 'John M.', amount: 8500, pkg: 'gold' },
  { name: 'Sarah K.', amount: 12000, pkg: 'vip' },
  { name: 'Peter O.', amount: 5600, pkg: 'silver' },
  { name: 'Grace A.', amount: 3200, pkg: 'bronze' },
  { name: 'David N.', amount: 9800, pkg: 'gold' },
];

const difficultyColor: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const [packages, setPackages] = useState<Package[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('packages').select('*').eq('is_active', true).order('sort_order').then(({ data }) => {
      if (data) setPackages(data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg gradient-bg-primary flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text shrink-0">MetaPay</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-muted-foreground">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-medium hidden sm:flex">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="gradient-bg-primary text-white font-medium">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, hsl(262 83% 58%), transparent)' }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, hsl(221 83% 53%), transparent)' }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="mb-6 gradient-bg-primary text-white border-0 px-4 py-1.5 text-sm font-medium">
                🇰🇪 Kenya's #1 Earning Platform
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance leading-tight">
                Earn Real Money
                <br />
                <span className="gradient-text">Completing Simple Tasks</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 text-pretty max-w-2xl mx-auto">
                Join 50,000+ Kenyans earning daily through surveys, app testing, watching ads, and more. Withdraw via M-Pesa instantly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                <Link to="/register">
                  <Button size="lg" className="gradient-bg-primary text-white font-semibold px-8 h-12 text-base w-full sm:w-auto">
                    Start Earning Now <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="font-semibold px-8 h-12 text-base w-full sm:w-auto">
                    Sign In <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <LiveActivityTicker className="max-w-xl mx-auto" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="bg-card border border-border rounded-2xl p-5 text-center h-full">
                  <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                  <p className="text-2xl font-bold text-balance">{stat.value}</p>
                  <p className="text-sm text-muted-foreground text-pretty">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">How MetaPay Works</h2>
            <p className="text-muted-foreground text-lg text-pretty max-w-xl mx-auto">Get started in minutes and start earning real money today</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="bg-card border border-border rounded-2xl p-6 text-center h-full flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl gradient-bg-primary flex items-center justify-center mb-4 shadow-md">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-balance">{item.title}</h3>
                  <p className="text-muted-foreground text-sm text-pretty">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Task Previews */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Available Tasks</h2>
            <p className="text-muted-foreground text-lg text-pretty max-w-xl mx-auto">Hundreds of tasks updated daily across multiple categories</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {taskPreviews.map((task, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <div className="bg-card border border-border rounded-2xl p-5 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">{task.category}</p>
                      <h3 className="font-semibold text-balance">{task.title}</h3>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${difficultyColor[task.difficulty]}`}>{task.difficulty}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-auto">
                    <div className="flex items-center gap-1 text-green-500">
                      <DollarSign className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-bold text-sm">KES {task.reward}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs">{task.time}</span>
                    </div>
                    <Link to="/register" className="ml-auto">
                      <Button size="sm" className="gradient-bg-primary text-white text-xs h-7 px-3">Start</Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center">
            <Link to="/register">
              <Button size="lg" className="gradient-bg-primary text-white font-semibold px-8">
                View All Tasks <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-16 md:py-24" id="packages">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Choose Your Package</h2>
            <p className="text-muted-foreground text-lg text-pretty max-w-xl mx-auto">Activate your account and start earning today</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {packages.map((pkg, i) => {
              const config = PACKAGE_CONFIG[pkg.name];
              const isPopular = pkg.name === 'gold';
              return (
                <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                  <div className={`bg-card border rounded-2xl p-5 h-full flex flex-col relative ${isPopular ? 'border-primary shadow-lg' : 'border-border'}`}>
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="gradient-bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</span>
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-4 shadow-md`}>
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-bold text-lg text-balance">{config.label}</h3>
                    <div className="my-3">
                      <span className="text-3xl font-bold">KES {pkg.price.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Est. daily: <span className="text-green-500 font-semibold">KES {pkg.daily_earnings_estimate.toLocaleString()}</span></p>
                    <ul className="space-y-1.5 flex-1 mb-4">
                      {(Array.isArray(pkg.features) ? pkg.features : []).slice(0, 4).map((f: string, fi: number) => (
                        <li key={fi} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-pretty">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/register">
                      <Button className={`w-full font-semibold ${isPopular ? 'gradient-bg-primary text-white' : 'bg-muted hover:bg-primary hover:text-primary-foreground'}`}>
                        Activate
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">What Our Members Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="bg-card border border-border rounded-2xl p-6 h-full flex flex-col">
                  <div className="flex mb-3 gap-0.5">
                    {Array.from({ length: t.rating }).map((_, ri) => (
                      <Star key={ri} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-pretty flex-1 mb-4">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.location} • {t.pkg} Member</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Winners */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Recent Top Earners</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {recentWinners.map((w, i) => {
              const config = PACKAGE_CONFIG[w.pkg as keyof typeof PACKAGE_CONFIG];
              return (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <div className="bg-card border border-border rounded-2xl p-5 text-center h-full">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white font-bold text-lg mx-auto mb-3`}>
                      {w.name.charAt(0)}
                    </div>
                    <p className="font-semibold text-sm text-balance">{w.name}</p>
                    <p className="text-lg font-bold text-green-500">KES {w.amount.toLocaleString()}</p>
                    <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-3"
                  >
                    <span className="font-semibold text-sm md:text-base text-balance">{faq.q}</span>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-4">
                      <p className="text-muted-foreground text-sm text-pretty">{faq.a}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="gradient-bg-primary rounded-3xl p-8 md:p-14 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">Ready to Start Earning?</h2>
              <p className="text-white/80 text-lg mb-8 text-pretty max-w-xl mx-auto">Join thousands of Kenyans earning daily on MetaPay. Register now and activate your account.</p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="font-bold px-10 h-12 text-base">
                  Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-bg-primary flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold gradient-text">MetaPay</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-primary">Terms</Link>
              <Link to="/privacy" className="hover:text-primary">Privacy</Link>
              <Link to="/login" className="hover:text-primary">Sign In</Link>
              <Link to="/register" className="hover:text-primary">Register</Link>
            </div>
            <p className="text-xs text-muted-foreground">© 2025 MetaPay. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
