import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  isBootstrapTeamEmail,
  OperationType,
  testConnection,
} from '../lib/firebase.ts';
import {
  calculateSppInvoice,
  canRolePerformAction,
  checkThreeConsecutiveAbsences,
  computeClassStatus,
  formatPeriode,
  generateReceiptNumber,
  MAX_CLASS_CAPACITY,
  MIN_CLASS_STUDENTS,
  type ProtectedAction,
  REGISTRATION_FEE,
  SESSION_DURATION_MINUTES,
  TUTOR_HONOR_PER_SESSION,
} from '../lib/businessRules.ts';
import {
  DEMO_USERS,
  SEED_CLASSES,
  SEED_FEATURE_FLAGS,
  SEED_FOLLOWUPS,
  SEED_INVOICES,
  SEED_NOTIFICATIONS,
  SEED_PAYMENTS,
  SEED_PROGRAMS,
  SEED_RECEIPTS,
  SEED_REGISTRATIONS,
  SEED_RELIEF_REQUESTS,
  SEED_SCHEDULES,
  SEED_STUDENT_ATTENDANCE,
  SEED_STUDENTS,
  SEED_TUTOR_ATTENDANCE,
  SEED_TUTORS,
  SEED_WAITLISTS,
  TEST_ACCOUNTS_BY_ROLE,
} from '../data/seedData.ts';
import type {
  AbsenceFollowup,
  AdminBetaFlagKey,
  AppView,
  AttendanceStatus,
  ClassRoom,
  FeatureFlagConfig,
  FollowupStatus,
  Invoice,
  InvoiceStatus,
  NotificationItem,
  Payment,
  PaymentMethod,
  Program,
  Receipt,
  Registration,
  ReliefDecision,
  ReliefRequest,
  ReliefType,
  Schedule,
  Student,
  StudentAttendance,
  StudentStatus,
  ToastMessage,
  Tutor,
  TutorAttendance,
  UserAccount,
  UserRole,
  Waitlist,
} from '../types.ts';

interface RegisterStudentInput {
  namaSiswa: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  asalSekolah: string;
  idProgram: string;
  idKelas: string;
}

interface RecordAttendanceInput {
  idJadwal: string;
  tanggal: string;
  hadirMengajar: boolean;
  isPengganti: boolean;
  idTutorPengganti?: string;
  kehadiran: { idSiswa: string; status: AttendanceStatus; catatan?: string }[];
}

