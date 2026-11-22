import dns from 'node:dns/promises';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateSppInvoice,
  calculateTutorHonorRecap,
  REGISTRATION_FEE,
  SIBLING_DISCOUNT_PERCENT,
  SPP_BY_JENJANG,
  TUTOR_HONOR_PER_SESSION,
  validateEmailAddressFormat,
} from '../src/lib/businessRules.ts';
import {
  SEED_CLASSES,
  SEED_PROGRAMS,
  SEED_SCHEDULES,
  SEED_TUTORS,
  TEST_ACCOUNTS_BY_ROLE,
} from '../src/data/seedData.ts';
import type { Jenjang, Tutor, TutorAttendance } from '../src/types.ts';

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(process.cwd(), 'firebase-applet-config.json'),
    path.resolve(currentDir, '../firebase-applet-config.json'),
  ];
  for (const configPath of candidatePaths) {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(raw) as FirebaseAppletConfig;
    }
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0798980042',
    apiKey: process.env.FIREBASE_API_KEY || '',
    firestoreDatabaseId:
      process.env.FIRESTORE_DATABASE_ID || 'ai-studio-c15e7da5-4f88-4940-89f4-ab28fa592704',
  };
}

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

function decodeFirestoreValue(val: FirestoreValue): unknown {
  if ('stringValue' in val) return val.stringValue ?? '';
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('timestampValue' in val) return val.timestampValue ?? '';
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return null;
}

interface FirestoreRestDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

