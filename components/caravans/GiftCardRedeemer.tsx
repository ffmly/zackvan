'use client';

import { Gift, Loader2, Tag, X } from 'lucide-react';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/form';
import {
  normalizeGiftCardCode,
  quoteGiftCard,
  type RedemptionQuote,
} from '@/lib/services/giftcards';
import { formatDZD } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';

interface Props {
  user: UserProfile;
  caravanId: string;
  startDate: number | null;
  endDate: number | null;
  totalPrice: number;
  onQuoteChange: (quote: RedemptionQuote | null) => void;
  quote: RedemptionQuote | null;
}

export default function GiftCardRedeemer({
  user,
  caravanId,
  startDate,
  endDate,
  totalPrice,
  onQuoteChange,
  quote,
}: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    if (!code.trim() || checking) return;
    setChecking(true);
    setError(null);
    try {
      const result = await quoteGiftCard(code, {
        uid: user.uid,
        email: user.email,
        caravanId,
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
        totalPrice,
      });
      onQuoteChange(result);
      setCode(result.card.code);
    } catch (e) {
      onQuoteChange(null);
      setError(e instanceof Error ? e.message : 'Could not validate that code.');
    } finally {
      setChecking(false);
    }
  }

  function clear() {
    setCode('');
    setError(null);
    onQuoteChange(null);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
      >
        <Gift className="h-3.5 w-3.5" /> Have a gift card?
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-800">
          <Tag className="h-3.5 w-3.5" /> Gift card
        </p>
        <button
          type="button"
          onClick={clear}
          className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-600"
          aria-label="Remove gift card"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {quote ? (
        <div className="mt-2 space-y-1 text-xs text-brand-900">
          <p className="font-semibold">
            {quote.card.code} · {quote.card.kind === 'wallet' ? 'Wallet credit' : 'Trip voucher'}
          </p>
          <p className="text-brand-700">{quote.hint}</p>
          <p>
            Applied <strong>{formatDZD(quote.applied)}</strong> · Cash due{' '}
            <strong>{formatDZD(quote.cashDue)}</strong>
          </p>
          {quote.card.balance - quote.applied > 0 && (
            <p className="text-brand-600">
              {formatDZD(quote.card.balance - quote.applied)} stays on the card for future trips.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mt-2 flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(normalizeGiftCardCode(e.target.value))}
              placeholder="ZK-XXXX-XXXX-XXXX"
              className="font-mono text-xs uppercase"
              autoComplete="off"
              spellCheck={false}
              maxLength={16}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCheck();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCheck}
              disabled={!code.trim() || checking}
              className="shrink-0"
            >
              {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
            </Button>
          </div>
          {error && (
            <p className="mt-1.5 rounded bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
            Gift cards reduce what you owe at handover. They are not cash and are not
            refundable to money.
          </p>
        </>
      )}
    </div>
  );
}