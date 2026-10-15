import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand-100">
              <Image src="/icon.png" alt="Zackvan" width={36} height={36} className="h-full w-full object-cover" />
            </span>
            <span className="text-lg font-bold text-slate-900">
              Zackvan <span className="text-brand-700">Algeria</span>
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            Algeria&apos;s caravan rental marketplace with a built-in tourism map
            of national parks, forests, and safe camping spots.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
            Explore
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-500">
            <li><Link href="/caravans" className="hover:text-brand-700">Browse caravans</Link></li>
            <li><Link href="/map" className="hover:text-brand-700">Interactive nature map</Link></li>
            <li><Link href="/dashboard" className="hover:text-brand-700">Owner dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
            Trust & Safety
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-500">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              Every booking is sealed with a binding electronic contract.
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              Listings verified across all 58 wilayas.
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-4">
        <p className="mx-auto max-w-7xl text-xs leading-relaxed text-slate-400 sm:px-6">
          © {new Date().getFullYear()} Zackvan Algeria. Zackvan facilitates digital
          contracting between owners and renters; payments are settled directly
          between the parties and no funds are held by the platform.
        </p>
      </div>
    </footer>
  );
}
