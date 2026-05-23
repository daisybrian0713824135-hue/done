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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Task, SurveyQuestion } from '@/types/types';
import { PACKAGE_DAILY_LIMITS } from '@/types/types';
import {
  Lock, Search, Clock, DollarSign, CheckCircle, Play,
  ExternalLink, ClipboardList, Timer, ArrowRight, Globe,
  Star, Zap, AlertCircle, Copy, Download, MessageCircle,
  X, ChevronRight, TrendingUp,
} from 'lucide-react';

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all',             label: 'All Tasks' },
  { key: 'surveys',         label: 'Surveys' },
  { key: 'watching_ads',    label: 'Watch Ads' },
  { key: 'video_tasks',     label: 'Videos' },
  { key: 'app_testing',     label: 'App Testing' },
  { key: 'data_annotation', label: 'Annotation' },
  { key: 'offers',          label: 'WhatsApp' },
  { key: 'daily_tasks',     label: 'Daily' },
  { key: 'referrals',       label: 'Referrals' },
];

const difficultyColor: Record<string, string> = {
  easy:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  hard:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const categoryColors: Record<string, string> = {
  surveys:         'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  watching_ads:    'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  app_testing:     'bg-green-500/10 text-green-600 dark:text-green-400',
  data_annotation: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  offers:          'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  video_tasks:     'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  daily_tasks:     'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  referrals:       'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
};

// ─── TaskModal ────────────────────────────────────────────────────────────────

interface TaskModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onComplete: (taskId: string) => Promise<void>;
  isActive: boolean;
  alreadyDone: boolean;
}

