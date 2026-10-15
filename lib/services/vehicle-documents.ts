import { doc, getDoc, getDocs, setDoc, collection } from 'firebase/firestore';
import { COLLECTIONS, getDb } from '@/lib/firebase';
import type { CloudinaryImage, VehicleDocument } from '@/lib/types';

function toMs(value: unknown): number {
  const timestamp = value as { toMillis?: () => number } | undefined;
  if (typeof timestamp?.toMillis === 'function') return timestamp.toMillis();
  return typeof value === 'number' ? value : Date.now();
}

function mapDocument(caravanId: string, data: Record<string, unknown>): VehicleDocument {
  return {
    caravanId,
    ownerId: (data.ownerId as string) ?? '',
    registrationCard: data.registrationCard as CloudinaryImage,
    uploadedAt: toMs(data.uploadedAt),
  };
}

export async function getVehicleDocument(caravanId: string): Promise<VehicleDocument | null> {
  const snapshot = await getDoc(doc(getDb(), COLLECTIONS.vehicleDocuments, caravanId));
  return snapshot.exists() ? mapDocument(snapshot.id, snapshot.data()) : null;
}

export async function saveVehicleDocument(
  caravanId: string,
  ownerId: string,
  registrationCard: CloudinaryImage,
): Promise<void> {
  await setDoc(doc(getDb(), COLLECTIONS.vehicleDocuments, caravanId), {
    ownerId,
    registrationCard,
    uploadedAt: Date.now(),
  });
}

export async function listAllVehicleDocuments(): Promise<VehicleDocument[]> {
  const snapshot = await getDocs(collection(getDb(), COLLECTIONS.vehicleDocuments));
  return snapshot.docs.map((entry) => mapDocument(entry.id, entry.data()));
}
