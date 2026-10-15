'use client';

import { RequireAuth } from '@/lib/auth-context';
import AdminDashboard from '@/components/dashboard/AdminDashboard';

export default function AdminDashboardPage() {
  return <RequireAuth roles={['admin']}><AdminDashboard /></RequireAuth>;
}
