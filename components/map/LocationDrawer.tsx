'use client';

import Link from 'next/link';
import {
  CalendarClock,
  Droplets,
  Lightbulb,
  Mountain,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { LOCATION_TYPE_META, WATER_META } from '@/lib/constants';
import type { MapLocation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

export default function LocationDrawer({
  location,
  onClose,
}: {
  location: MapLocation | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!location) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [location, onClose]);

  const meta = location ? LOCATION_TYPE_META[location.type] : null;
  const water = location ? WATER_META[location.water] : null;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-slate-900/40 transition-opacity duration-300 lg:hidden',
          location ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[65] flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out',
          location ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!location}
      >
        {location && meta && water && (
          <>
            <div
              className="relative shrink-0 p-5"
              style={{
                background: '#dbc8a3',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg bg-white/20 p-1.5 text-white transition hover:bg-white/30"
                aria-label={t('map.close')}
              >
                <X className="h-5 w-5" />
              </button>
              <span className="inline-block rounded-full bg-white/25 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                {meta.label}
              </span>
              <h2 className="mt-3 pr-10 text-xl font-bold leading-snug text-white">
                {location.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
                {location.wilaya} Wilaya · {location.geo.lat.toFixed(2)}°N,
                {' '}
                {location.geo.lng.toFixed(2)}°E
              </p>
            </div>

            <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-5">
              <p className="text-sm leading-relaxed text-slate-600">
                {location.description}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <Mountain className="h-3.5 w-3.5" /> {t('map.terrain')}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {location.terrain}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <Droplets className={cn('h-3.5 w-3.5', water.iconClass)} /> {t('map.water')}
                  </p>
                  <p className={cn('mt-1 text-sm font-medium', water.iconClass)}>
                    {water.shortLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{water.label}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">{t('map.safety')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    {location.safetyNotes}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-slate-900">{t('map.tips')}</p>
                <ul className="space-y-2">
                  {location.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      <span className="text-sm leading-relaxed text-slate-600">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" />
                {t('map.bestSeason')}: <strong className="text-slate-800">{location.bestSeason}</strong>
              </p>
            </div>

            <div className="shrink-0 border-t border-slate-100 p-4">
              <Link
                href={`/caravans?wilaya=${encodeURIComponent(location.wilaya)}`}
                onClick={onClose}
                className="block w-full rounded-lg bg-brand-700 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                {t('map.findCaravans', { wilaya: location.wilaya })}
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
