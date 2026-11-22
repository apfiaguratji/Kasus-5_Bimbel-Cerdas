# Dokumentasi Pengujian, Matriks Keterlacakan, Manual Pengguna & Panduan Demo
## Sistem Informasi Manajemen Bimbel Cerdas

- **Aplikasi**: Sistem Informasi Manajemen Bimbel Cerdas
- **Domain Publik (Vercel)**: `https://kasus-5-bimbel-cerdas.vercel.app`
- **Aktor Terintegrasi**: Pengunjung Publik, Orang Tua, Tutor, Admin, Pemilik
- **Arsitektur**: React 19 + TypeScript + Tailwind CSS + Express REST API + Firebase Auth & Cloud Firestore

---

## 1. Test Case per Kebutuhan dan Hasilnya

### 1.1 Ringkasan Hasil Eksekusi Pengujian Terverifikasi

| Jenis Pengujian | Perintah / Metode | Hasil Aktual |
| :--- | :--- | :--- |
| **Unit & API Integration Test** | `npm test` (`tsx --test tests/*.test.ts`) | **11/11 lulus** (3 suite, 0 gagal) |
| **TypeScript Static Check** | `tsc --noEmit` | **Lulus** (exit code 0, tanpa error) |
| **Build Produksi (SPA)** | `vite build` | **Sukses** |
| **Audit Security Rules** | `npx eslint firestore.rules DRAFT_firestore.rules` | **Lulus** (exit code 0) |

### 1.2 Daftar Test Case per Kebutuhan