interface AppDataContextValue {
  view: AppView;
  setView: (v: AppView) => void;
  authMode: 'none' | 'demo' | 'firebase';
  authReady: boolean;
  isLoggingIn: boolean;
  currentUser: UserAccount | null;
  activeRole: UserRole;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role: UserRole) => void;
  loginWithTestCredential: (
    email: string,
    kodeUji: string
  ) => { ok: boolean; error?: string; role?: UserRole };
  logout: () => Promise<void>;
  updateOwnProfile: (payload: { nama: string; noTelepon: string; alamat: string }) => Promise<void>;

  // Data collections
  usersList: UserAccount[];
  programs: Program[];
  tutors: Tutor[];
  classes: ClassRoom[];
  schedules: Schedule[];
  students: Student[];
  registrations: Registration[];
  waitlists: Waitlist[];
  studentAttendance: StudentAttendance[];
  tutorAttendance: TutorAttendance[];
  invoices: Invoice[];
  payments: Payment[];
  receipts: Receipt[];
  notifications: NotificationItem[];
  followups: AbsenceFollowup[];
  reliefRequests: ReliefRequest[];
  featureFlags: FeatureFlagConfig[];

  // Feature flags (Admin beta features)
  isFeatureEnabled: (key: AdminBetaFlagKey) => boolean;
  setFeatureFlag: (key: AdminBetaFlagKey, enabled: boolean) => Promise<void>;
  toggleFeatureFlag: (key: AdminBetaFlagKey) => Promise<void>;

  // Actions
  registerChild: (input: RegisterStudentInput) => Promise<{ status: string; isWaitlist: boolean }>;
  markNotificationRead: (id: string) => Promise<void>;
  submitReliefRequest: (input: {
    idTagihan: string;
    jenisPengajuan: ReliefType;
    alasan: string;
  }) => Promise<void>;
  recordTutorSessionAndAttendance: (input: RecordAttendanceInput) => Promise<{ triggeredAlerts: number }>;
  recordInvoicePayment: (idTagihan: string, metodeBayar: PaymentMethod) => Promise<Receipt>;
  markInvoiceOverdue: (idTagihan: string) => Promise<void>;
  generateMonthlyInvoices: (bulan: number, tahun: number) => Promise<number>;
  confirmRegistrationPayment: (idRegistrasi: string, metodeBayar: PaymentMethod) => Promise<Receipt | null>;
  updateStudentAdmin: (
    studentId: string,
    updates: { namaSiswa: string; asalSekolah: string; idKelas: string; statusSiswa: StudentStatus }
  ) => Promise<void>;
  promoteWaitlistStudent: (idWaitlist: string, targetClassId: string) => Promise<void>;
  cancelWaitlist: (idWaitlist: string) => Promise<void>;
  updateFollowupCall: (
    idFollowup: string,
    status: FollowupStatus,
    hasilPanggilan: string
  ) => Promise<void>;
  decideReliefRequest: (
    idRelief: string,
    decision: Exclude<ReliefDecision, 'Menunggu'>,
    catatanPemilik: string
  ) => Promise<void>;
  updateUserRole: (
    uid: string,
    role: UserRole,
    linkedTutorId?: string,
    statusAktif?: boolean
  ) => Promise<void>;

  // Master CRUD (Admin)
  saveProgram: (item: Omit<Program, 'id'> & { id?: string }) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  saveTutor: (item: Omit<Tutor, 'id'> & { id?: string }) => Promise<void>;
  deleteTutor: (id: string) => Promise<void>;
  saveClass: (item: Omit<ClassRoom, 'id'> & { id?: string }) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  saveSchedule: (item: Omit<Schedule, 'id'> & { id?: string }) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;

  // Toasts
  toasts: ToastMessage[];
  addToast: (type: ToastMessage['type'], title: string, description?: string) => void;
  dismissToast: (id: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function stripTimestamps<T>(raw: Record<string, unknown>): T {
  const { createdAt: _c, updatedAt: _u, ...rest } = raw;
  return rest as T;
}

function formatDocDate(val: unknown): string {
  if (typeof val === 'string' && val.length > 0) return val;
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
  }
  return todayISO();
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<AppView>('public');
  const [authMode, setAuthMode] = useState<'none' | 'demo' | 'firebase'>('none');
  const [authReady, setAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  const [usersList, setUsersList] = useState<UserAccount[]>(Object.values(DEMO_USERS));
  const [programs, setPrograms] = useState<Program[]>(SEED_PROGRAMS);
  const [tutors, setTutors] = useState<Tutor[]>(SEED_TUTORS);
  const [classes, setClasses] = useState<ClassRoom[]>(SEED_CLASSES);
  const [schedules, setSchedules] = useState<Schedule[]>(SEED_SCHEDULES);
  const [students, setStudents] = useState<Student[]>(SEED_STUDENTS);
  const [registrations, setRegistrations] = useState<Registration[]>(SEED_REGISTRATIONS);
  const [waitlists, setWaitlists] = useState<Waitlist[]>(SEED_WAITLISTS);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendance[]>(SEED_STUDENT_ATTENDANCE);
  const [tutorAttendance, setTutorAttendance] = useState<TutorAttendance[]>(SEED_TUTOR_ATTENDANCE);
  const [invoices, setInvoices] = useState<Invoice[]>(SEED_INVOICES);
  const [payments, setPayments] = useState<Payment[]>(SEED_PAYMENTS);
  const [receipts, setReceipts] = useState<Receipt[]>(SEED_RECEIPTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);
  const [followups, setFollowups] = useState<AbsenceFollowup[]>(SEED_FOLLOWUPS);
  const [reliefRequests, setReliefRequests] = useState<ReliefRequest[]>(SEED_RELIEF_REQUESTS);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagConfig[]>(SEED_FEATURE_FLAGS);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastMessage['type'], title: string, description?: string) => {
    const id = makeId('toast');
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load public catalog on startup + test Firestore connection
  const loadPublicCatalog = useCallback(async () => {
    try {
      const [progSnap, classSnap, schedSnap] = await Promise.all([
        getDocs(collection(db, 'programs')),
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'schedules')),
      ]);
      if (!progSnap.empty) {
        setPrograms(
          progSnap.docs.map((d) => ({
            id: d.id,
            ...stripTimestamps<Omit<Program, 'id'>>(d.data()),
          }))
        );
      }
      if (!classSnap.empty) {
        setClasses(
          classSnap.docs.map((d) => ({
            id: d.id,
            ...stripTimestamps<Omit<ClassRoom, 'id'>>(d.data()),
          }))
        );
      }
      if (!schedSnap.empty) {
        setSchedules(
          schedSnap.docs.map((d) => ({
            id: d.id,
            ...stripTimestamps<Omit<Schedule, 'id'>>(d.data()),
          }))
        );
      }
    } catch {
      // Keep seed catalog if offline/unseeded
    }
  }, []);

  const seedFirestoreIfEmpty = useCallback(async () => {
    try {
      const [
        progSnap,
        tutorSnap,
        classSnap,
        schedSnap,
        studSnap,
        regSnap,
        wlSnap,
        saSnap,
        taSnap,
        invSnap,
        paySnap,
        recSnap,
        notifSnap,
        fuSnap,
        relSnap,
        flagSnap,
      ] = await Promise.all([
        getDocs(query(collection(db, 'programs'), limit(1))),
        getDocs(query(collection(db, 'tutors'), limit(1))),
        getDocs(query(collection(db, 'classes'), limit(1))),
        getDocs(query(collection(db, 'schedules'), limit(1))),
        getDocs(query(collection(db, 'students'), limit(1))),
        getDocs(query(collection(db, 'registrations'), limit(1))),
        getDocs(query(collection(db, 'waitlists'), limit(1))),
        getDocs(query(collection(db, 'student_attendance'), limit(1))),
        getDocs(query(collection(db, 'tutor_attendance'), limit(1))),
        getDocs(query(collection(db, 'invoices'), limit(1))),
        getDocs(query(collection(db, 'payments'), limit(1))),
        getDocs(query(collection(db, 'receipts'), limit(1))),
        getDocs(query(collection(db, 'notifications'), limit(1))),
        getDocs(query(collection(db, 'followups'), limit(1))),
        getDocs(query(collection(db, 'relief_requests'), limit(1))),
        getDocs(query(collection(db, 'feature_flags'), limit(1))),
      ]);

      const batch = writeBatch(db);
      const ts = serverTimestamp();
      let pendingWrites = 0;

      if (progSnap.empty) {
        SEED_PROGRAMS.forEach((p) => {
          const { id, ...rest } = p;
          batch.set(doc(db, 'programs', id), { ...rest, createdAt: ts, updatedAt: ts });
          pendingWrites++;
        });
      }
      if (tutorSnap.empty) {
        SEED_TUTORS.forEach((t) => {
          const { id, ...rest } = t;
          batch.set(doc(db, 'tutors', id), { ...rest, createdAt: ts, updatedAt: ts });
          pendingWrites++;
        });
      }
      if (classSnap.empty) {
        SEED_CLASSES.forEach((c) => {
          const { id, ...rest } = c;
          batch.set(doc(db, 'classes', id), { ...rest, createdAt: ts, updatedAt: ts });
          pendingWrites++;
        });
      }
      if (schedSnap.empty) {
        SEED_SCHEDULES.forEach((s) => {
          const { id, ...rest } = s;
          batch.set(doc(db, 'schedules', id), { ...rest, createdAt: ts, updatedAt: ts });
          pendingWrites++;
        });
      }
      if (studSnap.empty) {
        SEED_STUDENTS.forEach((s) => {
          const { id, ...rest } = s;
          batch.set(doc(db, 'students', id), { ...rest, createdAt: ts, updatedAt: ts });
          pendingWrites++;
        });
      }
      if (regSnap.empty) {
        SEED_REGISTRATIONS.forEach((r) => {
          const { id, ...rest } = r;
          batch.set(doc(db, 'registrations', id), { ...rest, createdAt: ts, updatedAt: ts });
          pendingWrites++;
        });
      }
      if (wlSnap.empty) {
        SEED_WAITLISTS.forEach((w) => {
          const { id, ...rest } = w;
          batch.set(doc(db, 'waitlists', id), { ...rest, createdAt: ts, updatedAt: ts });
          pendingWrites++;
        });
      }
      if (saSnap.empty) {
        SEED_STUDENT_ATTENDANCE.forEach((a) => {
          const { id, ...rest } = a;
          batch.set(doc(db, 'student_attendance', id), { ...rest, createdAt: ts });
          pendingWrites++;
        });
      }
      if (taSnap.empty) {
        SEED_TUTOR_ATTENDANCE.forEach((a) => {
          const { id, ...rest } = a;
          batch.set(doc(db, 'tutor_attendance', id), { ...rest, createdAt: ts });
          pendingWrites++;
        });
      }
      if (invSnap.empty) {
        SEED_INVOICES.forEach((i) => {
          const { id, ...rest } = i;
          batch.set(doc(db, 'invoices', id), { ...rest, createdAt: ts, updatedAt: ts });
          pendingWrites++;
        });
      }
      if (paySnap.empty) {
        SEED_PAYMENTS.forEach((p) => {
          const { id, ...rest } = p;
          batch.set(doc(db, 'payments', id), { ...rest, createdAt: ts });
          pendingWrites++;
        });
      }
      if (recSnap.empty) {
        SEED_RECEIPTS.forEach((r) => {
          const { id, ...rest } = r;
          batch.set(doc(db, 'receipts', id), { ...rest, createdAt: ts });
          pendingWrites++;
        });
      }
      if (notifSnap.empty) {
        SEED_NOTIFICATIONS.forEach((n) => {
          const { id, ...rest } = n;
          batch.set(doc(db, 'notifications', id), { ...rest, createdAt: ts });
          pendingWrites++;
        });
      }
      if (fuSnap.empty) {
        SEED_FOLLOWUPS.forEach((f) => {
          const { id, ...rest } = f;
          batch.set(doc(db, 'followups', id), { ...rest, createdAt: ts, updatedAt: ts });
          pendingWrites++;
        });
      }
      if (relSnap.empty) {
        SEED_RELIEF_REQUESTS.forEach((r) => {
          const { id, ...rest } = r;
          batch.set(doc(db, 'relief_requests', id), { ...rest, createdAt: ts, updatedAt: ts });
          pendingWrites++;
        });
      }
      if (flagSnap.empty) {
        SEED_FEATURE_FLAGS.forEach((flag) => {
          const { id, ...rest } = flag;
          batch.set(doc(db, 'feature_flags', id), { ...rest, createdAt: ts, updatedAt: ts });
          pendingWrites++;
        });
      }

      if (pendingWrites > 0) {
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'seed_workspace');
    }
  }, []);

  const loadFirebaseWorkspace = useCallback(
    async (user: UserAccount) => {
      const isBootstrapOwner = isBootstrapTeamEmail(user.email);
      const canManageAll = user.role === 'admin' || user.role === 'pemilik';
      const canManageUsers = user.role === 'admin';
      try {
        await loadPublicCatalog();
        if (isBootstrapOwner && canManageAll) {
          await seedFirestoreIfEmpty();
        }
        if (canManageAll) {
          const [
            usersSnap,
            tutorSnap,
            studSnap,
            regSnap,
            wlSnap,
            saSnap,
            taSnap,
            invSnap,
            paySnap,
            recSnap,
            notifSnap,
            fuSnap,
            relSnap,
            flagSnap,
          ] = await Promise.all([
            canManageUsers ? getDocs(collection(db, 'users')) : Promise.resolve(null),
            getDocs(collection(db, 'tutors')),
            getDocs(collection(db, 'students')),
            getDocs(collection(db, 'registrations')),
            getDocs(collection(db, 'waitlists')),
            getDocs(collection(db, 'student_attendance')),
            getDocs(collection(db, 'tutor_attendance')),
            getDocs(collection(db, 'invoices')),
            getDocs(collection(db, 'payments')),
            getDocs(collection(db, 'receipts')),
            getDocs(collection(db, 'notifications')),
            getDocs(collection(db, 'followups')),
            getDocs(collection(db, 'relief_requests')),
            canManageUsers ? getDocs(collection(db, 'feature_flags')) : Promise.resolve(null),
          ]);
          if (usersSnap) {
            setUsersList(
              usersSnap.docs.map((d) => ({
                id: d.id,
                ...stripTimestamps<Omit<UserAccount, 'id'>>(d.data()),
              }))
            );
          }
          if (flagSnap && !flagSnap.empty) {
            const loadedFlags = flagSnap.docs.map((d) => ({
              id: d.id as AdminBetaFlagKey,
              ...stripTimestamps<Omit<FeatureFlagConfig, 'id'>>(d.data()),
            }));
            const mergedFlags = SEED_FEATURE_FLAGS.map((seedFlag) => {
              const found = loadedFlags.find((f) => f.key === seedFlag.key);
              return found || seedFlag;
            });
            setFeatureFlags(mergedFlags);
          }
          setTutors(
            tutorSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Tutor, 'id'>>(d.data()),
            }))
          );
          setStudents(
            studSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Student, 'id'>>(d.data()),
            }))
          );
          setRegistrations(
            regSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Registration, 'id'>>(d.data()),
            }))
          );
          setWaitlists(
            wlSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Waitlist, 'id'>>(d.data()),
            }))
          );
          setStudentAttendance(
            saSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<StudentAttendance, 'id'>>(d.data()),
            }))
          );
          setTutorAttendance(
            taSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<TutorAttendance, 'id'>>(d.data()),
            }))
          );
          setInvoices(
            invSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Invoice, 'id'>>(d.data()),
            }))
          );
          setPayments(
            paySnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Payment, 'id'>>(d.data()),
            }))
          );
          setReceipts(
            recSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Receipt, 'id'>>(d.data()),
            }))
          );
          setNotifications(
            notifSnap.docs.map((d) => {
              const raw = d.data();
              return {
                id: d.id,
                ...stripTimestamps<Omit<NotificationItem, 'id' | 'createdAt'>>(raw),
                createdAt: formatDocDate(raw.createdAt),
              };
            })
          );
          setFollowups(
            fuSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<AbsenceFollowup, 'id'>>(d.data()),
            }))
          );
          setReliefRequests(
            relSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<ReliefRequest, 'id'>>(d.data()),
            }))
          );
          await loadPublicCatalog();
        } else if (user.role === 'tutor') {
          const [tutorSnap, studSnap, saSnap, taSnap, notifSnap, fuSnap] = await Promise.all([
            getDocs(collection(db, 'tutors')),
            getDocs(collection(db, 'students')),
            getDocs(collection(db, 'student_attendance')),
            getDocs(collection(db, 'tutor_attendance')),
            getDocs(collection(db, 'notifications')),
            getDocs(collection(db, 'followups')),
          ]);
          setTutors(
            tutorSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Tutor, 'id'>>(d.data()),
            }))
          );
          setStudents(
            studSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Student, 'id'>>(d.data()),
            }))
          );
          setStudentAttendance(
            saSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<StudentAttendance, 'id'>>(d.data()),
            }))
          );
          setTutorAttendance(
            taSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<TutorAttendance, 'id'>>(d.data()),
            }))
          );
          setNotifications(
            notifSnap.docs.map((d) => {
              const raw = d.data();
              return {
                id: d.id,
                ...stripTimestamps<Omit<NotificationItem, 'id' | 'createdAt'>>(raw),
                createdAt: formatDocDate(raw.createdAt),
              };
            })
          );
          setFollowups(
            fuSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<AbsenceFollowup, 'id'>>(d.data()),
            }))
          );
        } else {
          const uid = user.uid;
          const [studSnap, regSnap, wlSnap, saSnap, invSnap, paySnap, recSnap, notifSnap, relSnap] =
            await Promise.all([
              getDocs(query(collection(db, 'students'), where('parentUid', '==', uid))),
              getDocs(query(collection(db, 'registrations'), where('parentUid', '==', uid))),
              getDocs(query(collection(db, 'waitlists'), where('parentUid', '==', uid))),
              getDocs(query(collection(db, 'student_attendance'), where('parentUid', '==', uid))),
              getDocs(query(collection(db, 'invoices'), where('parentUid', '==', uid))),
              getDocs(query(collection(db, 'payments'), where('parentUid', '==', uid))),
              getDocs(query(collection(db, 'receipts'), where('parentUid', '==', uid))),
              getDocs(query(collection(db, 'notifications'), where('parentUid', '==', uid))),
              getDocs(query(collection(db, 'relief_requests'), where('parentUid', '==', uid))),
            ]);
          setStudents(
            studSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Student, 'id'>>(d.data()),
            }))
          );
          setRegistrations(
            regSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Registration, 'id'>>(d.data()),
            }))
          );
          setWaitlists(
            wlSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Waitlist, 'id'>>(d.data()),
            }))
          );
          setStudentAttendance(
            saSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<StudentAttendance, 'id'>>(d.data()),
            }))
          );
          setInvoices(
            invSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Invoice, 'id'>>(d.data()),
            }))
          );
          setPayments(
            paySnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Payment, 'id'>>(d.data()),
            }))
          );
          setReceipts(
            recSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<Receipt, 'id'>>(d.data()),
            }))
          );
          setNotifications(
            notifSnap.docs.map((d) => {
              const raw = d.data();
              return {
                id: d.id,
                ...stripTimestamps<Omit<NotificationItem, 'id' | 'createdAt'>>(raw),
                createdAt: formatDocDate(raw.createdAt),
              };
            })
          );
          setReliefRequests(
            relSnap.docs.map((d) => ({
              id: d.id,
              ...stripTimestamps<Omit<ReliefRequest, 'id'>>(d.data()),
            }))
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'workspace');
      }
    },
    [loadPublicCatalog, seedFirestoreIfEmpty]
  );

  useEffect(() => {
    testConnection();
    loadPublicCatalog();
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setAuthReady(true);
        return;
      }
      try {
        const userRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userRef);
        const isBootstrap = isBootstrapTeamEmail(fbUser.email);
        let profile: UserAccount;
        if (snap.exists()) {
          profile = {
            id: snap.id,
            ...stripTimestamps<Omit<UserAccount, 'id'>>(snap.data()),
          };
        } else {
          const initialRole: UserRole = isBootstrap ? 'pemilik' : 'orang_tua';
          const newProfile = {
            uid: fbUser.uid,
            nama: fbUser.displayName || fbUser.email?.split('@')[0] || 'Pengguna Bimbel Cerdas',
            email: fbUser.email || '',
            role: initialRole,
            noTelepon: '',
            alamat: '',
            statusAktif: true,
          };
          await setDoc(userRef, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          profile = { id: fbUser.uid, ...newProfile };
        }
        if (!profile.statusAktif) {
          await signOut(auth);
          setAuthMode('none');
          setCurrentUser(null);
          addToast(
            'error',
            'Akun dinonaktifkan',
            'Akun Anda sedang nonaktif. Hubungi Admin Bimbel Cerdas.'
          );
          return;
        }
        setAuthMode('firebase');
        setCurrentUser(profile);
        await loadFirebaseWorkspace(profile);
        setView('dashboard');
      } catch (err) {
        addToast('error', 'Gagal memuat data akun', 'Periksa koneksi atau hak akses Firestore.');
        handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [addToast, loadFirebaseWorkspace, loadPublicCatalog]);

  const loginWithGoogle = useCallback(async () => {
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      addToast('success', 'Berhasil masuk dengan Google', 'Selamat datang di Bimbel Cerdas.');
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      let msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      if (code === 'auth/unauthorized-domain') {
        msg = `Domain "${host}" belum terdaftar di Firebase Authorized Domains. Tambahkan "${host}" di Firebase Console → Authentication → Settings → Authorized domains, atau gunakan Akun Uji Sandbox di bawah.`;
      } else if (code === 'auth/popup-blocked') {
        msg = 'Popup login Google diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.';
      } else if (code === 'auth/popup-closed-by-user') {
        msg = 'Jendela login Google ditutup sebelum proses selesai.';
      }
      addToast('error', 'Autentikasi gagal', msg);
    } finally {
      setIsLoggingIn(false);
    }
  }, [addToast]);

  const loginAsDemo = useCallback(
    (role: UserRole) => {
      setUsersList(Object.values(DEMO_USERS));
      setPrograms(SEED_PROGRAMS);
      setTutors(SEED_TUTORS);
      setClasses(SEED_CLASSES);
      setSchedules(SEED_SCHEDULES);
      setStudents(SEED_STUDENTS);
      setRegistrations(SEED_REGISTRATIONS);
      setWaitlists(SEED_WAITLISTS);
      setStudentAttendance(SEED_STUDENT_ATTENDANCE);
      setTutorAttendance(SEED_TUTOR_ATTENDANCE);
      setInvoices(SEED_INVOICES);
      setPayments(SEED_PAYMENTS);
      setReceipts(SEED_RECEIPTS);
      setNotifications(SEED_NOTIFICATIONS);
      setFollowups(SEED_FOLLOWUPS);
      setReliefRequests(SEED_RELIEF_REQUESTS);
      setFeatureFlags(SEED_FEATURE_FLAGS);
      setAuthMode('demo');
      setCurrentUser(DEMO_USERS[role]);
      setView('dashboard');
      const roleLabels: Record<UserRole, string> = {
        orang_tua: 'Orang Tua',
        tutor: 'Tutor',
        admin: 'Admin',
        pemilik: 'Pemilik',
      };
      addToast('info', `Mode Demo: ${roleLabels[role]}`, 'Seluruh alur dan aturan bisnis siap diuji.');
    },
    [addToast]
  );

  const loginWithTestCredential = useCallback(
    (email: string, kodeUji: string): { ok: boolean; error?: string; role?: UserRole } => {
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedCode = kodeUji.trim();
      if (!normalizedEmail || !trimmedCode) {
        return { ok: false, error: 'Email dan kata sandi akun uji wajib diisi.' };
      }
      const matched = TEST_ACCOUNTS_BY_ROLE.find(
        (acc) => acc.email.toLowerCase() === normalizedEmail && acc.kodeUji === trimmedCode
      );
      if (!matched) {
        return {
          ok: false,
          error: 'Email atau kata sandi akun uji tidak sesuai. Periksa daftar akun uji per aktor.',
        };
      }
      loginAsDemo(matched.role);
      return { ok: true, role: matched.role };
    },
    [loginAsDemo]
  );

  const logout = useCallback(async () => {
    if (authMode === 'firebase') {
      await signOut(auth);
    }
    setAuthMode('none');
    setCurrentUser(null);
    setFeatureFlags(SEED_FEATURE_FLAGS);
    setView('public');
    addToast('info', 'Anda telah keluar', 'Sampai jumpa kembali di Bimbel Cerdas.');
  }, [addToast, authMode]);

  const activeRole: UserRole = currentUser?.role || 'orang_tua';

  const assertRoleAction = useCallback(
    (action: ProtectedAction, actionLabel: string): boolean => {
      if (!currentUser || !currentUser.statusAktif) {
        addToast('error', 'Sesi tidak valid', 'Silakan masuk terlebih dahulu.');
        return false;
      }
      if (!canRolePerformAction(activeRole, action)) {
        addToast(
          'error',
          'Akses ditolak',
          `Peran ${activeRole} tidak memiliki izin untuk ${actionLabel}.`
        );
        return false;
      }
      return true;
    },
    [activeRole, addToast, currentUser]
  );

  const isFeatureEnabled = useCallback(
    (key: AdminBetaFlagKey) => {
      if (activeRole !== 'admin') return false;
      return Boolean(featureFlags.find((f) => f.key === key)?.enabled);
    },
    [activeRole, featureFlags]
  );

  const setFeatureFlag = useCallback(
    async (key: AdminBetaFlagKey, enabled: boolean) => {
      if (activeRole !== 'admin') {
        addToast('error', 'Akses ditolak', 'Feature flag beta hanya dapat diatur pada peran Admin.');
        return;
      }
      const targetFlag =
        featureFlags.find((f) => f.key === key) || SEED_FEATURE_FLAGS.find((f) => f.key === key);
      if (!targetFlag) return;
      const updatedBy = currentUser?.nama || 'Admin Bimbel Cerdas';

      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          const flagRef = doc(db, 'feature_flags', key);
          const snap = await getDoc(flagRef);
          const payload = {
            key: targetFlag.key,
            label: targetFlag.label,
            description: targetFlag.description,
            targetRole: 'admin' as const,
            enabled,
            updatedBy,
          };
          if (snap.exists()) {
            await updateDoc(flagRef, { ...payload, updatedAt: ts });
          } else {
            await setDoc(flagRef, { ...payload, createdAt: ts, updatedAt: ts });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `feature_flags/${key}`);
        }
      }

      setFeatureFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, enabled, updatedBy } : f))
      );
      addToast(
        'info',
        enabled ? 'Fitur beta diaktifkan' : 'Fitur beta dinonaktifkan',
        targetFlag.label
      );
    },
    [activeRole, addToast, authMode, currentUser, featureFlags]
  );

  const toggleFeatureFlag = useCallback(
    async (key: AdminBetaFlagKey) => {
      const current = featureFlags.find((f) => f.key === key)?.enabled ?? false;
      await setFeatureFlag(key, !current);
    },
    [featureFlags, setFeatureFlag]
  );

  const updateOwnProfile = useCallback(
    async (payload: { nama: string; noTelepon: string; alamat: string }) => {
      if (!currentUser) return;
      const updated = { ...currentUser, ...payload };
      setCurrentUser(updated);
      if (authMode === 'firebase') {
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            nama: payload.nama,
            noTelepon: payload.noTelepon,
            alamat: payload.alamat,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
        }
      }
      addToast('success', 'Profil diperbarui');
    },
    [addToast, authMode, currentUser]
  );

  const registerChild = useCallback(
    async (input: RegisterStudentInput) => {
      if (!assertRoleAction('register_child', 'mendaftarkan siswa')) {
        throw new Error('Akses ditolak: hanya portal Orang Tua yang dapat mendaftarkan anak.');
      }
      if (!currentUser) throw new Error('Belum login.');
      const prog = programs.find((p) => p.id === input.idProgram);
      const cls = classes.find((c) => c.id === input.idKelas);
      if (!prog || !cls) throw new Error('Program atau kelas tidak ditemukan.');

      const parentUid = authMode === 'demo' ? DEMO_USERS.orang_tua.uid : currentUser.uid;
      const parentName = authMode === 'demo' ? DEMO_USERS.orang_tua.nama : currentUser.nama;
      const parentPhone =
        (authMode === 'demo' ? DEMO_USERS.orang_tua.noTelepon : currentUser.noTelepon) || '-';

      const familyChildren = students.filter((s) => s.parentUid === parentUid);
      const urutanAnak = familyChildren.length + 1;
      const isFull = cls.jumlahTerisi >= cls.kapasitasMaksimal;

      const newTerisi = isFull ? cls.jumlahTerisi : cls.jumlahTerisi + 1;
      const newClassStatus = computeClassStatus(newTerisi, cls.kapasitasMaksimal, cls.jumlahMinimal);

      const studentId = makeId('sis');
      const regId = makeId('reg');
      const today = todayISO();

      const studentStatus = isFull
        ? 'Daftar Tunggu'
        : newClassStatus === 'Aktif' || newClassStatus === 'Penuh'
          ? 'Aktif'
          : 'Menunggu Kelas';
      const regStatus = isFull
        ? 'Daftar Tunggu'
        : newClassStatus === 'Aktif' || newClassStatus === 'Penuh'
          ? 'Aktif'
          : 'Menunggu Kelas';

      const newStudent: Student = {
        id: studentId,
        parentUid,
        parentName,
        parentPhone,
        namaSiswa: input.namaSiswa.trim(),
        tanggalLahir: input.tanggalLahir,
        jenisKelamin: input.jenisKelamin,
        asalSekolah: input.asalSekolah.trim(),
        jenjang: prog.jenjang,
        idProgram: prog.id,
        namaProgram: prog.namaProgram,
        idKelas: cls.id,
        namaKelas: cls.namaKelas,
        urutanAnak,
        statusSiswa: studentStatus,
      };

      const newReg: Registration = {
        id: regId,
        parentUid,
        parentName,
        idSiswa: studentId,
        namaSiswa: newStudent.namaSiswa,
        idProgram: prog.id,
        namaProgram: prog.namaProgram,
        idKelas: cls.id,
        namaKelas: cls.namaKelas,
        biayaPendaftaran: REGISTRATION_FEE,
        statusBayarDaftar: 'Belum Bayar',
        statusPendaftaran: regStatus,
        tanggalDaftar: today,
      };

      const now = new Date();
      const bulan = now.getMonth() + 1;
      const tahun = now.getFullYear();
      const sppCalc = calculateSppInvoice(prog.biayaSpp, urutanAnak);
      const invId = makeId('inv');
      const newInvoice: Invoice = {
        id: invId,
        parentUid,
        idSiswa: studentId,
        namaSiswa: newStudent.namaSiswa,
        idProgram: prog.id,
        namaProgram: prog.namaProgram,
        bulan,
        tahun,
        periodeLabel: formatPeriode(bulan, tahun),
        ...sppCalc,
        jatuhTempo: `${tahun}-${String(bulan).padStart(2, '0')}-15`,
        statusTagihan: 'Belum Bayar',
      };

      const wlId = makeId('wl');
      const classWaitlistCount = waitlists.filter(
        (w) => w.idKelas === cls.id && w.statusAntrean === 'Menunggu'
      ).length;
      const newWaitlist: Waitlist | null = isFull
        ? {
            id: wlId,
            parentUid,
            idSiswa: studentId,
            namaSiswa: newStudent.namaSiswa,
            idProgram: prog.id,
            idKelas: cls.id,
            namaKelas: cls.namaKelas,
            urutanAntrean: classWaitlistCount + 1,
            statusAntrean: 'Menunggu',
            tanggalMasuk: today,
          }
        : null;

      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          const batch = writeBatch(db);
          const { id: _sid, ...sData } = newStudent;
          batch.set(doc(db, 'students', studentId), { ...sData, createdAt: ts, updatedAt: ts });
          const { id: _rid, ...rData } = newReg;
          batch.set(doc(db, 'registrations', regId), { ...rData, createdAt: ts, updatedAt: ts });
          if (!isFull) {
            batch.update(doc(db, 'classes', cls.id), {
              jumlahTerisi: newTerisi,
              statusKelas: newClassStatus,
              updatedAt: ts,
            });
            const { id: _iid, ...iData } = newInvoice;
            batch.set(doc(db, 'invoices', invId), { ...iData, createdAt: ts, updatedAt: ts });
          } else if (newWaitlist) {
            const { id: _wid, ...wData } = newWaitlist;
            batch.set(doc(db, 'waitlists', wlId), { ...wData, createdAt: ts, updatedAt: ts });
          }
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'students');
        }
      }

      setStudents((prev) => [...prev, newStudent]);
      setRegistrations((prev) => [...prev, newReg]);
      if (!isFull) {
        setClasses((prev) =>
          prev.map((c) =>
            c.id === cls.id ? { ...c, jumlahTerisi: newTerisi, statusKelas: newClassStatus } : c
          )
        );
        setInvoices((prev) => [...prev, newInvoice]);
      } else if (newWaitlist) {
        setWaitlists((prev) => [...prev, newWaitlist]);
      }

      const statusMsg = isFull
        ? `Kelas penuh (${MAX_CLASS_CAPACITY}/${MAX_CLASS_CAPACITY}). Siswa masuk Daftar Tunggu antrean #${newWaitlist?.urutanAntrean}.`
        : newClassStatus === 'Menunggu Minimal'
          ? `Terdaftar di ${cls.namaKelas} (${newTerisi}/${MIN_CLASS_STUDENTS} siswa minimal pembukaan kelas).`
          : `Siswa aktif di ${cls.namaKelas}. Tagihan SPP ${urutanAnak >= 2 ? '(diskon anak ke-2+ 10%)' : ''} telah dibuat.`;

      addToast('success', 'Pendaftaran siswa tersimpan', statusMsg);
      return { status: statusMsg, isWaitlist: isFull };
    },
    [addToast, authMode, classes, currentUser, programs, students, waitlists]
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      if (!assertRoleAction('mark_notification_read', 'menandai notifikasi')) return;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, sudahDibaca: true } : n)));
      if (authMode === 'firebase') {
        try {
          await updateDoc(doc(db, 'notifications', id), { sudahDibaca: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
        }
      }
    },
    [assertRoleAction, authMode]
  );

  const submitReliefRequest = useCallback(
    async (input: { idTagihan: string; jenisPengajuan: ReliefType; alasan: string }) => {
      if (!assertRoleAction('submit_relief', 'mengajukan keringanan SPP')) {
        throw new Error('Akses ditolak: hanya portal Orang Tua yang dapat mengajukan keringanan.');
      }
      const inv = invoices.find((i) => i.id === input.idTagihan);
      if (!inv) throw new Error('Tagihan tidak ditemukan.');
      const relId = makeId('rel');
      const today = todayISO();
      const newReq: ReliefRequest = {
        id: relId,
        parentUid: inv.parentUid,
        idTagihan: inv.id,
        idSiswa: inv.idSiswa,
        namaSiswa: inv.namaSiswa,
        periode: inv.periodeLabel,
        jumlahTagihan: inv.jumlahTagihan,
        jenisPengajuan: input.jenisPengajuan,
        alasan: input.alasan.trim(),
        statusKeputusan: 'Menunggu',
        tanggalPengajuan: today,
      };
      if (authMode === 'firebase') {
        try {
          const { id: _id, ...data } = newReq;
          const ts = serverTimestamp();
          await setDoc(doc(db, 'relief_requests', relId), { ...data, createdAt: ts, updatedAt: ts });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `relief_requests/${relId}`);
        }
      }
      setReliefRequests((prev) => [newReq, ...prev]);
      addToast('success', 'Pengajuan dikirim', 'Menunggu persetujuan Pemilik Bimbel Cerdas.');
    },
    [addToast, authMode, invoices]
  );

  const recordTutorSessionAndAttendance = useCallback(
    async (input: RecordAttendanceInput) => {
      if (!assertRoleAction('record_tutor_attendance', 'mencatat absensi mengajar')) {
        throw new Error('Akses ditolak: hanya portal Tutor yang dapat mencatat absensi sesi.');
      }
      const sched = schedules.find((s) => s.id === input.idJadwal);
      if (!sched) throw new Error('Jadwal mengajar tidak ditemukan.');

      const mengajarTutor = input.isPengganti
        ? tutors.find((t) => t.id === input.idTutorPengganti) || tutors[0]
        : tutors.find((t) => t.id === sched.idTutor);

      const tutorId = mengajarTutor?.id || sched.idTutor;
      const tutorName = mengajarTutor?.namaTutor || sched.namaTutor;

      const taId = makeId('tatt');
      const newTutorAtt: TutorAttendance = {
        id: taId,
        idJadwal: sched.id,
        idKelas: sched.idKelas,
        namaKelas: sched.namaKelas,
        tanggal: input.tanggal,
        idTutorAsli: sched.idTutor,
        idTutorMengajar: tutorId,
        namaTutorMengajar: tutorName,
        isPengganti: input.isPengganti,
        statusHadir: input.hadirMengajar,
        durasiMenit: SESSION_DURATION_MINUTES,
        honorSesi: input.hadirMengajar ? TUTOR_HONOR_PER_SESSION : 0,
      };

      const newStudentAtts: StudentAttendance[] = input.kehadiran.map((k) => {
        const sis = students.find((s) => s.id === k.idSiswa);
        return {
          id: makeId('abs'),
          parentUid: sis?.parentUid || '',
          idJadwal: sched.id,
          idKelas: sched.idKelas,
          namaKelas: sched.namaKelas,
          idTutor: tutorId,
          tanggal: input.tanggal,
          idSiswa: k.idSiswa,
          namaSiswa: sis?.namaSiswa || '-',
          statusKehadiran: k.status,
          catatan: k.catatan || '',
        };
      });

      const combinedAttendance = [...studentAttendance, ...newStudentAtts];
      const newNotifs: NotificationItem[] = [];
      const newFollowups: AbsenceFollowup[] = [];

      newStudentAtts.forEach((rec) => {
        if (rec.statusKehadiran !== 'Tidak Hadir') return;
        const isThreeInRow = checkThreeConsecutiveAbsences(combinedAttendance, rec.idSiswa);
        const alreadyOpenFollowup = followups.some(
          (f) => f.idSiswa === rec.idSiswa && f.statusTindakLanjut !== 'Selesai'
        );
        if (isThreeInRow && !alreadyOpenFollowup) {
          const sis = students.find((s) => s.id === rec.idSiswa);
          newNotifs.push({
            id: makeId('notif'),
            parentUid: rec.parentUid,
            idSiswa: rec.idSiswa,
            judul: 'Peringatan Ketidakhadiran 3× Berturut-turut',
            pesan: `${rec.namaSiswa} tercatat tidak hadir 3 kali berturut-turut di kelas ${rec.namaKelas} hingga ${rec.tanggal}. Tim admin akan segera menghubungi Anda.`,
            kategori: 'Absensi 3x',
            sudahDibaca: false,
            createdAt: rec.tanggal,
          });
          newFollowups.push({
            id: makeId('fu'),
            parentUid: rec.parentUid,
            idSiswa: rec.idSiswa,
            namaSiswa: rec.namaSiswa,
            namaParent: sis?.parentName || 'Orang Tua Siswa',
            noTeleponParent: sis?.parentPhone || '-',
            jumlahAbsenBeruntun: 3,
            tanggalPemicu: rec.tanggal,
            statusTindakLanjut: 'Menunggu Telepon',
          });
        }
      });

      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          const batch = writeBatch(db);
          const { id: _taId, ...taData } = newTutorAtt;
          batch.set(doc(db, 'tutor_attendance', taId), { ...taData, createdAt: ts });
          newStudentAtts.forEach((sa) => {
            const { id, catatan, ...rest } = sa;
            batch.set(doc(db, 'student_attendance', id), {
              ...rest,
              ...(catatan ? { catatan } : {}),
              createdAt: ts,
            });
          });
          newNotifs.forEach((n) => {
            const { id, ...rest } = n;
            batch.set(doc(db, 'notifications', id), { ...rest, createdAt: ts });
          });
          newFollowups.forEach((f) => {
            const { id, ...rest } = f;
            batch.set(doc(db, 'followups', id), { ...rest, createdAt: ts, updatedAt: ts });
          });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'student_attendance');
        }
      }

      setTutorAttendance((prev) => [newTutorAtt, ...prev]);
      setStudentAttendance((prev) => [...newStudentAtts, ...prev]);
      if (newNotifs.length) setNotifications((prev) => [...newNotifs, ...prev]);
      if (newFollowups.length) setFollowups((prev) => [...newFollowups, ...prev]);

      addToast(
        'success',
        'Absensi sesi tersimpan',
        newFollowups.length > 0
          ? `${newFollowups.length} siswa terdeteksi tidak hadir 3× berturut-turut — notifikasi & tindak lanjut admin dibuat.`
          : input.hadirMengajar
            ? `Honor Rp75.000 dicatat untuk ${tutorName}.`
            : 'Absensi siswa disimpan.'
      );
      return { triggeredAlerts: newFollowups.length };
    },
    [addToast, authMode, followups, schedules, studentAttendance, students, tutors]
  );

  const recordInvoicePayment = useCallback(
    async (idTagihan: string, metodeBayar: PaymentMethod): Promise<Receipt> => {
      if (!assertRoleAction('manage_payments', 'mencatat pembayaran SPP')) {
        throw new Error('Akses ditolak: hanya Admin yang dapat mencatat pembayaran.');
      }
      const inv = invoices.find((i) => i.id === idTagihan);
      if (!inv) throw new Error('Tagihan tidak ditemukan.');
      const sis = students.find((s) => s.id === inv.idSiswa);
      const today = todayISO();
      const payId = makeId('pay');
      const recId = makeId('rec');
      const nomorKuitansi = generateReceiptNumber(receipts.length + 1, today);
      const adminName = currentUser?.nama || 'Admin Bimbel Cerdas';

      const newPayment: Payment = {
        id: payId,
        parentUid: inv.parentUid,
        idTagihan: inv.id,
        idSiswa: inv.idSiswa,
        namaSiswa: inv.namaSiswa,
        jenisPembayaran: 'SPP',
        jumlahBayar: inv.jumlahTagihan,
        metodeBayar,
        tanggalBayar: today,
        dicatatOleh: adminName,
        nomorKuitansi,
      };

      const newReceipt: Receipt = {
        id: recId,
        nomorKuitansi,
        parentUid: inv.parentUid,
        idPembayaran: payId,
        idTagihan: inv.id,
        namaSiswa: inv.namaSiswa,
        namaOrangTua: sis?.parentName || 'Orang Tua Siswa',
        jenisPembayaran: 'SPP',
        periode: inv.periodeLabel,
        nominalDasar: inv.nominalDasar,
        diskonPersen: inv.diskonPersen,
        jumlahBayar: inv.jumlahTagihan,
        metodeBayar,
        tanggalBayar: today,
        adminPencatat: adminName,
      };

      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          const batch = writeBatch(db);
          batch.update(doc(db, 'invoices', inv.id), { statusTagihan: 'Lunas', updatedAt: ts });
          const { id: _pid, ...pData } = newPayment;
          batch.set(doc(db, 'payments', payId), { ...pData, createdAt: ts });
          const { id: _rid, ...rData } = newReceipt;
          batch.set(doc(db, 'receipts', recId), { ...rData, createdAt: ts });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'payments');
        }
      }

      setInvoices((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, statusTagihan: 'Lunas' as InvoiceStatus } : i))
      );
      setPayments((prev) => [newPayment, ...prev]);
      setReceipts((prev) => [newReceipt, ...prev]);
      addToast('success', 'Pembayaran SPP dicatat', `Kuitansi ${nomorKuitansi} siap dicetak.`);
      return newReceipt;
    },
    [addToast, authMode, currentUser, invoices, receipts.length, students]
  );

  const markInvoiceOverdue = useCallback(
    async (idTagihan: string) => {
      if (!assertRoleAction('manage_payments', 'mengubah status tunggakan')) return;
      setInvoices((prev) =>
        prev.map((i) => (i.id === idTagihan ? { ...i, statusTagihan: 'Tunggakan' } : i))
      );
      if (authMode === 'firebase') {
        try {
          await updateDoc(doc(db, 'invoices', idTagihan), {
            statusTagihan: 'Tunggakan',
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `invoices/${idTagihan}`);
        }
      }
      addToast('info', 'Status diperbarui ke Tunggakan');
    },
    [addToast, assertRoleAction, authMode]
  );

  const generateMonthlyInvoices = useCallback(
    async (bulan: number, tahun: number): Promise<number> => {
      if (!assertRoleAction('manage_payments', 'menerbitkan tagihan bulanan')) return 0;
      const eligibleStudents = students.filter(
        (s) => s.statusSiswa === 'Aktif' || s.statusSiswa === 'Menunggu Kelas'
      );
      const createdList: Invoice[] = [];
      const periodeLabel = formatPeriode(bulan, tahun);
      const jatuhTempo = `${tahun}-${String(bulan).padStart(2, '0')}-15`;

      eligibleStudents.forEach((sis) => {
        const exists = invoices.some(
          (i) => i.idSiswa === sis.id && i.bulan === bulan && i.tahun === tahun
        );
        if (exists) return;
        const prog = programs.find((p) => p.id === sis.idProgram);
        const nominalDasar = prog?.biayaSpp || 400_000;
        const sppCalc = calculateSppInvoice(nominalDasar, sis.urutanAnak);
        createdList.push({
          id: makeId('inv'),
          parentUid: sis.parentUid,
          idSiswa: sis.id,
          namaSiswa: sis.namaSiswa,
          idProgram: sis.idProgram,
          namaProgram: sis.namaProgram,
          bulan,
          tahun,
          periodeLabel,
          ...sppCalc,
          jatuhTempo,
          statusTagihan: 'Belum Bayar',
        });
      });

      if (createdList.length === 0) {
        addToast('info', 'Semua siswa aktif sudah memiliki tagihan', `Periode ${periodeLabel} lengkap.`);
        return 0;
      }

      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          const batch = writeBatch(db);
          createdList.forEach((inv) => {
            const { id, ...data } = inv;
            batch.set(doc(db, 'invoices', id), { ...data, createdAt: ts, updatedAt: ts });
          });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'invoices');
        }
      }

      setInvoices((prev) => [...createdList, ...prev]);
      addToast(
        'success',
        `${createdList.length} tagihan SPP ${periodeLabel} dibuat`,
        'Diskon anak ke-2+ (10%) diterapkan otomatis.'
      );
      return createdList.length;
    },
    [addToast, authMode, invoices, programs, students]
  );

  const confirmRegistrationPayment = useCallback(
    async (idRegistrasi: string, metodeBayar: PaymentMethod): Promise<Receipt | null> => {
      if (!assertRoleAction('manage_payments', 'mengonfirmasi biaya pendaftaran')) return null;
      const reg = registrations.find((r) => r.id === idRegistrasi);
      if (!reg) return null;
      const today = todayISO();
      const payId = makeId('pay');
      const recId = makeId('rec');
      const nomorKuitansi = generateReceiptNumber(receipts.length + 1, today);
      const adminName = currentUser?.nama || 'Admin Bimbel Cerdas';

      const newPay: Payment = {
        id: payId,
        parentUid: reg.parentUid,
        idTagihan: reg.id,
        idSiswa: reg.idSiswa,
        namaSiswa: reg.namaSiswa,
        jenisPembayaran: 'Pendaftaran',
        jumlahBayar: REGISTRATION_FEE,
        metodeBayar,
        tanggalBayar: today,
        dicatatOleh: adminName,
        nomorKuitansi,
      };

      const newRec: Receipt = {
        id: recId,
        nomorKuitansi,
        parentUid: reg.parentUid,
        idPembayaran: payId,
        idTagihan: reg.id,
        namaSiswa: reg.namaSiswa,
        namaOrangTua: reg.parentName,
        jenisPembayaran: 'Pendaftaran',
        periode: 'Biaya Pendaftaran (1×)',
        nominalDasar: REGISTRATION_FEE,
        diskonPersen: 0,
        jumlahBayar: REGISTRATION_FEE,
        metodeBayar,
        tanggalBayar: today,
        adminPencatat: adminName,
      };

      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          const batch = writeBatch(db);
          batch.update(doc(db, 'registrations', reg.id), {
            statusBayarDaftar: 'Lunas',
            updatedAt: ts,
          });
          const { id: _pid, ...pData } = newPay;
          batch.set(doc(db, 'payments', payId), { ...pData, createdAt: ts });
          const { id: _rid, ...rData } = newRec;
          batch.set(doc(db, 'receipts', recId), { ...rData, createdAt: ts });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `registrations/${reg.id}`);
        }
      }

      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, statusBayarDaftar: 'Lunas' } : r))
      );
      setPayments((prev) => [newPay, ...prev]);
      setReceipts((prev) => [newRec, ...prev]);
      addToast('success', 'Biaya pendaftaran Rp100.000 lunas', `Kuitansi ${nomorKuitansi} dibuat.`);
      return newRec;
    },
    [addToast, authMode, currentUser, receipts.length, registrations]
  );

  const updateStudentAdmin = useCallback(
    async (
      studentId: string,
      updates: { namaSiswa: string; asalSekolah: string; idKelas: string; statusSiswa: StudentStatus }
    ) => {
      if (!assertRoleAction('manage_master_data', 'memperbarui data siswa')) return;
      const sis = students.find((s) => s.id === studentId);
      const targetCls = classes.find((c) => c.id === updates.idKelas);
      if (!sis || !targetCls) return;

      const classChanged = sis.idKelas !== targetCls.id;
      const oldCls = classes.find((c) => c.id === sis.idKelas);

      if (classChanged && targetCls.jumlahTerisi >= targetCls.kapasitasMaksimal) {
        addToast('error', 'Kelas tujuan sudah penuh', 'Kapasitas maksimal 8 siswa telah tercapai.');
        return;
      }

      const oldNextCount =
        oldCls && classChanged && sis.statusSiswa !== 'Daftar Tunggu' && sis.statusSiswa !== 'Nonaktif'
          ? Math.max(0, oldCls.jumlahTerisi - 1)
          : oldCls?.jumlahTerisi ?? 0;
      const oldNextStatus = oldCls
        ? computeClassStatus(oldNextCount, oldCls.kapasitasMaksimal, oldCls.jumlahMinimal)
        : 'Aktif';

      const newNextCount = classChanged
        ? targetCls.jumlahTerisi + 1
        : targetCls.jumlahTerisi;
      const newNextStatus = computeClassStatus(
        newNextCount,
        targetCls.kapasitasMaksimal,
        targetCls.jumlahMinimal
      );

      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          const batch = writeBatch(db);
          batch.update(doc(db, 'students', studentId), {
            namaSiswa: updates.namaSiswa.trim(),
            asalSekolah: updates.asalSekolah.trim(),
            idKelas: targetCls.id,
            namaKelas: targetCls.namaKelas,
            idProgram: targetCls.idProgram,
            namaProgram: targetCls.namaProgram,
            jenjang: targetCls.jenjang,
            statusSiswa: updates.statusSiswa,
            updatedAt: ts,
          });
          if (classChanged && oldCls) {
            batch.update(doc(db, 'classes', oldCls.id), {
              jumlahTerisi: oldNextCount,
              statusKelas: oldNextStatus,
              updatedAt: ts,
            });
            batch.update(doc(db, 'classes', targetCls.id), {
              jumlahTerisi: newNextCount,
              statusKelas: newNextStatus,
              updatedAt: ts,
            });
          }
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `students/${studentId}`);
        }
      }

      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? {
                ...s,
                namaSiswa: updates.namaSiswa.trim(),
                asalSekolah: updates.asalSekolah.trim(),
                idKelas: targetCls.id,
                namaKelas: targetCls.namaKelas,
                idProgram: targetCls.idProgram,
                namaProgram: targetCls.namaProgram,
                jenjang: targetCls.jenjang,
                statusSiswa: updates.statusSiswa,
              }
            : s
        )
      );
      if (classChanged) {
        setClasses((prev) =>
          prev.map((c) => {
            if (oldCls && c.id === oldCls.id) {
              return { ...c, jumlahTerisi: oldNextCount, statusKelas: oldNextStatus };
            }
            if (c.id === targetCls.id) {
              return { ...c, jumlahTerisi: newNextCount, statusKelas: newNextStatus };
            }
            return c;
          })
        );
      }
      addToast('success', 'Data siswa diperbarui', `${updates.namaSiswa} (${targetCls.namaKelas}).`);
    },
    [addToast, authMode, classes, students]
  );

  const promoteWaitlistStudent = useCallback(
    async (idWaitlist: string, targetClassId: string) => {
      if (!assertRoleAction('manage_waitlist', 'menempatkan siswa daftar tunggu')) return;
      const wl = waitlists.find((w) => w.id === idWaitlist);
      const targetCls = classes.find((c) => c.id === targetClassId);
      const sis = students.find((s) => s.id === wl?.idSiswa);
      if (!wl || !targetCls || !sis) return;
      if (targetCls.jumlahTerisi >= targetCls.kapasitasMaksimal) {
        addToast('error', 'Kelas tujuan sudah penuh', 'Pilih kelas lain atau buat kelas baru.');
        return;
      }
      const nextCount = targetCls.jumlahTerisi + 1;
      const nextClassStatus = computeClassStatus(
        nextCount,
        targetCls.kapasitasMaksimal,
        targetCls.jumlahMinimal
      );
      const nextStudentStatus =
        nextClassStatus === 'Aktif' || nextClassStatus === 'Penuh' ? 'Aktif' : 'Menunggu Kelas';

      const prog = programs.find((p) => p.id === targetCls.idProgram);
      const now = new Date();
      const bulan = now.getMonth() + 1;
      const tahun = now.getFullYear();
      const sppCalc = calculateSppInvoice(prog?.biayaSpp || 400_000, sis.urutanAnak);
      const invId = makeId('inv');
      const newInv: Invoice = {
        id: invId,
        parentUid: sis.parentUid,
        idSiswa: sis.id,
        namaSiswa: sis.namaSiswa,
        idProgram: targetCls.idProgram,
        namaProgram: targetCls.namaProgram,
        bulan,
        tahun,
        periodeLabel: formatPeriode(bulan, tahun),
        ...sppCalc,
        jatuhTempo: `${tahun}-${String(bulan).padStart(2, '0')}-15`,
        statusTagihan: 'Belum Bayar',
      };

      const notifId = makeId('notif');
      const notif: NotificationItem = {
        id: notifId,
        parentUid: sis.parentUid,
        idSiswa: sis.id,
        judul: 'Penempatan dari Daftar Tunggu',
        pesan: `${sis.namaSiswa} telah ditempatkan ke kelas ${targetCls.namaKelas}. Silakan cek jadwal dan tagihan SPP.`,
        kategori: 'Pendaftaran',
        sudahDibaca: false,
        createdAt: todayISO(),
      };

      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          const batch = writeBatch(db);
          batch.update(doc(db, 'waitlists', wl.id), { statusAntrean: 'Ditempatkan', updatedAt: ts });
          batch.update(doc(db, 'classes', targetCls.id), {
            jumlahTerisi: nextCount,
            statusKelas: nextClassStatus,
            updatedAt: ts,
          });
          batch.update(doc(db, 'students', sis.id), {
            idKelas: targetCls.id,
            namaKelas: targetCls.namaKelas,
            statusSiswa: nextStudentStatus,
            updatedAt: ts,
          });
          const { id: _iid, ...iData } = newInv;
          batch.set(doc(db, 'invoices', invId), { ...iData, createdAt: ts, updatedAt: ts });
          const { id: _nid, ...nData } = notif;
          batch.set(doc(db, 'notifications', notifId), { ...nData, createdAt: ts });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `waitlists/${wl.id}`);
        }
      }

      setWaitlists((prev) =>
        prev.map((w) => (w.id === wl.id ? { ...w, statusAntrean: 'Ditempatkan' } : w))
      );
      setClasses((prev) =>
        prev.map((c) =>
          c.id === targetCls.id ? { ...c, jumlahTerisi: nextCount, statusKelas: nextClassStatus } : c
        )
      );
      setStudents((prev) =>
        prev.map((s) =>
          s.id === sis.id
            ? {
                ...s,
                idKelas: targetCls.id,
                namaKelas: targetCls.namaKelas,
                statusSiswa: nextStudentStatus,
              }
            : s
        )
      );
      setRegistrations((prev) =>
        prev.map((r) =>
          r.idSiswa === sis.id
            ? {
                ...r,
                idKelas: targetCls.id,
                namaKelas: targetCls.namaKelas,
                statusPendaftaran: nextStudentStatus === 'Aktif' ? 'Aktif' : 'Menunggu Kelas',
              }
            : r
        )
      );
      setInvoices((prev) => [...prev, newInv]);
      setNotifications((prev) => [notif, ...prev]);
      addToast('success', 'Siswa ditempatkan ke kelas', `${sis.namaSiswa} masuk ke ${targetCls.namaKelas}.`);
    },
    [addToast, authMode, classes, programs, students, waitlists]
  );

  const cancelWaitlist = useCallback(
    async (idWaitlist: string) => {
      if (!assertRoleAction('manage_waitlist', 'membatalkan daftar tunggu')) return;
      const wl = waitlists.find((w) => w.id === idWaitlist);
      if (!wl) return;
      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          const batch = writeBatch(db);
          batch.update(doc(db, 'waitlists', wl.id), {
            statusAntrean: 'Dibatalkan',
            updatedAt: ts,
          });
          batch.update(doc(db, 'students', wl.idSiswa), {
            statusSiswa: 'Nonaktif',
            updatedAt: ts,
          });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `waitlists/${wl.id}`);
        }
      }
      setWaitlists((prev) =>
        prev.map((w) => (w.id === wl.id ? { ...w, statusAntrean: 'Dibatalkan' } : w))
      );
      setStudents((prev) =>
        prev.map((s) =>
          s.id === wl.idSiswa && s.statusSiswa === 'Daftar Tunggu'
            ? { ...s, statusSiswa: 'Nonaktif' }
            : s
        )
      );
      addToast('info', 'Antrean daftar tunggu dibatalkan', `${wl.namaSiswa} dikeluarkan dari antrean.`);
    },
    [addToast, assertRoleAction, authMode, waitlists]
  );

  const updateFollowupCall = useCallback(
    async (idFollowup: string, status: FollowupStatus, hasilPanggilan: string) => {
      if (!assertRoleAction('manage_followups', 'mencatat hasil panggilan bolos')) return;
      const today = todayISO();
      const adminName = currentUser?.nama || 'Admin';
      setFollowups((prev) =>
        prev.map((f) =>
          f.id === idFollowup
            ? {
                ...f,
                statusTindakLanjut: status,
                hasilPanggilan,
                ditindakOleh: adminName,
                tanggalTindakLanjut: today,
              }
            : f
        )
      );
      if (authMode === 'firebase') {
        try {
          await updateDoc(doc(db, 'followups', idFollowup), {
            statusTindakLanjut: status,
            hasilPanggilan,
            ditindakOleh: adminName,
            tanggalTindakLanjut: today,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `followups/${idFollowup}`);
        }
      }
      addToast('success', 'Hasil panggilan disimpan');
    },
    [addToast, authMode, currentUser]
  );

  const decideReliefRequest = useCallback(
    async (
      idRelief: string,
      decision: Exclude<ReliefDecision, 'Menunggu'>,
      catatanPemilik: string
    ) => {
      if (!assertRoleAction('decide_relief', 'memutuskan pengajuan keringanan')) return;
      const req = reliefRequests.find((r) => r.id === idRelief);
      if (!req) return;
      const today = todayISO();
      const notifId = makeId('notif');
      const notif: NotificationItem = {
        id: notifId,
        parentUid: req.parentUid,
        idSiswa: req.idSiswa,
        judul: `Pengajuan Keringanan ${decision}`,
        pesan: `Permintaan ${req.jenisPengajuan} untuk ${req.namaSiswa} (${req.periode}) telah ${decision.toLowerCase()} oleh Pemilik.${catatanPemilik ? ` Catatan: ${catatanPemilik}` : ''}`,
        kategori: 'Keringanan',
        sudahDibaca: false,
        createdAt: today,
      };

      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          const batch = writeBatch(db);
          batch.update(doc(db, 'relief_requests', idRelief), {
            statusKeputusan: decision,
            catatanPemilik,
            tanggalKeputusan: today,
            updatedAt: ts,
          });
          const { id: _nid, ...nData } = notif;
          batch.set(doc(db, 'notifications', notifId), { ...nData, createdAt: ts });
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `relief_requests/${idRelief}`);
        }
      }

      setReliefRequests((prev) =>
        prev.map((r) =>
          r.id === idRelief
            ? { ...r, statusKeputusan: decision, catatanPemilik, tanggalKeputusan: today }
            : r
        )
      );
      setNotifications((prev) => [notif, ...prev]);
      addToast('success', `Pengajuan keringanan ${decision.toLowerCase()}`);
    },
    [addToast, authMode, reliefRequests]
  );

  const updateUserRole = useCallback(
    async (uid: string, role: UserRole, linkedTutorId?: string, statusAktif = true) => {
      if (!assertRoleAction('manage_users', 'mengubah hak akses pengguna')) return;
      const nextTutorId = role === 'tutor' ? linkedTutorId || '' : '';
      if (authMode === 'firebase') {
        try {
          await updateDoc(doc(db, 'users', uid), {
            role,
            linkedTutorId: nextTutorId,
            statusAktif,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
        }
      }
      setUsersList((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, role, linkedTutorId: nextTutorId, statusAktif } : u
        )
      );
      addToast('success', 'Hak akses pengguna diperbarui');
    },
    [addToast, assertRoleAction, authMode]
  );

  // Master CRUD
  const saveProgram = useCallback(
    async (item: Omit<Program, 'id'> & { id?: string }) => {
      if (!assertRoleAction('manage_master_data', 'menyimpan program belajar')) return;
      const id = item.id || makeId('prog');
      const payload = {
        namaProgram: item.namaProgram,
        jenjang: item.jenjang,
        biayaSpp: item.biayaSpp,
        biayaPendaftaran: item.biayaPendaftaran,
        frekuensiMingguan: item.frekuensiMingguan,
        durasiMenit: item.durasiMenit,
        deskripsi: item.deskripsi,
      };
      const full: Program = { ...payload, id };
      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          if (item.id) {
            await updateDoc(doc(db, 'programs', id), { ...payload, updatedAt: ts });
          } else {
            await setDoc(doc(db, 'programs', id), { ...payload, createdAt: ts, updatedAt: ts });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `programs/${id}`);
        }
      }
      setPrograms((prev) =>
        item.id ? prev.map((p) => (p.id === id ? full : p)) : [...prev, full]
      );
      addToast('success', item.id ? 'Program diperbarui' : 'Program ditambahkan');
    },
    [addToast, authMode]
  );

  const deleteProgram = useCallback(
    async (id: string) => {
      if (!assertRoleAction('manage_master_data', 'menghapus program belajar')) return;
      if (authMode === 'firebase') {
        try {
          await deleteDoc(doc(db, 'programs', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `programs/${id}`);
        }
      }
      setPrograms((prev) => prev.filter((p) => p.id !== id));
      addToast('info', 'Program dihapus');
    },
    [addToast, assertRoleAction, authMode]
  );

  const saveTutor = useCallback(
    async (item: Omit<Tutor, 'id'> & { id?: string }) => {
      if (!assertRoleAction('manage_master_data', 'menyimpan data tutor')) return;
      const id = item.id || makeId('tutor');
      const payload = {
        namaTutor: item.namaTutor,
        email: item.email,
        noTelepon: item.noTelepon,
        alamat: item.alamat || '',
        bidangKeahlian: item.bidangKeahlian,
        ...(item.uid ? { uid: item.uid } : {}),
        statusAktif: item.statusAktif,
      };
      const full: Tutor = { ...payload, id };
      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          if (item.id) {
            await updateDoc(doc(db, 'tutors', id), { ...payload, updatedAt: ts });
          } else {
            await setDoc(doc(db, 'tutors', id), { ...payload, createdAt: ts, updatedAt: ts });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `tutors/${id}`);
        }
      }
      setTutors((prev) =>
        item.id ? prev.map((t) => (t.id === id ? full : t)) : [...prev, full]
      );
      addToast('success', item.id ? 'Data tutor diperbarui' : 'Tutor ditambahkan');
    },
    [addToast, assertRoleAction, authMode]
  );

  const deleteTutor = useCallback(
    async (id: string) => {
      if (!assertRoleAction('manage_master_data', 'menghapus data tutor')) return;
      if (authMode === 'firebase') {
        try {
          await deleteDoc(doc(db, 'tutors', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `tutors/${id}`);
        }
      }
      setTutors((prev) => prev.filter((t) => t.id !== id));
      addToast('info', 'Tutor dihapus');
    },
    [addToast, assertRoleAction, authMode]
  );

  const saveClass = useCallback(
    async (item: Omit<ClassRoom, 'id'> & { id?: string }) => {
      if (!assertRoleAction('manage_master_data', 'menyimpan data kelas')) return;
      const id = item.id || makeId('kelas');
      const payload = {
        idProgram: item.idProgram,
        namaProgram: item.namaProgram,
        jenjang: item.jenjang,
        namaKelas: item.namaKelas,
        kapasitasMaksimal: item.kapasitasMaksimal,
        jumlahMinimal: item.jumlahMinimal,
        jumlahTerisi: item.jumlahTerisi,
        statusKelas: item.statusKelas,
      };
      const full: ClassRoom = { ...payload, id };
      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          if (item.id) {
            await updateDoc(doc(db, 'classes', id), { ...payload, updatedAt: ts });
          } else {
            await setDoc(doc(db, 'classes', id), { ...payload, createdAt: ts, updatedAt: ts });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `classes/${id}`);
        }
      }
      setClasses((prev) =>
        item.id ? prev.map((c) => (c.id === id ? full : c)) : [...prev, full]
      );
      addToast('success', item.id ? 'Data kelas diperbarui' : 'Kelas ditambahkan');
    },
    [addToast, assertRoleAction, authMode]
  );

  const deleteClass = useCallback(
    async (id: string) => {
      if (!assertRoleAction('manage_master_data', 'menghapus kelas')) return;
      if (authMode === 'firebase') {
        try {
          await deleteDoc(doc(db, 'classes', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `classes/${id}`);
        }
      }
      setClasses((prev) => prev.filter((c) => c.id !== id));
      addToast('info', 'Kelas dihapus');
    },
    [addToast, assertRoleAction, authMode]
  );

  const saveSchedule = useCallback(
    async (item: Omit<Schedule, 'id'> & { id?: string }) => {
      if (!assertRoleAction('manage_master_data', 'menyimpan jadwal belajar')) return;
      const id = item.id || makeId('jad');
      const payload = {
        idKelas: item.idKelas,
        namaKelas: item.namaKelas,
        idTutor: item.idTutor,
        namaTutor: item.namaTutor,
        hari: item.hari,
        jamMulai: item.jamMulai,
        jamSelesai: item.jamSelesai,
        durasiMenit: item.durasiMenit,
        ruangan: item.ruangan || '',
      };
      const full: Schedule = { ...payload, id };
      if (authMode === 'firebase') {
        try {
          const ts = serverTimestamp();
          if (item.id) {
            await updateDoc(doc(db, 'schedules', id), { ...payload, updatedAt: ts });
          } else {
            await setDoc(doc(db, 'schedules', id), { ...payload, createdAt: ts, updatedAt: ts });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `schedules/${id}`);
        }
      }
      setSchedules((prev) =>
        item.id ? prev.map((s) => (s.id === id ? full : s)) : [...prev, full]
      );
      addToast('success', item.id ? 'Jadwal diperbarui' : 'Jadwal ditambahkan');
    },
    [addToast, assertRoleAction, authMode]
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      if (!assertRoleAction('manage_master_data', 'menghapus jadwal belajar')) return;
      if (authMode === 'firebase') {
        try {
          await deleteDoc(doc(db, 'schedules', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `schedules/${id}`);
        }
      }
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      addToast('info', 'Jadwal dihapus');
    },
    [addToast, assertRoleAction, authMode]
  );

  return (
    <AppDataContext.Provider
      value={{
        view,
        setView,
        authMode,
        authReady,
        isLoggingIn,
        currentUser,
        activeRole,
        loginWithGoogle,
        loginAsDemo,
        loginWithTestCredential,
        logout,
        updateOwnProfile,
        usersList,
        programs,
        tutors,
        classes,
        schedules,
        students,
        registrations,
        waitlists,
        studentAttendance,
        tutorAttendance,
        invoices,
        payments,
        receipts,
        notifications,
        followups,
        reliefRequests,
        featureFlags,
        isFeatureEnabled,
        setFeatureFlag,
        toggleFeatureFlag,
        registerChild,
        markNotificationRead,
        submitReliefRequest,
        recordTutorSessionAndAttendance,
        recordInvoicePayment,
        markInvoiceOverdue,
        generateMonthlyInvoices,
        confirmRegistrationPayment,
        updateStudentAdmin,
        promoteWaitlistStudent,
        cancelWaitlist,
        updateFollowupCall,
        decideReliefRequest,
        updateUserRole,
        saveProgram,
        deleteProgram,
        saveTutor,
        deleteTutor,
        saveClass,
        deleteClass,
        saveSchedule,
        deleteSchedule,
        toasts,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
