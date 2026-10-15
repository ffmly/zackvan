import Image from 'next/image';
import Link from 'next/link';
import { Droplets, MapPin, Star, Users, Zap } from 'lucide-react';
import type { Caravan } from '@/lib/types';
import { formatDZD } from '@/lib/utils';
import { CARAVAN_TYPES } from '@/lib/types';

const TYPE_SHORT: Record<Caravan['type'], string> = Object.fromEntries(
  CARAVAN_TYPES.map((t) => [t.value, t.label.split(' ')[0]]),
) as Record<Caravan['type'], string>;

export default function CaravanCard({ caravan }: { caravan: Caravan }) {
  const cover = caravan.images[0]?.url;

  return (
    <Link
      href={`/caravans/${caravan.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {cover ? (
          <Image
            src={cover}
            alt={caravan.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            No photo yet
          </div>
        )}
        <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-brand-800 shadow">
          {formatDZD(caravan.pricePerDay)}
          <span className="text-xs font-medium text-slate-500"> /day</span>
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] font-semibold text-white">
          {TYPE_SHORT[caravan.type]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold text-slate-900 group-hover:text-brand-700">
            {caravan.title}
          </h3>
        </div>
        <p className="flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="h-4 w-4 shrink-0" />
          {caravan.wilaya}
          {caravan.commune ? ` — ${caravan.commune}` : ''}
        </p>
        <div className="mt-auto flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-400" />
            {caravan.specs.capacity} guests
          </span>
          {caravan.specs.waterTankL ? (
            <span className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-sky-400" />
              {caravan.specs.waterTankL} L
            </span>
          ) : null}
          {caravan.specs.solarPanelW ? (
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-400" />
              {caravan.specs.solarPanelW} W solar
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function CaravanCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="aspect-[4/3] w-full animate-pulse bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

export function RatingStars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-1 text-sm font-semibold text-slate-700">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      {value.toFixed(1)}
    </span>
  );
}
