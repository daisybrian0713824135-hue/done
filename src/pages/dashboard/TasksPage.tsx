import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Task } from '@/types/types';
import {
  Lock, Search, Clock, DollarSign, CheckCircle, Play,
  ExternalLink, ClipboardList, Timer, ArrowRight, Globe,
  Star, Zap, AlertCircle
} from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'All Tasks' },
  { key: 'surveys', label: 'Surveys' },
  { key: 'watching_ads', label: 'Watch Ads' },
  { key: 'app_testing', label: 'App Testing' },
  { key: 'data_annotation', label: 'Annotation' },
  { key: 'offers', label: 'Offers' },
  { key: 'video_tasks', label: 'Video Tasks' },
  { key: 'daily_tasks', label: 'Daily Tasks' },
  { key: 'referrals', label: 'Referrals' },
];

const difficultyColor: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const categoryColors: Record<string, string> = {
  surveys: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  watching_ads: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  app_testing: 'bg-green-500/10 text-green-600 dark:text-green-400',
  data_annotation: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  offers: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  video_tasks: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  daily_tasks: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  referrals: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
};

// ─── Task Modal ────────────────────────────────────────────────────────────────

interface TaskModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onComplete: (taskId: string) => Promise<void>;
  isActive: boolean;
  alreadyDone: boolean;
}

