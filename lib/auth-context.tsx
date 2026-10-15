'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { usePathname, useRouter } from 'next/navigation';
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase';
import {
  ensureUserProfile,
  getUserProfile,
  setUserRole,
} from '@/lib/services/users';
import type { UserProfile, UserRole } from '@/lib/types';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/email-already-in-use': 'An account already exists with this email.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests':
    'Too many attempts. Please try again in a few minutes.',
  'auth/network-request-failed':
    'Network error. Check your internet connection.',
};

function friendlyAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    return (
      AUTH_ERROR_MESSAGES[error.code] ??
      error.message.replace('Firebase: ', '').replace(/\(auth.*\)\.?/, '')
    );
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
}

interface AuthContextValue {
  user: UserProfile | null;
  firebaseUid: string | null;
  initializing: boolean;
  signUpEmail(input: SignUpInput): Promise<void>;
  signInEmail(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  logout(): Promise<void>;
  becomeOwner(): Promise<void>;
  reloadProfile(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (fbUser) => {
      setFirebaseUid(fbUser?.uid ?? null);
      if (fbUser) {
        try {
          setUser(await getUserProfile(fbUser.uid));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const signUpEmail = useCallback(async (input: SignUpInput) => {
    try {
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        input.email.trim(),
        input.password,
      );
      await updateProfile(cred.user, { displayName: input.displayName });
      await ensureUserProfile(cred.user, {
        role: input.role,
        phone: input.phone,
      });
      await ensureProfileRefresh();
    } catch (error) {
      throw new Error(friendlyAuthError(error));
    }
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    } catch (error) {
      throw new Error(friendlyAuthError(error));
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const cred = await signInWithPopup(getFirebaseAuth(), getGoogleProvider());
      await ensureUserProfile(cred.user);
      await ensureProfileRefresh();
    } catch (error) {
      if (
        error instanceof FirebaseError &&
        error.code === 'auth/popup-closed-by-user'
      ) {
        return;
      }
      throw new Error(friendlyAuthError(error));
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(getFirebaseAuth());
    setUser(null);
  }, []);

  const becomeOwner = useCallback(async () => {
    if (!firebaseUid) throw new Error('You must be signed in.');
    await setUserRole(firebaseUid, 'owner');
    await ensureProfileRefresh();
  }, [firebaseUid]);

  async function ensureProfileRefresh() {
    const currentUid = getFirebaseAuth().currentUser?.uid;
    if (!currentUid) return;
    setUser(await getUserProfile(currentUid));
  }

  const reloadProfile = useCallback(async () => {
    const currentUid = getFirebaseAuth().currentUser?.uid;
    if (!currentUid) return;
    setUser(await getUserProfile(currentUid));
  }, []);

  const value = useMemo(
    () => ({
      user,
      firebaseUid,
      initializing,
      signUpEmail,
      signInEmail,
      signInWithGoogle,
      logout,
      becomeOwner,
      reloadProfile,
    }),
    [
      user,
      firebaseUid,
      initializing,
      signUpEmail,
      signInEmail,
      signInWithGoogle,
      logout,
      becomeOwner,
      reloadProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const { user, firebaseUid, initializing } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initializing && !user && !firebaseUid) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [initializing, user, firebaseUid, router, pathname]);

  if (initializing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-slate-900">Access restricted</h1>
        <p className="mt-2 text-sm text-slate-600">
          This area requires a{' '}
          <span className="font-semibold">{roles.join(' / ')}</span> account.
          Your current role is{' '}
          <span className="font-semibold">{user.role}</span>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
