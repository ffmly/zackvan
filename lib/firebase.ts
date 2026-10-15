import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let cachedGoogleProvider: GoogleAuthProvider | null = null;

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(app);
  return cachedAuth;
}

export function getDb(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(app);
  return cachedDb;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!cachedGoogleProvider) {
    cachedGoogleProvider = new GoogleAuthProvider();
    cachedGoogleProvider.setCustomParameters({ prompt: 'select_account' });
  }
  return cachedGoogleProvider;
}

export const COLLECTIONS = {
  users: 'users',
  caravans: 'caravans',
  bookings: 'bookings',
  contracts: 'contracts',
  vehicleDocuments: 'vehicleDocuments',
  mapLocations: 'mapLocations',
  giftCards: 'giftCards',
  giftCardLedger: 'giftCardLedger',
} as const;
