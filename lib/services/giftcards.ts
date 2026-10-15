import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  where,
  type DocumentReference,
} from 'firebase/firestore';
import { getDb, COLLECTIONS } from '@/lib/firebase';
import { stripUndefined } from '@/lib/utils';
import type { NewBooking } from '@/lib/services/contracts';
import type {
  GiftCard,
  GiftCardKind,
  GiftCardLedgerEntry,
  GiftCardLedgerKind,
  GiftCardStatus,
} from '@/lib/types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = 'ZK';
const CODE_GROUPS = [4, 4, 4];

function randomSegment(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function generateGiftCardCode(): string {
  return `${CODE_PREFIX}-${CODE_GROUPS.map(randomSegment).join('-')}`;
}

/**
 * Card codes double as document IDs, so user input is normalised into that
 * exact shape before any lookup. Unambiguous alphabet excludes 0/O/1/I/L.
 */
export function normalizeGiftCardCode(code: string): string {
  const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = cleaned.startsWith(CODE_PREFIX) ? cleaned.slice(CODE_PREFIX.length) : cleaned;
  const groups = body.match(/.{1,4}/g) ?? [];
  return groups.length > 0 ? `${CODE_PREFIX}-${groups.join('-')}` : CODE_PREFIX;
}

/**
 * Ledger rows get a deterministic document ID derived from the operation they
 * describe. That buys three things a random ID could not: security rules can
 * check the row ID against the operation, a card can only ever be claimed once,
 * and a second release for the same booking collides instead of silently
 * double-crediting the holder.
 */
function ledgerEntryId(kind: GiftCardLedgerKind, key: string): string {
  return `${kind}_${key}`;
}

/** Internal signal: a generated code was already taken, so try another. */
class CodeCollisionError extends Error {}

function mapGiftCard(id: string, data: Record<string, unknown>): GiftCard {
  return {
    id,
    code: (data.code as string) ?? id,
    kind: (data.kind as GiftCardKind) ?? 'wallet',
    status: (data.status as GiftCardStatus) ?? 'active',
    initialAmount: (data.initialAmount as number) ?? 0,
    balance: (data.balance as number) ?? 0,
    issuedBy: (data.issuedBy as string) ?? '',
    issuedByName: (data.issuedByName as string) ?? '',
    recipientUid: (data.recipientUid as string) || undefined,
    recipientEmail: (data.recipientEmail as string) || undefined,
    recipientName: (data.recipientName as string) || undefined,
    recipientClaimedAt: (data.recipientClaimedAt as number) || undefined,
    note: (data.note as string) || undefined,
    caravanId: (data.caravanId as string) || undefined,
    caravanTitle: (data.caravanTitle as string) || undefined,
    startDate: (data.startDate as number) || undefined,
    endDate: (data.endDate as number) || undefined,
    expiresAt: (data.expiresAt as number) || undefined,
    createdAt: (data.createdAt as number) ?? Date.now(),
    heldBookingId: (data.heldBookingId as string) || undefined,
    heldAmount: (data.heldAmount as number) ?? 0,
    lastUsedAt: (data.lastUsedAt as number) || undefined,
    lastUsedBy: (data.lastUsedBy as string) || undefined,
    voidedAt: (data.voidedAt as number) || undefined,
    voidedBy: (data.voidedBy as string) || undefined,
  };
}

function mapLedgerEntry(id: string, data: Record<string, unknown>): GiftCardLedgerEntry {
  return {
    id,
    giftCardId: (data.giftCardId as string) ?? '',
    code: (data.code as string) ?? '',
    kind: (data.kind as GiftCardLedgerEntry['kind']) ?? 'issued',
    amount: (data.amount as number) ?? 0,
    balanceAfter: (data.balanceAfter as number) ?? 0,
    bookingId: (data.bookingId as string) || undefined,
    note: (data.note as string) || undefined,
    actorUid: (data.actorUid as string) || undefined,
    createdAt: (data.createdAt as number) ?? Date.now(),
  };
}

/**
 * Every ledger row is written with every field present, using an empty string
 * where a field does not apply. The rules compare these fields directly, and a
 * missing field would turn a comparison into a rule error rather than a clean
 * "false".
 */
function ledgerPayload(entry: {
  giftCardId: string;
  code: string;
  kind: GiftCardLedgerKind;
  amount: number;
  balanceAfter: number;
  bookingId?: string;
  note?: string;
  actorUid?: string;
}): Record<string, unknown> {
  return {
    giftCardId: entry.giftCardId,
    code: entry.code,
    kind: entry.kind,
    amount: entry.amount,
    balanceAfter: entry.balanceAfter,
    bookingId: entry.bookingId ?? '',
    note: entry.note ?? '',
    actorUid: entry.actorUid ?? '',
    createdAt: Date.now(),
  };
}

function fail(reason: string): never {
  throw new Error(reason);
}

/* ---------------------------------------------------------------- issuance */

export interface MintGiftCardInput {
  kind: GiftCardKind;
  amount: number;
  issuedBy: string;
  issuedByName: string;
  recipientEmail?: string;
  recipientUid?: string;
  recipientName?: string;
  note?: string;
  caravanId?: string;
  caravanTitle?: string;
  startDate?: number;
  endDate?: number;
  expiresAt?: number;
}

function buildMintedCard(
  code: string,
  input: MintGiftCardInput,
  amount: number,
  recipientEmail: string,
): Record<string, unknown> {
  return {
    code,
    kind: input.kind,
    status: 'active' as GiftCardStatus,
    initialAmount: amount,
    balance: amount,
    heldBookingId: null,
    heldAmount: 0,
    issuedBy: input.issuedBy,
    issuedByName: input.issuedByName,
    recipientUid: input.recipientUid ?? null,
    recipientEmail: recipientEmail || null,
    recipientName: input.recipientName ?? null,
    recipientClaimedAt: null,
    note: input.note?.trim() || null,
    caravanId: input.caravanId ?? null,
    caravanTitle: input.caravanTitle ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    expiresAt: input.expiresAt ?? null,
    createdAt: Date.now(),
  };
}

export async function mintGiftCard(input: MintGiftCardInput): Promise<GiftCard> {
  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    fail('Enter a valid amount greater than zero.');
  }

  const recipientEmail = input.recipientEmail?.trim().toLowerCase() ?? '';
  if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    fail('That recipient email address does not look valid.');
  }
  if (input.kind === 'voucher') {
    if (!input.caravanId || !input.startDate || !input.endDate) {
      fail('A voucher must be tied to one caravan and one date range.');
    }
    if (input.endDate <= input.startDate) {
      fail('The voucher end date must be after its start date.');
    }
  }

  const db = getDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateGiftCardCode();
    const payload = buildMintedCard(code, input, amount, recipientEmail);

    try {
      // The code is the document ID, so the card is created at its own address
      // and every later lookup is a single getDoc on that code.
      await runTransaction(db, async (tx) => {
        const cardRef = doc(db, COLLECTIONS.giftCards, code);
        if ((await tx.get(cardRef)).exists()) throw new CodeCollisionError();

        tx.set(cardRef, payload);
        tx.set(
          doc(db, COLLECTIONS.giftCardLedger, ledgerEntryId('issued', code)),
          ledgerPayload({
            giftCardId: code,
            code,
            kind: 'issued',
            amount,
            balanceAfter: amount,
            note: input.note?.trim() || undefined,
            actorUid: input.issuedBy,
          }),
        );
      });
    } catch (error) {
      if (error instanceof CodeCollisionError) continue;
      throw error;
    }

    return mapGiftCard(code, payload);
  }

  return fail('Could not allocate a unique gift card code. Please try again.');
}

