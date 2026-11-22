import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { createApiRouter } from '../server/apiRouter.ts';
import {
  calculateSppInvoice,
  calculateTutorHonorRecap,
  canRolePerformAction,
  checkThreeConsecutiveAbsences,
  computeClassStatus,
  formatPeriode,
  formatRupiah,
  generateReceiptNumber,
  mapFirebaseAuthError,
  MAX_CLASS_CAPACITY,
  MIN_CLASS_STUDENTS,
  REGISTRATION_FEE,
  SESSION_DURATION_MINUTES,
  SESSIONS_PER_WEEK,
  SIBLING_DISCOUNT_PERCENT,
  SPP_BY_JENJANG,
  TUTOR_HONOR_PER_SESSION,
  validateEmailPasswordInput,
} from '../src/lib/businessRules.ts';
import {
  DEMO_USERS,
  SEED_CLASSES,
  SEED_FEATURE_FLAGS,
  SEED_INVOICES,
  SEED_PROGRAMS,
  SEED_STUDENT_ATTENDANCE,
  SEED_STUDENTS,
  SEED_TUTOR_ATTENDANCE,
  SEED_TUTORS,
  TEST_ACCOUNTS_BY_ROLE,
} from '../src/data/seedData.ts';
import type { StudentAttendance, TutorAttendance, UserRole } from '../src/types.ts';