function TaskModal({ task, open, onClose, onComplete, isActive, alreadyDone }: TaskModalProps) {
  type Step = 'info' | 'waiting' | 'confirm' | 'done';
  const [step, setStep] = useState<Step>('info');
  const [elapsed, setElapsed] = useState(0);
  const [completing, setCompleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requiredSecs = task?.required_time_seconds ?? 0;
  const progress = requiredSecs > 0 ? Math.min(100, (elapsed / requiredSecs) * 100) : 100;
  const timerDone = elapsed >= requiredSecs || requiredSecs === 0;

  useEffect(() => {
    if (open) { setStep('info'); setElapsed(0); setCompleting(false); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [open]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= requiredSecs) { clearInterval(timerRef.current!); return prev; }
        return prev + 1;
      });
    }, 1000);
  }, [requiredSecs]);

  const handleOpenTask = () => {
    if (task?.task_url) window.open(task.task_url, '_blank', 'noopener,noreferrer');
    setStep('waiting');
    startTimer();
  };

  const handleMarkDone = () => {
    if (!timerDone) {
      const remaining = Math.ceil((requiredSecs - elapsed) / 60);
      toast.error(`Please wait ${remaining} more minute(s) before claiming.`);
      return;
    }
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!task) return;
    setCompleting(true);
    await onComplete(task.id);
    setStep('done');
    setCompleting(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!task) return null;
  const isNoUrl = !task.task_url;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-balance pr-6">{task.title}</DialogTitle>
          <DialogDescription className="text-pretty">{task.description}</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">

          {/* INFO step */}
          {step === 'info' && (
            <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted rounded-xl p-3 text-center">
                  <DollarSign className="h-4 w-4 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Reward</p>
                  <p className="font-bold text-sm">KES {task.reward}</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-bold text-sm">{task.time_estimate_minutes}min</p>
                </div>
                <div className="bg-muted rounded-xl p-3 text-center">
                  <Star className="h-4 w-4 text-purple-500 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Level</p>
                  <p className="font-bold text-sm capitalize">{task.difficulty}</p>
                </div>
              </div>

              {task.instructions && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> Instructions
                  </p>
                  <p className="text-sm text-muted-foreground text-pretty leading-relaxed">{task.instructions}</p>
                </div>
              )}

              {task.completion_proof && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Proof required:</span> {task.completion_proof}
                  </p>
                </div>
              )}

              {alreadyDone ? (
                <div className="w-full bg-green-500/10 text-green-600 border border-green-500/30 font-medium rounded-xl flex items-center justify-center py-3 text-sm gap-2">
                  <CheckCircle className="h-4 w-4" /> Already Completed
                </div>
              ) : !isActive ? (
                <Button className="w-full h-11 gradient-bg-primary text-white font-semibold" onClick={onClose}>
                  <Lock className="h-4 w-4 mr-2" /> Activate Account to Start
                </Button>
              ) : (
                <Button onClick={isNoUrl ? handleConfirm : handleOpenTask} className="w-full h-11 gradient-bg-primary text-white font-semibold">
                  {isNoUrl
                    ? <><CheckCircle className="h-4 w-4 mr-2" /> Claim Bonus</>
                    : <><ExternalLink className="h-4 w-4 mr-2" /> Open Task <ArrowRight className="h-4 w-4 ml-1" /></>
                  }
                </Button>
              )}
            </motion.div>
          )}

          {/* WAITING step */}
          {step === 'waiting' && (
            <motion.div key="waiting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-full gradient-bg-primary mx-auto flex items-center justify-center mb-3 shadow-lg">
                  <Timer className="h-8 w-8 text-white" />
                </div>
                <p className="font-semibold text-balance">Task Opened in New Tab</p>
                <p className="text-sm text-muted-foreground mt-1 text-pretty">Complete it in the new tab, then return here</p>
              </div>

              {requiredSecs > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time elapsed</span>
                    <span className={`font-mono font-semibold ${timerDone ? 'text-green-500' : 'text-primary'}`}>
                      {formatTime(elapsed)} / {formatTime(requiredSecs)}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  {timerDone ? (
                    <p className="text-xs text-green-500 text-center font-medium">
                      Minimum time reached — you can now claim your reward
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center text-pretty">
                      Spend at least {Math.ceil(requiredSecs / 60)} min on this task before claiming
                    </p>
                  )}
                </div>
              )}

              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground text-pretty">
                  <span className="font-semibold text-foreground">Reminder: </span>{task.instructions}
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleMarkDone}
                  disabled={!timerDone && requiredSecs > 0}
                  className="w-full h-11 gradient-bg-primary text-white font-semibold disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {timerDone || requiredSecs === 0
                    ? "I've Completed the Task"
                    : `Wait ${formatTime(requiredSecs - elapsed)}`
                  }
                </Button>
                <Button
                  variant="outline"
                  onClick={() => task.task_url && window.open(task.task_url, '_blank', 'noopener,noreferrer')}
                  className="w-full h-9 text-sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Reopen Task Tab
                </Button>
              </div>
            </motion.div>
          )}

          {/* CONFIRM step */}
          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                <p className="font-semibold text-sm text-balance">Confirm Task Completion</p>
                <p className="text-xs text-muted-foreground mt-1 text-pretty">
                  Confirm you have fully completed: <strong>{task.title}</strong>
                </p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">Reward to be credited</p>
                <p className="text-2xl font-bold text-green-500">KES {task.reward}</p>
              </div>
              <Button onClick={handleConfirm} disabled={completing} className="w-full h-11 gradient-bg-primary text-white font-semibold">
                {completing
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Processing...</>
                  : <><CheckCircle className="h-4 w-4 mr-2" /> Confirm & Claim KES {task.reward}</>
                }
              </Button>
              <Button variant="outline" onClick={() => setStep('waiting')} className="w-full">Back</Button>
            </motion.div>
          )}

          {/* DONE step */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center space-y-4 py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                  className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 mx-auto flex items-center justify-center"
                >
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-xl text-balance">Task Completed!</h3>
                  <p className="text-muted-foreground text-pretty mt-1">
                    You earned <span className="text-green-500 font-bold text-lg">KES {task.reward}</span> added to your wallet!
                  </p>
                </div>
                <Button onClick={onClose} className="w-full h-11 gradient-bg-primary text-white font-semibold">
                  <Zap className="h-4 w-4 mr-2" /> Continue Earning
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { profile, isActive, refreshProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('reward', { ascending: false })
      .then(({ data }) => {
        if (data) setTasks(Array.isArray(data) ? data : []);
        setLoading(false);
      });

    if (profile) {
      supabase
        .from('task_completions')
        .select('task_id')
        .eq('user_id', profile.id)
        .then(({ data }) => {
          if (data) setCompletedIds(new Set(data.map((d: { task_id: string }) => d.task_id)));
        });
    }
  }, [profile]);

  const filtered = tasks.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleComplete = async (taskId: string) => {
    if (!profile) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const { error } = await supabase.from('task_completions').insert({
      user_id: profile.id,
      task_id: taskId,
      reward_amount: task.reward,
      status: 'completed',
    });

    if (!error) {
      setCompletedIds(prev => new Set([...prev, taskId]));
      await Promise.all([
        supabase.from('earnings').insert({
          user_id: profile.id,
          amount: task.reward,
          source: 'task',
          task_id: taskId,
          description: `Completed: ${task.title}`,
        }),
        supabase.from('profiles').update({
          withdrawal_balance: (profile.withdrawal_balance || 0) + task.reward,
          completed_tasks: (profile.completed_tasks || 0) + 1,
        }).eq('id', profile.id),
        supabase.from('live_activity').insert({
          activity_type: 'task_completion',
          message: `${profile.full_name?.split(' ')[0]} completed "${task.title}"`,
          amount: task.reward,
        }),
      ]);
      await refreshProfile();
      toast.success(`KES ${task.reward} added to your wallet!`);
    } else {
      toast.error('Could not record completion: ' + error.message);
    }
  };

  const completedCount = completedIds.size;
  const availableCount = filtered.filter(t => !completedIds.has(t.id)).length;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-balance">Tasks Marketplace</h1>
            <p className="text-muted-foreground text-sm text-pretty mt-0.5">
              Complete real tasks to earn KES rewards instantly
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-card border border-border rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-lg font-bold text-green-500">{completedCount}</p>
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-lg font-bold text-primary">{availableCount}</p>
            </div>
          </div>
        </div>

        {/* Locked banner */}
        {!isActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 text-center">
              <Lock className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-semibold text-balance">Activate Your Account to Earn</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4 text-pretty">
                You need an active package to complete tasks and earn rewards
              </p>
              <a href="/dashboard/packages">
                <Button className="gradient-bg-primary text-white font-semibold">
                  <Zap className="h-4 w-4 mr-2" /> View Packages
                </Button>
              </a>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Category tabs */}
        <div className="overflow-x-auto whitespace-nowrap flex gap-2 pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
                selectedCategory === cat.key
                  ? 'gradient-bg-primary text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Task grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16">
                <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-balance">No tasks found in this category</p>
              </div>
            )}

            {filtered.map((task, i) => {
              const done = completedIds.has(task.id);
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className={`bg-card border rounded-2xl p-5 h-full flex flex-col transition-all hover:shadow-md ${
                    done ? 'border-green-500/30 bg-green-500/5' : task.is_featured ? 'border-primary/40 shadow-sm' : 'border-border'
                  }`}>
                    {/* Badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[task.category] || 'bg-muted text-muted-foreground'}`}>
                          {task.category.replace(/_/g, ' ')}
                        </span>
                        {task.is_featured && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium gradient-bg-primary text-white">
                            Featured
                          </span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${difficultyColor[task.difficulty]}`}>
                        {task.difficulty}
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm text-balance leading-snug mb-1">{task.title}</h3>
                    <p className="text-xs text-muted-foreground flex-1 mb-3 text-pretty line-clamp-2">{task.description}</p>

                    {/* Reward + meta */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-green-500">
                        <DollarSign className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-bold text-base">KES {task.reward}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs">{task.time_estimate_minutes}min</span>
                        {task.task_url && (
                          <>
                            <span className="mx-1 opacity-30">·</span>
                            <Globe className="h-3 w-3 shrink-0" />
                            <span className="text-xs">External</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    {done ? (
                      <div className="w-full h-9 text-xs bg-green-500/10 text-green-600 border border-green-500/30 rounded-xl flex items-center justify-center font-medium gap-1.5 cursor-default select-none">
                        <CheckCircle className="h-3.5 w-3.5" /> Completed
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => { setSelectedTask(task); setModalOpen(true); }}
                        disabled={!isActive}
                        className={`w-full h-9 text-xs font-semibold ${isActive ? 'gradient-bg-primary text-white' : 'opacity-60 cursor-not-allowed'}`}
                      >
                        {isActive
                          ? <><Play className="h-3.5 w-3.5 mr-1.5" /> Start Task</>
                          : <><Lock className="h-3.5 w-3.5 mr-1.5" /> Locked</>
                        }
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <TaskModal
          task={selectedTask}
          open={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedTask(null); }}
          onComplete={handleComplete}
          isActive={isActive}
          alreadyDone={selectedTask ? completedIds.has(selectedTask.id) : false}
        />
      </div>
    </DashboardLayout>
  );
}