export async function voidGiftCard(code: string, actorUid: string): Promise<void> {
  const normalized = normalizeGiftCardCode(code);
  const db = getDb();

  await runTransaction(db, async (tx) => {
    const ref = doc(db, COLLECTIONS.giftCards, normalized);
    const snap = await tx.get(ref);
    if (!snap.exists()) fail('That gift card code was not recognised.');

    const card = mapGiftCard(snap.id, snap.data());
    if (card.status === 'void') fail('This gift card is already voided.');

    tx.update(ref, {
      status: 'void',
      balance: 0,
      heldBookingId: null,
      heldAmount: 0,
      voidedAt: Date.now(),
      voidedBy: actorUid,
    });
    tx.set(
      doc(db, COLLECTIONS.giftCardLedger, ledgerEntryId('voided', normalized)),
      ledgerPayload({
        giftCardId: normalized,
        code: normalized,
        kind: 'voided',
        amount: -card.balance,
        balanceAfter: 0,
        actorUid,
      }),
    );
  });
}

export async function listAllGiftCards(): Promise<GiftCard[]> {
  const snap = await getDocs(
    query(
      collection(getDb(), COLLECTIONS.giftCards),
      orderBy('createdAt', 'desc'),
      limit(300),
    ),
  );
  return snap.docs.map((d) => mapGiftCard(d.id, d.data()));
}

