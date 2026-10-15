'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowRight,
  CalendarDays,
  Compass,
  FileSignature,
  MapPin,
  Search,
  ShieldCheck,
  Caravan as VanIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import CaravanCard, { CaravanCardSkeleton } from '@/components/caravans/CaravanCard';
import MapClient from '@/components/map/MapClient';
import { Input, Select } from '@/components/ui/form';
import { listCaravans } from '@/lib/services/caravans';
import { listMapLocations } from '@/lib/services/locations';
import { WILAYAS } from '@/lib/constants';
import type { Caravan, MapLocation } from '@/lib/types';

const STEPS = [
  {
    icon: Search,
    title: 'Find your caravan',
    body: 'Filter by wilaya, dates, capacity, and equipment — solar panels, water tanks, bathrooms.',
  },
  {
    icon: FileSignature,
    title: 'Sign the e-contract',
    body: 'A binding digital agreement protects both sides: clear terms, zero cash surprises.',
  },
  {
    icon: Compass,
    title: 'Hit the road',
    body: 'Use our nature map to plan national parks, forests, and safe campsites along the way.',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [featured, setFeatured] = useState<Caravan[]>([]);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [wilaya, setWilaya] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    Promise.all([listCaravans(), listMapLocations()])
      .then(([caravans, locs]) => {
        setFeatured(caravans.slice(0, 6));
        setLocations(locs);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (wilaya) params.set('wilaya', wilaya);
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    router.push(`/caravans${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <div>
      <section className="relative overflow-hidden bg-brand-300">
        <div className="pointer-events-none absolute inset-0 bg-white/10" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-20">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-900 backdrop-blur">
              <VanIcon className="h-4 w-4" /> 58 wilayas · One platform
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Rent a caravan.
              <br />
              Discover Algeria&apos;s wild side.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-800">
              From the Djurdjura cedars to the Tassili dunes — book vetted
              caravans with binding digital contracts, and explore every national
              park and safe campsite on our interactive map.
            </p>

            <form
              onSubmit={handleSearch}
              className="mt-8 grid gap-3 rounded-2xl bg-white p-3 shadow-2xl sm:grid-cols-[1.2fr_1fr_1fr_auto]"
            >
              <label className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Select
                  value={wilaya}
                  onChange={(e) => setWilaya(e.target.value)}
                  className="pl-9"
                >
                  <option value="">All wilayas</option>
                  {WILAYAS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </Select>
              </label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Pickup date" />
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Return date" />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-6 py-2 font-semibold text-white transition hover:bg-brand-800"
              >
                <Search className="h-4 w-4" /> Search
              </button>
            </form>
          </div>

          <div className="relative hidden min-h-[430px] lg:block" aria-label="Zackvan caravan illustration">
            <div className="absolute right-4 top-4 h-20 w-20 rounded-full border-8 border-white/60" />
            <div className="absolute bottom-8 left-2 h-28 w-28 rounded-full border border-brand-400/70 bg-brand-200/60" />
            <div className="absolute right-10 top-24 h-3 w-3 rounded-full bg-brand-700" />
            <div className="absolute left-12 top-16 h-2 w-2 rounded-full bg-white" />
            <div className="relative flex h-full min-h-[430px] items-center justify-center rounded-[2.5rem] border border-white/70 bg-white/45 p-5 shadow-2xl shadow-brand-800/10 backdrop-blur-sm">
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2rem] border border-brand-200/80 bg-brand-50/80">
                <Image
                  src="/icon.png"
                  alt="Zackvan camper van ready for an Algerian road trip"
                  fill
                  priority
                  sizes="(min-width: 1024px) 42vw, 0px"
                  className="object-contain p-2 transition duration-700 ease-out hover:scale-[1.03]"
                />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-lg backdrop-blur">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-800">Road-ready stays</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">Your next wild weekend starts here.</p>
                  </div>
                  <VanIcon className="h-7 w-7 shrink-0 text-brand-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-slate-100 px-4 py-8 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
          {[
            ['Binding e-contracts', 'Every booking sealed with legal liability terms'],
            ['Direct owner contact', 'No middlemen fees on your rental price'],
            ['Curated nature map', 'Parks, forests & safe camping verified'],
          ].map(([title, sub]) => (
            <div key={title} className="flex items-center gap-4 px-2 py-4 sm:justify-center">
              <ShieldCheck className="h-9 w-9 shrink-0 text-brand-600" />
              <div>
                <p className="font-bold text-slate-900">{title}</p>
                <p className="text-sm text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Featured caravans
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ready-to-roll homes across the country
            </p>
          </div>
          <Link href="/caravans" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800 sm:flex">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CaravanCardSkeleton key={i} />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <VanIcon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">No caravans listed yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Be the first — list your caravan and reach travelers nationwide.
            </p>
            <Link href="/dashboard/caravans/new" className="mt-4 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
              List my caravan
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <CaravanCard key={c.id} caravan={c} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-brand-50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-300 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-900">
              <Compass className="h-3.5 w-3.5" /> Interactive map
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
              Plan every stop before you leave
            </h2>
            <p className="mt-3 leading-relaxed text-slate-700">
              Tap any marker to see terrain type, water availability, safety
              notes, and tips from fellow travelers for Algeria&apos;s national
              parks, forests, and trusted camping spots.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Tassili n'Ajjer, Ahaggar, Djurdjura, Chréa…",
                'Water sources & seasonal warnings per location',
                'One tap to find caravans in the same wilaya',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href="/map"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-300 px-6 py-3 font-semibold text-slate-900 transition hover:bg-brand-400"
            >
              Open the full map <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-brand-200 bg-brand-100 shadow-xl ring-1 ring-brand-200">
            {!loading && locations.length > 0 && (
              <MapClient
                locations={locations}
                interactive={false}
                className="h-[380px] w-full"
              />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          How Zackvan works
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-700 px-3 py-1 text-xs font-bold text-white">
                Step {i + 1}
              </span>
              <step.icon className="mx-auto h-9 w-9 text-brand-600" />
              <h3 className="mt-4 font-bold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl bg-brand-300 px-8 py-10 text-center">
          <h3 className="text-2xl font-bold text-white">Own a caravan?</h3>
          <p className="mx-auto mt-2 max-w-lg text-slate-800">
            Turn idle months into income. List in minutes, manage bookings, and
            rent with legally binding contracts.
          </p>
          <Link
            href="/register?role=owner"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-800 transition hover:bg-brand-50"
          >
            Start listing <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