function TaskModal({ task, open, onClose, onComplete, isActive, alreadyDone }: TaskModalProps) {
  type Step = 'info' | 'survey' | 'waiting' | 'whatsapp' | 'confirm' | 'done';
  const [step, setStep] = useState<Step>('info');
  const [elapsed, setElapsed] = useState(0);
  const [completing, setCompleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // survey state
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const requiredSecs = task?.required_time_seconds ?? 0;
  const progress = requiredSecs > 0 ? Math.min(100, (elapsed / requiredSecs) * 100) : 100;
  const timerDone = elapsed >= requiredSecs || requiredSecs === 0;

  useEffect(() => {
    if (open) {
      setStep('info');
      setElapsed(0);
      setCompleting(false);
      setCurrentQ(0);
      setAnswers({});
      setSubmitted(false);
      setScore(0);
    }
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

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleStart = () => {
    if (!task) return;
    if (task.task_type === 'survey') { setStep('survey'); return; }
    if (task.task_type === 'whatsapp_post' || task.task_type === 'whatsapp_share') { setStep('whatsapp'); return; }
    if (task.task_type === 'instant') { setStep('confirm'); return; }
    // video_watch or external
    if (task.task_url) window.open(task.task_url, '_blank', 'noopener,noreferrer');
    setStep('waiting');
    startTimer();
  };

  const handleMarkDone = () => {
    if (!timerDone) {
      toast.error(`Wait ${formatTime(requiredSecs - elapsed)} more before claiming.`);
      return;
    }
    setStep('confirm');
  };

  // survey submit
  const handleSurveySubmit = () => {
    if (!task?.survey_questions) return;
    const qs: SurveyQuestion[] = task.survey_questions;
    const correct = qs.filter((q, i) => answers[i] === q.correct).length;
    setScore(correct);
    setSubmitted(true);
    if (correct >= Math.ceil(qs.length * 0.8)) {
      setTimeout(() => setStep('confirm'), 1800);
    }
  };

  const handleConfirm = async () => {
    if (!task) return;
    setCompleting(true);
    await onComplete(task.id);
    setStep('done');
    setCompleting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard!'));
  };

  if (!task) return null;
  const questions: SurveyQuestion[] = task.survey_questions ?? [];
  const passThreshold = questions.length > 0 ? Math.ceil(questions.length * 0.8) : 0;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-balance pr-6">{task.title}</DialogTitle>
          <DialogDescription className="text-pretty">{task.description}</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">

          {/* ── INFO ── */}
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
                    <AlertCircle className="h-3.5 w-3.5" /> How it works
                  </p>
                  <p className="text-sm text-muted-foreground text-pretty leading-relaxed">{task.instructions}</p>
                </div>
              )}

              {task.task_type === 'survey' && questions.length > 0 && (
                <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-purple-500 shrink-0" />
                  <p className="text-xs text-muted-foreground text-pretty">
                    <span className="font-semibold text-foreground">{questions.length} questions</span> — answer in-app, no external link needed.
                    Score <strong>{passThreshold}/{questions.length}</strong> to earn KES {task.reward}.
                  </p>
                </div>
              )}

              {(task.task_type === 'whatsapp_post' || task.task_type === 'whatsapp_share') && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-green-500 shrink-0" />
                  <p className="text-xs text-muted-foreground text-pretty">
                    {task.task_type === 'whatsapp_post'
                      ? 'Save the image and post it on your WhatsApp Status.'
                      : 'Copy the message and send it to at least 3 WhatsApp groups or contacts.'}
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
                <Button onClick={handleStart} className="w-full h-11 gradient-bg-primary text-white font-semibold">
                  {task.task_type === 'survey'   && <><ClipboardList className="h-4 w-4 mr-2" /> Start Quiz <ArrowRight className="h-4 w-4 ml-1" /></>}
                  {task.task_type === 'instant'  && <><CheckCircle  className="h-4 w-4 mr-2" /> Claim Bonus</>}
                  {(task.task_type === 'whatsapp_post' || task.task_type === 'whatsapp_share') && <><MessageCircle className="h-4 w-4 mr-2" /> Start Task <ArrowRight className="h-4 w-4 ml-1" /></>}
                  {(task.task_type === 'video_watch' || task.task_type === 'external') && <><ExternalLink className="h-4 w-4 mr-2" /> Open Task <ArrowRight className="h-4 w-4 ml-1" /></>}
                </Button>
              )}
            </motion.div>
          )}

          {/* ── SURVEY ── */}
          {step === 'survey' && (
            <motion.div key="survey" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {!submitted ? (
                <>
                  {/* progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Question {currentQ + 1} of {questions.length}</span>
                      <span>{Object.keys(answers).length} answered</span>
                    </div>
                    <Progress value={((currentQ + 1) / questions.length) * 100} className="h-1.5" />
                  </div>

                  {/* question */}
                  <AnimatePresence mode="wait">
                    <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                      <p className="font-semibold text-sm leading-relaxed text-balance">
                        {questions[currentQ].question}
                      </p>
                      <div className="space-y-2">
                        {questions[currentQ].options.map(opt => {
                          const selected = answers[currentQ] === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: opt }))}
                              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all font-medium ${
                                selected
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border bg-muted/40 hover:border-primary/50 hover:bg-muted'
                              }`}
                            >
                              <span className={`inline-flex w-6 h-6 rounded-full border text-xs items-center justify-center mr-2 shrink-0 ${
                                selected ? 'border-primary bg-primary text-white' : 'border-border'
                              }`}>
                                {String.fromCharCode(65 + questions[currentQ].options.indexOf(opt))}
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* nav */}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0} className="flex-1">
                      Back
                    </Button>
                    {currentQ < questions.length - 1 ? (
                      <Button
                        onClick={() => setCurrentQ(q => q + 1)}
                        disabled={!answers[currentQ]}
                        className="flex-1 gradient-bg-primary text-white font-semibold"
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSurveySubmit}
                        disabled={Object.keys(answers).length < questions.length}
                        className="flex-1 gradient-bg-primary text-white font-semibold"
                      >
                        Submit <CheckCircle className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                /* results */
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-2">
                  <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center border-4 ${
                    score >= passThreshold
                      ? 'border-green-500 bg-green-500/10 text-green-500'
                      : 'border-red-400 bg-red-500/10 text-red-500'
                  }`}>
                    {score >= passThreshold
                      ? <CheckCircle className="h-10 w-10" />
                      : <X className="h-10 w-10" />
                    }
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{score}/{questions.length}</p>
                    <p className={`text-sm font-medium ${score >= passThreshold ? 'text-green-500' : 'text-red-400'}`}>
                      {score >= passThreshold ? 'Passed! Collecting your reward…' : `Need ${passThreshold}/${questions.length} to pass`}
                    </p>
                  </div>
                  {/* show correct/wrong indicators */}
                  <div className="flex justify-center gap-2 flex-wrap">
                    {questions.map((q, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          answers[i] === q.correct
                            ? 'bg-green-500 text-white'
                            : 'bg-red-400 text-white'
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  {score < passThreshold && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground text-pretty">
                        You scored {score}/{questions.length}. You need at least {passThreshold} to earn.
                      </p>
                      <Button onClick={() => { setCurrentQ(0); setAnswers({}); setSubmitted(false); }} variant="outline" className="w-full">
                        Try Again
                      </Button>
                      <Button onClick={onClose} className="w-full gradient-bg-primary text-white">Close</Button>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── WHATSAPP ── */}
          {step === 'whatsapp' && (
            <motion.div key="whatsapp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border-2 border-green-500 mx-auto flex items-center justify-center mb-2">
                  <MessageCircle className="h-7 w-7 text-green-500" />
                </div>
                <p className="font-semibold text-balance">
                  {task.task_type === 'whatsapp_post' ? 'Post on WhatsApp Status' : 'Share on WhatsApp'}
                </p>
              </div>

              {/* image for whatsapp_post */}
              {task.task_type === 'whatsapp_post' && task.media_url && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Step 1 — Save this image:</p>
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img src={task.media_url} alt="MetaPay promotional image" className="w-full object-cover aspect-video" />
                  </div>
                  <a href={task.media_url} download target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full h-9 text-sm">
                      <Download className="h-4 w-4 mr-2" /> Save Image to Phone
                    </Button>
                  </a>
                </div>
              )}

              {/* share text */}
              {task.share_text && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {task.task_type === 'whatsapp_post' ? 'Step 2 — Caption to add (optional):' : 'Step 1 — Copy this message:'}
                  </p>
                  <div className="bg-muted rounded-xl p-3 border border-border">
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words leading-relaxed">{task.share_text}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-9 text-sm"
                    onClick={() => copyToClipboard(task.share_text!)}
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copy Message
                  </Button>
                </div>
              )}

              {/* open whatsapp */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  {task.task_type === 'whatsapp_post' ? 'Step 3 — Post on WhatsApp Status:' : 'Step 2 — Open WhatsApp and share:'}
                </p>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(task.share_text ?? '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full h-10 bg-green-500 hover:bg-green-600 text-white font-semibold">
                    <MessageCircle className="h-4 w-4 mr-2" /> Open WhatsApp
                  </Button>
                </a>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground text-center mb-3 text-pretty">
                  Once you have {task.task_type === 'whatsapp_post' ? 'posted the image on your WhatsApp Status' : 'sent the message to at least 3 contacts/groups'}, tap below to claim your reward.
                </p>
                <Button onClick={() => setStep('confirm')} className="w-full h-11 gradient-bg-primary text-white font-semibold">
                  <CheckCircle className="h-4 w-4 mr-2" /> I Have Done This — Claim KES {task.reward}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── WAITING (video/external timer) ── */}
          {step === 'waiting' && (
            <motion.div key="waiting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="text-center py-1">
                <div className="w-14 h-14 rounded-full gradient-bg-primary mx-auto flex items-center justify-center mb-3 shadow-lg">
                  <Timer className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-balance">Task Opened in New Tab</p>
                <p className="text-sm text-muted-foreground mt-1 text-pretty">Complete it there, then return here</p>
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
                  <p className={`text-xs text-center ${timerDone ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
                    {timerDone
                      ? 'Minimum time reached — you can now claim your reward!'
                      : `Spend at least ${Math.ceil(requiredSecs / 60)} min on this task before claiming`}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={handleMarkDone}
                  disabled={!timerDone && requiredSecs > 0}
                  className="w-full h-11 gradient-bg-primary text-white font-semibold disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {timerDone || requiredSecs === 0
                    ? "I've Completed the Task"
                    : `Wait ${formatTime(requiredSecs - elapsed)}`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => task.task_url && window.open(task.task_url, '_blank', 'noopener,noreferrer')}
                  className="w-full h-9 text-sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Reopen Tab
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── CONFIRM ── */}
          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                <p className="font-semibold text-sm text-balance">Confirm Completion</p>
                <p className="text-xs text-muted-foreground mt-1 text-pretty">
                  Confirm you have fully completed: <strong>{task.title}</strong>
                </p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">Reward to be credited</p>
                <p className="text-3xl font-bold text-green-500">KES {task.reward}</p>
                <p className="text-xs text-muted-foreground mt-1">Added to your M-Pesa withdrawal balance</p>
              </div>
              <Button onClick={handleConfirm} disabled={completing} className="w-full h-11 gradient-bg-primary text-white font-semibold">
                {completing
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Processing…</>
                  : <><CheckCircle className="h-4 w-4 mr-2" /> Confirm & Claim KES {task.reward}</>}
              </Button>
              {step === 'confirm' && task.task_type !== 'instant' && task.task_type !== 'survey' && (
                <Button variant="outline" onClick={() => setStep('waiting')} className="w-full">Back</Button>
              )}
            </motion.div>
          )}

          {/* ── DONE ── */}
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
                    <span className="text-green-500 font-bold text-2xl">KES {task.reward}</span> added to your wallet!
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
  const [tasks, setTasks]                 = useState<Task[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [completedEver, setCompletedEver]   = useState<Set<string>>(new Set());
  const [todayCount, setTodayCount]         = useState(0);
  const [loading, setLoading]             = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch]               = useState('');
  const [selectedTask, setSelectedTask]   = useState<Task | null>(null);
  const [modalOpen, setModalOpen]         = useState(false);

  // daily limit for this user's package
  const dailyLimit = PACKAGE_DAILY_LIMITS[profile?.current_package ?? ''] ?? 0;
  const limitReached = isActive && todayCount >= dailyLimit;

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
      // completed ever
      supabase
        .from('task_completions')
        .select('task_id')
        .eq('user_id', profile.id)
        .then(({ data }) => {
          if (data) setCompletedEver(new Set(data.map((d: { task_id: string }) => d.task_id)));
        });

      // completed today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      supabase
        .from('task_completions')
        .select('task_id')
        .eq('user_id', profile.id)
        .gte('completed_at', todayStart.toISOString())
        .then(({ data }) => {
          if (data) {
            setCompletedToday(new Set(data.map((d: { task_id: string }) => d.task_id)));
            setTodayCount(data.length);
          }
        });
    }
  }, [profile]);

  const filtered = tasks.filter(t => {
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !t.description.toLowerCase().includes(search.toLowerCase())) return false;
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
      setCompletedEver(prev => new Set([...prev, taskId]));
      setCompletedToday(prev => new Set([...prev, taskId]));
      setTodayCount(c => c + 1);

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
          message: `${profile.full_name?.split(' ')[0] ?? 'Someone'} completed "${task.title}"`,
          amount: task.reward,
        }),
      ]);
      await refreshProfile();
      toast.success(`KES ${task.reward} added to your wallet!`);
    } else {
      toast.error('Could not record completion: ' + error.message);
    }
  };

  const availableCount = filtered.filter(t => !completedToday.has(t.id) && !completedEver.has(t.id)).length;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-balance">Tasks Marketplace</h1>
            <p className="text-muted-foreground text-sm text-pretty mt-0.5">
              Complete tasks to earn KES — paid directly to your M-Pesa balance
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-card border border-border rounded-xl px-3 py-2 text-center min-w-16">
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-lg font-bold text-primary">{todayCount}<span className="text-xs text-muted-foreground">/{isActive ? dailyLimit : 0}</span></p>
            </div>
            <div className="bg-card border border-border rounded-xl px-3 py-2 text-center min-w-16">
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="text-lg font-bold text-green-500">{availableCount}</p>
            </div>
          </div>
        </div>

        {/* Not active banner */}
        {!isActive && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 text-center">
              <Lock className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
              <h3 className="font-semibold text-balance">Activate Your Account to Earn</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4 text-pretty">
                Choose a package to unlock tasks and start earning KES daily via M-Pesa
              </p>
              <a href="/dashboard/packages">
                <Button className="gradient-bg-primary text-white font-semibold">
                  <Zap className="h-4 w-4 mr-2" /> View Packages
                </Button>
              </a>
            </div>
          </motion.div>
        )}

        {/* Daily limit reached banner */}
        {isActive && limitReached && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 text-center">
              <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold text-balance">Daily Limit Reached!</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4 text-pretty">
                You've completed all {dailyLimit} tasks allowed today on your{' '}
                <span className="font-semibold capitalize">{profile?.current_package}</span> package.
                Upgrade to unlock more daily tasks — or come back tomorrow!
              </p>
              <a href="/dashboard/packages">
                <Button className="gradient-bg-primary text-white font-semibold">
                  <Zap className="h-4 w-4 mr-2" /> Upgrade Package
                </Button>
              </a>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Category tabs */}
        <div className="overflow-x-auto flex gap-2 pb-1 whitespace-nowrap">
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
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16">
                <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-balance">No tasks found</p>
              </div>
            )}

            {filtered.map((task, i) => {
              const doneToday = completedToday.has(task.id);
              const doneEver  = completedEver.has(task.id);
              const isDone    = doneToday || doneEver;
              const blocked   = !isDone && isActive && limitReached;

              // type badge
              const typeBadge: Record<string, { label: string; icon: typeof Globe }> = {
                survey:          { label: 'In-App Quiz',  icon: ClipboardList },
                video_watch:     { label: 'Watch Video',  icon: Play },
                whatsapp_post:   { label: 'WhatsApp',     icon: MessageCircle },
                whatsapp_share:  { label: 'WhatsApp',     icon: MessageCircle },
                external:        { label: 'External',     icon: Globe },
                instant:         { label: 'Instant',      icon: Zap },
              };
              const tb = typeBadge[task.task_type] ?? { label: task.task_type, icon: Globe };
              const TypeIcon = tb.icon;

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className={`bg-card border rounded-2xl p-5 h-full flex flex-col transition-all hover:shadow-md ${
                    isDone     ? 'border-green-500/30 bg-green-500/5 opacity-75'
                    : task.is_featured ? 'border-primary/40 shadow-sm'
                    : 'border-border'
                  }`}>
                    {/* badges row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${categoryColors[task.category] ?? 'bg-muted text-muted-foreground'}`}>
                          {task.category.replace(/_/g, ' ')}
                        </span>
                        {task.is_featured && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium gradient-bg-primary text-white shrink-0">
                            Top Pick
                          </span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${difficultyColor[task.difficulty]}`}>
                        {task.difficulty}
                      </span>
                    </div>

                    {/* title */}
                    <h3 className="font-semibold text-sm text-balance leading-snug mb-1">{task.title}</h3>
                    <p className="text-xs text-muted-foreground flex-1 mb-3 text-pretty line-clamp-2">{task.description}</p>

                    {/* type + time row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 text-green-500">
                        <DollarSign className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-bold text-base">KES {task.reward}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TypeIcon className="h-3 w-3 shrink-0" />
                        <span className="text-xs">{tb.label}</span>
                        <span className="opacity-30 mx-0.5">·</span>
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="text-xs">{task.time_estimate_minutes}min</span>
                      </div>
                    </div>

                    {/* CTA */}
                    {isDone ? (
                      <div className="w-full h-9 text-xs bg-green-500/10 text-green-600 border border-green-500/30 rounded-xl flex items-center justify-center font-medium gap-1.5 cursor-default select-none">
                        <CheckCircle className="h-3.5 w-3.5" /> Completed
                      </div>
                    ) : blocked ? (
                      <div className="w-full h-9 text-xs bg-muted text-muted-foreground border border-border rounded-xl flex items-center justify-center font-medium gap-1.5 cursor-default select-none">
                        <Lock className="h-3.5 w-3.5" /> Daily Limit Reached
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
                          : <><Lock className="h-3.5 w-3.5 mr-1.5" /> Locked</>}
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
          alreadyDone={selectedTask ? (completedToday.has(selectedTask.id) || completedEver.has(selectedTask.id)) : false}
        />
      </div>
    </DashboardLayout>
  );
}
