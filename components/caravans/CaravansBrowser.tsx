'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CaravanCard, { CaravanCardSkeleton } from '@/components/caravans/CaravanCard';
import Button from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/form';
import { CARAVAN_TYPES, type Caravan, type CaravanType } from '@/lib/types';
import { listCaravans } from '@/lib/services/caravans';
import { WILAYAS } from '@/lib/constants';
import { dateInputToMs } from '@/lib/utils';

export interface FilterState {
  q: string;
  wilaya: string;
  minPrice: string;
  maxPrice: string;
  guests: string;
  type: CaravanType | '';
  start: string;
  end: string;
}

const EMPTY_FILTERS: FilterState = {
  q: '',
  wilaya: '',
  minPrice: '',
  maxPrice: '',
  guests: '',
  type: '',
  start: '',
  end: '',
};

function parseFilters(params: URLSearchParams): FilterState {
  const get = (k: string) => params.get(k) ?? '';
  return {
    q: get('q'),
    wilaya: get('wilaya'),
    minPrice: get('minPrice'),
    maxPrice: get('maxPrice'),
    guests: get('guests'),
    type: (get('type') as CaravanType) || '',
    start: get('start'),
    end: get('end'),
  };
}

function serialize(filters: FilterState): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export default function CaravansBrowser() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() =>
    parseFilters(new URLSearchParams(searchParams.toString())),
  );
  const [caravans, setCaravans] = useState<Caravan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const currentQS = useMemo(
    () => serialize(filters).replace(/^\?/, ''),
    [filters],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      window.history.replaceState(null, '', `/caravans${serialize(filters)}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    const incoming = searchParams.toString();
    if (
      incoming !== currentQS &&
      incoming !== '' &&
      Object.keys(parseFilters(searchParams)).some((k) => {
        return (searchParams.get(k) ?? '') !== '';
      })
    ) {
      setFilters(parseFilters(searchParams));
    }
  }, [searchParams, currentQS]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const startMs = dateInputToMs(filters.start);
    const endMs = dateInputToMs(filters.end);

    listCaravans({
      q: filters.q || undefined,
      wilaya: filters.wilaya || undefined,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      guests: filters.guests ? Number(filters.guests) : undefined,
      type: filters.type || undefined,
      startDate: startMs && endMs ? startMs : undefined,
      endDate: startMs && endMs ? endMs : undefined,
    })
      .then((items) => {
        if (!cancelled) setCaravans(items);
      })
      .catch(() => {
        if (!cancelled) setCaravans([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentQS]);

  const sorted = useMemo(() => {
    const copy = [...caravans];
    if (sort === 'price_asc') copy.sort((a, b) => a.pricePerDay - b.pricePerDay);
    if (sort === 'price_desc') copy.sort((a, b) => b.pricePerDay - a.pricePerDay);
    return copy;
  }, [caravans, sort]);

  const update = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const activeCount = Object.values(filters).filter(Boolean).length;

  const filterPanel = (
    <div className="space-y-5">
      <Field label="Keyword" htmlFor="f-q">
        <Input
          id="f-q"
          placeholder="e.g. solar, family, desert…"
          value={filters.q}
          onChange={(e) => update('q', e.target.value)}
        />
      </Field>

      <Field label="Wilaya" htmlFor="f-wilaya">
        <Select
          id="f-wilaya"
          value={filters.wilaya}
          onChange={(e) => update('wilaya', e.target.value)}
        >
          <option value="">All wilayas</option>
          {WILAYAS.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Min price (DA)" htmlFor="f-min">
          <Input
            id="f-min"
            type="number"
            min={0}
            placeholder="0"
            value={filters.minPrice}
            onChange={(e) => update('minPrice', e.target.value)}
          />
        </Field>
        <Field label="Max price (DA)" htmlFor="f-max">
          <Input
            id="f-max"
            type="number"
            min={0}
            placeholder="Any"
            value={filters.maxPrice}
            onChange={(e) => update('maxPrice', e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Guests" htmlFor="f-guests">
          <Input
            id="f-guests"
            type="number"
            min={1}
            max={12}
            placeholder="Any"
            value={filters.guests}
            onChange={(e) => update('guests', e.target.value)}
          />
        </Field>
        <Field label="Type" htmlFor="f-type">
          <Select
            id="f-type"
            value={filters.type}
            onChange={(e) => update('type', e.target.value as CaravanType | '')}
          >
            <option value="">All types</option>
            {CARAVAN_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Available from" htmlFor="f-start">
          <Input
            id="f-start"
            type="date"
            value={filters.start}
            onChange={(e) => update('start', e.target.value)}
          />
        </Field>
        <Field label="Until" htmlFor="f-end">
          <Input
            id="f-end"
            type="date"
            value={filters.end}
            onChange={(e) => update('end', e.target.value)}
          />
        </Field>
      </div>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
          <X className="h-3.5 w-3.5" /> Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Browse caravans
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? 'Searching listings…'
              : `${sorted.length} caravan${sorted.length === 1 ? '' : 's'} available`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileFiltersOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="w-auto"
            aria-label="Sort results"
          >
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </Select>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="sticky top-24 hidden h-fit w-72 shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </h2>
          {filterPanel}
        </aside>

        {mobileFiltersOpen && (
          <div className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-white p-5 shadow-2xl lg:hidden">
            {filterPanel}
            <Button className="mt-6 w-full" onClick={() => setMobileFiltersOpen(false)}>
              Show {sorted.length} results
            </Button>
          </div>
        )}

        <div className="flex-1">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CaravanCardSkeleton key={i} />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
              <Search className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">No caravans match your filters</p>
              <p className="mt-1 text-sm text-slate-500">
                Try widening the dates or clearing some criteria.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {sorted.map((c) => (
                <CaravanCard key={c.id} caravan={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
