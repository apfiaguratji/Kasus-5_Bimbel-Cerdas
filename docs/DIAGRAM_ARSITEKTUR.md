# Diagram Arsitektur Sistem — Bimbel Cerdas

Dokumen ini merangkum arsitektur lengkap **Sistem Informasi Manajemen Bimbel Cerdas** yang terbagi ke dalam 4 lapisan utama: **Hosting**, **Frontend**, **Backend**, dan **Database**.

- **Aplikasi**: Sistem Informasi Manajemen Bimbel Cerdas
- **Domain Produksi (Vercel)**: `https://kasus-5-bimbel-cerdas.vercel.app`
- **Repositori GitHub**: `https://github.com/apfiaguratji/Kasus-5_Bimbel-Cerdas`
- **Firebase Project ID**: `gen-lang-client-0798980042`
- **Cloud Firestore Database ID**: `ai-studio-c15e7da5-4f88-4940-89f4-ab28fa592704`
- **File Diagram Vektor (SVG)**: `public/docs/Diagram_Arsitektur_Bimbel_Cerdas.svg` (dapat dibuka langsung lewat `/docs/Diagram_Arsitektur_Bimbel_Cerdas.svg`)

---

## 1. Diagram Arsitektur Menyeluruh (Mermaid)

```mermaid
flowchart TB
    subgraph HOSTING["1. HOSTING & DEPLOYMENT LAYER"]
        direction LR
        GH["GitHub Repository<br/>Kasus-5_Bimbel-Cerdas<br/>(Source Code & CI/CD Trigger)"]
        VC["Vercel Production Hosting<br/>kasus-5-bimbel-cerdas.vercel.app<br/>• Static SPA (dist/) via vercel.json<br/>• Static Docs (/docs/*)<br/>• Serverless Functions (/api/*)"]
        NODE["Local / Node.js Runtime<br/>server.ts (Port 3000)<br/>• Vite Dev Middleware (dev)<br/>• Static dist/ + /docs (prod)<br/>• Express /api mount"]
        GH -->|"Auto Deploy"| VC
    end

    subgraph FRONTEND["2. FRONTEND LAYER (React 19 + TypeScript + Vite 8 + Tailwind CSS v4)"]
        direction TB
        APP["AppRouter (src/App.tsx) + ErrorBoundary + ToastContainer"]
        PUB["PublicSite.tsx<br/>Beranda, Profil, Katalog Program & Jadwal, Kalkulator Simulasi Biaya"]
        LOGIN["LoginPage.tsx<br/>Email & Kata Sandi (Masuk, Daftar, Reset Sandi),<br/>Konfirmasi Verifikasi Email & Google Sign-In"]

        subgraph PORTALS["4 Portal Aktor Terisolasi (DashboardShell.tsx — Single-Role RBAC)"]
            ORTU["ParentDashboard.tsx<br/>(orang_tua)"]
            TUTOR["TutorDashboard.tsx<br/>(tutor)"]
            ADMIN["AdminDashboard.tsx<br/>(admin)"]
            OWNER["OwnerDashboard.tsx<br/>(pemilik: KPI, Grafik 6B, Ledger, PDF/CSV)"]
        end

        PDF["ReceiptModal.tsx + pdfReport.ts (jsPDF & jspdf-autotable)<br/>Cetak Kuitansi Resmi & Laporan Keuangan PDF"]
        CTX["AppDataContext.tsx<br/>onAuthStateChanged, Role Auto-Sync, emailVerified Gate,<br/>Role-Scoped Firestore Queries, Atomic writeBatch"]
        RULES_CLIENT["businessRules.ts & firebase.ts<br/>Tarif SPP, Diskon Anak ke-2+ (10%), Kuota Kelas 3–8 & Waitlist,<br/>Deteksi Absen 3×, Honor Rp75.000/90m, Pemetaan Peran Email"]

        APP --> PUB
        APP --> LOGIN
        APP --> PORTALS
        PORTALS --> PDF
        PUB --> CTX
        LOGIN --> CTX
        PORTALS --> CTX
        CTX --> RULES_CLIENT
    end

    subgraph BACKEND["3. BACKEND REST API LAYER (Express 4 + Serverless Wrapper)"]
        direction TB
        ENTRY["Entrypoints:<br/>• api/[...route].ts (Vercel Serverless Function)<br/>• server.ts (Express HTTP Server)"]
        ROUTER["server/apiRouter.ts (Mounted at /api)"]
        EP_PUB["Endpoint Publik:<br/>• GET /api/health & /api/docs<br/>• GET /api/programs, /api/classes, /api/schedules<br/>• POST /api/simulasi-biaya & /api/honor-rekap<br/>• GET /api/akun-uji"]
        EP_PRIV["Endpoint Terproteksi:<br/>• GET /api/collections/:name<br/>(Meneruskan Authorization: Bearer &lt;Firebase_ID_Token&gt;<br/>ke Firestore REST API)"]

        ENTRY --> ROUTER
        ROUTER --> EP_PUB
        ROUTER --> EP_PRIV
    end

    subgraph DATABASE["4. DATABASE, AUTH & SECURITY LAYER (Firebase BaaS)"]
        direction TB
        AUTH["Firebase Authentication<br/>• Email/Password & Google OAuth<br/>• Penerbitan JWT ID Token<br/>• Wajib email_verified == true"]
        SEC["Firestore Security Rules (firestore.rules)<br/>• Default Deny All<br/>• Wajib isVerifiedUser() & Validasi Skema Ketat<br/>• RBAC: isAdmin(), isPemilik(), isTutor(), isOwner()<br/>• isDesignatedSelfRoleSync() untuk sinkronisasi peran QA"]

        subgraph FS["Cloud Firestore (DB: ai-studio-c15e7da5-4f88-4940-89f4-ab28fa592704)"]
            C1["Master & Katalog:<br/>programs, classes, schedules, tutors"]
            C2["Akun & Konfigurasi:<br/>users, admins, feature_flags"]
            C3["Akademik & Presensi:<br/>students, registrations, waitlists,<br/>student_attendance, tutor_attendance,<br/>followups, notifications"]
            C4["Keuangan & Keringanan:<br/>invoices, payments, receipts, relief_requests"]
        end

        AUTH --> SEC
        SEC --> FS
    end

    VC --> FRONTEND
    VC --> BACKEND
    NODE --> FRONTEND
    NODE --> BACKEND

    LOGIN <-->|"Sign-In / Register / Verification"| AUTH
    CTX <-->|"Firebase SDK (HTTPS + JWT)"| SEC
    EP_PUB -->|"Baca Katalog / Fallback Seed"| FS
    EP_PRIV <-->|"Firestore REST API + Bearer Token"| SEC
```

