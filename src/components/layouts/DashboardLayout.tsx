import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, ClipboardList, DollarSign, Users, Wallet,
  Package, Settings, LogOut, Menu, Zap, Bell, Sun, Moon,
  ChevronRight, ShieldCheck, TrendingUp, X
} from 'lucide-react';
import type { ReactNode } from 'react';
import { PACKAGE_CONFIG } from '@/types/types';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/tasks', label: 'Tasks', icon: ClipboardList },
  { path: '/dashboard/earnings', label: 'Earnings', icon: TrendingUp },
  { path: '/dashboard/referrals', label: 'Referrals', icon: Users },
  { path: '/dashboard/withdrawals', label: 'Withdrawals', icon: Wallet },
  { path: '/dashboard/packages', label: 'Packages', icon: Package },
  { path: '/dashboard/account', label: 'Account', icon: Settings },
];

const adminNavItems = [
  { path: '/admin', label: 'Admin Panel', icon: ShieldCheck },
];

interface Props { children: ReactNode; }

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isAdmin, isActive } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl gradient-bg-primary shadow-md shrink-0">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-lg text-sidebar-foreground">MetaPay</span>
          {profile?.current_package && (
            <div className="flex items-center gap-1">
              <span className={`text-xs font-medium ${PACKAGE_CONFIG[profile.current_package].color}`}>
                {PACKAGE_CONFIG[profile.current_package].label}
              </span>
            </div>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-sidebar-foreground/60 hover:text-sidebar-foreground md:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="gradient-bg-primary text-white font-semibold text-sm">
              {(profile?.full_name || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-sidebar-foreground truncate">{profile?.full_name || 'User'}</p>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-green-400' : 'bg-yellow-400'}`} />
              <span className="text-xs text-sidebar-foreground/70 truncate">
                {isActive ? 'Active' : 'Inactive — Activate now'}
              </span>
            </div>
          </div>
        </div>
        {!isActive && (
          <Link to="/dashboard/packages" onClick={onClose}>
            <div className="mt-3 px-3 py-2 rounded-lg bg-primary/20 border border-primary/30 text-xs text-primary font-medium flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span>Activate your account</span>
              <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0" />
            </div>
          </Link>
        )}
      </div>

      {/* Balance */}
      {isActive && (
        <div className="px-5 py-3 border-b border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60 mb-0.5">Wallet Balance</p>
          <p className="text-xl font-bold text-sidebar-foreground">
            KES {(profile?.withdrawal_balance || 0).toLocaleString()}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(item => {
          const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link key={item.path} to={item.path} onClick={onClose}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`}>
                <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: '1.125rem', height: '1.125rem' }} />
                <span className="text-sm">{item.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 ml-auto text-sidebar-primary" />}
              </div>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Admin</p>
            </div>
            {adminNavItems.map(item => {
              const active = location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path} onClick={onClose}>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`}>
                    <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: '1.125rem', height: '1.125rem' }} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Sign Out</span>
        </Button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: Props) {
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border fixed top-0 left-0 h-full z-30">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 lg:ml-64 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 md:px-6 h-14 flex items-center gap-3">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar" aria-label="Navigation menu">
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1 min-w-0" />

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/notifications')}
              className="text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-4.5 w-4.5" />
            </Button>
            <div className="flex items-center gap-2 ml-1">
              <Avatar className="h-8 w-8 cursor-pointer" onClick={() => navigate('/dashboard/account')}>
                <AvatarFallback className="gradient-bg-primary text-white text-xs font-semibold">
                  {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-sm font-medium text-foreground truncate max-w-[120px]">
                {profile?.full_name || 'User'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-x-hidden"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}

// HOC to wrap any page with the dashboard layout
export function withDashboardLayout<T extends object>(Component: React.ComponentType<T>) {
  return function WrappedComponent(props: T) {
    return (
      <DashboardLayout>
        <Component {...props} />
      </DashboardLayout>
    );
  };
}
