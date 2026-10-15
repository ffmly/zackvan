import { Suspense } from 'react';
import CaravansBrowser from '@/components/caravans/CaravansBrowser';

export const metadata = {
  title: 'Browse Caravans',
};

export default function CaravansPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
        </div>
      }
    >
      <CaravansBrowser />
    </Suspense>
  );
}
