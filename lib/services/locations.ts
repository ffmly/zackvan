import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb, COLLECTIONS } from '@/lib/firebase';
import type { MapLocation } from '@/lib/types';
import { MAP_LOCATIONS_SEED } from '@/lib/data/map-seed';

export async function listMapLocations(): Promise<MapLocation[]> {
  const snap = await getDocs(collection(getDb(), COLLECTIONS.mapLocations));

  if (snap.empty) {
    // Anonymous visitors can read map locations but are intentionally not
    // allowed to write them. Return the bundled seed data as the canonical
    // fallback instead of attempting forbidden client-side writes.
    return [...MAP_LOCATIONS_SEED].sort((a, b) =>
      a.type === b.type
        ? a.name.localeCompare(b.name)
        : a.type.localeCompare(b.type),
    );
  }

  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<MapLocation, 'id'>) }))
    .filter((l) => l.name && l.geo)
    .sort((a, b) =>
      a.type === b.type
        ? a.name.localeCompare(b.name)
        : a.type.localeCompare(b.type),
    );
}

export async function seedMapLocations(): Promise<void> {
  for (const loc of MAP_LOCATIONS_SEED) {
    await setDoc(
      doc(getDb(), COLLECTIONS.mapLocations, loc.id),
      { ...loc, createdAt: serverTimestamp() },
      { merge: true },
    );
  }
}