| ID Test | Kebutuhan (Req ID) | Aktor / Modul | Skenario & Input Uji | Hasil yang Diharapkan | Hasil Aktual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | **REQ-01** Publikasi Info & Simulasi Biaya | Pengunjung (`PublicSite.tsx`) | Buka `#beranda`, `#profil`, `#program`, `#biaya`; jalankan simulasi biaya untuk 2 anak (SMP + SD). | 4 halaman publik tampil; anak ke-1 SMP Rp400.000, anak ke-2 SD diskon 10% (Rp270.000), pendaftaran 2×Rp100.000. | Kalkulator dan endpoint `POST /api/simulasi-biaya` mengembalikan `totalSppBulanan: 670000`, `totalDiskonBulanan: 30000`, `totalPendaftaran: 200000`. | **LULUS** |
| **TC-02** | **REQ-02** Autentikasi & Isolasi 4 Aktor | Semua Aktor (`LoginPage.tsx`) | Login dengan Email & Kata Sandi Akun Uji (`ratna.wijaya@contoh.id` / `OrtuUji#2026`, dst.) maupun sandi salah, serta Google Sign-In. | Kredensial cocok masuk ke portal sesuai peran; sandi salah ditolak dengan pesan error; Google baru default ke `orang_tua` (kecuali 5 email tim bootstrap). | Login valid mengarahkan ke dashboard masing-masing aktor; salah sandi memicu pesan error validasi. | **LULUS** |
| **TC-03** | **REQ-03** Pendaftaran Siswa & Kuota Kelas (Min 3, Maks 8) | Orang Tua (`ParentDashboard.tsx`) | Daftarkan anak ke kelas tersedia (`< 8` siswa) dan ke kelas penuh (`8/8` siswa). | Kelas `< 3` berstatus `Menunggu Minimal`, `3–7` `Aktif`, `8` `Penuh`. Pendaftaran ke kelas penuh otomatis masuk koleksi `waitlists`. | `computeClassStatus(0..9)` & alur `registerChild` memisahkan kelas aktif dan `Daftar Tunggu` dengan benar. | **LULUS** |
| **TC-04** | **REQ-04** Diskon Keluarga 10% Anak ke-2+ | Orang Tua (`businessRules.ts`) | Hitung SPP untuk anak ke-1 (`SMP` Rp400.000), anak ke-2 (`SD` Rp300.000), dan anak ke-3 (`UTBK` Rp600.000). | Anak ke-1 diskon 0%; anak ke-2 & ke-3 otomatis diskon 10% (`Rp270.000` & `Rp540.000`). | `calculateSppInvoice` lulus unit test `npm test` #2 dan data seed keluarga Wijaya. | **LULUS** |
| **TC-05** | **REQ-05** Absensi Siswa & Deteksi Bolos 3× Berturut-turut | Tutor (`TutorDashboard.tsx`) | Input 3 status `Tidak Hadir` berturut-turut pada sesi terbaru untuk satu siswa, lalu uji sesi berikutnya hadir. | Pada 3× absen berturut-turut, sistem otomatis membuat notifikasi Orang Tua (`Absensi 3x`) dan tiket follow-up Admin (`Menunggu Telepon`). Jika `Hadir`, streak terputus. | `checkThreeConsecutiveAbsences` lulus unit test `npm test` #4 dan data seed `sis-2`. | **LULUS** |
| **TC-06** | **REQ-06** Absensi Tutor & Pengalihan Honor ke Pengganti | Tutor (`TutorDashboard.tsx`) | Catat sesi 90 menit: Tutor A hadir reguler (1 sesi), Tutor B menggantikan Tutor A (1 sesi), Tutor A tidak hadir (1 sesi). | Tarif honor Rp75.000/sesi; sesi tidak hadir Rp0; sesi pengganti dihitung ke `idTutorMengajar` (Tutor B). | `calculateTutorHonorRecap` lulus unit test `npm test` #5 dan endpoint `POST /api/honor-rekap`. | **LULUS** |
| **TC-07** | **REQ-07** Daftar Tunggu & Tindak Lanjut Telepon Bolos | Admin (`AdminDashboard.tsx`) | Promosikan siswa dari `Daftar Tunggu` ke kelas tersedia; ubah status follow-up `Menunggu Telepon` → `Selesai` + catatan panggilan. | Status waitlist menjadi `Ditempatkan`, jumlah terisi kelas bertambah, tagihan SPP dibuat; riwayat panggilan Admin tersimpan. | Status antrean, kapasitas kelas, tagihan, dan catatan telepon tersinkron. | **LULUS** |
| **TC-08** | **REQ-08** Pembayaran, Tunggakan & Kuitansi Resmi | Admin (`AdminDashboard.tsx`) | Konfirmasi bayar SPP (`Transfer Bank` / `QRIS` / `Tunai`), buat tagihan bulanan, atau tandai `Tunggakan`; buka modal kuitansi. | Nomor kuitansi terformat `KW-BC-YYYYMMDD-XXXX`, status tagihan berubah `Lunas`, masuk ke `payments` & `receipts`. | `generateReceiptNumber` lulus unit test `npm test` #6; modal kuitansi menampilkan rincian resmi. | **LULUS** |
| **TC-09** | **REQ-09** Arus Kas, Persetujuan Keringanan & Laporan PDF | Pemilik (`OwnerDashboard.tsx`) | Tinjau ringkasan kas & tunggakan, proses pengajuan keringanan (`Disetujui` / `Ditolak`), lalu klik `Download Report (PDF)`. | Keputusan mengirim notifikasi ke Orang Tua; file `laporan-bimbel-cerdas-YYYY-MM.pdf` terunduh berisi 5 bagian laporan. | Notifikasi terkirim ke Orang Tua dan PDF berhasil di-generate via `exportOwnerReportPdf`. | **LULUS** |
| **TC-10** | **REQ-10** RBAC, Feature Flags Admin & Proteksi API | Admin / Sistem (`firestore.rules`, `apiRouter.ts`) | Evaluasi `isFeatureEnabled` di 4 peran; uji akses `GET /api/collections/invoices` tanpa Bearer token; uji daftar 5 email tim bootstrap. | Feature flag beta hanya aktif pada peran `admin`; `/api/collections/*` tanpa token mengembalikan HTTP `401`; hanya 5 email tim yang diizinkan bootstrap admin. | Lulus unit test `npm test` #8, #9, #10, #11 dan `GET /api/akun-uji` mengembalikan HTTP `200`. | **LULUS** |