describe('Pengujian Aturan Bisnis Bimbel Cerdas (Unit Tests)', () => {
  it('memvalidasi konstanta tarif dan kapasitas sesuai spesifikasi sistem', () => {
    assert.equal(REGISTRATION_FEE, 100_000);
    assert.equal(MAX_CLASS_CAPACITY, 8);
    assert.equal(MIN_CLASS_STUDENTS, 3);
    assert.equal(SESSIONS_PER_WEEK, 2);
    assert.equal(SESSION_DURATION_MINUTES, 90);
    assert.equal(TUTOR_HONOR_PER_SESSION, 75_000);
    assert.equal(SIBLING_DISCOUNT_PERCENT, 10);

    assert.deepEqual(SPP_BY_JENJANG, {
      SD: 300_000,
      SMP: 400_000,
      SMA: 600_000,
      UTBK: 600_000,
    });
  });

  it('menghitung tagihan SPP dan diskon keluarga 10% otomatis untuk anak ke-2 dan seterusnya', () => {
    const anakPertama = calculateSppInvoice(SPP_BY_JENJANG.SMP, 1);
    assert.equal(anakPertama.diskonPersen, 0);
    assert.equal(anakPertama.nominalDiskon, 0);
    assert.equal(anakPertama.jumlahTagihan, 400_000);

    const anakKeduaSD = calculateSppInvoice(SPP_BY_JENJANG.SD, 2);
    assert.equal(anakKeduaSD.diskonPersen, 10);
    assert.equal(anakKeduaSD.nominalDiskon, 30_000);
    assert.equal(anakKeduaSD.jumlahTagihan, 270_000);

    const anakKetigaUTBK = calculateSppInvoice(SPP_BY_JENJANG.UTBK, 3);
    assert.equal(anakKetigaUTBK.diskonPersen, 10);
    assert.equal(anakKetigaUTBK.nominalDiskon, 60_000);
    assert.equal(anakKetigaUTBK.jumlahTagihan, 540_000);
  });

  it('menentukan status kelas berdasarkan kuota minimal 3 dan maksimal 8 siswa', () => {
    assert.equal(computeClassStatus(0), 'Menunggu Minimal');
    assert.equal(computeClassStatus(2), 'Menunggu Minimal');
    assert.equal(computeClassStatus(3), 'Aktif');
    assert.equal(computeClassStatus(7), 'Aktif');
    assert.equal(computeClassStatus(8), 'Penuh');
    assert.equal(computeClassStatus(9), 'Penuh');
  });

  it('mendeteksi tepat 3 ketidakhadiran berturut-turut terbaru pada siswa', () => {
    const consecutiveUnordered: StudentAttendance[] = [
      {
        id: 'a1',
        parentUid: 'p1',
        idJadwal: 'j1',
        idKelas: 'k1',
        namaKelas: 'SD-A',
        idTutor: 't1',
        tanggal: '2026-11-04',
        idSiswa: 'sis-x',
        namaSiswa: 'Siswa Uji',
        statusKehadiran: 'Tidak Hadir',
      },
      {
        id: 'a3',
        parentUid: 'p1',
        idJadwal: 'j1',
        idKelas: 'k1',
        namaKelas: 'SD-A',
        idTutor: 't1',
        tanggal: '2026-11-11',
        idSiswa: 'sis-x',
        namaSiswa: 'Siswa Uji',
        statusKehadiran: 'Tidak Hadir',
      },
      {
        id: 'a0',
        parentUid: 'p1',
        idJadwal: 'j1',
        idKelas: 'k1',
        namaKelas: 'SD-A',
        idTutor: 't1',
        tanggal: '2026-11-01',
        idSiswa: 'sis-x',
        namaSiswa: 'Siswa Uji',
        statusKehadiran: 'Hadir',
      },
      {
        id: 'a2',
        parentUid: 'p1',
        idJadwal: 'j1',
        idKelas: 'k1',
        namaKelas: 'SD-A',
        idTutor: 't1',
        tanggal: '2026-11-09',
        idSiswa: 'sis-x',
        namaSiswa: 'Siswa Uji',
        statusKehadiran: 'Tidak Hadir',
      },
    ];
    assert.equal(checkThreeConsecutiveAbsences(consecutiveUnordered, 'sis-x'), true);

    const brokenStreak: StudentAttendance[] = [
      ...consecutiveUnordered,
      {
        id: 'a4',
        parentUid: 'p1',
        idJadwal: 'j1',
        idKelas: 'k1',
        namaKelas: 'SD-A',
        idTutor: 't1',
        tanggal: '2026-11-13',
        idSiswa: 'sis-x',
        namaSiswa: 'Siswa Uji',
        statusKehadiran: 'Hadir',
      },
    ];
    assert.equal(checkThreeConsecutiveAbsences(brokenStreak, 'sis-x'), false);

    // Verifikasi terhadap data seed Keisha Wijaya (sis-2) & Naufal Wijaya (sis-1)
    assert.equal(checkThreeConsecutiveAbsences(SEED_STUDENT_ATTENDANCE, 'sis-2'), true);
    assert.equal(checkThreeConsecutiveAbsences(SEED_STUDENT_ATTENDANCE, 'sis-1'), false);
  });

  it('menghitung rekap honor tutor Rp75.000/sesi termasuk pengalihan ke tutor pengganti', () => {
    const sampleAtt: TutorAttendance[] = [
      {
        id: 'ta-1',
        idJadwal: 'j1',
        idKelas: 'k1',
        namaKelas: 'SD-A',
        tanggal: '2026-11-02',
        idTutorAsli: 'tutor-1',
        idTutorMengajar: 'tutor-1',
        namaTutorMengajar: 'Budi Santoso, S.Pd.',
        isPengganti: false,
        statusHadir: true,
        durasiMenit: 90,
        honorSesi: 75_000,
      },
      {
        id: 'ta-2',
        idJadwal: 'j1',
        idKelas: 'k1',
        namaKelas: 'SD-A',
        tanggal: '2026-11-04',
        idTutorAsli: 'tutor-1',
        idTutorMengajar: 'tutor-2',
        namaTutorMengajar: 'Nadia Larasati, M.Si.',
        isPengganti: true,
        statusHadir: true,
        durasiMenit: 90,
        honorSesi: 75_000,
      },
      {
        id: 'ta-3',
        idJadwal: 'j1',
        idKelas: 'k1',
        namaKelas: 'SD-A',
        tanggal: '2026-11-06',
        idTutorAsli: 'tutor-1',
        idTutorMengajar: 'tutor-1',
        namaTutorMengajar: 'Budi Santoso, S.Pd.',
        isPengganti: false,
        statusHadir: false,
        durasiMenit: 90,
        honorSesi: 75_000,
      },
    ];

    const recap = calculateTutorHonorRecap(sampleAtt, SEED_TUTORS);
    const budi = recap.find((r) => r.idTutor === 'tutor-1');
    const nadia = recap.find((r) => r.idTutor === 'tutor-2');

    assert.ok(budi);
    assert.equal(budi.sesiReguler, 1);
    assert.equal(budi.sesiPengganti, 0);
    assert.equal(budi.totalSesi, 1);
    assert.equal(budi.totalHonor, 75_000);

    assert.ok(nadia);
    assert.equal(nadia.sesiReguler, 0);
    assert.equal(nadia.sesiPengganti, 1);
    assert.equal(nadia.totalSesi, 1);
    assert.equal(nadia.totalHonor, 75_000);

    const seedRecap = calculateTutorHonorRecap(SEED_TUTOR_ATTENDANCE, SEED_TUTORS);
    assert.ok(seedRecap.length >= SEED_TUTORS.length);
    assert.ok(seedRecap.every((row) => row.totalSesi === row.sesiReguler + row.sesiPengganti));
  });

  it('memformat nomor kuitansi, periode bulan Indonesia, dan nominal Rupiah', () => {
    assert.equal(generateReceiptNumber(7, '2026-11-18'), 'KW-BC-20261118-0007');
    assert.equal(formatPeriode(11, 2026), 'November 2026');
    assert.match(formatRupiah(300_000), /^Rp300[.,]000$/);
  });

  it('memvalidasi input form Email & Kata Sandi serta menerjemahkan kode galat Firebase Auth', () => {
    const emptyEmail = validateEmailPasswordInput({ mode: 'login', email: '', password: 'secret' });
    assert.equal(emptyEmail.ok, false);

    const shortPass = validateEmailPasswordInput({
      mode: 'register',
      nama: 'Budi',
      email: 'budi@example.com',
      password: '123',
    });
    assert.equal(shortPass.ok, false);

    const validReg = validateEmailPasswordInput({
      mode: 'register',
      nama: '  Budi Santoso  ',
      email: '  budi@example.com ',
      password: 'password123',
    });
    assert.equal(validReg.ok, true);
    if (validReg.ok) {
      assert.equal(validReg.email, 'budi@example.com');
      assert.equal(validReg.nama, 'Budi Santoso');
    }

    assert.match(
      mapFirebaseAuthError({ code: 'auth/invalid-credential' }),
      /Email atau kata sandi tidak sesuai/
    );
    assert.match(
      mapFirebaseAuthError({ code: 'auth/operation-not-allowed' }),
      /Firebase Console/
    );
    assert.match(
      mapFirebaseAuthError({ code: 'auth/unauthorized-domain' }, 'kasus-5-bimbel-cerdas.vercel.app'),
      /kasus-5-bimbel-cerdas\.vercel\.app/
    );
  });
});

