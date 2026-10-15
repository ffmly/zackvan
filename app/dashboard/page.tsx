'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarOff,
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  Pencil,
  Plus,
  Trash2,
  Route,
  Ticket,
  Caravan as VanIcon,
  XCircle,
} from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/form';
import { useAuth, RequireAuth } from '@/lib/auth-context';
import type {
  AvailabilityRange,
  Booking,
  BookingStatus,
  Caravan,
  GiftCard,
  GiftCardKind,
  GiftCardLedgerEntry,
  UserProfile,
} from '@/lib/types';
import {
  claimGiftCard,
  getGiftCardLedgerForUser,
  getGiftCardsForUser,
  getWalletBalance,
  listAllGiftCards,
  mintGiftCard,
  normalizeGiftCardCode,
  voidGiftCard,
} from '@/lib/services/giftcards';
import {
  addUnavailableRange,
  deleteCaravan,
  listCaravans,
  removeUnavailableRange,
  setCaravanPublished,
} from '@/lib/services/caravans';
import { getBookingsForOwner, getBookingsForRenter, updateBookingStatus } from '@/lib/services/bookings';
import { BOOKING_STATUS_META } from '@/lib/constants';
import { cn, dateInputToMs, formatDZD, formatDate, shortId } from '@/lib/utils';

type Tab = 'listings' | 'requests' | 'trips' | 'wallet' | 'giftcards';

function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS_META[status];
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', meta.badgeClass)}>
      {meta.label}
    </span>
  );
}

