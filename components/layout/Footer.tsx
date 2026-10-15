'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function Footer() {
  const { t } = useLanguage();

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
            {t('footer.description')}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
            {t('footer.explore')}
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-500">
            <li><Link href="/caravans" className="hover:text-brand-700">{t('footer.browse')}</Link></li>
            <li><Link href="/map" className="hover:text-brand-700">{t('footer.map')}</Link></li>
            <li><Link href="/dashboard" className="hover:text-brand-700">{t('footer.owner')}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">
            {t('footer.trust')}
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-500">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              {t('footer.contract')}
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              {t('footer.verified')}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-4">
        <p className="mx-auto max-w-7xl text-xs leading-relaxed text-slate-400 sm:px-6">
          © {new Date().getFullYear()} Zackvan Algeria. {t('footer.copyright')}
        </p>
      </div>
    </footer>
  );
}
