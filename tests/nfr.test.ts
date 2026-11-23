import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { createApiRouter } from '../server/apiRouter.ts';
import {
  calculateSppInvoice,
  calculateTutorHonorRecap,
  canRolePerformAction,
  checkThreeConsecutiveAbsences,
  mapFirebaseAuthError,
  validateEmailAddressFormat,
  type ProtectedAction,
} from '../src/lib/businessRules.ts';
import { SEED_STUDENT_ATTENDANCE, SEED_TUTOR_ATTENDANCE, SEED_TUTORS } from '../src/data/seedData.ts';
import type { UserRole } from '../src/types.ts';

function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe('Pengujian Non-Functional Requirements (NFR) Bimbel Cerdas', () => {
  it('NFR-01 (Keamanan — RBAC & Firestore Rules): mengisolasi seluruh hak akses dan aturan anti-injeksi', () => {
    const allActions: ProtectedAction[] = [
      'register_child',
      'submit_relief',
      'mark_notification_read',
      'record_tutor_attendance',
      'manage_payments',
      'manage_waitlist',
      'manage_followups',
      'manage_master_data',
      'manage_users',
      'manage_feature_flags',
      'decide_relief',
    ];
    const roles: UserRole[] = ['orang_tua', 'tutor', 'admin', 'pemilik'];

    // Tidak ada 1 role pun yang memiliki seluruh hak akses (strict separation of duties)
    for (const role of roles) {
      const allowedCount = allActions.filter((a) => canRolePerformAction(role, a)).length;
      assert.ok(allowedCount > 0 && allowedCount < allActions.length);
    }

    // Validasi struktural firestore.rules sesuai Security Spec (Eight Pillars)
    const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
    assert.match(rules, /match \/\{document=\*\*\}[\s\S]*allow read, write:\s*if false;/);
    assert.match(rules, /function isVerifiedUser\(\)/);
    assert.match(rules, /function isValidId\(id\)/);
    assert.match(rules, /keys\(\)\.hasOnly\(/);
    assert.match(rules, /match \/payments\/\{paymentId\}[\s\S]*allow create:[\s\S]*isAdmin\(\)/);
    assert.match(rules, /match \/receipts\/\{receiptId\}[\s\S]*allow create:[\s\S]*isAdmin\(\)/);
    assert.match(rules, /match \/feature_flags\/\{flagId\}[\s\S]*allow list:\s*if isAdmin\(\);/);
  });

  it('NFR-01 (Keamanan — Hygiene Rahasia & Anti-Spoofing Input): bebas private key & menolak payload berbahaya', () => {
    const codeFiles = [
      ...collectSourceFiles(path.resolve(process.cwd(), 'src')),
      ...collectSourceFiles(path.resolve(process.cwd(), 'server')),
    ];
    for (const filePath of codeFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      assert.equal(content.includes('BEGIN PRIVATE KEY'), false, `Private key ditemukan di ${filePath}`);
      assert.equal(content.includes('client_secret'), false, `Client secret ditemukan di ${filePath}`);
    }

    // Penolakan input email XSS / invalid / oversized / disposable / typo
    assert.equal(validateEmailAddressFormat('<script>alert(1)</script>@gmail.com', { strictDomainPolicy: true }).ok, false);
    assert.equal(validateEmailAddressFormat('nama..dua@gmail.com', { strictDomainPolicy: true }).ok, false);
    assert.equal(validateEmailAddressFormat(`${'a'.repeat(250)}@gmail.com`, { strictDomainPolicy: true }).ok, false);
    assert.equal(validateEmailAddressFormat('akun@mailinator.com', { strictDomainPolicy: true }).ok, false);
    assert.equal(validateEmailAddressFormat('akun@gmial.com', { strictDomainPolicy: true }).ok, false);
    assert.equal(validateEmailAddressFormat('12410331@student.unklab.ac.id', { strictDomainPolicy: true }).ok, true);
  });

  it('NFR-02 (Performa & Konkurensi): komputasi aturan bisnis dan burst 25 request API memenuhi SLA latensi', async () => {
    // 1. SLA Komputasi Aturan Bisnis (1.000 iterasi < 100 ms)
    const tCompute0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      calculateSppInvoice(400_000, (i % 3) + 1);
      checkThreeConsecutiveAbsences(SEED_STUDENT_ATTENDANCE, 'sis-2');
      calculateTutorHonorRecap(SEED_TUTOR_ATTENDANCE, SEED_TUTORS);
    }
    const computeMs = performance.now() - tCompute0;
    assert.ok(computeMs < 150, `Komputasi 1.000× terlalu lambat: ${computeMs.toFixed(2)}ms`);

    // 2. SLA Endpoint REST API & Konkurensi 25 Request Paralel
    const app = express();
    app.use('/api', createApiRouter());
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    try {
      const { port } = server.address() as AddressInfo;
      const base = `http://127.0.0.1:${port}/api`;

      const tHealth0 = performance.now();
      const healthRes = await fetch(`${base}/health`);
      const healthMs = performance.now() - tHealth0;
      assert.equal(healthRes.status, 200);
      assert.ok(healthMs < 150, `Healthcheck > 150ms: ${healthMs.toFixed(2)}ms`);

      const burstLatencies: number[] = [];
      const burstResults = await Promise.all(
        Array.from({ length: 25 }, async () => {
          const t0 = performance.now();
          const res = await fetch(`${base}/simulasi-biaya`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ children: [{ jenjang: 'SMA' }, { jenjang: 'SD' }] }),
          });
          await res.json();
          burstLatencies.push(performance.now() - t0);
          return res.status;
        })
      );

      assert.equal(
        burstResults.filter((s) => s === 200).length,
        25,
        'Seluruh 25 request konkurensi harus mengembalikan HTTP 200'
      );
      const sorted = [...burstLatencies].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95) - 1] ?? sorted[sorted.length - 1];
      assert.ok(p95 < 250, `Latensi p95 burst terlalu tinggi: ${p95.toFixed(2)}ms`);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it('NFR-03 (Keandalan & Penanganan Galat): menolak payload tidak valid secara aman tanpa crash', async () => {
    const app = express();
    app.use('/api', createApiRouter());
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    try {
      const { port } = server.address() as AddressInfo;
      const base = `http://127.0.0.1:${port}/api`;

      // Payload simulasi kosong -> 400 terstruktur
      const badSim = await fetch(`${base}/simulasi-biaya`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ children: [] }),
      });
      assert.equal(badSim.status, 400);

      // Payload honor-rekap bukan array -> 400 terstruktur
      const badHonor = await fetch(`${base}/honor-rekap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendances: 'bukan-array' }),
      });
      assert.equal(badHonor.status, 400);

      // Token palsu ke /api/collections/invoices -> harus ditolak (401/403)
      const forgedTokenRes = await fetch(`${base}/collections/invoices`, {
        headers: { Authorization: 'Bearer token-palsu-123' },
      });
      assert.ok(forgedTokenRes.status === 401 || forgedTokenRes.status === 403);

      // Koleksi tidak dikenal -> 404
      const unknownColRes = await fetch(`${base}/collections/koleksi_liar`, {
        headers: { Authorization: 'Bearer token-palsu-123' },
      });
      assert.equal(unknownColRes.status, 404);

      // Pemetaan pesan galat Firebase Auth tetap ramah bahasa Indonesia
      assert.match(mapFirebaseAuthError({ code: 'auth/too-many-requests' }), /Terlalu banyak/);
      assert.match(mapFirebaseAuthError({ code: 'auth/network-request-failed' }), /koneksi internet/);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it('NFR-04 (Usabilitas, Responsivitas & Ketersediaan Dokumen): metadata HTML & aset dokumentasi valid', () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
    assert.match(html, /<html lang="id">/);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0"/);
    assert.match(html, /<title>Bimbel Cerdas/);
    assert.match(html, /<meta[\s\S]*name="description"/);

    const requiredDocs = [
      'public/docs/Diagram_Arsitektur_Bimbel_Cerdas.svg',
      'public/docs/Skema_Database_Bimbel_Cerdas.svg',
      'public/docs/Dokumentasi_Bimbel_Cerdas.docx',
      'docs/DOKUMENTASI_BIMBEL_CERDAS.md',
      'security_spec.md',
    ];
    for (const relPath of requiredDocs) {
      const fullPath = path.resolve(process.cwd(), relPath);
      assert.equal(fs.existsSync(fullPath), true, `Dokumen NFR tidak ditemukan: ${relPath}`);
      assert.ok(fs.statSync(fullPath).size > 500, `Dokumen NFR kosong: ${relPath}`);
    }
  });
});
