import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
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
  const batch = writeBatch(getDb());

  const bookingRef = doc(collection(getDb(), COLLECTIONS.bookings));
  const contractRef = doc(collection(getDb(), COLLECTIONS.contracts));

  batch.set(bookingRef, stripUndefined({
    ...booking,
    status: 'pending',
    giftCardId: booking.giftCardId ?? null,
    giftCardCode: booking.giftCardCode ?? null,
    giftCardApplied: booking.giftCardApplied ?? 0,
    cashDue: booking.cashDue ?? booking.totalPrice,
    contractId: contractRef.id,
    createdAt: Date.now(),
  }));

  batch.set(contractRef, {
    ...contract,
    bookingId: bookingRef.id,
    acceptedAt: Date.now(),
  });

  await batch.commit();
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
