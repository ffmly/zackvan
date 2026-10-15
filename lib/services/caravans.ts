import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDb, COLLECTIONS } from '@/lib/firebase';
import type { AvailabilityRange, Caravan } from '@/lib/types';
import { chunk } from '@/lib/utils';

type RawCaravan = Omit<Caravan, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

function mapCaravan(
  id: string,
  data: Record<string, unknown>,
): Caravan {
  const toMs = (v: unknown): number => {
    const t = v as { toMillis?: () => number };
    if (typeof t?.toMillis === 'function') return t.toMillis();
    return typeof v === 'number' ? v : Date.now();
  };
  return {
    id,
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
    unavailableRanges:
      (data.unavailableRanges as AvailabilityRange[] | undefined) ?? [],
    published: Boolean(data.published),
    createdAt: toMs(data.createdAt),
    updatedAt: toMs(data.updatedAt),
  };
}

export interface CaravanFilters {
  wilaya?: string;
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  type?: Caravan['type'];
  q?: string;
  startDate?: number;
  endDate?: number;
  ownerId?: string;
  includeUnpublished?: boolean;
}

async function findConflictingCaravanIds(
  caravanIds: string[],
  startMs: number,
  endMs: number,
): Promise<Set<string>> {
  const conflicted = new Set<string>();
  for (const batch of chunk(caravanIds, 10)) {
    if (batch.length === 0) continue;
    const q = query(
      collection(getDb(), COLLECTIONS.bookings),
      where('caravanId', 'in', batch),
      where('status', 'in', ['pending', 'accepted']),
      where('endDate', '>', startMs),
    );
    const snap = await getDocs(q);
    snap.forEach((d) => {
      const b = d.data();
      const bStart = (b.startDate as { toMillis?: () => number })
        ?.toMillis?.()
        ?? (b.startDate as number);
      if (bStart < endMs) conflicted.add(b.caravanId as string);
    });
  }
  return conflicted;
}

export async function listCaravans(
  filters: CaravanFilters = {},
): Promise<Caravan[]> {
  const constraints = [];
  if (filters.ownerId) {
    constraints.push(where('ownerId', '==', filters.ownerId));
    if (!filters.includeUnpublished) {
      constraints.push(where('published', '==', true));
    }
  } else {
    constraints.push(where('published', '==', true));
  }
  constraints.push(orderBy('createdAt', 'desc'), limit(200));

  const snap = await getDocs(
    query(collection(getDb(), COLLECTIONS.caravans), ...constraints),
  );
  let items = snap.docs.map((d) => mapCaravan(d.id, d.data()));

  if (filters.wilaya) {
    const w = filters.wilaya.toLowerCase();
    items = items.filter((c) => c.wilaya.toLowerCase() === w);
  }
  if (filters.minPrice != null) {
    items = items.filter((c) => c.pricePerDay >= filters.minPrice!);
  }
  if (filters.maxPrice != null && filters.maxPrice > 0) {
    items = items.filter((c) => c.pricePerDay <= filters.maxPrice!);
  }
  if (filters.guests != null && filters.guests > 0) {
    items = items.filter((c) => c.specs.capacity >= filters.guests!);
  }
  if (filters.type) {
    items = items.filter((c) => c.type === filters.type);
  }
  if (filters.q) {
    const qText = filters.q.trim().toLowerCase();
    if (qText.length > 0) {
      items = items.filter(
        (c) =>
          c.title.toLowerCase().includes(qText) ||
          c.description.toLowerCase().includes(qText) ||
          c.wilaya.toLowerCase().includes(qText),
      );
    }
  }

  if (
    filters.startDate != null &&
    filters.endDate != null &&
    items.length > 0
  ) {
    const conflicts = await findConflictingCaravanIds(
      items.map((c) => c.id),
      filters.startDate!,
      filters.endDate!,
    );
    items = items.filter(
      (c) =>
        !conflicts.has(c.id) &&
        !c.unavailableRanges.some((r) =>
          r.start < filters.endDate! && filters.startDate! < r.end,
        ),
    );
  }

  return items;
}

export async function getCaravan(id: string): Promise<Caravan | null> {
  const snap = await getDoc(doc(getDb(), COLLECTIONS.caravans, id));
  return snap.exists() ? mapCaravan(snap.id, snap.data()) : null;
}

export async function createCaravan(data: RawCaravan): Promise<string> {
  const ref = await addDoc(collection(getDb(), COLLECTIONS.caravans), {
    ...data,
    unavailableRanges: [],
    published: data.published ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCaravan(
  id: string,
  patch: Partial<RawCaravan>,
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.caravans, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCaravan(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), COLLECTIONS.caravans, id));
}

export async function setCaravanPublished(
  id: string,
  published: boolean,
): Promise<void> {
  await updateCaravan(id, { published });
}

export async function addUnavailableRange(
  id: string,
  range: AvailabilityRange,
): Promise<void> {
  const snap = await getDoc(doc(getDb(), COLLECTIONS.caravans, id));
  if (!snap.exists()) throw new Error('Caravan not found');
  const current = ((snap.data().unavailableRanges as AvailabilityRange[]) ?? []).concat(
    range,
  );
  await updateCaravan(id, { unavailableRanges: current });
}

export async function removeUnavailableRange(
  id: string,
  index: number,
): Promise<void> {
  const snap = await getDoc(doc(getDb(), COLLECTIONS.caravans, id));
  if (!snap.exists()) throw new Error('Caravan not found');
  const current = (snap.data().unavailableRanges as AvailabilityRange[]) ?? [];
  current.splice(index, 1);
  await updateCaravan(id, { unavailableRanges: current });
}