---

## 2. Matriks Keterlacakan (Requirements Traceability Matrix)

| Req ID | Deskripsi Kebutuhan | Aktor | Modul UI / Layanan | Koleksi Firestore / Endpoint | Aturan Keamanan (`firestore.rules`) | Test Case | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | Informasi profil, program, jadwal publik, dan kalkulator biaya keluarga | Pengunjung | `PublicSite.tsx` | `programs`, `classes`, `schedules`, `GET /api/programs`, `POST /api/simulasi-biaya` | `allow get, list: if true` (katalog publik) | **TC-01** | Terpenuhi |
| **REQ-02** | Autentikasi Google, login kredensial akun uji, & manajemen peran | Semua Aktor | `LoginPage.tsx`, `AppDataContext.tsx`, `AdminDashboard.tsx` | `users`, `admins`, `GET /api/akun-uji` | Owner/Admin read; `isBootstrappedAdmin()` untuk 5 email tim | **TC-02** | Terpenuhi |
| **REQ-03** | Pendaftaran anak, cek kuota minimal 3 & maksimal 8, serta antrean otomatis | Orang Tua | `ParentDashboard.tsx` (`Daftarkan Anak`) | `students`, `registrations`, `classes`, `waitlists` | `parentUid == request.auth.uid \|\| isStaff()` | **TC-03** | Terpenuhi |
| **REQ-04** | Perhitungan otomatis diskon keluarga 10% untuk anak ke-2 dst. | Orang Tua, Sistem | `businessRules.ts`, `ParentDashboard.tsx` | `invoices` | `diskonPersen == 0 \|\| diskonPersen == 10` | **TC-04** | Terpenuhi |
| **REQ-05** | Pencatatan absensi siswa dan deteksi otomatis bolos 3× berturut-turut | Tutor, Orang Tua, Admin | `TutorDashboard.tsx` (`Absensi & Konfirmasi`) | `student_attendance`, `notifications`, `followups` | `create: if isTutor()`; notifikasi terbaca pemilik `parentUid` | **TC-05** | Terpenuhi |
| **REQ-06** | Konfirmasi mengajar tutor (90 menit) & pengalihan honor Rp75.000 ke pengganti | Tutor, Pemilik | `TutorDashboard.tsx`, `businessRules.ts` | `tutor_attendance`, `POST /api/honor-rekap` | `honorSesi == 75000 \|\| honorSesi == 0`; `durasiMenit == 90` | **TC-06** | Terpenuhi |
| **REQ-07** | Pengelolaan daftar tunggu & tindak lanjut telepon siswa bolos 3× | Admin | `AdminDashboard.tsx` (`Daftar Tunggu`, `Tindak Lanjut Bolos`) | `waitlists`, `followups`, `classes`, `students` | `update: if isAdmin()` | **TC-07** | Terpenuhi |
| **REQ-08** | Pencatatan pembayaran SPP/pendaftaran, status tunggakan, & kuitansi | Admin, Orang Tua | `AdminDashboard.tsx`, `ReceiptModal.tsx` | `invoices`, `payments`, `receipts` | `payments`/`receipts` create hanya `isAdmin()` | **TC-08** | Terpenuhi |
| **REQ-09** | Pemantauan arus kas, persetujuan keringanan SPP, & ekspor PDF | Pemilik | `OwnerDashboard.tsx`, `pdfReport.ts` | `payments`, `tutor_attendance`, `relief_requests` | Keputusan `relief_requests` hanya `isPemilik() \|\| isAdmin()` | **TC-09** | Terpenuhi |
| **REQ-10** | Kontrol fitur beta Admin (Feature Flags) & REST API terproteksi | Admin, Integrasi | `AdminDashboard.tsx` (`Fitur Beta`), `server/apiRouter.ts` | `feature_flags`, `/api/health`, `/api/docs`, `/api/collections/:name` | `feature_flags` hanya `isAdmin()`; API koleksi wajib Bearer Token | **TC-10** | Terpenuhi |

