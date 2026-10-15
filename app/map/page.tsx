'use client';

import { List, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import LocationDrawer from '@/components/map/LocationDrawer';
import MapClient from '@/components/map/MapClient';
import { Input } from '@/components/ui/form';
import { LOCATION_TYPES, type LocationType, type MapLocation } from '@/lib/types';
import { listMapLocations } from '@/lib/services/locations';
import { LOCATION_TYPE_META, WATER_META } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

type TypeFilter = LocationType | 'all';

export default function MapPage() {
  const { t } = useLanguage();
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    listMapLocations()
      .then(setLocations)
      .catch(() =>
        setError(t('map.error')),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let items = locations;
    if (typeFilter !== 'all') items = items.filter((l) => l.type === typeFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.wilaya.toLowerCase().includes(q),
      );
    }
    return items;
  }, [locations, typeFilter, search]);

  const selected = locations.find((l) => l.id === selectedId) ?? null;

  function select(loc: MapLocation) {
    setSelectedId(loc.id);
    setListOpen(false);
  }

  const counts = useMemo(() => {
    const map = new Map<LocationType, number>();
    for (const l of locations) {
      map.set(l.type, (map.get(l.type) ?? 0) + 1);
    }
    return map;
  }, [locations]);

  return (
    <div className="relative flex h-[calc(100vh-4rem)] overflow-hidden">
      <aside
        className={cn(
          'absolute inset-y-0 left-0 z-[40] flex w-80 max-w-full flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0',
          listOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="space-y-3 border-b border-slate-100 p-4">
          <h1 className="text-lg font-bold text-slate-900">
            {t('map.title')}
          </h1>
          <Input
            placeholder={t('map.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition',
                typeFilter === 'all'
                  ? 'bg-brand-300 text-slate-900 ring-brand-300'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
              )}
            >
              {t('map.all')} ({locations.length})
            </button>
            {LOCATION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition',
                  typeFilter === type
                    ? 'text-slate-900 ring-brand-300'
                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                )}
                style={
                  typeFilter === type
                    ? { backgroundColor: LOCATION_TYPE_META[type].hex }
                    : undefined
                }
              >
                <span
                  className={cn('h-2 w-2 rounded-full', LOCATION_TYPE_META[type].dotClass)}
                  style={typeFilter === type ? { backgroundColor: '#fcf9f2' } : undefined}
                />
                {locationTypeLabel(type, (key) => t(key))} ({counts.get(type) ?? 0})
              </button>
            ))}
          </div>
        </div>

        <div className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto p-3">
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-slate-100"
              />
            ))}

          {!loading && filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-slate-400">
              {t('map.noMatch')}
            </p>
          )}

          {filtered.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => select(loc)}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition',
                selectedId === loc.id
                  ? 'border-brand-300 bg-brand-50'
                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-snug text-slate-900">
                  {loc.name}
                </p>
                <span
                  className={cn(
                    'mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full',
                    LOCATION_TYPE_META[loc.type].dotClass,
                  )}
                />
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" /> {loc.wilaya}
                <span className="mx-1">·</span>
                <DropletsLabel water={loc.water} />
              </p>
            </button>
          ))}
        </div>
      </aside>

      <div className="relative flex-1">
        {listOpen && (
          <div
            className="absolute inset-0 z-30 bg-brand-900/30 lg:hidden"
            onClick={() => setListOpen(false)}
          />
        )}
        <button
          type="button"
          onClick={() => setListOpen((v) => !v)}
          className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-lg lg:hidden"
        >
          <List className="h-4 w-4" /> {t('map.locations')}
        </button>

        {error && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-full items-center justify-center bg-slate-200">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
          </div>
        ) : (
          <MapClient
            locations={filtered}
            selectedId={selectedId}
            onSelect={select}
            interactive
            className="h-full w-full"
          />
        )}
      </div>

      <LocationDrawer location={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function locationTypeLabel(type: LocationType, translate: (key: 'map.park' | 'map.forest' | 'map.campsite') => string) {
  if (type === 'national_park') return translate('map.park');
  if (type === 'forest') return translate('map.forest');
  return translate('map.campsite');
}

function DropletsLabel({ water }: { water: MapLocation['water'] }) {
  return (
    <span className={WATER_META[water].iconClass}>
      {WATER_META[water].shortLabel}
    </span>
  );
}
