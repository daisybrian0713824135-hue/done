import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PACKAGE_CONFIG } from '@/types/types';
import { User, Mail, Phone, AtSign, Package, Calendar, Shield, Edit, CheckCircle } from 'lucide-react';

const schema = z.object({
  full_name: z.string().min(2, 'At least 2 characters'),
  location: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function AccountPage() {
  const { profile, refreshProfile, isActive } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: profile?.full_name || '', location: profile?.location || '' },
  });

  const onSubmit = async (data: FormData) => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: data.full_name, location: data.location || null }).eq('id', profile.id);
    if (!error) { await refreshProfile(); toast.success('Profile updated!'); setEditing(false); }
    else toast.error('Update failed: ' + error.message);
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-balance">Account</h1>
          <p className="text-muted-foreground text-sm text-pretty mt-1">Manage your profile and account settings</p>
        </div>

        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="gradient-bg-primary p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold shrink-0">
                  {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-balance text-white">{profile?.full_name}</h2>
                  <p className="text-white/70 text-sm">{profile?.phone}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-green-400/20 text-green-100' : 'bg-yellow-400/20 text-yellow-100'}`}>
                      {isActive ? '✓ Active' : '⚠ Inactive'}
                    </span>
                    {profile?.current_package && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
                        {PACKAGE_CONFIG[profile.current_package].label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: User, label: 'Full Name', value: profile?.full_name || '-' },
                  { icon: AtSign, label: 'Username', value: profile?.username || 'Not set' },
                  { icon: Phone, label: 'Phone', value: profile?.phone || '-' },
                  { icon: Mail, label: 'Email', value: profile?.email || 'Not set' },
                  { icon: Package, label: 'Package', value: profile?.current_package ? PACKAGE_CONFIG[profile.current_package].label : 'None' },
                  { icon: Calendar, label: 'Joined', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-' },
                  { icon: Calendar, label: 'Activation Date', value: profile?.activation_date ? new Date(profile.activation_date).toLocaleDateString() : 'Not activated' },
                  { icon: Shield, label: 'Package Expiry', value: profile?.package_expiry ? new Date(profile.package_expiry).toLocaleDateString() : 'N/A' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                    <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={() => setEditing(!editing)} variant="outline" className="mt-4">
                <Edit className="h-4 w-4 mr-2" /> {editing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Edit form */}
        {editing && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold mb-4">Edit Profile</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="full_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl><Input placeholder="e.g. Nairobi" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={saving} className="gradient-bg-primary text-white font-semibold">
                    {saving ? 'Saving...' : <><CheckCircle className="h-4 w-4 mr-2" />Save Changes</>}
                  </Button>
                </form>
              </Form>
            </div>
          </motion.div>
        )}

        {/* Referral code */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-3">Referral Code</h3>
          <div className="flex items-center gap-3">
            <div className="bg-muted rounded-xl px-4 py-2 font-mono font-bold text-primary text-lg tracking-widest">
              {profile?.referral_code || '--------'}
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(profile?.referral_code || '');
              toast.success('Copied!');
            }}>Copy</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
