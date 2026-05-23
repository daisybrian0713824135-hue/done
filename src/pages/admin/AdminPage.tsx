import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Profile, Withdrawal, Task } from '@/types/types';
import { PACKAGE_CONFIG } from '@/types/types';
import {
  Users, DollarSign, ClipboardList, Wallet, Search, CheckCircle,
  XCircle, Shield, Edit, Plus, Trash, Bell, TrendingUp, Settings, Package
} from 'lucide-react';

export default function AdminPage() {
  const { isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, pendingWithdrawals: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  useEffect(() => {
    if (!isAdmin) { navigate('/dashboard'); return; }
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    const [usersRes, withdrawRes, tasksRes, statsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('withdrawals').select('*, user:profiles!withdrawals_user_id_fkey(full_name,phone)').order('created_at', { ascending: false }).limit(50),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('profiles').select('id,status'),
    ]);

    if (usersRes.data) setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
    if (withdrawRes.data) setWithdrawals(Array.isArray(withdrawRes.data) ? withdrawRes.data : []);
    if (tasksRes.data) setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
    if (statsRes.data) {
      const allUsers = Array.isArray(statsRes.data) ? statsRes.data : [];
      const activeCount = allUsers.filter((u: { status: string }) => u.status === 'active').length;
      setStats({ totalUsers: allUsers.length, activeUsers: activeCount, pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length, totalPaid: 0 });
    }
    setLoading(false);
  };

  const updateWithdrawal = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('withdrawals').update({ status, processed_at: new Date().toISOString() }).eq('id', id);
    if (!error) { toast.success(`Withdrawal ${status}`); fetchAll(); }
    else toast.error('Update failed: ' + error.message);
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);
    if (!error) { toast.success(`User ${newStatus}`); fetchAll(); }
    else toast.error('Update failed');
  };

  const postAnnouncement = async () => {
    if (!annTitle || !annContent) { toast.error('Fill in all fields'); return; }
    const { error } = await supabase.from('announcements').insert({ title: annTitle, content: annContent, is_published: true, created_by: profile?.id });
    if (!error) { toast.success('Announcement posted!'); setAnnouncementOpen(false); setAnnTitle(''); setAnnContent(''); }
    else toast.error('Failed: ' + error.message);
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone?.includes(userSearch)
  );

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-balance flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> Admin Panel
            </h1>
            <p className="text-muted-foreground text-sm text-pretty mt-1">Manage users, tasks, and platform</p>
          </div>
          <Button onClick={() => setAnnouncementOpen(true)} className="gradient-bg-primary text-white font-semibold shrink-0">
            <Bell className="h-4 w-4 mr-2" /> Post Announcement
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'from-purple-500 to-blue-500' },
            { label: 'Active Users', value: stats.activeUsers, icon: CheckCircle, color: 'from-green-500 to-teal-500' },
            { label: 'Pending Withdrawals', value: pendingWithdrawals.length, icon: Wallet, color: 'from-yellow-500 to-orange-500' },
            { label: 'Total Tasks', value: tasks.length, icon: ClipboardList, color: 'from-blue-500 to-cyan-500' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <div className="bg-card border border-border rounded-2xl p-4 h-full">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                    <s.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-balance">{loading ? <Skeleton className="h-8 w-16" /> : s.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="users" className="whitespace-nowrap">Users</TabsTrigger>
            <TabsTrigger value="withdrawals" className="whitespace-nowrap">
              Withdrawals
              {pendingWithdrawals.length > 0 && <span className="ml-2 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">{pendingWithdrawals.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="whitespace-nowrap">Tasks</TabsTrigger>
          </TabsList>

          {/* Users tab */}
          <TabsContent value="users">
            <div className="space-y-4">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-9" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              </div>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">User</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Phone</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Package</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Balance</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}><td colSpan={6} className="px-5 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                      ))}
                      {!loading && filteredUsers.length === 0 && (
                        <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">No users found</td></tr>
                      )}
                      {!loading && filteredUsers.map(u => (
                        <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full gradient-bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {(u.full_name || 'U').charAt(0)}
                              </div>
                              <span className="text-sm font-medium">{u.full_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">{u.phone}</td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {u.current_package ? (
                              <span className={`text-xs font-medium ${PACKAGE_CONFIG[u.current_package]?.color}`}>{PACKAGE_CONFIG[u.current_package]?.label}</span>
                            ) : <span className="text-xs text-muted-foreground">None</span>}
                          </td>
                          <td className="px-5 py-3 text-sm font-medium whitespace-nowrap">KES {Number(u.withdrawal_balance || 0).toLocaleString()}</td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleUserStatus(u.id, u.status)}
                              className="h-7 text-xs"
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Withdrawals tab */}
          <TabsContent value="withdrawals">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">User</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Amount</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Phone</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}><td colSpan={6} className="px-5 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                    ))}
                    {!loading && withdrawals.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">No withdrawals</td></tr>
                    )}
                    {!loading && withdrawals.map(w => (
                      <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-5 py-3 text-sm font-medium whitespace-nowrap">{(w as Withdrawal & { user?: { full_name?: string } }).user?.full_name || 'Unknown'}</td>
                        <td className="px-5 py-3 text-sm font-bold whitespace-nowrap">KES {Number(w.amount).toLocaleString()}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{w.phone_number}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(w.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : w.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {w.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Button size="sm" onClick={() => updateWithdrawal(w.id, 'approved')} className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => updateWithdrawal(w.id, 'rejected')} className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Tasks tab */}
          <TabsContent value="tasks">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">All Tasks</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Title</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Category</th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground whitespace-nowrap">Reward</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Difficulty</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}><td colSpan={5} className="px-5 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                    ))}
                    {!loading && tasks.map(t => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-5 py-3 text-sm font-medium max-w-xs truncate">{t.title}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground capitalize whitespace-nowrap">{t.category.replace('_', ' ')}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-green-500 text-right whitespace-nowrap">KES {t.reward}</td>
                        <td className="px-5 py-3 text-xs capitalize text-muted-foreground whitespace-nowrap">{t.difficulty}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {t.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Announcement dialog */}
        <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-balance">Post Announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-normal text-muted-foreground mb-1.5 block">Title</label>
                <Input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Announcement title..." />
              </div>
              <div>
                <label className="text-sm font-normal text-muted-foreground mb-1.5 block">Content</label>
                <textarea
                  value={annContent}
                  onChange={e => setAnnContent(e.target.value)}
                  placeholder="Write your announcement..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none"
                />
              </div>
              <Button onClick={postAnnouncement} className="w-full gradient-bg-primary text-white font-semibold">
                Post Announcement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
