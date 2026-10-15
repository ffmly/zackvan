import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { getDb, COLLECTIONS } from '@/lib/firebase';
import type { Booking, ContractRecord } from '@/lib/types';
import { stripUndefined } from '@/lib/utils';

export type NewContract = Omit<
  ContractRecord,
  'id' | 'acceptedAt' | 'bookingId'
>;
export type NewBooking = Omit<
  Booking,
  'id' | 'createdAt' | 'giftCardId' | 'giftCardCode' | 'giftCardApplied' | 'cashDue'
> & {
  giftCardId?: string;
  giftCardCode?: string;
  giftCardApplied?: number;
  cashDue?: number;
};

export async function signContractAndCreateBooking(
  booking: NewBooking,
  contract: NewContract,
): Promise<string> {
  const db = getDb();
  const bookingRef = doc(collection(db, COLLECTIONS.bookings));
  const contractRef = doc(collection(db, COLLECTIONS.contracts));
  // Query reads are not supported inside the version of the web SDK's
  // Transaction type that this app uses. Check availability immediately before
  // the atomic booking/contract write; the UI repeats this check too.
  const active = await getDocs(
    query(
      collection(db, COLLECTIONS.bookings),
      where('caravanId', '==', booking.caravanId),
      where('status', 'in', ['pending', 'accepted']),
      where('endDate', '>', booking.startDate),
    ),
  );
  const conflict = active.docs.some((entry) => Number(entry.data().startDate) < booking.endDate);
  if (conflict) {
    throw new Error('These dates were just reserved by another renter. Please choose different dates.');
  }

  await runTransaction(db, async (transaction) => {
    const now = Date.now();
    transaction.set(bookingRef, stripUndefined({
      ...booking,
      status: 'pending',
      giftCardId: booking.giftCardId ?? null,
      giftCardCode: booking.giftCardCode ?? null,
      giftCardApplied: booking.giftCardApplied ?? 0,
      cashDue: booking.cashDue ?? booking.totalPrice,
      contractId: contractRef.id,
      createdAt: now,
    }));
    transaction.set(contractRef, { ...contract, bookingId: bookingRef.id, acceptedAt: now });
  });
  return bookingRef.id;
}

export async function getContractsForUser(
  userId: string,
): Promise<ContractRecord[]> {
  const snap = await getDocs(
    query(collection(getDb(), COLLECTIONS.contracts), where('userId', '==', userId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContractRecord, 'id'>) }));
}

export async function getContractsForOwner(ownerId: string): Promise<ContractRecord[]> {
  const snap = await getDocs(
    query(collection(getDb(), COLLECTIONS.contracts), where('ownerId', '==', ownerId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContractRecord, 'id'>) }));
}

export async function getContractsForBooking(
  bookingId: string,
): Promise<ContractRecord[]> {
  const snap = await getDocs(
    query(
      collection(getDb(), COLLECTIONS.contracts),
      where('bookingId', '==', bookingId),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ContractRecord, 'id'>) }));
}