/* --------------------------------------------------------------- validation */

export interface RedemptionQuote {
  card: GiftCard;
  applied: number;
  cashDue: number;
  hint?: string;
}

export interface RedemptionContext {
  uid: string;
  email?: string;
  caravanId?: string;
  startDate?: number;
  endDate?: number;
  totalPrice?: number;
}

/**
 * Pure validation of a card against a user and a booking. Shared by the quote
 * path and the transaction that spends it, so the pre-flight check and the
 * authoritative commit can never disagree.
 */
function assertCardUsable(card: GiftCard, ctx: RedemptionContext): void {
  if (card.status === 'void') fail('This gift card has been voided.');
  if (card.status === 'used') fail('This gift card has already been fully used.');
  if (card.expiresAt && card.expiresAt < Date.now()) fail('This gift card has expired.');
  if (card.balance <= 0) fail('This gift card has no remaining balance.');

  if (card.recipientUid && card.recipientUid !== ctx.uid) {
    fail('This gift card belongs to a different account.');
  }
  if (!card.recipientUid) {
    // Named cards must be claimed by their recipient. Unassigned cards are
    // public gift cards: the first signed-in person who uses or claims the
    // printed code becomes the holder.
    const email = (ctx.email ?? '').trim().toLowerCase();
    if (card.recipientEmail) {
      if (!email) {
        fail('Sign in with the email address this gift card was issued to.');
      }
      if (email !== card.recipientEmail.trim().toLowerCase()) {
        fail('This gift card was issued to a different email address.');
      }
      fail('Add this card to your wallet first, then apply it to this booking.');
    }
  }

  if (card.kind === 'voucher') {
    if (ctx.caravanId && card.caravanId !== ctx.caravanId) {
      fail('This voucher is valid only for its own caravan.');
    }
    if (
      ctx.startDate != null &&
      ctx.endDate != null &&
      card.startDate != null &&
      card.endDate != null &&
      (ctx.startDate < card.startDate || ctx.endDate > card.endDate)
    ) {
      fail('This voucher is valid only for its own date range.');
    }
  }
}

function applicationFor(card: GiftCard, totalPrice?: number): { applied: number; cashDue: number } {
  const total = totalPrice ?? card.balance;
  const applied = Math.min(Math.max(0, Math.round(total)), card.balance);
  return { applied, cashDue: Math.max(0, Math.round(total) - applied) };
}

/**
 * Validates a card against the current user and booking, then returns how much
 * of it can actually be spent. Throws with a user-facing reason on rejection.
 */
export async function quoteGiftCard(
  rawCode: string,
  ctx: RedemptionContext,
): Promise<RedemptionQuote> {
  const code = normalizeGiftCardCode(rawCode);
  const snap = await getDoc(doc(getDb(), COLLECTIONS.giftCards, code));
  if (!snap.exists()) fail('That gift card code was not recognised.');

  const card = mapGiftCard(snap.id, snap.data());
  assertCardUsable(card, ctx);
  const { applied, cashDue } = applicationFor(card, ctx.totalPrice);

  return {
    card,
    applied,
    cashDue,
    hint:
      card.kind === 'voucher'
        ? `Voucher — restricted to ${card.caravanTitle ?? 'its caravan'}.`
        : 'Wallet credit — usable on any listing, partial amounts allowed.',
  };
}

