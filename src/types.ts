export type UserRole = 'orang_tua' | 'tutor' | 'admin' | 'pemilik';
export type Jenjang = 'SD' | 'SMP' | 'SMA' | 'UTBK';
export type HariBelajar = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
export type ClassStatus = 'Menunggu Minimal' | 'Aktif' | 'Penuh' | 'Tidak Aktif';
export type StudentStatus = 'Aktif' | 'Menunggu Kelas' | 'Daftar Tunggu' | 'Nonaktif';
export type RegistrationStatus = 'Menunggu Verifikasi' | 'Aktif' | 'Menunggu Kelas' | 'Daftar Tunggu' | 'Ditolak';
export type WaitlistStatus = 'Menunggu' | 'Ditempatkan' | 'Dibatalkan';
export type AttendanceStatus = 'Hadir' | 'Tidak Hadir';
export type InvoiceStatus = 'Belum Bayar' | 'Lunas' | 'Tunggakan';
export type PaymentMethod = 'Transfer Bank' | 'QRIS' | 'Tunai';
export type ReliefType = 'Keringanan Nominal' | 'Penundaan Jatuh Tempo';
export type ReliefDecision = 'Menunggu' | 'Disetujui' | 'Ditolak';
export type FollowupStatus = 'Menunggu Telepon' | 'Sedang Dihubungi' | 'Selesai';
export type NotificationCategory = 'Absensi 3x' | 'Pendaftaran' | 'Tagihan' | 'Keringanan';

export interface UserAccount {
  id: string;
  uid: string;
  nama: string;
  email: string;
  role: UserRole;
  noTelepon?: string;
  alamat?: string;
  linkedTutorId?: string;
  statusAktif: boolean;
}

export interface Program {
  id: string;
  namaProgram: string;
  jenjang: Jenjang;
  biayaSpp: number;
  biayaPendaftaran: number;
  frekuensiMingguan: number;
  durasiMenit: number;
  deskripsi: string;
}

export interface Tutor {
  id: string;
  namaTutor: string;
  email: string;
  noTelepon: string;
  alamat?: string;
  bidangKeahlian: string;
  uid?: string;
  statusAktif: boolean;
}

export interface ClassRoom {
  id: string;
  idProgram: string;
  namaProgram: string;
  jenjang: Jenjang;
  namaKelas: string;
  kapasitasMaksimal: number;
  jumlahMinimal: number;
  jumlahTerisi: number;
  statusKelas: ClassStatus;
}

export interface Schedule {
  id: string;
  idKelas: string;
  namaKelas: string;
  idTutor: string;
  namaTutor: string;
  hari: HariBelajar;
  jamMulai: string;
  jamSelesai: string;
  durasiMenit: number;
  ruangan?: string;
}

export interface Student {
  id: string;
  parentUid: string;
  parentName: string;
  parentPhone?: string;
  namaSiswa: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  asalSekolah: string;
  jenjang: Jenjang;
  idProgram: string;
  namaProgram: string;
  idKelas: string;
  namaKelas: string;
  urutanAnak: number;
  statusSiswa: StudentStatus;
}

export interface Registration {
  id: string;
  parentUid: string;
  parentName: string;
  idSiswa: string;
  namaSiswa: string;
  idProgram: string;
  namaProgram: string;
  idKelas: string;
  namaKelas: string;
  biayaPendaftaran: number;
  statusBayarDaftar: 'Belum Bayar' | 'Lunas';
  statusPendaftaran: RegistrationStatus;
  tanggalDaftar: string;
}

export interface Waitlist {
  id: string;
  parentUid: string;
  idSiswa: string;
  namaSiswa: string;
  idProgram: string;
  idKelas: string;
  namaKelas: string;
  urutanAntrean: number;
  statusAntrean: WaitlistStatus;
  tanggalMasuk: string;
}

export interface StudentAttendance {
  id: string;
  parentUid: string;
  idJadwal: string;
  idKelas: string;
  namaKelas: string;
  idTutor: string;
  tanggal: string;
  idSiswa: string;
  namaSiswa: string;
  statusKehadiran: AttendanceStatus;
  catatan?: string;
}

export interface TutorAttendance {
  id: string;
  idJadwal: string;
  idKelas: string;
  namaKelas: string;
  tanggal: string;
  idTutorAsli: string;
  idTutorMengajar: string;
  namaTutorMengajar: string;
  isPengganti: boolean;
  statusHadir: boolean;
  durasiMenit: number;
  honorSesi: number;
}

export interface Invoice {
  id: string;
  parentUid: string;
  idSiswa: string;
  namaSiswa: string;
  idProgram: string;
  namaProgram: string;
  bulan: number;
  tahun: number;
  periodeLabel: string;
  nominalDasar: number;
  diskonPersen: number;
  nominalDiskon: number;
  jumlahTagihan: number;
  jatuhTempo: string;
  statusTagihan: InvoiceStatus;
}

export interface Payment {
  id: string;
  parentUid: string;
  idTagihan: string;
  idSiswa: string;
  namaSiswa: string;
  jenisPembayaran: 'SPP' | 'Pendaftaran';
  jumlahBayar: number;
  metodeBayar: PaymentMethod;
  tanggalBayar: string;
  dicatatOleh: string;
  nomorKuitansi: string;
}

export interface Receipt {
  id: string;
  nomorKuitansi: string;
  parentUid: string;
  idPembayaran: string;
  idTagihan: string;
  namaSiswa: string;
  namaOrangTua: string;
  jenisPembayaran: 'SPP' | 'Pendaftaran';
  periode: string;
  nominalDasar: number;
  diskonPersen: number;
  jumlahBayar: number;
  metodeBayar: string;
  tanggalBayar: string;
  adminPencatat: string;
}

export interface NotificationItem {
  id: string;
  parentUid: string;
  idSiswa: string;
  judul: string;
  pesan: string;
  kategori: NotificationCategory;
  sudahDibaca: boolean;
  createdAt: string;
}

export interface AbsenceFollowup {
  id: string;
  parentUid: string;
  idSiswa: string;
  namaSiswa: string;
  namaParent: string;
  noTeleponParent: string;
  jumlahAbsenBeruntun: number;
  tanggalPemicu: string;
  statusTindakLanjut: FollowupStatus;
  hasilPanggilan?: string;
  ditindakOleh?: string;
  tanggalTindakLanjut?: string;
}

export interface ReliefRequest {
  id: string;
  parentUid: string;
  idTagihan: string;
  idSiswa: string;
  namaSiswa: string;
  periode: string;
  jumlahTagihan: number;
  jenisPengajuan: ReliefType;
  alasan: string;
  statusKeputusan: ReliefDecision;
  catatanPemilik?: string;
  tanggalPengajuan: string;
  tanggalKeputusan?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export type AdminBetaFlagKey =
  | 'betaAnalyticsForecast'
  | 'betaBulkBillingActions'
  | 'betaCompactAuditStream';

export interface FeatureFlagConfig {
  id: AdminBetaFlagKey;
  key: AdminBetaFlagKey;
  label: string;
  description: string;
  targetRole: 'admin';
  enabled: boolean;
  updatedBy?: string;
}

export interface TestAccountCredential {
  role: UserRole;
  label: string;
  nama: string;
  email: string;
  kodeUji: string;
  ringkasanData: string;
  skenarioUji: string[];
}

export type AppView = 'public' | 'login' | 'dashboard';
