'use client';

import { RequireAuth } from '@/lib/auth-context';
import CaravanForm from '@/components/dashboard/CaravanForm';

export default function NewCaravanPage() {
  return (
    <RequireAuth roles={['owner', 'admin']}>
      <CaravanForm />
    </RequireAuth>
  );
}