describe('Pengujian Integritas Data Seed, RBAC & Feature Flags', () => {
  it('memastikan seluruh program dan kelas seed memenuhi aturan kapasitas dan tarif', () => {
    assert.equal(SEED_PROGRAMS.length, 4);
    for (const prog of SEED_PROGRAMS) {
      assert.equal(prog.biayaPendaftaran, REGISTRATION_FEE);
      assert.equal(prog.frekuensiMingguan, SESSIONS_PER_WEEK);
      assert.equal(prog.durasiMenit, SESSION_DURATION_MINUTES);
      assert.equal(prog.biayaSpp, SPP_BY_JENJANG[prog.jenjang]);
    }

    for (const cls of SEED_CLASSES) {
      assert.equal(
        cls.statusKelas,
        computeClassStatus(cls.jumlahTerisi, cls.kapasitasMaksimal, cls.jumlahMinimal)
      );
    }
  });

  it('memastikan isolasi akun demo untuk ke-4 peran dan konsistensi anak keluarga Wijaya', () => {
    const roles: UserRole[] = ['orang_tua', 'tutor', 'admin', 'pemilik'];
    for (const role of roles) {
      assert.equal(DEMO_USERS[role].role, role);
      assert.equal(DEMO_USERS[role].statusAktif, true);
    }

    const wijayaChildren = SEED_STUDENTS.filter((s) => s.parentUid === DEMO_USERS.orang_tua.uid);
    assert.equal(wijayaChildren.length, 2);
    const secondChildInvoice = SEED_INVOICES.find((i) => i.idSiswa === 'sis-2');
    assert.ok(secondChildInvoice);
    assert.equal(secondChildInvoice.diskonPersen, 10);
    assert.equal(secondChildInvoice.jumlahTagihan, 270_000);

    assert.equal(TEST_ACCOUNTS_BY_ROLE.length, 4);
    for (const acc of TEST_ACCOUNTS_BY_ROLE) {
      assert.equal(acc.email, DEMO_USERS[acc.role].email);
      assert.ok(acc.kodeUji.length >= 8);
      assert.ok(acc.skenarioUji.length >= 3);
    }
  });

  it('memastikan feature flags beta terkunci khusus untuk peran Admin', () => {
    assert.equal(SEED_FEATURE_FLAGS.length, 3);
    for (const flag of SEED_FEATURE_FLAGS) {
      assert.equal(flag.targetRole, 'admin');
      assert.equal(flag.enabled, false);
    }

    const enabledState = SEED_FEATURE_FLAGS.map((f) => ({ ...f, enabled: true }));
    const evaluateFlag = (role: UserRole, key: string) =>
      role === 'admin' && Boolean(enabledState.find((f) => f.key === key)?.enabled);

    assert.equal(evaluateFlag('admin', 'betaAnalyticsForecast'), true);
    assert.equal(evaluateFlag('orang_tua', 'betaAnalyticsForecast'), false);
    assert.equal(evaluateFlag('tutor', 'betaAnalyticsForecast'), false);
    assert.equal(evaluateFlag('pemilik', 'betaAnalyticsForecast'), false);

    // Isolasi hak akses ketat per aktor (Pemilik tidak bisa akses fungsi Admin/Tutor/Orang Tua, dst.)
    assert.equal(canRolePerformAction('pemilik', 'decide_relief'), true);
    assert.equal(canRolePerformAction('pemilik', 'manage_payments'), false);
    assert.equal(canRolePerformAction('pemilik', 'manage_users'), false);
    assert.equal(canRolePerformAction('pemilik', 'record_tutor_attendance'), false);
    assert.equal(canRolePerformAction('pemilik', 'register_child'), false);

    assert.equal(canRolePerformAction('admin', 'manage_payments'), true);
    assert.equal(canRolePerformAction('admin', 'manage_users'), true);
    assert.equal(canRolePerformAction('admin', 'decide_relief'), false);
    assert.equal(canRolePerformAction('admin', 'record_tutor_attendance'), false);

    assert.equal(canRolePerformAction('tutor', 'record_tutor_attendance'), true);
    assert.equal(canRolePerformAction('tutor', 'manage_payments'), false);
    assert.equal(canRolePerformAction('tutor', 'decide_relief'), false);

    assert.equal(canRolePerformAction('orang_tua', 'register_child'), true);
    assert.equal(canRolePerformAction('orang_tua', 'submit_relief'), true);
    assert.equal(canRolePerformAction('orang_tua', 'manage_payments'), false);
    assert.equal(canRolePerformAction('orang_tua', 'decide_relief'), false);
  });

  it('memvalidasi daftar email anggota kelompok yang berhak atas akses bootstrap admin', () => {
    const allowedTeam = new Set([
      '12410331@student.unklab.ac.id',
      's22319041@student.unklab.ac.id',
      '12410503@student.unklab.ac.id',
      '12410384@student.unklab.ac.id',
      '12410388@student.unklab.ac.id',
    ]);
    const check = (email: string) => allowedTeam.has(email.trim().toLowerCase());

    assert.equal(check('S22319041@student.unklab.ac.id'), true);
    assert.equal(check('12410503@student.unklab.ac.id'), true);
    assert.equal(check('12410384@student.unklab.ac.id'), true);
    assert.equal(check('12410388@student.unklab.ac.id'), true);
    assert.equal(check('12410331@student.unklab.ac.id'), true);
    assert.equal(check('orangluar@gmail.com'), false);
  });
});

