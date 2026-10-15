'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpenCheck,
  FileText,
  Gift,
  LayoutDashboard,
  Printer,
  Search,
  ShieldCheck,
  Store,
  Ticket,
  Users,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/form';
import ContractAccess from '@/components/contract/ContractAccess';
import type {
  Booking,
  Caravan,
  ContractRecord,
  GiftCard,
  GiftCardKind,
  UserProfile,
  VehicleDocument,
} from '@/lib/types';
import { formatDZD, formatDate, cn } from '@/lib/utils';
import {
  listAllBookingsForAdmin,
  listAllCaravansForAdmin,
  listAllContractsForAdmin,
  listAllUsers,
} from '@/lib/services/admin';
import { listAllGiftCards, mintGiftCard, voidGiftCard } from '@/lib/services/giftcards';
import { listAllVehicleDocuments } from '@/lib/services/vehicle-documents';
import { useAuth } from '@/lib/auth-context';

type AdminTab = 'overview' | 'sellers' | 'listings' | 'bookings' | 'contracts' | 'giftcards';

const tabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'sellers', label: 'Accounts', icon: Users },
  { id: 'listings', label: 'Listings', icon: Store },
  { id: 'bookings', label: 'Bookings', icon: BookOpenCheck },
  { id: 'contracts', label: 'Contracts', icon: FileText },
  { id: 'giftcards', label: 'Gift cards', icon: Gift },
];

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Users }) {
  return (
    <div className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-brand-200 bg-white px-5 py-12 text-center text-sm text-slate-500">{text}</div>;
}

function AdminOverview({ users, caravans, bookings, contracts, cards }: { users: UserProfile[]; caravans: Caravan[]; bookings: Booking[]; contracts: ContractRecord[]; cards: GiftCard[] }) {
  const statuses = ['pending', 'accepted', 'completed', 'rejected', 'cancelled'] as const;
  const maxStatus = Math.max(1, ...statuses.map((status) => bookings.filter((b) => b.status === status).length));
  const ownerCount = users.filter((u) => u.role === 'owner' || u.role === 'admin').length;
  const totalValue = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total accounts" value={users.length} detail={`${ownerCount} seller/admin accounts`} icon={Users} />
        <Metric label="Listings" value={caravans.length} detail={`${caravans.filter((c) => c.published).length} published`} icon={Store} />
        <Metric label="Bookings" value={bookings.length} detail={`${formatDZD(totalValue)} requested value`} icon={BookOpenCheck} />
        <Metric label="Contracts" value={contracts.length} detail={`${cards.length} gift cards issued`} icon={FileText} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Booking pipeline</h2>
              <p className="mt-1 text-sm text-slate-500">Current status distribution</p>
            </div>
            <BarChart3 className="h-5 w-5 text-brand-800" />
          </div>
          <div className="mt-6 space-y-3">
            {statuses.map((status) => {
              const count = bookings.filter((booking) => booking.status === status).length;
              return (
                <div key={status}>
                  <div className="mb-1 flex justify-between text-xs font-semibold capitalize text-slate-600"><span>{status}</span><span>{count}</span></div>
                  <div className="h-2 rounded-full bg-brand-50"><div className="h-2 rounded-full bg-brand-300" style={{ width: `${(count / maxStatus) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-brand-200 bg-brand-50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-brand-800" />
            <div><h2 className="font-bold text-slate-900">Operations health</h2><p className="mt-1 text-sm text-slate-600">Quick checks for the admin team</p></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['Published listings', caravans.filter((c) => c.published).length],
              ['Pending requests', bookings.filter((b) => b.status === 'pending').length],
              ['Signed contracts', contracts.length],
              ['Active gift cards', cards.filter((c) => c.status === 'active').length],
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-brand-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div>)}
          </div>
        </section>
      </div>
    </div>
  );
}

function AccountsTab({ users }: { users: UserProfile[] }) {
  return users.length ? <div className="overflow-x-auto rounded-2xl border border-brand-200 bg-white shadow-sm"><table className="w-full min-w-[720px] text-sm"><thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Joined</th></tr></thead><tbody className="divide-y divide-brand-100">{users.map((user) => <tr key={user.uid}><td className="px-4 py-3 font-semibold text-slate-900">{user.displayName || 'Unnamed'}</td><td className="px-4 py-3 text-slate-600">{user.email}</td><td className="px-4 py-3 text-slate-600">{user.phone || '—'}</td><td className="px-4 py-3"><span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold capitalize text-brand-800">{user.role}</span></td><td className="px-4 py-3 text-slate-500">{formatDate(user.createdAt)}</td></tr>)}</tbody></table></div> : <Empty text="No account profiles found." />;
}

function ListingsTab({ caravans, vehicleDocuments }: { caravans: Caravan[]; vehicleDocuments: VehicleDocument[] }) {
  return caravans.length ? <div className="grid gap-4 md:grid-cols-2">{caravans.map((caravan) => {
    const vehicleDocument = vehicleDocuments.find((entry) => entry.caravanId === caravan.id);
    return <div key={caravan.id} className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{caravan.title}</h3><p className="mt-1 text-sm text-slate-500">{caravan.wilaya} · {formatDZD(caravan.pricePerDay)}/day</p></div><span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', caravan.published ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-500')}>{caravan.published ? 'Published' : 'Draft'}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-500"><span>Owner<br /><strong className="text-slate-800">{caravan.ownerName}</strong></span><span>Capacity<br /><strong className="text-slate-800">{caravan.specs.capacity} guests</strong></span><span>Photos<br /><strong className="text-slate-800">{caravan.images.length}</strong></span></div><div className="mt-4 border-t border-brand-100 pt-4"><p className="text-xs font-semibold text-slate-700">Private vehicle registration</p>{vehicleDocument ? <a href={vehicleDocument.registrationCard.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-900 hover:bg-brand-100">View carte grise</a> : <p className="mt-1 text-xs text-amber-700">No registration card uploaded.</p>}</div></div>;
  })}</div> : <Empty text="No caravan listings found." />;
}

function BookingsTab({ bookings }: { bookings: Booking[] }) {
  return bookings.length ? <div className="overflow-x-auto rounded-2xl border border-brand-200 bg-white shadow-sm"><table className="w-full min-w-[900px] text-sm"><thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Caravan</th><th className="px-4 py-3">Renter / seller</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-brand-100">{bookings.map((booking) => <tr key={booking.id}><td className="px-4 py-3 font-mono text-xs font-semibold">{booking.id.slice(0, 8).toUpperCase()}</td><td className="px-4 py-3 font-semibold text-slate-900">{booking.caravanTitle}</td><td className="px-4 py-3 text-slate-600">{booking.renterName}<span className="block text-xs text-slate-400">{booking.ownerName}</span></td><td className="px-4 py-3 text-slate-600">{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</td><td className="px-4 py-3 font-semibold">{formatDZD(booking.totalPrice)}</td><td className="px-4 py-3"><span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold capitalize text-brand-800">{booking.status}</span></td></tr>)}</tbody></table></div> : <Empty text="No bookings found." />;
}

function ContractsTab({ contracts, bookings, caravans }: { contracts: ContractRecord[]; bookings: Booking[]; caravans: Caravan[] }) {
  return contracts.length ? <div className="overflow-x-auto rounded-2xl border border-brand-200 bg-white shadow-sm"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Contract</th><th className="px-4 py-3">Signed by</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">IP address</th><th className="px-4 py-3">Accepted</th><th className="px-4 py-3">Access</th></tr></thead><tbody className="divide-y divide-brand-100">{contracts.map((contract) => { const booking = bookings.find((entry) => entry.id === contract.bookingId); const caravan = caravans.find((entry) => entry.id === contract.caravanId); return <tr key={contract.id}><td className="px-4 py-3 font-mono text-xs">{contract.id?.slice(0, 8).toUpperCase()}</td><td className="px-4 py-3"><strong>{contract.fullNameSigned}</strong><span className="block text-xs text-slate-400">{contract.userEmail}</span></td><td className="px-4 py-3 text-slate-600">{contract.contractVersion}</td><td className="px-4 py-3 text-slate-600">{contract.ipAddress}</td><td className="px-4 py-3 text-slate-600">{formatDate(contract.acceptedAt)}</td><td className="px-4 py-3">{booking && caravan ? <ContractAccess booking={booking} caravan={caravan} contract={contract} compact /> : <span className="text-xs text-slate-400">Booking unavailable</span>}</td></tr>; })}</tbody></table></div> : <Empty text="No signed contracts found." />;
}

function GiftCardPreview({ created, kind, amount }: { created: GiftCard | null; kind: GiftCardKind; amount: string }) {
  const cardKind = created?.kind ?? kind;
  const value = created ? formatDZD(created.initialAmount) : amount ? formatDZD(Number(amount)) : 'VALUE';
  const code = created?.code ?? 'ZK-XXXX-XXXX-XXXX';
  const message = created
    ? (created.recipientEmail ? `For ${created.recipientEmail}` : 'Anyone can use this card')
    : 'Preview - generate to activate';

  return <div className="print-card gift-card-print relative overflow-hidden rounded-[1.25rem] border-2 border-brand-300 bg-brand-100 p-5 text-slate-900 shadow-lg">
    <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full border-[18px] border-brand-300/70" />
    <div className="absolute -bottom-20 -left-12 h-36 w-36 rounded-full border-[18px] border-brand-800/20" />
    <div className="relative flex h-full flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2"><img src="/icon.png" alt="Zackvan" className="h-9 w-9 rounded-full bg-brand-50 object-cover" /><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-900">Zackvan Algeria</p><p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600">Travel gift card</p></div></div>
        <div className="text-right"><p className="text-2xl font-black leading-none tracking-tight">{value}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-brand-900">{cardKind === 'wallet' ? 'Wallet credit' : 'Trip voucher'}</p></div>
      </div>
      <div className="relative mt-4 rounded-xl border border-brand-200 bg-white/90 px-3 py-2.5"><p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">Redeem code</p><p className="mt-1 font-mono text-base font-black tracking-[0.12em] text-slate-900">{code}</p></div>
      <div className="mt-3 flex items-end justify-between gap-3"><p className="max-w-[75%] text-[9px] font-medium leading-tight text-slate-600">{message}. Present this card when claiming it in Zackvan.</p>{created && <Button type="button" variant="outline" className="shrink-0 bg-white px-3 py-1.5 text-xs print:hidden" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /> Print</Button>}</div>
    </div>
  </div>;
}

function GiftCardsTab({ cards, caravans, onCreated }: { cards: GiftCard[]; caravans: Caravan[]; onCreated: () => void }) {
  const { user } = useAuth();
  const [kind, setKind] = useState<GiftCardKind>('wallet');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [caravanId, setCaravanId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [expires, setExpires] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<GiftCard | null>(null);
  const [error, setError] = useState('');

  async function createCard(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const value = Number(amount);
    if (!value || value <= 0) { setError('Enter a positive amount.'); return; }
    const selected = caravans.find((caravan) => caravan.id === caravanId);
    setBusy(true);
    try {
      if (!user) throw new Error('Admin session is required.');
      const card = await mintGiftCard({ kind, amount: value, issuedBy: user.uid, issuedByName: user.displayName, recipientEmail: email.trim(), note: note.trim() || undefined, caravanId: kind === 'voucher' ? selected?.id : undefined, caravanTitle: kind === 'voucher' ? selected?.title : undefined, startDate: kind === 'voucher' && start ? new Date(`${start}T12:00:00`).getTime() : undefined, endDate: kind === 'voucher' && end ? new Date(`${end}T12:00:00`).getTime() : undefined, expiresAt: expires ? new Date(`${expires}T12:00:00`).getTime() : undefined });
      setCreated(card); setAmount(''); setEmail(''); setNote(''); setExpires(''); setStart(''); setEnd(''); onCreated();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create the gift card.'); }
    finally { setBusy(false); }
  }

  async function voidCard(card: GiftCard) {
    if (!user || card.status !== 'active') return;
    if (!window.confirm(`Void ${card.code}? Any remaining balance will be lost.`)) return;
    try {
      await voidGiftCard(card.code, user.uid);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not void the gift card.');
    }
  }

  return <div className="space-y-6">
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <form onSubmit={createCard} className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3"><Ticket className="h-5 w-5 text-brand-800" /><div><h2 className="font-bold text-slate-900">Issue a printable gift card</h2><p className="mt-1 text-sm text-slate-500">Generate a secure code and branded card for handover or printing.</p></div></div>
        <div className="mt-5 flex gap-2">{(['wallet', 'voucher'] as GiftCardKind[]).map((value) => <button key={value} type="button" onClick={() => setKind(value)} className={cn('rounded-lg px-4 py-2 text-sm font-semibold', kind === value ? 'bg-brand-300 text-slate-900' : 'bg-brand-50 text-slate-600')}>{value === 'wallet' ? 'Wallet credit' : 'Trip voucher'}</button>)}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Amount (DA)" htmlFor="admin-card-amount"><Input id="admin-card-amount" type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field><Field label="Recipient email (optional)" htmlFor="admin-card-email"><Input id="admin-card-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Leave blank for a public card" /><p className="mt-1 text-xs text-slate-500">Blank means anyone with the printed code can claim it.</p></Field></div>
        {kind === 'voucher' && <div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Caravan" htmlFor="admin-card-caravan"><Select id="admin-card-caravan" value={caravanId} onChange={(event) => setCaravanId(event.target.value)} required><option value="">Select a caravan</option>{caravans.filter((caravan) => caravan.published).map((caravan) => <option key={caravan.id} value={caravan.id}>{caravan.title}</option>)}</Select></Field><Field label="Valid from" htmlFor="admin-card-start"><Input id="admin-card-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} required /></Field><Field label="Valid until" htmlFor="admin-card-end"><Input id="admin-card-end" type="date" value={end} min={start || undefined} onChange={(event) => setEnd(event.target.value)} required /></Field></div>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Note" htmlFor="admin-card-note"><Input id="admin-card-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Birthday gift" /></Field><Field label="Expires" htmlFor="admin-card-expires"><Input id="admin-card-expires" type="date" value={expires} onChange={(event) => setExpires(event.target.value)} /></Field></div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
        <Button type="submit" className="mt-5" loading={busy}><Gift className="h-4 w-4" /> Generate card</Button>
      </form>
      <GiftCardPreview created={created} kind={kind} amount={amount} />
    </div>
    <div className="overflow-x-auto rounded-2xl border border-brand-200 bg-white shadow-sm"><div className="flex items-center justify-between p-5"><div><h2 className="font-bold text-slate-900">Issued cards</h2><p className="mt-1 text-sm text-slate-500">{cards.length} total cards</p></div><Gift className="h-5 w-5 text-brand-800" /></div><table className="w-full min-w-[780px] text-sm"><thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-brand-100">{cards.map((card) => <tr key={card.id}><td className="px-4 py-3 font-mono text-xs font-semibold">{card.code}</td><td className="px-4 py-3 text-slate-600">{card.recipientEmail || '—'}</td><td className="px-4 py-3 font-semibold">{formatDZD(card.balance)}</td><td className="px-4 py-3 capitalize text-brand-800">{card.status}</td><td className="px-4 py-3 text-right">{card.status === 'active' && <Button type="button" size="sm" variant="danger" onClick={() => voidCard(card)}>Void</Button>}</td></tr>)}</tbody></table></div>
  </div>;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [caravans, setCaravans] = useState<Caravan[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocument[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const [allUsers, allCaravans, allBookings, allContracts, allCards, allVehicleDocuments] = await Promise.all([listAllUsers(), listAllCaravansForAdmin(), listAllBookingsForAdmin(), listAllContractsForAdmin(), listAllGiftCards(), listAllVehicleDocuments()]); setUsers(allUsers); setCaravans(allCaravans); setBookings(allBookings); setContracts(allContracts); setCards(allCards); setVehicleDocuments(allVehicleDocuments); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load admin data.'); }
    finally { setLoading(false); setHasLoaded(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filteredUsers = useMemo(() => users.filter((user) => `${user.displayName} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const filteredCaravans = useMemo(() => caravans.filter((caravan) => `${caravan.title} ${caravan.ownerName} ${caravan.wilaya}`.toLowerCase().includes(query.toLowerCase())), [caravans, query]);
  const filteredBookings = useMemo(() => bookings.filter((booking) => `${booking.caravanTitle} ${booking.renterName} ${booking.ownerName} ${booking.status}`.toLowerCase().includes(query.toLowerCase())), [bookings, query]);

  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-800"><ShieldCheck className="h-4 w-4" /> Admin workspace</div><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Zackvan control center</h1><p className="mt-1 text-sm text-slate-500">Manage the marketplace, seller accounts, contracts, bookings and credits.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search admin data…" className="pl-9" /></div></div><div className="mt-8 flex gap-1 overflow-x-auto border-b border-brand-200">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={cn('flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold', tab === id ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800')}><Icon className="h-4 w-4" />{label}</button>)}</div>{error && <p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}{loading && !hasLoaded ? <div className="mt-6 h-64 animate-pulse rounded-2xl bg-brand-50" /> : <div className="mt-6">{tab === 'overview' && <AdminOverview users={users} caravans={caravans} bookings={bookings} contracts={contracts} cards={cards} />}{tab === 'sellers' && <AccountsTab users={filteredUsers} />}{tab === 'listings' && <ListingsTab caravans={filteredCaravans} vehicleDocuments={vehicleDocuments} />}{tab === 'bookings' && <BookingsTab bookings={filteredBookings} />}{tab === 'contracts' && <ContractsTab contracts={contracts} bookings={bookings} caravans={caravans} />}{tab === 'giftcards' && <GiftCardsTab cards={cards} caravans={caravans} onCreated={load} />}</div>}</div>;
}