---

## 3. Manual Pengguna Singkat

### 3.1 Akses & Cara Masuk
1. **Halaman Publik**: Buka website (`https://kasus-5-bimbel-cerdas.vercel.app`) untuk mengakses menu **Beranda** (`#beranda`), **Profil** (`#profil`), **Program** (`#program`), dan **Biaya** (`#biaya`).
2. **Masuk ke Portal**: Klik tombol **Masuk** di pojok kanan atas:
   - **Mode Live Database (Firestore)**: Klik **Masuk dengan Google (Live DB)**. Email pendaftar umum masuk sebagai Orang Tua; 5 email tim kelompok otomatis mendapat akses switcher Pemilik/Admin.
   - **Mode Akun Uji (Sandbox Terisolasi)**: Masukkan Email & Kata Sandi Uji pada form login atau klik **Isi ke Form Login** / **Masuk Langsung** pada kartu aktor berikut:

| Aktor | Nama Akun | Email Uji | Kata Sandi Uji |
| :--- | :--- | :--- | :--- |
| **Orang Tua** | Ibu Ratna Wijaya | `ratna.wijaya@contoh.id` | `OrtuUji#2026` |
| **Tutor** | Budi Santoso, S.Pd. | `budi.tutor@bimbelcerdas.id` | `TutorUji#2026` |
| **Admin** | Sari Kusuma (Admin) | `admin@bimbelcerdas.id` | `AdminUji#2026` |
| **Pemilik** | Hendra Pratama (Pemilik) | `pemilik@bimbelcerdas.id` | `PemilikUji#2026` |

### 3.2 Panduan Operasional per Aktor
- **Orang Tua**:
  - *Ringkasan Anak*: Memantau anak aktif, urutan anak, dan status kelas.
  - *Daftarkan Anak*: Mendaftarkan anak baru ke jenjang/program dan kelas; kelas penuh otomatis masuk Daftar Tunggu.
  - *Jadwal & Kehadiran*: Melihat jadwal belajar dan riwayat absensi anak.
  - *SPP & Kuitansi*: Memantau tagihan SPP, mengajukan **Keringanan**, serta mengunduh/melihat **Kuitansi Resmi**.
  - *Notifikasi*: Membaca peringatan otomatis (termasuk alarm absen 3× berturut-turut dan status keringanan).
- **Tutor**:
  - *Absensi & Konfirmasi*: Memilih jadwal, mengonfirmasi hadir mengajar atau menandai **Tutor Pengganti**, lalu menginput status hadir/tidak hadir siswa.
  - *Jadwal Mengajar & Kelas Diampu*: Melihat jadwal sesi 90 menit, ruangan, dan daftar siswa.
  - *Riwayat & Honor*: Memantau total sesi mengajar dan honor (`Rp75.000/sesi`).
- **Admin**:
  - *Ringkasan Operasional & Siswa*: Memantau statistik operasional dan data pendaftaran.
  - *Daftar Tunggu*: Mempromosikan siswa antrean ke kelas tersedia atau membatalkan antrean.
  - *Pembayaran & Kuitansi*: Mengonfirmasi pembayaran pendaftaran/SPP, membuat tagihan bulanan, menandai tunggakan, dan mencetak kuitansi.
  - *Tindak Lanjut Bolos*: Menghubungi orang tua dari siswa dengan 3× absen berturut-turut dan mencatat hasil panggilan.
  - *Program, Kelas & Jadwal / Akun / Fitur Beta*: Mengelola master data, hak akses peran, dan toggle fitur beta khusus Admin.