describe('Pengujian REST API Endpoints Bimbel Cerdas', () => {
  it('melayani endpoint health, docs, simulasi-biaya, honor-rekap, dan proteksi koleksi', async () => {
    const app = express();
    app.use('/api', createApiRouter());

    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    try {
      const { port } = server.address() as AddressInfo;
      const base = `http://127.0.0.1:${port}/api`;

      const healthRes = await fetch(`${base}/health`);
      assert.equal(healthRes.status, 200);
      const healthJson = (await healthRes.json()) as { status: string; databaseId: string };
      assert.equal(healthJson.status, 'ok');
      assert.equal(healthJson.databaseId, 'ai-studio-c15e7da5-4f88-4940-89f4-ab28fa592704');

      const docsRes = await fetch(`${base}/docs`);
      assert.equal(docsRes.status, 200);
      const docsJson = (await docsRes.json()) as { endpoints: unknown[] };
      assert.ok(docsJson.endpoints.length >= 8);

      const simRes = await fetch(`${base}/simulasi-biaya`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ children: [{ jenjang: 'SMP' }, { jenjang: 'SD' }] }),
      });
      assert.equal(simRes.status, 200);
      const simJson = (await simRes.json()) as {
        totalPendaftaran: number;
        totalDiskonBulanan: number;
        totalSppBulanan: number;
      };
      assert.equal(simJson.totalPendaftaran, 200_000);
      assert.equal(simJson.totalDiskonBulanan, 30_000);
      assert.equal(simJson.totalSppBulanan, 670_000);

      const honorRes = await fetch(`${base}/honor-rekap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendances: SEED_TUTOR_ATTENDANCE }),
      });
      assert.equal(honorRes.status, 200);
      const honorJson = (await honorRes.json()) as { totalHonorKeseluruhan: number };
      assert.equal(honorJson.totalHonorKeseluruhan, 300_000);

      const akunUjiRes = await fetch(`${base}/akun-uji`);
      assert.equal(akunUjiRes.status, 200);
      const akunUjiJson = (await akunUjiRes.json()) as {
        totalAktor: number;
        data: Array<{ role: UserRole; email: string; kodeUji: string }>;
      };
      assert.equal(akunUjiJson.totalAktor, 4);
      assert.deepEqual(
        akunUjiJson.data.map((item) => item.role),
        ['orang_tua', 'tutor', 'admin', 'pemilik']
      );

      const unauthColRes = await fetch(`${base}/collections/invoices`);
      assert.equal(unauthColRes.status, 401);

      const notFoundRes = await fetch(`${base}/tidak-ada`);
      assert.equal(notFoundRes.status, 404);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});

