'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RequireAuth, useAuth } from '@/lib/auth-context';
import CaravanForm from '@/components/dashboard/CaravanForm';
import { getCaravan } from '@/lib/services/caravans';
import type { Caravan } from '@/lib/types';

function EditCaravanContent() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [caravan, setCaravan] = useState<Caravan | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!params?.id || !user) return;
    let cancelled = false;
    getCaravan(params.id)
      .then((c) => {
        if (cancelled) return;
        if (!c || (c.ownerId !== user.uid && user.role !== 'admin')) {
          setDenied(true);
          return;
        }
        setCaravan(c);
      })
      .catch(() => {
        if (!cancelled) setDenied(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params?.id, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
      </div>
    );
  }

  if (denied || !caravan) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-slate-900">Listing unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">
          This caravan does not exist or you are not allowed to edit it.
        </p>
      </div>
    );
  }

  return <CaravanForm existing={caravan} />;
}

export default function EditCaravanPage() {
  return (
    <RequireAuth roles={['owner', 'admin']}>
      <EditCaravanContent />
    </RequireAuth>
  );
}
