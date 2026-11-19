# Security Specification — Bimbel Cerdas Firestore Rules

## 1. Data Invariants
1. **Role Integrity**: Pengguna baru hanya dapat membuat profil `/users/{userId}` dengan `role == 'orang_tua'`. Perubahan peran ke `tutor`, `admin`, atau `pemilik` hanya boleh dilakukan oleh `isAdmin()`.
2. **Parent-Child Isolation**: Dokumen siswa (`students`), pendaftaran (`registrations`), daftar tunggu (`waitlists`), absensi siswa (`student_attendance`), tagihan (`invoices`), pembayaran (`payments`), kuitansi (`receipts`), notifikasi (`notifications`), tindak lanjut (`followups`), dan keringanan (`relief_requests`) selalu terikat pada `parentUid`. Orang tua hanya dapat membaca/membuat data miliknya sendiri (`parentUid == request.auth.uid`).
3. **Financial & Approval Gates**:
   - Orang tua tidak dapat mengubah `statusTagihan`, `jumlahTagihan`, atau `diskonPersen` pada `invoices`, dan tidak dapat menerbitkan `payments` atau `receipts` secara langsung.
   - Orang tua dapat membuat `relief_requests` hanya dengan `statusKeputusan == 'Menunggu'` untuk tagihan miliknya sendiri, dan hanya Pemilik atau Admin yang dapat menyetujui/menolak (`Disetujui` / `Ditolak`).
   - Tagihan dengan `statusTagihan == 'Lunas'` bersifat terminal bagi non-admin.
4. **Tutor Scope**: Tutor dapat mencatat `student_attendance` dan `tutor_attendance` (termasuk sebagai tutor pengganti), tetapi tidak dapat mengubah data keuangan atau master program/kelas.
5. **Catalog Public Read / Admin Write**: `programs`, `classes`, dan `schedules` dapat dibaca oleh publik agar halaman Informasi Program & Biaya berfungsi sebelum login, tetapi hanya `isAdmin()` yang dapat menulisnya. Data PII (`users`, `tutors`) terisolasi dari bacaan publik.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Privilege Escalation on Signup**: `POST /users/{uid}` dengan `{ role: 'admin', ... }` oleh pengguna non-admin -> `PERMISSION_DENIED`.
2. **Role Self-Promotion on Update**: `PATCH /users/{uid}` mengubah `{ role: 'pemilik' }` -> `PERMISSION_DENIED`.
3. **Cross-Parent Student Read**: Orang tua A membaca `/students/{studentBelongingToB}` -> `PERMISSION_DENIED`.
4. **Cross-Parent Invoice Spoofing**: Orang tua A membuat `/relief_requests/{id}` dengan `parentUid: uidB` -> `PERMISSION_DENIED`.
5. **Pre-Approved Relief Injection**: Orang tua membuat `/relief_requests/{id}` dengan `statusKeputusan: 'Disetujui'` -> `PERMISSION_DENIED`.
6. **Parent Paying Own Invoice Client-Side**: Orang tua mengubah `/invoices/{id}` menjadi `statusTagihan: 'Lunas'` -> `PERMISSION_DENIED`.
7. **Shadow Field Injection**: Menambahkan field liar `{ isBypassed: true }` pada `create`/`update` di koleksi mana pun -> `PERMISSION_DENIED` (ditolak oleh `keys().hasOnly(...)` / `affectedKeys().hasOnly(...)`).
8. **ID Poisoning**: Membuat dokumen dengan ID > 128 karakter atau karakter ilegal `../hack` -> `PERMISSION_DENIED` (`isValidId`).
9. **Resource Exhaustion (1MB String)**: Mengirim `alasan` atau `namaSiswa` > batas `maxLength` -> `PERMISSION_DENIED`.
10. **Timestamp Spoofing**: Mengirim `createdAt` atau `updatedAt` palsu yang tidak sama dengan `request.time` -> `PERMISSION_DENIED`.
11. **PII Scraping on Tutors**: Pengguna belum login atau orang tua mencoba membaca `/tutors` yang memuat email/telepon/alamat tutor -> `PERMISSION_DENIED`.
12. **Terminal State Tampering**: Mengubah `relief_requests` yang sudah `'Disetujui'` kembali ke `'Menunggu'` oleh non-admin -> `PERMISSION_DENIED`.