async function fetchFirestoreCollection<T>(
  collectionName: string,
  bearerToken?: string
): Promise<T[] | null> {
  const cfg = loadFirebaseConfig();
  const dbId = cfg.firestoreDatabaseId || '(default)';
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    cfg.projectId
  )}/databases/${encodeURIComponent(dbId)}/documents:runQuery`;
  const url =
    !bearerToken && cfg.apiKey
      ? `${baseUrl}?key=${encodeURIComponent(cfg.apiKey)}`
      : baseUrl;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (bearerToken) {
    headers.Authorization = bearerToken;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        limit: 100,
      },
    }),
  });
  if (!res.ok) {
    if (bearerToken) {
      const errText = await res.text();
      throw new Error(`FIRESTORE_${res.status}:${errText}`);
    }
    return null;
  }

  const rows = (await res.json()) as Array<{ document?: FirestoreRestDocument }>;
  const docs = rows.map((r) => r.document).filter((d): d is FirestoreRestDocument => Boolean(d));
  return docs.map((d) => {
    const segments = d.name.split('/');
    const id = segments[segments.length - 1] || '';
    const record: Record<string, unknown> = { id };
    for (const [key, val] of Object.entries(d.fields || {})) {
      if (key === 'createdAt' || key === 'updatedAt') continue;
      record[key] = decodeFirestoreValue(val);
    }
    return record as T;
  });
}

const PROTECTED_COLLECTIONS = new Set([
  'users',
  'tutors',
  'students',
  'registrations',
  'waitlists',
  'student_attendance',
  'tutor_attendance',
  'invoices',
  'payments',
  'receipts',
  'notifications',
  'followups',
  'relief_requests',
  'feature_flags',
]);

async function verifyEmailDomainMx(rawEmail: string): Promise<
  | { valid: true; email: string; domain: string; mxCount: number; skippedDnsCheck?: boolean }
  | { valid: false; error: string; code: string; domain?: string }
> {
  const formatCheck = validateEmailAddressFormat(rawEmail, { strictDomainPolicy: true });
  if (!formatCheck.ok) {
    return { valid: false, error: formatCheck.error, code: 'INVALID_FORMAT' };
  }

  const { email, domain } = formatCheck;

  try {
    const mxRecords = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error('DNS timeout'), { code: 'ETIMEOUT' })), 3500)
      ),
    ]);

    const activeMx = mxRecords.filter(
      (record) => record.exchange && record.exchange.trim() !== '' && record.exchange.trim() !== '.'
    );

    if (activeMx.length === 0) {
      return {
        valid: false,
        code: 'NO_MX_RECORD',
        domain,
        error: `Domain email "${domain}" tidak memiliki server penerima email aktif (MX record). Gunakan alamat email aktif yang valid.`,
      };
    }

    return {
      valid: true,
      email,
      domain,
      mxCount: activeMx.length,
    };
  } catch (err: unknown) {
    const dnsCode =
      err && typeof err === 'object' && 'code' in err ? String((err as { code?: unknown }).code) : '';

    if (dnsCode === 'ENOTFOUND' || dnsCode === 'ENODATA' || dnsCode === 'ENOTIMP') {
      return {
        valid: false,
        code: dnsCode,
        domain,
        error: `Domain email "${domain}" tidak ditemukan atau tidak dapat menerima email. Periksa kembali penulisan alamat email Anda.`,
      };
    }

    return {
      valid: true,
      email,
      domain,
      mxCount: 0,
      skippedDnsCheck: true,
    };
  }
}

export function createApiRouter(): express.Router {
  const router = express.Router();
  router.use(express.json());

  router.get('/health', (_req, res) => {
    const cfg = loadFirebaseConfig();
    res.json({
      status: 'ok',
      service: 'Bimbel Cerdas REST API',
      projectId: cfg.projectId,
      databaseId: cfg.firestoreDatabaseId,
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/docs', (_req, res) => {
    res.json({
      service: 'Bimbel Cerdas REST API',
      version: '1.0.0',
      endpoints: [
        {
          method: 'GET',
          path: '/api/health',
          auth: 'Publik',
          description: 'Cek status server API dan konfigurasi database Firestore.',
        },
        {
          method: 'GET',
          path: '/api/docs',
          auth: 'Publik',
          description: 'Daftar lengkap endpoint REST API Bimbel Cerdas.',
        },
        {
          method: 'GET',
          path: '/api/programs',
          auth: 'Publik',
          query: { jenjang: 'Opsional (SD | SMP | SMA | UTBK)' },
          description: 'Mengambil daftar program belajar dan tarif SPP.',
        },
        {
          method: 'GET',
          path: '/api/classes',
          auth: 'Publik',
          query: { jenjang: 'Opsional', status: 'Opsional (Aktif | Penuh | Menunggu Minimal)' },
          description: 'Mengambil daftar kelas serta sisa kuota kursi.',
        },
        {
          method: 'GET',
          path: '/api/schedules',
          auth: 'Publik',
          query: { idKelas: 'Opsional', hari: 'Opsional' },
          description: 'Mengambil jadwal sesi belajar dan ruangan.',
        },
        {
          method: 'POST',
          path: '/api/simulasi-biaya',
          auth: 'Publik',
          body: { children: [{ jenjang: 'SD | SMP | SMA | UTBK' }] },
          description:
            'Menghitung biaya pendaftaran (Rp100.000/anak) serta SPP bulanan dan diskon anak ke-2+ (10%).',
        },
        {
          method: 'POST',
          path: '/api/honor-rekap',
          auth: 'Publik',
          body: { attendances: 'TutorAttendance[]', tutors: 'Tutor[] (opsional)' },
          description:
            'Menghitung rekap honor tutor Rp75.000/sesi termasuk pengalihan ke tutor pengganti.',
        },
        {
          method: 'GET',
          path: '/api/akun-uji',
          auth: 'Publik',
          description:
            'Daftar akun uji standar per aktor (Orang Tua, Tutor, Admin, Pemilik) beserta skenario pengujian.',
        },
        {
          method: 'POST',
          path: '/api/validate-email',
          auth: 'Publik',
          body: { email: 'string' },
          description:
            'Memvalidasi format email, typo domain, domain sementara/palsu, serta memeriksa DNS MX record aktif sebelum pendaftaran akun.',
        },
        {
          method: 'GET',
          path: '/api/collections/:name',
          auth: 'Bearer Token (Firebase Auth ID Token)',
          description:
            'Mengambil dokumen koleksi terproteksi (students, invoices, payments, receipts, dll.) sesuai aturan firestore.rules.',
        },
      ],
    });
  });

  router.post('/validate-email', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const result = await verifyEmailDomainMx(email);
    if (!result.valid) {
      res.status(422).json(result);
      return;
    }
    res.json(result);
  });

  router.get('/akun-uji', (_req, res) => {
    res.json({
      mode: 'sandbox-demo',
      totalAktor: TEST_ACCOUNTS_BY_ROLE.length,
      catatan:
        'Gunakan email dan kodeUji di halaman Masuk Bimbel Cerdas untuk menguji keempat aktor secara terisolasi.',
      data: TEST_ACCOUNTS_BY_ROLE,
    });
  });

  router.get('/programs', async (req, res) => {
    const jenjang = typeof req.query.jenjang === 'string' ? req.query.jenjang.toUpperCase() : '';
    try {
      const live = await fetchFirestoreCollection<typeof SEED_PROGRAMS[number]>('programs');
      const source = live && live.length > 0 ? live : SEED_PROGRAMS;
      const items = jenjang ? source.filter((p) => p.jenjang === jenjang) : source;
      res.json({
        source: live && live.length > 0 ? 'firestore' : 'seed',
        count: items.length,
        data: items,
      });
    } catch {
      const items = jenjang ? SEED_PROGRAMS.filter((p) => p.jenjang === jenjang) : SEED_PROGRAMS;
      res.json({ source: 'seed', count: items.length, data: items });
    }
  });

  router.get('/classes', async (req, res) => {
    const jenjang = typeof req.query.jenjang === 'string' ? req.query.jenjang.toUpperCase() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    try {
      const live = await fetchFirestoreCollection<typeof SEED_CLASSES[number]>('classes');
      const source = live && live.length > 0 ? live : SEED_CLASSES;
      const items = source.filter(
        (c) => (!jenjang || c.jenjang === jenjang) && (!status || c.statusKelas === status)
      );
      res.json({
        source: live && live.length > 0 ? 'firestore' : 'seed',
        count: items.length,
        data: items,
      });
    } catch {
      const items = SEED_CLASSES.filter(
        (c) => (!jenjang || c.jenjang === jenjang) && (!status || c.statusKelas === status)
      );
      res.json({ source: 'seed', count: items.length, data: items });
    }
  });

  router.get('/schedules', async (req, res) => {
    const idKelas = typeof req.query.idKelas === 'string' ? req.query.idKelas : '';
    const hari = typeof req.query.hari === 'string' ? req.query.hari : '';
    try {
      const live = await fetchFirestoreCollection<typeof SEED_SCHEDULES[number]>('schedules');
      const source = live && live.length > 0 ? live : SEED_SCHEDULES;
      const items = source.filter(
        (s) => (!idKelas || s.idKelas === idKelas) && (!hari || s.hari === hari)
      );
      res.json({
        source: live && live.length > 0 ? 'firestore' : 'seed',
        count: items.length,
        data: items,
      });
    } catch {
      const items = SEED_SCHEDULES.filter(
        (s) => (!idKelas || s.idKelas === idKelas) && (!hari || s.hari === hari)
      );
      res.json({ source: 'seed', count: items.length, data: items });
    }
  });

  router.post('/simulasi-biaya', (req, res) => {
    const body = req.body as {
      children?: Array<{ jenjang?: string; nominalDasar?: number }>;
    };
    const children = Array.isArray(body?.children) ? body.children : [];
    if (children.length === 0 || children.length > 10) {
      res.status(400).json({
        error: 'Body harus berisi array "children" dengan 1 hingga 10 item.',
      });
      return;
    }

    const rincian = children.map((child, idx) => {
      const jenjangRaw = String(child.jenjang || 'SD').toUpperCase() as Jenjang;
      const validJenjang: Jenjang =
        jenjangRaw in SPP_BY_JENJANG ? jenjangRaw : 'SD';
      const baseSpp =
        typeof child.nominalDasar === 'number' && child.nominalDasar > 0
          ? child.nominalDasar
          : SPP_BY_JENJANG[validJenjang];
      const sppCalc = calculateSppInvoice(baseSpp, idx + 1);
      return {
        urutanAnak: idx + 1,
        jenjang: validJenjang,
        biayaPendaftaran: REGISTRATION_FEE,
        ...sppCalc,
      };
    });

    const totalPendaftaran = rincian.reduce((sum, r) => sum + r.biayaPendaftaran, 0);
    const totalDiskonBulanan = rincian.reduce((sum, r) => sum + r.nominalDiskon, 0);
    const totalSppBulanan = rincian.reduce((sum, r) => sum + r.jumlahTagihan, 0);

    res.json({
      diskonAnakKeduaPersen: SIBLING_DISCOUNT_PERCENT,
      totalPendaftaran,
      totalDiskonBulanan,
      totalSppBulanan,
      totalTagihanAwal: totalPendaftaran + totalSppBulanan,
      rincian,
    });
  });

  router.post('/honor-rekap', (req, res) => {
    const body = req.body as {
      attendances?: TutorAttendance[];
      tutors?: Tutor[];
    };
    if (!Array.isArray(body?.attendances)) {
      res.status(400).json({
        error: 'Body harus berisi array "attendances".',
      });
      return;
    }
    const tutors = Array.isArray(body.tutors) ? body.tutors : SEED_TUTORS;
    const recap = calculateTutorHonorRecap(body.attendances, tutors);
    const totalHonorKeseluruhan = recap.reduce((sum, r) => sum + r.totalHonor, 0);
    res.json({
      tarifPerSesi: TUTOR_HONOR_PER_SESSION,
      totalHonorKeseluruhan,
      rekap: recap,
    });
  });

  router.get('/collections/:name', async (req, res) => {
    const collectionName = req.params.name;
    if (!PROTECTED_COLLECTIONS.has(collectionName)) {
      res.status(404).json({
        error: `Koleksi "${collectionName}" tidak terdaftar.`,
      });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Header Authorization: Bearer <Firebase_ID_Token> wajib disertakan.',
      });
      return;
    }

    try {
      const items = await fetchFirestoreCollection<Record<string, unknown>>(
        collectionName,
        authHeader
      );
      res.json({
        collection: collectionName,
        count: items?.length || 0,
        data: items || [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal mengakses Firestore';
      const statusMatch = message.match(/^FIRESTORE_(\d+):/);
      const statusCode = statusMatch ? Number(statusMatch[1]) : 500;
      res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
        error: statusCode === 403 || statusCode === 401
          ? 'Akses ditolak oleh aturan keamanan Firestore (firestore.rules).'
          : 'Gagal mengambil data koleksi dari Firestore.',
      });
    }
  });

  router.use((_req, res) => {
    res.status(404).json({
      error: 'Endpoint API tidak ditemukan. Lihat GET /api/docs untuk daftar endpoint.',
    });
  });

  return router;
}