/**
 * Attaches an email-locked card to the account it was sent to. Idempotent:
 * claiming a card this account already owns is a no-op, and the deterministic
 * ledger ID means the claim row can only be written once.
 */
export async function claimGiftCard(
  code: string,
  user: { uid: string; email: string; displayName: string },
): Promise<GiftCard> {
  const normalized = normalizeGiftCardCode(code);
  const db = getDb();

  return runTransaction(db, async (tx) => {
    const ref = doc(db, COLLECTIONS.giftCards, normalized);
    const snap = await tx.get(ref);
    if (!snap.exists()) fail('That gift card code was not recognised.');

    const card = mapGiftCard(snap.id, snap.data());
    if (card.recipientUid === user.uid) return card;

    if (card.status === 'void') fail('This gift card has been voided.');
    if (card.recipientUid) fail('This gift card belongs to a different account.');
    if (card.recipientEmail && card.recipientEmail.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      fail('This gift card was issued to a different email address.');
    }

    tx.update(ref, {
      recipientUid: user.uid,
      recipientName: user.displayName,
      recipientClaimedAt: Date.now(),
    });
    tx.set(
      doc(db, COLLECTIONS.giftCardLedger, ledgerEntryId('claimed', normalized)),
      ledgerPayload({
        giftCardId: normalized,
        code: normalized,
        kind: 'claimed',
        amount: 0,
        balanceAfter: card.balance,
        actorUid: user.uid,
      }),
    );

    return { ...card, recipientUid: user.uid, recipientName: user.displayName };
  });
}

/* ------------------------------------------------------------------ balance */

