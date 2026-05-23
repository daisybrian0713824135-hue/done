import type { ReactElement } from 'react';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import TasksPage from '@/pages/dashboard/TasksPage';
import EarningsPage from '@/pages/dashboard/EarningsPage';
import ReferralsPage from '@/pages/dashboard/ReferralsPage';
import WithdrawalsPage from '@/pages/dashboard/WithdrawalsPage';
import PackagesPage from '@/pages/dashboard/PackagesPage';
import AccountPage from '@/pages/dashboard/AccountPage';
import AdminPage from '@/pages/admin/AdminPage';

export interface RouteConfig {
  path: string;
  element: ReactElement;
  label?: string;
}

export const routes: RouteConfig[] = [
  { path: '/', element: <HomePage />, label: 'Home' },
  { path: '/login', element: <LoginPage />, label: 'Login' },
  { path: '/register', element: <RegisterPage />, label: 'Register' },
  { path: '/dashboard', element: <DashboardPage />, label: 'Dashboard' },
  { path: '/dashboard/tasks', element: <TasksPage />, label: 'Tasks' },
  { path: '/dashboard/earnings', element: <EarningsPage />, label: 'Earnings' },
  { path: '/dashboard/referrals', element: <ReferralsPage />, label: 'Referrals' },
  { path: '/dashboard/withdrawals', element: <WithdrawalsPage />, label: 'Withdrawals' },
  { path: '/dashboard/packages', element: <PackagesPage />, label: 'Packages' },
  { path: '/dashboard/account', element: <AccountPage />, label: 'Account' },
  { path: '/admin', element: <AdminPage />, label: 'Admin' },
];
