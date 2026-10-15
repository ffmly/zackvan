'use client';

import dynamic from 'next/dynamic';
import type { MapViewProps } from './types';
import { useLanguage } from '@/lib/i18n';

const AlgeriaMap = dynamic(() => import('./AlgeriaMap'), {
  ssr: false,
  loading: () => <MapLoading />,
});

export default function MapClient(props: MapViewProps) {
  return <AlgeriaMap {...props} />;
}

function MapLoading() {
  const { t } = useLanguage();
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-200">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
        <p className="text-xs font-medium text-slate-500">{t('map.loading')}</p>
      </div>
    </div>
  );
}
