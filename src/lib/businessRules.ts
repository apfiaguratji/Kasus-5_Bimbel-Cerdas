import type {
  ClassStatus,
  Jenjang,
  StudentAttendance,
  Tutor,
  TutorAttendance,
  UserRole,
} from '../types.ts';

export const REGISTRATION_FEE = 100_000;
export const MAX_CLASS_CAPACITY = 8;
export const MIN_CLASS_STUDENTS = 3;
export const SESSIONS_PER_WEEK = 2;
export const SESSION_DURATION_MINUTES = 90;
export const TUTOR_HONOR_PER_SESSION = 75_000;
export const SIBLING_DISCOUNT_PERCENT = 10;

export const SPP_BY_JENJANG: Record<Jenjang, number> = {
  SD: 300_000,
  SMP: 400_000,
  SMA: 600_000,
  UTBK: 600_000,
};

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatRupiah(amount: number): string {
  return `Rp${Math.round(amount || 0).toLocaleString('id-ID')}`;
}

export function formatPeriode(bulan: number, tahun: number): string {
  const monthName = MONTH_NAMES_ID[Math.max(0, Math.min(11, bulan - 1))] || String(bulan);
  return `${monthName} ${tahun}`;
}

export function calculateSppInvoice(nominalDasar: number, childOrderInFamily: number) {
  const diskonPersen = childOrderInFamily >= 2 ? SIBLING_DISCOUNT_PERCENT : 0;
  const nominalDiskon = Math.round((nominalDasar * diskonPersen) / 100);
  const jumlahTagihan = nominalDasar - nominalDiskon;
  return {
    nominalDasar,
    diskonPersen,
    nominalDiskon,
    jumlahTagihan,
  };
}

export function computeClassStatus(
  jumlahTerisi: number,
  kapasitasMaksimal = MAX_CLASS_CAPACITY,
  jumlahMinimal = MIN_CLASS_STUDENTS
): ClassStatus {
  if (jumlahTerisi >= kapasitasMaksimal) return 'Penuh';
  if (jumlahTerisi >= jumlahMinimal) return 'Aktif';
  return 'Menunggu Minimal';
}

export function checkThreeConsecutiveAbsences(
  records: StudentAttendance[],
  studentId: string
): boolean {
  const studentRecords = records
    .filter((r) => r.idSiswa === studentId)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  if (studentRecords.length < 3) return false;
  return (
    studentRecords[0].statusKehadiran === 'Tidak Hadir' &&
    studentRecords[1].statusKehadiran === 'Tidak Hadir' &&
    studentRecords[2].statusKehadiran === 'Tidak Hadir'
  );
}

export interface TutorHonorRecap {
  idTutor: string;
  namaTutor: string;
  sesiReguler: number;
  sesiPengganti: number;
  totalSesi: number;
  totalHonor: number;
}

export function calculateTutorHonorRecap(
  tutorAttendances: TutorAttendance[],
  tutors: Tutor[]
): TutorHonorRecap[] {
  const map = new Map<string, TutorHonorRecap>();
  tutors.forEach((t) => {
    map.set(t.id, {
      idTutor: t.id,
      namaTutor: t.namaTutor,
      sesiReguler: 0,
      sesiPengganti: 0,
      totalSesi: 0,
      totalHonor: 0,
    });
  });

  tutorAttendances.forEach((att) => {
    if (!att.statusHadir) return;
    const existing = map.get(att.idTutorMengajar) || {
      idTutor: att.idTutorMengajar,
      namaTutor: att.namaTutorMengajar,
      sesiReguler: 0,
      sesiPengganti: 0,
      totalSesi: 0,
      totalHonor: 0,
    };
    if (att.isPengganti) {
      existing.sesiPengganti += 1;
    } else {
      existing.sesiReguler += 1;
    }
    existing.totalSesi += 1;
    existing.totalHonor += att.honorSesi || TUTOR_HONOR_PER_SESSION;
    map.set(att.idTutorMengajar, existing);
  });

  return Array.from(map.values()).sort((a, b) => b.totalHonor - a.totalHonor);
}

export function generateReceiptNumber(sequenceNumber: number, dateStr: string): string {
  const compactDate = dateStr.replaceAll('-', '');
  const seq = String(sequenceNumber).padStart(4, '0');
  return `KW-BC-${compactDate}-${seq}`;
}

export type ProtectedAction =
  | 'register_child'
  | 'submit_relief'
  | 'mark_notification_read'
  | 'record_tutor_attendance'
  | 'manage_payments'
  | 'manage_waitlist'
  | 'manage_followups'
  | 'manage_master_data'
  | 'manage_users'
  | 'manage_feature_flags'
  | 'decide_relief';

export const ROLE_PERMISSIONS: Record<UserRole, readonly ProtectedAction[]> = {
  orang_tua: ['register_child', 'submit_relief', 'mark_notification_read'],
  tutor: ['record_tutor_attendance'],
  admin: [
    'manage_payments',
    'manage_waitlist',
    'manage_followups',
    'manage_master_data',
    'manage_users',
    'manage_feature_flags',
  ],
  pemilik: ['decide_relief'],
};

export function canRolePerformAction(
  role: UserRole | null | undefined,
  action: ProtectedAction
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}
