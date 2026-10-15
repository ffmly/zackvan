import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDb, COLLECTIONS } from '@/lib/firebase';
import type { AvailabilityRange, Booking, BookingStatus } from '@/lib/types';
import { ACTIVE_BOOKING_STATUSES } from '@/lib/types';

function mapBooking(id: string, data: Record<string, unknown>): Booking {
  const toMs = (v: unknown): number => {
    const t = v as { toMillis?: () => number };
    if (typeof t?.toMillis === 'function') return t.toMillis();
    return typeof v === 'number' ? v : Date.now();
  };
  return {
    id,
    caravanId: data.caravanId as string,
    caravanTitle: (data.caravanTitle as string) ?? '',
    ownerId: (data.ownerId as string) ?? '',
    ownerName: (data.ownerName as string) ?? '',
    renterId: (data.renterId as string) ?? '',
    renterName: (data.renterName as string) ?? '',
    startDate: toMs(data.startDate),
    endDate: toMs(data.endDate),
    days: (data.days as number) ?? 1,
    pricePerDay: (data.pricePerDay as number) ?? 0,
    totalPrice: (data.totalPrice as number) ?? 0,
    status: (data.status as BookingStatus) ?? 'pending',
    message: data.message as string | undefined,
    contractId: data.contractId as string | undefined,
    giftCardId: data.giftCardId as string | undefined,
    giftCardCode: data.giftCardCode as string | undefined,
    giftCardApplied: (data.giftCardApplied as number) ?? 0,
    cashDue: (data.cashDue as number) ?? ((data.totalPrice as number) ?? 0),
    createdAt: toMs(data.createdAt),
  };
}

export async function getActiveBookingRanges(
  caravanId: string,
): Promise<AvailabilityRange[]> {
  const snap = await getDocs(
    query(
      collection(getDb(), COLLECTIONS.bookings),
      where('caravanId', '==', caravanId),
      where('status', 'in', ACTIVE_BOOKING_STATUSES),
    ),
  );
  return snap.docs.map((d) => ({
    start: d.data().startDate as number,
    end: d.data().endDate as number,
  }));
}

export async function getBookingsForCaravan(
  caravanId: string,
): Promise<Booking[]> {
  const snap = await getDocs(
    query(
      collection(getDb(), COLLECTIONS.bookings),
      where('caravanId', '==', caravanId),
      orderBy('startDate', 'asc'),
      limit(100),
    ),
  );
  return snap.docs.map((d) => mapBooking(d.id, d.data()));
}

export async function getBookingsForOwner(ownerId: string): Promise<Booking[]> {
  const snap = await getDocs(
    query(
      collection(getDb(), COLLECTIONS.bookings),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc'),
      limit(200),
    ),
  );
  return snap.docs.map((d) => mapBooking(d.id, d.data()));
}

export async function getBookingsForRenter(
  renterId: string,
): Promise<Booking[]> {
  const snap = await getDocs(
    query(
      collection(getDb(), COLLECTIONS.bookings),
      where('renterId', '==', renterId),
      orderBy('createdAt', 'desc'),
      limit(200),
    ),
  );
  return snap.docs.map((d) => mapBooking(d.id, d.data()));
}

export async function hasActiveConflict(
  caravanId: string,
  startMs: number,
  endMs: number,
): Promise<boolean> {
  const ranges = await getActiveBookingRanges(caravanId);
  return ranges.some((r) => r.start < endMs && startMs < r.end);
}

export async function updateBookingStatus(
  booking: Booking,
  status: BookingStatus,
  actorUid: string,
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.bookings, booking.id), { status });

  // Credit reserved by a gift card goes back to the card when the booking it
  // funded will not go ahead. A completed trip is not refunded. The release is
  // idempotent: the card's hold is cleared by the first successful call, so a
  // retry is a no-op rather than a second credit.
  const reversible: BookingStatus[] = ['rejected', 'cancelled'];
  if (booking.giftCardCode && reversible.includes(status)) {
    const { releaseGiftCardForBooking } = await import('@/lib/services/giftcards');
    await releaseGiftCardForBooking({
      code: booking.giftCardCode,
      bookingId: booking.id,
      actorUid,
    }).catch(() => undefined);
  }
}