function ManageAvailabilityModal({
  caravan,
  open,
  onClose,
}: {
  caravan: Caravan | null;
  open: boolean;
  onClose: (refetch?: boolean) => void;
}) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!caravan) return;
    const s = dateInputToMs(start);
    const e = dateInputToMs(end);
    if (!s || !e || e <= s) {
      setError('Provide a valid range (end must be after start).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addUnavailableRange(caravan.id, { start: s, end: e });
      setStart('');
      setEnd('');
      onClose(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save range.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={() => onClose()} title={<p className="font-bold">Blocked periods</p>}>
      <p className="text-sm text-slate-500">
        Dates when <strong>{caravan?.title}</strong> cannot be booked.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="From" htmlFor="blk-start">
          <Input id="blk-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Until" htmlFor="blk-end">
          <Input id="blk-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
      <Button className="mt-3 w-full" loading={busy} onClick={handleAdd}>
        Block these dates
      </Button>

      <div className="mt-5 space-y-2">
        {(caravan?.unavailableRanges ?? []).map((range, i) => (
          <div key={`${range.start}-${range.end}-${i}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-sm text-slate-700">
              {formatDate(range.start)} → {formatDate(range.end)}
            </span>
            <button
              type="button"
              onClick={async () => {
                if (!caravan) return;
                await removeUnavailableRange(caravan.id, i);
                onClose(true);
              }}
              className="rounded p-1 text-rose-500 hover:bg-rose-50"
              aria-label="Remove blocked period"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {(caravan?.unavailableRanges.length ?? 0) === 0 && (
          <p className="py-2 text-center text-sm text-slate-400">
            No manually blocked periods.
          </p>
        )}
      </div>
    </Modal>
  );
}

const LEDGER_META: Record<
  GiftCardLedgerEntry['kind'],
  { label: string; className: string }
> = {
  issued: { label: 'Issued', className: 'text-brand-700' },
  claimed: { label: 'Claimed', className: 'text-slate-600' },
  applied: { label: 'Used on booking', className: 'text-rose-600' },
  released: { label: 'Returned', className: 'text-brand-700' },
  voided: { label: 'Voided', className: 'text-slate-400' },
};

function WalletTab() {
  const { user } = useAuth();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [entries, setEntries] = useState<GiftCardLedgerEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [c, e, b] = await Promise.all([
        getGiftCardsForUser(user.uid),
        getGiftCardLedgerForUser(user.uid),
        getWalletBalance(user.uid),
      ]);
      setCards(c);
      setEntries(e);
      setBalance(b);
    } catch {
      setMsg({ tone: 'err', text: 'Could not load your wallet.' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleClaim() {
    if (!user || !code.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      await claimGiftCard(code, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
      setCode('');
      setMsg({ tone: 'ok', text: 'Gift card added to your wallet.' });
      await load();
    } catch (e) {
      setMsg({
        tone: 'err',
        text: e instanceof Error ? e.message : 'Could not claim that card.',
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-brand-300 p-5 text-slate-900 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-800">
            Available credit
          </p>
          <p className="mt-1 text-2xl font-bold">{formatDZD(balance)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Active cards
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {cards.filter((c) => c.status === 'active' && c.balance > 0).length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Cards received
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{cards.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <Gift className="h-5 w-5 text-brand-600" /> Add a gift card to your wallet
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Paste the code you were sent. It must match the email address on your account.
          Once it is in your wallet you can apply it as credit when booking.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={code}
            onChange={(e) => setCode(normalizeGiftCardCode(e.target.value))}
            placeholder="ZK-XXXX-XXXX-XXXX"
            className="font-mono uppercase"
            maxLength={16}
            autoComplete="off"
          />
          <Button onClick={handleClaim} loading={busy} disabled={!code.trim()} className="shrink-0">
            Add to wallet
          </Button>
        </div>
        {msg && (
          <p
            className={cn(
              'mt-2 rounded-lg px-3 py-2 text-sm font-medium',
              msg.tone === 'ok'
                ? 'bg-brand-50 text-brand-800'
                : 'bg-rose-50 text-rose-700',
            )}
          >
            {msg.text}
          </p>
        )}
      </div>

      {cards.length > 0 && (
        <div>
          <h2 className="mb-3 font-bold text-slate-900">My cards</h2>
          <div className="space-y-3">
            {cards.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-slate-900">{c.code}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.kind === 'wallet' ? 'Wallet credit' : 'Trip voucher'}
                    {c.caravanTitle ? ` · ${c.caravanTitle}` : ''}
                    {c.note ? ` · ${c.note}` : ''}
                  </p>
                  {c.expiresAt && (
                    <p className="mt-0.5 text-xs text-amber-600">
                      Expires {formatDate(c.expiresAt)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-brand-700">{formatDZD(c.balance)}</p>
                  <p className="text-xs text-slate-400">of {formatDZD(c.initialAmount)} left</p>
                  <GiftCardStatusPill status={c.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div>
          <h2 className="mb-3 font-bold text-slate-900">Activity</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">When</th>
                  <th className="px-4 py-2.5 font-semibold">Card</th>
                  <th className="px-4 py-2.5 font-semibold">Event</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                      {formatDate(e.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{e.code}</td>
                    <td
                      className={cn(
                        'px-4 py-2.5 font-medium',
                        LEDGER_META[e.kind].className,
                      )}
                    >
                      {LEDGER_META[e.kind].label}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {e.amount > 0 ? '+' : ''}
                      {formatDZD(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cards.length === 0 && entries.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-400">
          No gift cards yet. Redeem a code above to get started.
        </p>
      )}
    </div>
  );
}

function GiftCardsAdminTab({ user }: { user: UserProfile }) {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [caravans, setCaravans] = useState<Caravan[]>([]);
  const [kind, setKind] = useState<GiftCardKind>('wallet');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [caravanId, setCaravanId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [expires, setExpires] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [c, v] = await Promise.all([
        listAllGiftCards(),
        listCaravans({ includeUnpublished: false }),
      ]);
      setCards(c);
      setCaravans(v);
    } catch {
      setMsg({ tone: 'err', text: 'Could not load gift cards.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCaravan = caravans.find((c) => c.id === caravanId);

  async function handleMint(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setMsg({ tone: 'err', text: 'Enter a valid amount.' });
      return;
    }
    if (!email.trim()) {
      setMsg({
        tone: 'err',
        text: 'Enter the recipient email address — only that account can claim the card.',
      });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const card = await mintGiftCard({
        kind,
        amount: value,
        issuedBy: user.uid,
        issuedByName: user.displayName,
        recipientEmail: email || undefined,
        note: note || undefined,
        caravanId: kind === 'voucher' ? selectedCaravan?.id : undefined,
        caravanTitle: kind === 'voucher' ? selectedCaravan?.title : undefined,
        startDate: kind === 'voucher' ? dateInputToMs(start) ?? undefined : undefined,
        endDate: kind === 'voucher' ? dateInputToMs(end) ?? undefined : undefined,
        expiresAt: expires ? dateInputToMs(expires) ?? undefined : undefined,
      });
      setMsg({ tone: 'ok', text: `Created ${card.code} for ${formatDZD(card.initialAmount)}.` });
      setAmount('');
      setNote('');
      await load();
    } catch (err) {
      setMsg({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Could not create the gift card.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleVoid(code: string) {
    if (!confirm(`Void ${code}? Any remaining balance is lost.`)) return;
    setBusy(true);
    try {
      await voidGiftCard(code, user.uid);
      setMsg({ tone: 'ok', text: `${code} voided.` });
      await load();
    } catch (err) {
      setMsg({
        tone: 'err',
        text: err instanceof Error ? err.message : 'Could not void that card.',
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />;

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleMint}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <Ticket className="h-5 w-5 text-brand-600" /> Create a gift card
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Wallet credit works on any listing. A trip voucher is locked to one caravan
          and date range.
        </p>

        <div className="mt-4 flex gap-2">
          {(['wallet', 'voucher'] as GiftCardKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-semibold ring-1 transition',
                kind === k
                  ? 'bg-brand-700 text-white ring-brand-700'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
              )}
            >
              {k === 'wallet' ? 'Wallet credit' : 'Trip voucher'}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Amount (DA)" htmlFor="gc-amount">
            <Input
              id="gc-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25000"
              required
            />
          </Field>
          <Field label="Recipient email" htmlFor="gc-email">
            <Input
              id="gc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              required
            />
          </Field>
        </div>

        {kind === 'voucher' && (
          <div className="mt-4 space-y-4 rounded-xl bg-slate-50 p-4">
            <Field label="Caravan" htmlFor="gc-caravan">
              <select
                id="gc-caravan"
                value={caravanId}
                onChange={(e) => setCaravanId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                required
              >
                <option value="">Select a listing…</option>
                {caravans.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} — {c.wilaya}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valid from" htmlFor="gc-start">
                <Input
                  id="gc-start"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </Field>
              <Field label="Valid until" htmlFor="gc-end">
                <Input
                  id="gc-end"
                  type="date"
                  value={end}
                  min={start || undefined}
                  onChange={(e) => setEnd(e.target.value)}
                  required
                />
              </Field>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Note (optional)" htmlFor="gc-note">
            <Input
              id="gc-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Birthday gift — Sahara trip"
            />
          </Field>
          <Field label="Expires (optional)" htmlFor="gc-expires">
            <Input
              id="gc-expires"
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </Field>
        </div>

        {msg && (
          <p
            className={cn(
              'mt-3 rounded-lg px-3 py-2 text-sm font-medium',
              msg.tone === 'ok'
                ? 'bg-brand-50 text-brand-800'
                : 'bg-rose-50 text-rose-700',
            )}
          >
            {msg.text}
          </p>
        )}

        <Button type="submit" className="mt-4" loading={busy}>
          Create gift card
        </Button>
      </form>

      <div>
        <h2 className="mb-3 font-bold text-slate-900">
          All cards ({cards.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Code</th>
                <th className="px-4 py-2.5 font-semibold">Type</th>
                <th className="px-4 py-2.5 font-semibold">Recipient</th>
                <th className="px-4 py-2.5 text-right font-semibold">Remaining</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cards.map((c) => (
                <tr key={c.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                    {c.code}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.kind === 'wallet' ? 'Wallet' : 'Voucher'}
                    {c.caravanTitle ? (
                      <span className="block text-xs text-slate-400">{c.caravanTitle}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {c.recipientEmail ?? 'Anyone'}
                    {c.recipientClaimedAt ? (
                      <span className="block text-brand-700">claimed</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatDZD(c.balance)}
                    <span className="block text-xs font-normal text-slate-400">
                      of {formatDZD(c.initialAmount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <GiftCardStatusPill status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status === 'active' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleVoid(c.code)}
                        disabled={busy}
                      >
                        Void
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {cards.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                    No gift cards created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GiftCardStatusPill({ status }: { status: GiftCard['status'] }) {
  const meta: Record<GiftCard['status'], string> = {
    active: 'bg-brand-50 text-brand-800',
    used: 'bg-slate-100 text-slate-500',
    void: 'bg-rose-50 text-rose-600',
  };
  return (
    <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold', meta[status])}>
      {status}
    </span>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, becomeOwner } = useAuth();

  const initialTab = (searchParams.get('tab') as Tab) || 'listings';
  const validTabs: Tab[] =
    user?.role === 'admin'
      ? ['giftcards', 'listings', 'requests', 'trips', 'wallet']
      : user?.role === 'renter'
        ? ['trips', 'wallet']
        : ['listings', 'requests', 'trips', 'wallet'];
  const tab: Tab = validTabs.includes(initialTab) ? initialTab : validTabs[0];

  const [myCaravans, setMyCaravans] = useState<Caravan[]>([]);
  const [receivedBookings, setReceivedBookings] = useState<Booking[]>([]);
  const [myTrips, setMyTrips] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [availabilityFor, setAvailabilityFor] = useState<Caravan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Caravan | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const tasks: Promise<void>[] = [];
      if (user.role !== 'renter') {
        tasks.push(
          listCaravans({ ownerId: user.uid, includeUnpublished: true }).then(setMyCaravans),
          getBookingsForOwner(user.uid).then(setReceivedBookings),
        );
      }
      tasks.push(getBookingsForRenter(user.uid).then(setMyTrips));
      await Promise.all(tasks);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pendingCount = useMemo(
    () => receivedBookings.filter((b) => b.status === 'pending').length,
    [receivedBookings],
  );

  function switchTab(next: Tab) {
    router.replace(`/dashboard?tab=${next}`);
  }

  async function handleBecomeOwner() {
    try {
      await becomeOwner();
      await refresh();
      switchTab('listings');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upgrade account.');
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {user?.displayName}.
          </p>
        </div>
        {user?.role !== 'renter' && (
          <Link href="/dashboard/caravans/new">
            <Button>
              <Plus className="h-4 w-4" /> Add caravan
            </Button>
          </Link>
        )}
      </div>

      {user?.role === 'renter' && (
        <div className="mt-8 flex flex-col items-center rounded-2xl bg-brand-300 px-6 py-10 text-center sm:flex-row sm:text-left">
          <VanIcon className="h-10 w-10 shrink-0 text-slate-900" />
          <div className="mt-3 sm:ml-5 sm:mt-0 sm:flex-1">
            <h2 className="text-lg font-bold text-slate-900">Earn from your caravan</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-800">
              Unlock the owner tools: publish listings, manage availability, and
              receive booking requests protected by digital contracts.
            </p>
          </div>
          <Button variant="outline" className="mt-4 shrink-0 bg-white sm:mt-0" onClick={handleBecomeOwner}>
            Become an owner
          </Button>
        </div>
      )}

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-slate-200">
        {validTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition',
              tab === t
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {t === 'listings' && `My listings (${myCaravans.length})`}
            {t === 'requests' && `Booking requests${pendingCount ? ` (${pendingCount})` : ''}`}
            {t === 'trips' && `My trips (${myTrips.length})`}
            {t === 'wallet' && 'Wallet & gift cards'}
            {t === 'giftcards' && 'Gift card admin'}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : tab === 'listings' ? (
          <ListingsTab caravans={myCaravans} onDelete={(c) => setConfirmDelete(c)} onAvailability={(c) => setAvailabilityFor(c)} onChanged={refresh} />
        ) : tab === 'requests' ? (
          <RequestsTab bookings={receivedBookings} isOwner actorUid={user!.uid} onChanged={refresh} />
        ) : tab === 'wallet' ? (
          <WalletTab />
        ) : tab === 'giftcards' ? (
          <GiftCardsAdminTab user={user!} />
        ) : (
          <RequestsTab bookings={myTrips} isOwner={false} actorUid={user!.uid} onChanged={refresh} />
        )}
      </div>

      <ManageAvailabilityModal
        caravan={availabilityFor}
        open={availabilityFor !== null}
        onClose={(refetch?: boolean) => {
          setAvailabilityFor(null);
          if (refetch) void refresh();
        }}
      />

      <Modal open={confirmDelete !== null} onClose={() => setConfirmDelete(null)} size="sm" title={<p className="font-bold text-rose-700">Delete listing?</p>}>
        <p className="text-sm text-slate-600">
          <strong>{confirmDelete?.title}</strong> will be permanently removed.
          Existing bookings remain in history.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirmDelete) return;
              await deleteCaravan(confirmDelete.id);
              setConfirmDelete(null);
              void refresh();
            }}
          >
            Delete permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ListingsTab({
  caravans,
  onAvailability,
  onDelete,
  onChanged,
}: {
  caravans: Caravan[];
  onAvailability: (c: Caravan) => void;
  onDelete: (c: Caravan) => void;
  onChanged: () => void;
}) {
  if (caravans.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <CalendarOff className="mx-auto h-9 w-9 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-700">No listings yet</p>
        <Link href="/dashboard/caravans/new" className="mt-3 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">
          Create your first listing
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {caravans.map((c) => (
        <div key={c.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-32">
            {c.images[0] ? (
              <Image src={c.images[0].url} alt="" fill sizes="150px" className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300"><VanIcon className="h-6 w-6" /></div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-bold text-slate-900">{c.title}</h3>
              {!c.published && (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Draft
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {c.wilaya} · {formatDZD(c.pricePerDay)}/day · sleeps {c.specs.capacity}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {c.unavailableRanges.length} blocked period(s)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => onAvailability(c)}>
              <CalendarOff className="h-4 w-4" /> Availability
            </Button>
            <Link href={`/dashboard/caravans/${c.id}/edit`}>
              <Button size="sm" variant="subtle"><Pencil className="h-4 w-4" /> Edit</Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await setCaravanPublished(c.id, !c.published);
                onChanged();
              }}
            >
              {c.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {c.published ? 'Unpublish' : 'Publish'}
            </Button>
            <Button size="sm" variant="ghost" className="!text-rose-600" onClick={() => onDelete(c)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestsTab({
  bookings,
  isOwner,
  actorUid,
  onChanged,
}: {
  bookings: Booking[];
  isOwner: boolean;
  actorUid: string;
  onChanged: () => void;
}) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <Route className="mx-auto h-9 w-9 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-700">
          {isOwner ? 'No booking requests yet' : 'No trips yet'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {isOwner
            ? 'Publish your listings to start receiving requests.'
            : 'Browse caravans and book your first adventure.'}
        </p>
      </div>
    );
  }

  const order: BookingStatus[] = ['pending', 'accepted', 'completed', 'rejected', 'cancelled'];
  const sorted = [...bookings].sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
  );

  async function transition(booking: Booking, status: BookingStatus) {
    await updateBookingStatus(booking, status, actorUid);
    onChanged();
  }

  return (
    <div className="space-y-4">
      {sorted.map((b) => (
        <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900">{isOwner ? b.caravanTitle : b.ownerName}</h3>
                <StatusBadge status={b.status} />
                <span className="font-mono text-[11px] text-slate-400">
                  REF {shortId(b.id)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {formatDate(b.startDate)} → {formatDate(b.endDate)} ({b.days} day{b.days > 1 ? 's' : ''})
                {' '}· {formatDZD(b.totalPrice)}
              </p>
              {b.giftCardApplied > 0 && (
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-brand-800">
                  <Gift className="h-3.5 w-3.5" />
                  Gift card {b.giftCardCode} covered {formatDZD(b.giftCardApplied)}
                  <span className="font-normal text-slate-400">
                    · {formatDZD(b.cashDue)} due to the owner at handover
                  </span>
                </p>
              )}
              <p className="mt-0.5 text-xs text-slate-400">
                {isOwner ? `Requested by ${b.renterName}` : `Owner: ${b.ownerName}`} · Contract signed electronically
              </p>
              {b.message && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-600">
                  “{b.message}”
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {isOwner && b.status === 'pending' && (
                <>
                  <Button size="sm" onClick={() => transition(b, 'accepted')}>
                    <CheckCircle2 className="h-4 w-4" /> Accept
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => transition(b, 'rejected')}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </>
              )}
              {!isOwner && b.status === 'accepted' && (
                <Button size="sm" variant="outline" onClick={() => transition(b, 'cancelled')}>
                  Cancel trip
                </Button>
              )}
              {isOwner && b.status === 'accepted' && (
                <Button size="sm" variant="subtle" onClick={() => transition(b, 'completed')}>
                  Mark completed
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Suspense fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </RequireAuth>
  );
}