---

## 2. Ringkasan Komponen per Lapisan

### A. Hosting & Deployment
| Komponen | File Konfigurasi | Peran |
| :--- | :--- | :--- |
| **Vercel Static & Edge** | `vercel.json` | Menyajikan bundle SPA hasil `npm run build` (`dist/`) dan mengecualikan `/api/*` serta `/docs/*` dari rewrite SPA. |
| **Vercel Serverless** | `api/[...route].ts` | Membungkus `createApiRouter()` menjadi Serverless Function untuk seluruh request `/api/*` di produksi. |
| **Node.js / Express Server** | `server.ts` | Server lokal/Node (port `3000`) yang memasang `/api`, static `/docs` (`public/docs`), dan `vite.middlewares` (dev) atau `dist/` (prod). |

### B. Frontend (Client SPA)
| Komponen | Lokasi File | Tanggung Jawab |
| :--- | :--- | :--- |
| **Router & Error Boundary** | `src/App.tsx`, `src/components/ErrorBoundary.tsx` | Mengatur perpindahan tampilan `public`, `login`, dan portal sesuai `activeRole`. |
| **Halaman Publik** | `src/components/PublicSite.tsx` | Informasi lembaga, katalog program SD/SMP/SMA/UTBK, jadwal, sisa kuota kelas, dan kalkulator simulasi biaya. |
| **Autentikasi** | `src/components/LoginPage.tsx` | Form Email & Kata Sandi (Masuk, Daftar, Reset Sandi), layar Verifikasi Email, dan Google Sign-In. |
| **Portal 4 Aktor** | `src/components/DashboardShell.tsx`, `src/components/dashboards/{Parent,Tutor,Admin,Owner}Dashboard.tsx` | Portal terisolasi Single-Role RBAC sesuai peran pengguna. |
| **Ekspor & Kuitansi** | `src/components/ReceiptModal.tsx`, `src/lib/pdfReport.ts` | Menampilkan kuitansi resmi dan mencetak laporan keuangan PDF/CSV (`jsPDF`). |
| **State & Aturan Bisnis** | `src/context/AppDataContext.tsx`, `src/lib/businessRules.ts`, `src/lib/firebase.ts` | Sinkronisasi auth & Firestore (*role-scoped queries*, `writeBatch`), pemetaan peran email QA, dan seluruh rumus aturan bisnis. |

### C. Backend (REST API)
Seluruh endpoint didefinisikan di `server/apiRouter.ts` dan menggunakan aturan bisnis yang sama dari `src/lib/businessRules.ts`:
- **Publik:**
  - `GET /api/health` — Cek status layanan, Project ID, dan Firestore Database ID.
  - `GET /api/docs` — Daftar spesifikasi endpoint REST API.
  - `GET /api/programs`, `GET /api/classes`, `GET /api/schedules` — Membaca data katalog dari Firestore REST API (dengan fallback data awal).
  - `POST /api/simulasi-biaya` — Menghitung biaya pendaftaran + SPP + diskon anak ke-2+ (10%).
  - `POST /api/honor-rekap` — Menghitung rekap honor tutor Rp75.000/sesi termasuk pengalihan ke tutor pengganti.
- **Terproteksi:**
  - `GET /api/collections/:name` — Mengambil koleksi terproteksi (`students`, `invoices`, `payments`, `receipts`, dll.) dengan mewajibkan header `Authorization: Bearer <Firebase_ID_Token>` agar tetap divalidasi oleh `firestore.rules`.

### D. Database, Autentikasi & Keamanan (Firebase BaaS)
- **Firebase Authentication:** Mendukung **Email/Password** dan **Google OAuth**, dengan kewajiban `email_verified == true` sebelum membaca/menulis data privat.
- **Firestore Security Rules (`firestore.rules`):** Menjalankan validasi skema setiap dokumen, isolasi PII, RBAC (`admin`, `pemilik`, `tutor`, `orang_tua`), dan sinkronisasi peran mandiri khusus email QA terotorisasi (`isDesignatedSelfRoleSync`).
- **Cloud Firestore (`ai-studio-c15e7da5-4f88-4940-89f4-ab28fa592704`):** Menyimpan 18 koleksi operasional terstruktur:
  - *Master & Katalog:* `programs`, `classes`, `schedules`, `tutors`
  - *Akun & Konfigurasi:* `users`, `admins`, `feature_flags`
  - *Akademik & Presensi:* `students`, `registrations`, `waitlists`, `student_attendance`, `tutor_attendance`, `followups`, `notifications`
  - *Keuangan & Keringanan:* `invoices`, `payments`, `receipts`, `relief_requests`
