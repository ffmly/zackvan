import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getDb, COLLECTIONS } from '@/lib/firebase';
import type { UserProfile, UserRole } from '@/lib/types';

function mapProfile(id: string, data: Record<string, unknown>): UserProfile {
  return {
    uid: id,
    email: (data.email as string) ?? '',
    displayName: (data.displayName as string) ?? '',
    photoURL: data.photoURL as string | undefined,
    phone: (data.phone as string) ?? '',
    role: (data.role as UserRole) ?? 'renter',
    createdAt:
      typeof (data.createdAt as { toMillis?: () => number })?.toMillis ===
      'function'
        ? (data.createdAt as { toMillis: () => number }).toMillis()
        : ((data.createdAt as number) ?? Date.now()),
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getDb(), COLLECTIONS.users, uid));
  return snap.exists() ? mapProfile(snap.id, snap.data()) : null;
}

export async function ensureUserProfile(
  user: Pick<User, 'uid' | 'email' | 'displayName' | 'photoURL'>,
  options?: { role?: UserRole; phone?: string },
): Promise<UserProfile> {
  const ref = doc(getDb(), COLLECTIONS.users, user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const profile = mapProfile(snap.id, snap.data());
    if (options?.role && options.role !== profile.role) {
      await updateDoc(ref, { role: options.role });
      profile.role = options.role;
    }
    if (options?.phone && !profile.phone) {
      await updateDoc(ref, { phone: options.phone });
      profile.phone = options.phone;
    }
    return profile;
  }

  const fallbackName =
    user.displayName || user.email?.split('@')[0] || 'Zackvan member';
  await setDoc(ref, {
    uid: user.uid,
    email: user.email ?? '',
    displayName: fallbackName,
    photoURL: user.photoURL ?? '',
    phone: options?.phone ?? '',
    role: options?.role ?? 'renter',
    createdAt: serverTimestamp(),
  });

  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: fallbackName,
    photoURL: user.photoURL ?? undefined,
    phone: options?.phone ?? '',
    role: options?.role ?? 'renter',
    createdAt: Date.now(),
  };
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, 'displayName' | 'phone' | 'photoURL'>>,
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.users, uid), patch);
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.users, uid), { role });
}
