'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Tent, UserRound, Caravan } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/form';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';
import { useLanguage } from '@/lib/i18n';

const ROLE_CARDS: { role: UserRole; icon: typeof Caravan; titleKey: 'register.renterTitle' | 'register.ownerTitle'; descKey: 'register.renterBody' | 'register.ownerBody' }[] = [
  {
    role: 'renter',
    icon: Tent,
    titleKey: 'register.renterTitle',
    descKey: 'register.renterBody',
  },
  {
    role: 'owner',
    icon: Caravan,
    titleKey: 'register.ownerTitle',
    descKey: 'register.ownerBody',
  },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUpEmail, signInWithGoogle } = useAuth();
  const { t } = useLanguage();

  const initialRole = (searchParams.get('role') === 'owner' ? 'owner' : 'renter') as UserRole;

  const [role, setRole] = useState<UserRole>(initialRole);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUpEmail({ displayName, email, password, phone, role });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white">
          <UserRound className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">{t('register.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('register.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            {t('register.joinAs')}
          </legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_CARDS.map((card) => (
              <button
                key={card.role}
                type="button"
                onClick={() => setRole(card.role)}
                className={cn(
                  'rounded-xl border-2 p-3 text-left transition',
                  role === card.role
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-slate-200 hover:border-slate-300',
                )}
              >
                <card.icon
                  className={cn(
                    'h-5 w-5',
                    role === card.role ? 'text-brand-700' : 'text-slate-400',
                  )}
                />
                <p className="mt-2 text-sm font-bold text-slate-900">{t(card.titleKey)}</p>
                <p className="mt-0.5 text-xs text-slate-500">{t(card.descKey)}</p>
              </button>
            ))}
          </div>
        </fieldset>

        <Field label={t('register.fullName')} htmlFor="name" required>
          <Input
            id="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Amine Benali"
            autoComplete="name"
          />
        </Field>
        <Field label={t('auth.email')} htmlFor="reg-email" required>
          <Input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label={t('register.phone')} htmlFor="phone" hint={t('register.phoneHint')}>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+213 …"
            autoComplete="tel"
          />
        </Field>
        <Field label={t('auth.password')} htmlFor="reg-password" required>
          <Input
            id="reg-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          {t('register.createAs', { role: role === 'owner' ? t('register.ownerTitle') : t('register.renterTitle') })}
        </Button>

        <div className="relative py-1 text-center">
          <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
          <span className="relative bg-white px-3 text-xs font-medium uppercase tracking-wider text-slate-400">
            {t('auth.or')}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          loading={googleLoading}
          onClick={handleGoogle}
        >
          {t('register.google')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t('register.already')}{' '}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          {t('nav.login')}
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
