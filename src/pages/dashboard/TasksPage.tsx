import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Task } from '@/types/types';
import { Lock, Search, Clock, DollarSign, CheckCircle, Play, ExternalLink, X, ClipboardList, Filter } from 'lucide-react';

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

interface TaskModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onComplete: (taskId: string) => void;
  isActive: boolean;
}

function TaskModal({ task, open, onClose, onComplete, isActive }: TaskModalProps) {
  const [step, setStep] = useState<'info' | 'task' | 'done'>('info');

  useEffect(() => { if (open) setStep('info'); }, [open]);

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-balance">{task.title}</DialogTitle>
          <DialogDescription className="text-pretty">{task.description}</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'info' && (
            <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <DollarSign className="h-4 w-4 text-green-500 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Reward</p>
                    <p className="font-bold text-sm">KES {task.reward}</p>
                  </div>
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-bold text-sm">{task.time_estimate_minutes}m</p>
                  </div>
                  <div className="bg-muted rounded-xl p-3 text-center">
                    <CheckCircle className="h-4 w-4 text-purple-500 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Difficulty</p>
                    <p className="font-bold text-sm capitalize">{task.difficulty}</p>
                  </div>
                </div>
                {task.instructions && (
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-sm font-medium mb-2">Instructions:</p>
                    <p className="text-sm text-muted-foreground text-pretty">{task.instructions}</p>
                  </div>
                )}
                <Button
                  onClick={() => setStep('task')}
                  disabled={!isActive}
                  className="w-full gradient-bg-primary text-white font-semibold"
                >
                  {isActive ? <><Play className="h-4 w-4 mr-2" /> Start Task</> : <><Lock className="h-4 w-4 mr-2" /> Activate to Start</>}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'task' && (
            <motion.div key="task" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="space-y-4">
                <div className="bg-muted rounded-2xl p-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl gradient-bg-primary mx-auto flex items-center justify-center">
                    <ClipboardList className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-balance">{task.title}</h3>
                  <p className="text-sm text-muted-foreground text-pretty">{task.instructions || task.description}</p>
                  <p className="text-xs text-muted-foreground">(Complete this task according to the instructions above)</p>
                </div>
                <Button onClick={() => { onComplete(task.id); setStep('done'); }} className="w-full gradient-bg-primary text-white font-semibold">
                  <CheckCircle className="h-4 w-4 mr-2" /> Mark as Completed
                </Button>
                <Button variant="outline" onClick={() => setStep('info')} className="w-full">Back</Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 mx-auto flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="font-bold text-xl text-balance">Task Completed!</h3>
                <p className="text-muted-foreground text-pretty">You earned <span className="text-green-500 font-bold">KES {task.reward}</span>. Keep it up!</p>
                <Button onClick={onClose} className="w-full gradient-bg-primary text-white font-semibold">Continue Earning</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

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
    supabase.from('tasks').select('*').eq('is_active', true).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setTasks(Array.isArray(data) ? data : []); setLoading(false); });

    if (profile) {
      supabase.from('task_completions').select('task_id').eq('user_id', profile.id)
        .then(({ data }) => { if (data) setCompletedIds(new Set(data.map((d: { task_id: string }) => d.task_id))); });
    }
  }, [profile]);

  const filtered = tasks.filter(t => {
    if (!isActive) return false;
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleComplete = async (taskId: string) => {
    if (!profile) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const { error } = await supabase.from('task_completions').insert({
      user_id: profile.id, task_id: taskId, reward_amount: task.reward, status: 'completed',
    });
    if (!error) {
      setCompletedIds(prev => new Set([...prev, taskId]));
      await supabase.from('earnings').insert({ user_id: profile.id, amount: task.reward, source: 'task', task_id: taskId, description: `Completed: ${task.title}` });
      await supabase.from('profiles').update({ withdrawal_balance: (profile.withdrawal_balance || 0) + task.reward, completed_tasks: (profile.completed_tasks || 0) + 1 }).eq('id', profile.id);
      await refreshProfile();
      toast.success(`You earned KES ${task.reward}!`);
      // Insert live activity
      await supabase.from('live_activity').insert({ activity_type: 'task_completion', message: `${profile.full_name?.split(' ')[0]} completed ${task.title}`, amount: task.reward });
    } else {
      toast.error('Could not complete task: ' + error.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-balance">Tasks</h1>
          <p className="text-muted-foreground text-sm text-pretty mt-1">Complete tasks to earn rewards</p>
        </div>

        {!isActive && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 text-center">
            <Lock className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <h3 className="font-semibold text-balance">Activate Your Account</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4 text-pretty">You need an active package to access tasks</p>
            <a href="/dashboard/packages"><Button className="gradient-bg-primary text-white font-semibold">View Packages</Button></a>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-0 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} disabled={!isActive} />
          </div>
        </div>

        {/* Category tabs */}
        <div className="overflow-x-auto whitespace-nowrap flex gap-2 pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              disabled={!isActive && cat.key !== 'all'}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${selectedCategory === cat.key ? 'gradient-bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Task grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16">
                <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-balance">{isActive ? 'No tasks found' : 'Activate your account to see tasks'}</p>
              </div>
            )}
            {filtered.map((task, i) => {
              const done = completedIds.has(task.id);
              return (
                <motion.div key={task.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className={`bg-card border rounded-2xl p-5 h-full flex flex-col transition-shadow hover:shadow-md ${done ? 'border-green-500/30 bg-green-500/5' : 'border-border'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[task.category] || 'bg-muted text-muted-foreground'}`}>
                        {task.category.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${difficultyColor[task.difficulty]}`}>{task.difficulty}</span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 text-balance">{task.title}</h3>
                    <p className="text-xs text-muted-foreground flex-1 mb-3 text-pretty line-clamp-2">{task.description}</p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1 text-green-500">
                        <DollarSign className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-bold text-sm">KES {task.reward}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs">{task.time_estimate_minutes}min</span>
                      </div>
                    </div>
                    {done ? (
                      <div className="w-full h-8 text-xs bg-green-500/10 text-green-600 border border-green-500/30 rounded-md flex items-center justify-center font-medium cursor-not-allowed select-none">
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Completed
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => { setSelectedTask(task); setModalOpen(true); }}
                        className="w-full h-8 text-xs gradient-bg-primary text-white"
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" /> Start Task
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
        />
      </div>
    </DashboardLayout>
  );
}