export async function getGiftCardsForUser(uid: string): Promise<GiftCard[]> {
  const snap = await getDocs(
    query(
      collection(getDb(), COLLECTIONS.giftCards),
      where('recipientUid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(100),
    ),
  );
  return snap.docs.map((d) => mapGiftCard(d.id, d.data()));
}

export async function getWalletBalance(uid: string): Promise<number> {
  const cards = await getGiftCardsForUser(uid);
  return cards
    .filter((c) => c.kind === 'wallet' && c.status === 'active' && c.balance > 0)
    .reduce((sum, c) => sum + c.balance, 0);
}

export async function getGiftCardLedgerForUser(
  uid: string,
): Promise<GiftCardLedgerEntry[]> {
  const db = getDb();
  const owned = await getDocs(
    query(collection(db, COLLECTIONS.giftCards), where('recipientUid', '==', uid)),
  );
  if (owned.empty) return [];

  const entries: GiftCardLedgerEntry[] = [];
  for (const cardDoc of owned.docs) {
    const snap = await getDocs(
      query(
        collection(db, COLLECTIONS.giftCardLedger),
        where('giftCardId', '==', cardDoc.id),
        orderBy('createdAt', 'desc'),
        limit(50),
      ),
    );
    snap.forEach((d) => entries.push(mapLedgerEntry(d.id, d.data())));
  }
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

/* ------------------------------------------------------------- redemption  */

export interface RedemptionResult {
  bookingId: string;
  applied: number;
  cashDue: number;
}

/**
 * Writes the booking, its contract, the gift card debit, and the ledger row in
 * a single transaction. The card is only ever debited by the amount that is
 * recorded as its hold, so a racing second redemption cannot push the balance
 * below zero: the rules re-evaluate against committed state and reject it.
 */
export async function redeemGiftCardAndCreateBooking(params: {
  bookingRef: DocumentReference;
  contractRef: DocumentReference;
  booking: NewBooking;
  contract: Record<string, unknown>;
  cardCode: string;
  uid: string;
}): Promise<RedemptionResult> {
  const db = getDb();
  const code = normalizeGiftCardCode(params.cardCode);
  const bookingId = params.bookingRef.id;
  const activeBookings = await getDocs(
    query(
      collection(db, COLLECTIONS.bookings),
      where('caravanId', '==', params.booking.caravanId),
      where('status', 'in', ['pending', 'accepted']),
      where('endDate', '>', params.booking.startDate),
    ),
  );
  if (activeBookings.docs.some((entry) => Number(entry.data().startDate) < params.booking.endDate)) {
    fail('These dates were just reserved by another renter. Please choose different dates.');
  }

  return runTransaction(db, async (tx) => {
    const cardRef = doc(db, COLLECTIONS.giftCards, code);
    const snap = await tx.get(cardRef);
    if (!snap.exists()) fail('That gift card code was not recognised.');

    const card = mapGiftCard(snap.id, snap.data());
    assertCardUsable(card, {
      uid: params.uid,
      caravanId: params.booking.caravanId,
      startDate: params.booking.startDate,
      endDate: params.booking.endDate,
      totalPrice: params.booking.totalPrice,
    });

    const { applied, cashDue } = applicationFor(card, params.booking.totalPrice);
    if (applied <= 0) fail('This gift card has no balance left to apply.');

    const remaining = card.balance - applied;
    const fullySpent = remaining <= 0;

    tx.set(params.bookingRef, stripUndefined({
      ...params.booking,
      giftCardId: code,
      giftCardCode: code,
      giftCardApplied: applied,
      cashDue,
      status: 'pending',
      contractId: params.contractRef.id,
      createdAt: Date.now(),
    }));
    tx.set(params.contractRef, {
      ...params.contract,
      bookingId,
      acceptedAt: Date.now(),
    });
    tx.update(cardRef, {
      recipientUid: card.recipientUid ?? params.uid,
      balance: remaining,
      status: fullySpent ? 'used' : 'active',
      heldBookingId: bookingId,
      heldAmount: applied,
      lastUsedAt: Date.now(),
      lastUsedBy: params.uid,
    });
    tx.set(
      doc(db, COLLECTIONS.giftCardLedger, ledgerEntryId('applied', bookingId)),
      ledgerPayload({
        giftCardId: code,
        code,
        kind: 'applied',
        amount: -applied,
        balanceAfter: remaining,
        bookingId,
        actorUid: params.uid,
      }),
    );

    return { bookingId, applied, cashDue };
  });
}

/**
 * Returns reserved credit to the card when the booking it funded is cancelled
 * or rejected. The amount comes from the card's own recorded hold rather than
 * from a client-supplied number, the booking must already be in a terminal
 * state, and clearing the hold makes the operation safe to retry: a second
 * call finds nothing held and returns 0.
 */
export async function releaseGiftCardForBooking(params: {
  code: string;
  bookingId: string;
  actorUid: string;
}): Promise<number> {
  const db = getDb();
  const code = normalizeGiftCardCode(params.code);

  return runTransaction(db, async (tx) => {
    const cardRef = doc(db, COLLECTIONS.giftCards, code);
    const [cardSnap, bookingSnap] = await Promise.all([
      tx.get(cardRef),
      tx.get(doc(db, COLLECTIONS.bookings, params.bookingId)),
    ]);
    if (!cardSnap.exists() || !bookingSnap.exists()) return 0;

    const booking = bookingSnap.data() as Record<string, unknown>;
    if (booking.status !== 'cancelled' && booking.status !== 'rejected') return 0;
    if (booking.giftCardCode !== code) return 0;

    const card = mapGiftCard(cardSnap.id, cardSnap.data());
    if (card.status === 'void') return 0;
    if (card.heldBookingId !== params.bookingId) return 0;
    if (card.heldAmount <= 0) return 0;

    const restored = card.balance + card.heldAmount;
    tx.update(cardRef, {
      balance: restored,
      status: 'active',
      heldBookingId: null,
      heldAmount: 0,
      lastUsedAt: Date.now(),
      lastUsedBy: params.actorUid,
    });
    tx.set(
      doc(db, COLLECTIONS.giftCardLedger, ledgerEntryId('released', params.bookingId)),
      ledgerPayload({
        giftCardId: code,
        code,
        kind: 'released',
        amount: card.heldAmount,
        balanceAfter: restored,
        bookingId: params.bookingId,
        actorUid: params.actorUid,
      }),
    );

    return card.heldAmount;
  });
}
