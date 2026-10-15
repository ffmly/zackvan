'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  BedDouble,
  Droplets,
  FileSignature,
  MapPin,
  Phone,
  ShowerHead,
  Sun,
  Users,
  UtensilsCrossed,
  Wind,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import BookingPanel from '@/components/caravans/BookingPanel';
import CaravanGallery from '@/components/caravans/CaravanGallery';
import { useAuth } from '@/lib/auth-context';
import type { AvailabilityRange, Caravan } from '@/lib/types';
import { getActiveBookingRanges } from '@/lib/services/bookings';
import { getCaravan } from '@/lib/services/caravans';
import { CARAVAN_TYPES } from '@/lib/types';
import { EXTRA_FEATURES } from '@/lib/constants';
import { formatDZD } from '@/lib/utils';

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-xl font-bold text-slate-900">Caravan not found</h1>
      <p className="mt-2 text-sm text-slate-500">
        This listing may have been removed or is not published yet.
      </p>
      <Link href="/caravans" className="mt-6 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
        Back to search
      </Link>
    </div>
  );
}

export default function CaravanDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [caravan, setCaravan] = useState<Caravan | null>(null);
  const [activeRanges, setActiveRanges] = useState<AvailabilityRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    setLoading(true);
    getCaravan(params.id)
      .then(async (c) => {
        if (cancelled) return;
        if (!c) {
          setNotFound(true);
          return;
        }
        setCaravan(c);
        try {
          const ranges = await getActiveBookingRanges(c.id);
          if (!cancelled) setActiveRanges(ranges);
        } catch {
          if (!cancelled) setActiveRanges([]);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
      </div>
    );
  }

  if (notFound || !caravan) return <NotFound />;

  const specs: { icon: typeof Users; label: string; value: string; show: boolean }[] = [
    { icon: Users, label: 'Sleeps', value: `${caravan.specs.capacity} guests`, show: true },
    { icon: BedDouble, label: 'Beds', value: `${caravan.specs.beds}`, show: true },
    { icon: Droplets, label: 'Water tank', value: `${caravan.specs.waterTankL ?? '—'} L`, show: true },
    { icon: Zap, label: 'Solar', value: caravan.specs.solarPanelW ? `${caravan.specs.solarPanelW} W` : '—', show: true },
    { icon: ShowerHead, label: 'Bathroom', value: caravan.specs.hasBathroom ? 'Onboard' : '—', show: true },
    { icon: UtensilsCrossed, label: 'Kitchen', value: caravan.specs.hasKitchen ? 'Equipped' : '—', show: true },
    { icon: Wind, label: 'A/C', value: caravan.specs.hasAC ? 'Yes' : '—', show: true },
    { icon: Sun, label: 'Type', value: CARAVAN_TYPES.find((t) => t.value === caravan.type)?.label.split(' ')[0] ?? '—', show: true },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link
        href="/caravans"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to results
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div>
          <CaravanGallery images={caravan.images} title={caravan.title} />

          <div className="mt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {caravan.title}
                </h1>
                <p className="mt-1.5 flex items-center gap-1.5 text-slate-500">
                  <MapPin className="h-4 w-4" />
                  {caravan.wilaya}
                  {caravan.commune ? ` — ${caravan.commune}` : ''}
                  <span className="mx-1 text-slate-300">·</span>
                  {formatDZD(caravan.pricePerDay)} / day
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {specs.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Icon className="h-5 w-5 text-brand-600" />
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                  </p>
                  <p className="text-sm font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </div>

            {caravan.extras.length > 0 && (
              <div className="mt-6">
                <h2 className="font-bold text-slate-900">Extra equipment</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {caravan.extras.map((extra) => (
                    <span
                      key={extra}
                      className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200"
                    >
                      {EXTRA_FEATURES.includes(extra) ? extra : extra}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8">
              <h2 className="font-bold text-slate-900">About this caravan</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-600">
                {caravan.description || 'The owner has not added a description yet.'}
              </p>
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <div>
                <p className="text-sm font-semibold text-brand-900">
                  Protected by Zackvan electronic contracts
                </p>
                <p className="mt-1 text-xs leading-relaxed text-brand-800">
                  When you request this caravan you will sign a binding digital
                  rental agreement. The contract records your identity, the exact
                  time, and your acceptance of the liability terms — protecting
                  both you and the owner.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
          <BookingPanel caravan={caravan} user={user} activeRanges={activeRanges} />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-base font-bold text-brand-800">
                {caravan.ownerName.charAt(0).toUpperCase()}
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Owner
                </p>
                <p className="font-bold text-slate-900">{caravan.ownerName}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Phone className="h-4 w-4 text-slate-400" />
              Contact details are confirmed in the signed contract.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
