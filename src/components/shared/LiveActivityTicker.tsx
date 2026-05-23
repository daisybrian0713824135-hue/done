import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/db/supabase';
import type { LiveActivity } from '@/types/types';
import { TrendingUp, UserPlus, Wallet, CheckCircle, Package, Star } from 'lucide-react';

const activityIcons: Record<string, React.ReactNode> = {
  earning: <TrendingUp className="h-3.5 w-3.5 text-green-400" />,
  registration: <UserPlus className="h-3.5 w-3.5 text-blue-400" />,
  withdrawal: <Wallet className="h-3.5 w-3.5 text-yellow-400" />,
  task_completion: <CheckCircle className="h-3.5 w-3.5 text-purple-400" />,
  package_activation: <Package className="h-3.5 w-3.5 text-pink-400" />,
  manual: <Star className="h-3.5 w-3.5 text-orange-400" />,
};

interface Props {
  compact?: boolean;
  className?: string;
}

export default function LiveActivityTicker({ compact = false, className = '' }: Props) {
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Fetch initial activities
    supabase
      .from('live_activity')
      .select('*')
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setActivities(data);
      });

    // Subscribe to realtime updates
    const channel = supabase
      .channel('live-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_activity' }, payload => {
        const newActivity = payload.new as LiveActivity;
        if (newActivity.is_visible) {
          setActivities(prev => [newActivity, ...prev.slice(0, 19)]);
          setCurrent(0);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (activities.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % activities.length);
    }, 3500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activities.length]);

  if (activities.length === 0) return null;

  const activity = activities[current];

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={current}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-muted-foreground truncate"
          >
            {activity.message}
          </motion.span>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-0">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border-r border-border shrink-0">
          <div className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </div>
          <span className="text-xs font-semibold text-primary whitespace-nowrap">LIVE</span>
        </div>
        <div className="flex-1 min-w-0 px-4 py-2.5 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2"
            >
              <span className="shrink-0">{activityIcons[activity.activity_type] || activityIcons.manual}</span>
              <span className="text-sm text-foreground truncate">{activity.message}</span>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="shrink-0 px-3 py-2.5 border-l border-border">
          <span className="text-xs text-muted-foreground">{current + 1}/{activities.length}</span>
        </div>
      </div>
    </div>
  );
}
