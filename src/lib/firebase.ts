import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { UserRole } from '../types.ts';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const OWNER_BOOTSTRAP_EMAIL = '12410331@student.unklab.ac.id';

export const TEAM_BOOTSTRAP_EMAILS = [
  '12410331@student.unklab.ac.id',
  's22319041@student.unklab.ac.id',
  '12410503@student.unklab.ac.id',
  '12410384@student.unklab.ac.id',
  '12410388@student.unklab.ac.id',
] as const;

export const DESIGNATED_ACTOR_PROFILES: Record<
  string,
  { role: UserRole; nama: string; linkedTutorId?: string }
> = {
  's22319041@student.unklab.ac.id': { role: 'admin', nama: 'Admin Bimbel Cerdas' },
  '12410503@student.unklab.ac.id': {
    role: 'tutor',
    nama: 'Tutor Bimbel Cerdas',
    linkedTutorId: 'tutor-1',
  },
  '12410388@student.unklab.ac.id': { role: 'orang_tua', nama: 'Orang Tua Bimbel Cerdas' },
  '12410384@student.unklab.ac.id': { role: 'pemilik', nama: 'Pemilik Bimbel Cerdas' },
  'tirsaadmin@gmail.com': { role: 'admin', nama: 'Tirsa (Admin)' },
  'lilisortu@gmail.com': { role: 'orang_tua', nama: 'Lilis (Orang Tua)' },
  'auroratutor@gmail.com': { role: 'tutor', nama: 'Aurora (Tutor)', linkedTutorId: 'tutor-1' },
  'gracepemilik@gmail.com': { role: 'pemilik', nama: 'Grace (Pemilik)' },
};

export function isBootstrapTeamEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return TEAM_BOOTSTRAP_EMAILS.some((allowed) => allowed === normalized);
}

export function resolveInitialActorProfile(
  email?: string | null,
  displayName?: string | null
): { role: UserRole; nama: string; linkedTutorId?: string } {
  const normalized = (email || '').trim().toLowerCase();
  const designated = DESIGNATED_ACTOR_PROFILES[normalized];
  if (designated) {
    return {
      role: designated.role,
      nama: displayName?.trim() || designated.nama,
      ...(designated.linkedTutorId ? { linkedTutorId: designated.linkedTutorId } : {}),
    };
  }
  const initialRole: UserRole = isBootstrapTeamEmail(normalized) ? 'pemilik' : 'orang_tua';
  return {
    role: initialRole,
    nama: displayName?.trim() || normalized.split('@')[0] || 'Pengguna Bimbel Cerdas',
  };
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  if (error instanceof Error) {
    try {
      const existingParsed = JSON.parse(error.message) as Partial<FirestoreErrorInfo>;
      if (existingParsed && existingParsed.operationType && existingParsed.authInfo) {
        throw error;
      }
    } catch (parseErr) {
      if (parseErr === error) throw error;
    }
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
