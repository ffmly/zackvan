import { collection, getDocs } from 'firebase/firestore';
import { getDb, COLLECTIONS } from '@/lib/firebase';
import type { Booking, Caravan, ContractRecord, UserProfile } from '@/lib/types';

function timestampMs(value: unknown): number {
  const candidate = value as { toMillis?: () => number } | undefined;
  if (typeof candidate?.toMillis === 'function') return candidate.toMillis();
  return typeof value === 'number' ? value : Date.now();
}

export async function listAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(getDb(), COLLECTIONS.users));
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: (data.email as string) ?? '',
        displayName: (data.displayName as string) ?? '',
        photoURL: data.photoURL as string | undefined,
        phone: (data.phone as string) ?? '',
        role: (data.role as UserProfile['role']) ?? 'renter',
        createdAt: timestampMs(data.createdAt),
      } satisfies UserProfile;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listAllCaravansForAdmin(): Promise<Caravan[]> {
  const snap = await getDocs(collection(getDb(), COLLECTIONS.caravans));
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ownerId: (data.ownerId as string) ?? '',
        ownerName: (data.ownerName as string) ?? '',
        ownerPhone: (data.ownerPhone as string) ?? '',
        title: (data.title as string) ?? '',
        description: (data.description as string) ?? '',
        type: (data.type as Caravan['type']) ?? 'caravan',
        wilaya: (data.wilaya as string) ?? '',
        commune: data.commune as string | undefined,
        locationGeo: data.locationGeo as Caravan['locationGeo'],
        pricePerDay: (data.pricePerDay as number) ?? 0,
        specs: (data.specs as Caravan['specs']) ?? {
          capacity: 2,
          beds: 1,
          hasBathroom: false,
          hasKitchen: false,
          hasAC: false,
        },
        extras: (data.extras as string[]) ?? [],
        images: (data.images as Caravan['images']) ?? [],
        unavailableRanges: (data.unavailableRanges as Caravan['unavailableRanges']) ?? [],
        published: Boolean(data.published),
        createdAt: timestampMs(data.createdAt),
        updatedAt: timestampMs(data.updatedAt),
      } satisfies Caravan;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listAllBookingsForAdmin(): Promise<Booking[]> {
  const snap = await getDocs(collection(getDb(), COLLECTIONS.bookings));
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        caravanId: (data.caravanId as string) ?? '',
        caravanTitle: (data.caravanTitle as string) ?? '',
        ownerId: (data.ownerId as string) ?? '',
        ownerName: (data.ownerName as string) ?? '',
        renterId: (data.renterId as string) ?? '',
        renterName: (data.renterName as string) ?? '',
        startDate: timestampMs(data.startDate),
        endDate: timestampMs(data.endDate),
        days: (data.days as number) ?? 1,
        pricePerDay: (data.pricePerDay as number) ?? 0,
        totalPrice: (data.totalPrice as number) ?? 0,
        status: (data.status as Booking['status']) ?? 'pending',
        message: data.message as string | undefined,
        contractId: data.contractId as string | undefined,
        giftCardId: data.giftCardId as string | undefined,
        giftCardCode: data.giftCardCode as string | undefined,
        giftCardApplied: (data.giftCardApplied as number) ?? 0,
        cashDue: (data.cashDue as number) ?? (data.totalPrice as number) ?? 0,
        createdAt: timestampMs(data.createdAt),
      } satisfies Booking;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listAllContractsForAdmin(): Promise<ContractRecord[]> {
  const snap = await getDocs(collection(getDb(), COLLECTIONS.contracts));
  return snap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ContractRecord, 'id'>) }))
    .sort((a, b) => Number(b.acceptedAt ?? 0) - Number(a.acceptedAt ?? 0));
}
