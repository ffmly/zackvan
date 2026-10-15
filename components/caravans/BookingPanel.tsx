'use client';

import { CalendarDays, Loader2, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ElectronicContractModal from '@/components/contract/ElectronicContractModal';
import GiftCardRedeemer from '@/components/caravans/GiftCardRedeemer';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/form';
import type { RedemptionQuote } from '@/lib/services/giftcards';
import type { AvailabilityRange, Caravan, UserProfile } from '@/lib/types';
import {
  dateInputToMs,
  daysBetween,
  formatDZD,
  isRangeBlocked,
  toDateInputValue,
} from '@/lib/utils';

export default function BookingPanel({
  caravan,
  user,
  activeRanges,
}: {
  caravan: Caravan;
  user: UserProfile | null;
  activeRanges: AvailabilityRange[];
}) {
  const router = useRouter();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [startValue, setStartValue] = useState('');
  const [endValue, setEndValue] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [contractOpen, setContractOpen] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [giftQuote, setGiftQuote] = useState<RedemptionQuote | null>(null);

  const start = dateInputToMs(startValue);
  const end = dateInputToMs(endValue);

  const blockedRanges = useMemo(
    () => [...caravan.unavailableRanges, ...activeRanges],
    [caravan.unavailableRanges, activeRanges],
  );

  const days = start && end ? daysBetween(start, end) : 0;
  const total = days * caravan.pricePerDay;
  const applied = giftQuote?.applied ?? 0;
  const cashDue = Math.max(0, total - applied);

  // A quote is only valid for the exact caravan, dates and price it was checked
  // against, so changing any of them discards it instead of leaving a stale
  // credit figure on screen.
  useEffect(() => {
    setGiftQuote(null);
  }, [caravan.id, start, end, total]);

  function computeError(): string | null {
    if (!start || !end) return 'Select both pickup and return dates.';
    if (start < today.getTime()) return 'Pickup date cannot be in the past.';
    if (end <= start) return 'Return date must be after the pickup date.';
    if (isRangeBlocked(start, end, blockedRanges)) {
      return 'Those dates overlap an existing booking or a blocked period.';
    }
    if (giftQuote && (giftQuote.card.kind === 'voucher')) {
      const card = giftQuote.card;
      if (card.caravanId && card.caravanId !== caravan.id) {
        return 'That voucher is tied to a different caravan.';
      }
      if (
        card.startDate != null &&
        card.endDate != null &&
        (start < card.startDate || end > card.endDate)
      ) {
        return 'Those dates fall outside the voucher validity range.';
      }
    }
    return null;
  }

  function handleRequest() {
    const validation = computeError();
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/caravans/${caravan.id}`)}`);
      return;
    }
    // The quote is re-validated server-side at submission, so a stale figure
    // can never be committed.
    setContractOpen(true);
  }

  if (confirmedId) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-brand-700" />
        <h3 className="mt-3 font-bold text-brand-900">Request sent</h3>
        <p className="mt-1 text-sm text-brand-800">
          Your contract is signed and the owner has been notified. Track the
          status from your dashboard.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard?tab=trips')}>
          Go to my trips
        </Button>
      </div>
    );
  }

  return (
    <div
      key={refreshKey}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-slate-900">
          {formatDZD(caravan.pricePerDay)}
          <span className="text-sm font-medium text-slate-400"> / day</span>
        </p>
        <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          <ShieldCheck className="h-3.5 w-3.5" /> E-contract protected
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" /> Pickup
          </span>
          <Input
            type="date"
            min={toDateInputValue(today.getTime())}
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" /> Return
          </span>
          <Input
            type="date"
            min={startValue || toDateInputValue(today.getTime())}
            value={endValue}
            onChange={(e) => setEndValue(e.target.value)}
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Message to the owner (optional)
        </span>
        <Textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Meeting point, questions about the route…"
          maxLength={500}
        />
      </label>

      <div className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
        <div className="flex justify-between text-slate-600">
          <span>{formatDZD(caravan.pricePerDay)} × {days || 0} day(s)</span>
          <span>{formatDZD(total)}</span>
        </div>
        {applied > 0 && (
          <div className="flex justify-between text-brand-800">
            <span>Gift card {giftQuote?.card.code}</span>
            <span>−{formatDZD(applied)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
          <span>Due at handover</span>
          <span>{formatDZD(cashDue)}</span>
        </div>
        <p className="text-xs text-slate-400">
          {applied > 0
            ? 'Remaining amount is settled directly with the owner — no online payment.'
            : 'Paid directly to the owner at handover — no online payment.'}
        </p>
      </div>

      {user && days > 0 && (
        <GiftCardRedeemer
          user={user}
          caravanId={caravan.id}
          startDate={start}
          endDate={end}
          totalPrice={total}
          quote={giftQuote}
          onQuoteChange={setGiftQuote}
        />
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      )}

      <Button size="lg" className="mt-4 w-full" onClick={handleRequest}>
        Request to book
      </Button>
      {!user && (
        <p className="mt-2 text-center text-xs text-slate-400">
          You&apos;ll be asked to log in before signing.
        </p>
      )}

      {user && start && end && (
        <ElectronicContractModal
          open={contractOpen}
          onClose={() => setContractOpen(false)}
          caravan={caravan}
          renter={user}
          startDate={start}
          endDate={end}
          days={days}
          totalPrice={total}
          giftCardCode={giftQuote?.card.code}
          giftCardApplied={giftQuote?.applied}
          cashDue={cashDue}
          message={message}
          onSuccess={(id) => {
            setConfirmedId(id);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

export function BookingPanelSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
    </div>
  );
}