- **Pemilik**:
  - *Ringkasan Keuangan & Laporan Bulanan*: Memilih periode bulan/tahun, memantau arus kas bersih, dan klik **Download Report (PDF)**.
  - *Rekap Honor Tutor & Daftar Tunggakan*: Mengaudit honor reguler vs pengganti per tutor dan daftar tagihan menunggak.
  - *Persetujuan Keringanan*: Menyetujui atau menolak pengajuan keringanan dari Orang Tua disertai catatan resmi.

---

## 4. Panduan Presentasi & Live Demo

### 4.1 Kerangka Slide Presentasi (8–10 Menit)
1. **Slide 1 — Judul & Tim Kelompok**: Sistem Informasi Manajemen Bimbel Cerdas (Kasus 5).
2. **Slide 2 — Masalah & Tujuan**: Mengatasi pencatatan manual kuota kelas, diskon keluarga, deteksi dini siswa sering absen, dan perhitungan honor tutor pengganti.
3. **Slide 3 — Arsitektur Sistem**: Frontend React + TypeScript + Tailwind CSS, Backend Express REST API (`/api/*`) + Vercel Serverless, Database Firebase Auth & Firestore + `firestore.rules`.
4. **Slide 4 — Aturan Bisnis Utama**:
   - Pendaftaran Rp100.000; SPP SD Rp300rb, SMP Rp400rb, SMA/UTBK Rp600rb; diskon anak ke-2+ sebesar 10%.
   - Kelas minimal 3 siswa, maksimal 8 siswa (otomatis *Waitlist* saat penuh).
   - Deteksi otomatis 3× tidak hadir berturut-turut; honor tutor Rp75.000/sesi (90 menit) dialihkan ke pengganti bila digantikan.
5. **Slide 5 — Hasil Pengujian & Keterlacakan**: 11/11 unit & API tests lulus, TypeScript & build bersih, RBAC terisolasi di aplikasi & Firestore rules.
6. **Slide 6 — Live Demo & Penutup**.

### 4.2 Skrip Urutan Live Demo (5 Menit)
1. **Halaman Publik (`#beranda` → `#program` → `#biaya`)** *(30 detik)*: Tunjukkan 4 halaman publik dan jalankan **Kalkulator Biaya Keluarga** untuk 2 anak guna membuktikan potongan 10% anak ke-2.
2. **Portal Orang Tua (`ratna.wijaya@contoh.id` / `OrtuUji#2026`)** *(1 menit)*: Perlihatkan 2 anak terdaftar, tagihan SPP dengan diskon 10%, notifikasi absen 3×, dan ajukan 1 permohonan **Keringanan**.
3. **Portal Tutor (`budi.tutor@bimbelcerdas.id` / `TutorUji#2026`)** *(1 menit)*: Buka `Absensi & Konfirmasi`, contohkan input absen siswa & opsi **Tutor Pengganti**, simpan sesi, dan lihat pembaruan di `Riwayat & Honor`.
4. **Portal Admin (`admin@bimbelcerdas.id` / `AdminUji#2026`)** *(1 menit)*: Catat hasil panggilan di `Tindak Lanjut Bolos`, konfirmasi pelunasan SPP di `Pembayaran & Kuitansi` untuk menampilkan **Kuitansi Resmi**, dan tunjukkan toggle di `Fitur Beta (Flags)`.
5. **Portal Pemilik (`pemilik@bimbelcerdas.id` / `PemilikUji#2026`)** *(1 menit)*: Tampilkan `Ringkasan Keuangan` dan `Rekap Honor Tutor`, setujui pengajuan keringanan di `Persetujuan Keringanan`, lalu klik **Download Report (PDF)**.
6. **Bukti REST API** *(30 detik)*: Buka `/api/health`, `/api/docs`, atau `/api/akun-uji` di tab browser untuk menunjukkan kesiapan endpoint backend.
