import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Calculator,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  CreditCard,
  GraduationCap,
  MapPin,
  Menu,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext.tsx';
import {
  calculateSppInvoice,
  formatRupiah,
  MAX_CLASS_CAPACITY,
  MIN_CLASS_STUDENTS,
  REGISTRATION_FEE,
  SESSION_DURATION_MINUTES,
  SESSIONS_PER_WEEK,
  SIBLING_DISCOUNT_PERCENT,
  TUTOR_HONOR_PER_SESSION,
} from '../lib/businessRules.ts';
import type { Jenjang } from '../types.ts';

type PublicPage = 'beranda' | 'profil' | 'program' | 'biaya';

const VALID_PAGES: readonly PublicPage[] = ['beranda', 'profil', 'program', 'biaya'];

function parseHashToPage(hash: string): PublicPage {
  const cleaned = hash.replace(/^#\/?/, '').trim().toLowerCase();
  if ((VALID_PAGES as readonly string[]).includes(cleaned)) {
    return cleaned as PublicPage;
  }
  return 'beranda';
}

function ResilientPhoto({
  src,
  alt,
  fallbackTitle,
  className = '',
}: {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`bg-gradient-to-br from-[#0b276b] to-[#1e56d9] text-[#dbeafe] flex flex-col items-center justify-center p-6 text-center ${className}`}
      >
        <GraduationCap className="w-10 h-10 mb-2 opacity-85" />
        <p className="text-sm font-semibold">{fallbackTitle}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

const PROGRAM_PALETTES = [
  {
    card: 'bg-[#eff6ff] border-[#dbeafe]',
    iconBg: 'bg-[#2563eb] text-white',
    accent: 'text-[#1d4ed8]',
  },
  {
    card: 'bg-[#ecfdf5] border-[#d1fae5]',
    iconBg: 'bg-[#10b981] text-white',
    accent: 'text-[#059669]',
  },
  {
    card: 'bg-[#f5f3ff] border-[#ede9fe]',
    iconBg: 'bg-[#7c3aed] text-white',
    accent: 'text-[#6d28d9]',
  },
  {
    card: 'bg-[#fffbeb] border-[#fef3c7]',
    iconBg: 'bg-[#f59e0b] text-white',
    accent: 'text-[#d97706]',
  },
];

const NAV_PAGES: { id: PublicPage; label: string; mobileLabel: string }[] = [
  { id: 'beranda', label: 'Beranda', mobileLabel: 'Beranda' },
  { id: 'profil', label: 'Profil', mobileLabel: 'Profil Bimbel' },
  { id: 'program', label: 'Program', mobileLabel: 'Program Belajar' },
  { id: 'biaya', label: 'Biaya', mobileLabel: 'Informasi Biaya' },
];

export function PublicSite() {
  const { setView, currentUser, programs, classes, schedules } = useAppData();
  const [activePage, setActivePage] = useState<PublicPage>(() =>
    typeof window !== 'undefined' ? parseHashToPage(window.location.hash) : 'beranda'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Program page filter
  const [jenjangFilter, setJenjangFilter] = useState<'Semua' | Jenjang>('Semua');

  // Biaya page interactive family calculator
  const [childCount, setChildCount] = useState<1 | 2 | 3>(2);
  const [childPrograms, setChildPrograms] = useState<[string, string, string]>([
    programs[1]?.id || programs[0]?.id || '',
    programs[0]?.id || '',
    programs[2]?.id || programs[0]?.id || '',
  ]);

  useEffect(() => {
    const onHashChange = () => {
      setActivePage(parseHashToPage(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateTo = (page: PublicPage) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      if (window.location.hash !== `#${page}`) {
        window.location.hash = page;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePortalClick = () => {
    setView(currentUser ? 'dashboard' : 'login');
  };

  const filteredPrograms =
    jenjangFilter === 'Semua'
      ? programs
      : programs.filter((p) => p.jenjang === jenjangFilter);

  // Compute simulated family fees using real business rules
  const selectedChildIds = childPrograms.slice(0, childCount);
  const simulationRows = selectedChildIds.map((progId, index) => {
    const prog = programs.find((p) => p.id === progId) || programs[0];
    const baseSpp = prog?.biayaSpp || 300_000;
    const calc = calculateSppInvoice(baseSpp, index + 1);
    return {
      order: index + 1,
      programName: prog?.namaProgram || 'Program Bimbel',
      jenjang: prog?.jenjang || 'SD',
      registrationFee: prog?.biayaPendaftaran ?? REGISTRATION_FEE,
      ...calc,
    };
  });
  const totalMonthlySpp = simulationRows.reduce((sum, r) => sum + r.jumlahTagihan, 0);
  const totalMonthlyDiscount = simulationRows.reduce((sum, r) => sum + r.nominalDiskon, 0);
  const totalRegistration = simulationRows.reduce((sum, r) => sum + r.registrationFee, 0);

  const pageMeta: Record<Exclude<PublicPage, 'beranda'>, { title: string; subtitle: string; breadcrumb: string }> = {
    profil: {
      title: 'Profil & Pendekatan Belajar Bimbel Cerdas',
      subtitle:
        'Mengenal metode kelas kecil, standar pengajaran terukur, serta sistem manajemen akademik dan keuangan yang terintegrasi penuh.',
      breadcrumb: 'Profil Bimbel',
    },
    program: {
      title: 'Pilihan Program Belajar & Ketersediaan Kelas',
      subtitle:
        'Program terstruktur untuk jenjang SD, SMP, SMA, hingga UTBK/SNBT dengan kapasitas maksimal 8 siswa per kelas.',
      breadcrumb: 'Program Belajar',
    },
    biaya: {
      title: 'Informasi Biaya Pendidikan & Diskon Keluarga',
      subtitle:
        'Rincian biaya pendaftaran satu kali, tarif SPP bulanan tiap jenjang, serta simulasi potongan keluarga 10% untuk anak ke-2 dan seterusnya.',
      breadcrumb: 'Informasi Biaya',
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f8ff] text-[#0b1e4b]">
      {/* Top Cobalt Banner (Full Hero on Beranda, Compact Page Header on Sub-pages) */}
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-[#061845] via-[#0e348c] to-[#1e5ae2] text-white ${
          activePage === 'beranda' ? 'pb-20 lg:pb-24' : 'pb-12'
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#3b82f6]/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-10 right-0 w-[30rem] h-[30rem] rounded-full bg-[#60a5fa]/20 blur-3xl"
        />

        {/* 3-Zone Top Bar */}
        <header className="relative z-30 max-w-7xl mx-auto px-4 sm:px-8 pt-5 pb-3">
          <div className="flex items-center justify-between gap-8">
            <button
              type="button"
              onClick={() => navigateTo('beranda')}
              className="text-xl font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0 text-left"
            >
              Bimbel Cerdas
            </button>

            <nav
              aria-label="Navigasi utama"
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 text-sm font-medium"
            >
              {NAV_PAGES.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => navigateTo(item.id)}
                    className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-white text-[#0b1e4b] font-semibold shadow-sm'
                        : 'text-white/90 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handlePortalClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] border border-white/25 text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                <span>{currentUser ? 'Buka Portal' : 'Masuk & Daftar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Menu navigasi"
                className="md:hidden p-2 rounded-full bg-white/15 border border-white/25 text-white"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav
              aria-label="Navigasi seluler"
              className="md:hidden mt-3 rounded-2xl bg-[#0a235e]/95 backdrop-blur-md border border-white/20 px-4 py-3 flex flex-col gap-1 text-sm font-medium text-white"
            >
              {NAV_PAGES.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => navigateTo(item.id)}
                    className={`py-2.5 px-3 rounded-lg text-left transition-colors ${
                      isActive ? 'bg-white text-[#0b1e4b] font-semibold' : 'hover:bg-white/10'
                    }`}
                  >
                    {item.mobileLabel}
                  </button>
                );
              })}
            </nav>
          )}
        </header>

        {activePage === 'beranda' ? (
          /* Hero Split for Beranda */
          <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-8 lg:pt-12">
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center">
                <p className="inline-flex items-center gap-2 self-start text-xs font-medium text-[#dbeafe] mb-4">
                  <GraduationCap className="w-4 h-4 text-[#93c5fd]" />
                  <span>Selamat Datang di Bimbel Cerdas · SD, SMP, SMA & UTBK</span>
                </p>

                <h1 className="text-[clamp(2.25rem,4vw,3.5rem)] leading-[1.1] font-display font-bold text-white text-balance">
                  Pendampingan Belajar Cerdas untuk{' '}
                  <span className="text-[#93c5fd]">Masa Depan Gemilang</span>
                </h1>

                <p className="mt-5 text-base sm:text-lg text-[#dbeafe]/90 leading-relaxed max-w-xl">
                  Platform terintegrasi untuk pendaftaran siswa online, kelas kecil maksimal 8 siswa,
                  pemantauan absensi real-time, serta tagihan SPP dan kuitansi digital transparan.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <button
                    type="button"
                    onClick={handlePortalClick}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] border border-white/25 text-white text-sm font-semibold shadow-md transition-colors whitespace-nowrap"
                  >
                    <span>{currentUser ? 'Masuk ke Dashboard' : 'Daftar & Masuk Portal'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('program')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/12 hover:bg-white/20 border border-white/25 text-white text-sm font-medium backdrop-blur-sm transition-colors whitespace-nowrap"
                  >
                    <span>Jelajahi Program</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative h-72 sm:h-96 lg:h-full min-h-[320px] rounded-3xl overflow-hidden border border-white/20 shadow-[0_24px_60px_-15px_rgba(4,14,42,0.55)]">
                  <ResilientPhoto
                    src="/src/assets/images/hero_bimbel_classroom_1795022873370.jpg"
                    alt="Suasana belajar kelompok kecil bersama tutor di Bimbel Cerdas"
                    fallbackTitle="Kelas Kecil Bimbel Cerdas"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#061845]/85 via-[#0b276b]/20 to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-[#93c5fd]">Sistem Akademik Terpadu</p>
                      <p className="text-sm sm:text-base font-semibold text-white mt-0.5">
                        Langkah Kecil, Prestasi Besar
                      </p>
                    </div>
                    <p className="text-xs font-mono tabular-nums text-white/95 bg-[#061845]/75 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1">
                      Maks. {MAX_CLASS_CAPACITY} Siswa / Kelas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* Sub-Page Compact Banner for Profil / Program / Biaya */
          <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-6">
            <div className="flex items-center gap-1.5 text-xs text-[#bfdbfe] mb-3">
              <button
                type="button"
                onClick={() => navigateTo('beranda')}
                className="hover:text-white transition-colors"
              >
                Beranda
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white font-medium">{pageMeta[activePage].breadcrumb}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white max-w-3xl text-balance">
              {pageMeta[activePage].title}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#dbeafe]/90 max-w-2xl leading-relaxed">
              {pageMeta[activePage].subtitle}
            </p>
          </section>
        )}
      </div>

      {/* Main Content Area per Page */}
      <main className="flex-1">
        {activePage === 'beranda' && (
          <>
            {/* Overlapping 4-Card Feature Strip */}
            <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 -mt-12">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/95 backdrop-blur-md border border-[#dde7f8] rounded-2xl p-5 shadow-[0_14px_34px_-12px_rgba(11,47,118,0.14)] flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#2563eb] text-white grid place-items-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b1e4b]">Kelas Kecil Terarah</h3>
                    <p className="text-xs text-[#4f648d] mt-1 leading-relaxed">
                      Maksimal {MAX_CLASS_CAPACITY} siswa per kelas agar fokus belajar optimal.
                    </p>
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-md border border-[#dde7f8] rounded-2xl p-5 shadow-[0_14px_34px_-12px_rgba(11,47,118,0.14)] flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#10b981] text-white grid place-items-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b1e4b]">Tutor Terverifikasi</h3>
                    <p className="text-xs text-[#4f648d] mt-1 leading-relaxed">
                      {SESSIONS_PER_WEEK}× pertemuan per minggu dengan durasi {SESSION_DURATION_MINUTES} menit.
                    </p>
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-md border border-[#dde7f8] rounded-2xl p-5 shadow-[0_14px_34px_-12px_rgba(11,47,118,0.14)] flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#f59e0b] text-white grid place-items-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b1e4b]">Diskon Keluarga 10%</h3>
                    <p className="text-xs text-[#4f648d] mt-1 leading-relaxed">
                      Otomatis berlaku pada SPP anak ke-2 dan seterusnya.
                    </p>
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-md border border-[#dde7f8] rounded-2xl p-5 shadow-[0_14px_34px_-12px_rgba(11,47,118,0.14)] flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#7c3aed] text-white grid place-items-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b1e4b]">Pantauan Real-Time</h3>
                    <p className="text-xs text-[#4f648d] mt-1 leading-relaxed">
                      Notifikasi absensi 3× beruntun & kuitansi digital resmi.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Navigation Cards to Profil, Program, Biaya */}
            <section className="max-w-7xl mx-auto px-4 sm:px-8 py-14 space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-wider uppercase text-[#2563eb]">
                    Eksplorasi Layanan Kami
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0b1e4b] mt-1">
                    Informasi Lengkap dalam Halaman Terstruktur
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handlePortalClick}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:underline self-start sm:self-auto"
                >
                  <span>{currentUser ? 'Masuk ke Dashboard' : 'Mulai Daftar Online'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white border border-[#dce6f7] rounded-2xl p-6 flex flex-col justify-between gap-5">
                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-xl bg-[#eff6ff] text-[#2563eb] grid place-items-center">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-display font-bold text-[#0b1e4b]">
                      Profil Bimbel Cerdas
                    </h3>
                    <p className="text-sm text-[#475d85] leading-relaxed">
                      Pelajari pendekatan kelas kecil 3–8 siswa, standar durasi 90 menit per sesi,
                      serta alur sistem terintegrasi untuk orang tua, tutor, admin, dan pemilik.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('profil')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563eb] hover:underline self-start"
                  >
                    <span>Buka Halaman Profil</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-white border border-[#dce6f7] rounded-2xl p-6 flex flex-col justify-between gap-5">
                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-xl bg-[#ecfdf5] text-[#059669] grid place-items-center">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-display font-bold text-[#0b1e4b]">
                      Program & Ketersediaan Kelas
                    </h3>
                    <p className="text-sm text-[#475d85] leading-relaxed">
                      Tersedia {programs.length} jenjang pilihan (SD, SMP, SMA, & UTBK/SNBT) lengkap
                      dengan jadwal ruang kelas dan pantauan sisa kursi secara langsung.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('program')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#059669] hover:underline self-start"
                  >
                    <span>Lihat Semua Program</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-white border border-[#dce6f7] rounded-2xl p-6 flex flex-col justify-between gap-5">
                  <div className="space-y-2.5">
                    <div className="w-11 h-11 rounded-xl bg-[#fffbeb] text-[#d97706] grid place-items-center">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-display font-bold text-[#0b1e4b]">
                      Rincian & Simulasi Biaya
                    </h3>
                    <p className="text-sm text-[#475d85] leading-relaxed">
                      Transparansi biaya daftar {formatRupiah(REGISTRATION_FEE)}, tabel SPP mulai
                      Rp300.000/bulan, serta kalkulator diskon saudara {SIBLING_DISCOUNT_PERCENT}%.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('biaya')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#d97706] hover:underline self-start"
                  >
                    <span>Hitung Estimasi Biaya</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Latest Announcements Banner */}
              <div className="bg-white border border-[#dce6f7] rounded-2xl p-6 grid lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#eff6ff] text-[#2563eb] grid place-items-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#2563eb]">Info & Pengumuman</p>
                    <h3 className="text-lg font-display font-bold text-[#0b1e4b]">
                      Pendaftaran Tahun Ajaran Aktif
                    </h3>
                  </div>
                </div>
                <div className="lg:col-span-5 text-sm text-[#475d85] leading-relaxed">
                  Kelas baru dibuka otomatis saat kuota minimal {MIN_CLASS_STUDENTS} siswa terpenuhi
                  (maksimal {MAX_CLASS_CAPACITY} siswa). Jika kelas penuh, calon siswa otomatis masuk
                  antrean daftar tunggu prioritas.
                </div>
                <div className="lg:col-span-3 flex lg:justify-end">
                  <button
                    type="button"
                    onClick={handlePortalClick}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    <span>Daftar Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {activePage === 'profil' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-12">
            {/* About & Quick Metrics 3-Column Split */}
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4">
                <div className="relative aspect-[4/3] lg:aspect-[5/4] rounded-2xl overflow-hidden border border-[#dce6f7] shadow-sm">
                  <ResilientPhoto
                    src="/src/assets/images/about_study_mentoring_1795022873625.jpg"
                    alt="Tutor mendampingi siswa memahami soal matematika secara personal"
                    fallbackTitle="Pendampingan Belajar Personal"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071a48]/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3.5 left-4 right-4 flex items-center gap-2 text-xs text-white font-medium">
                    <MapPin className="w-4 h-4 text-[#60a5fa] shrink-0" />
                    <span>Pusat Belajar Bimbel Cerdas</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <p className="text-xs font-bold tracking-wider uppercase text-[#2563eb]">
                  Tentang Bimbel Cerdas
                </p>
                <h2 className="text-3xl font-display font-bold text-[#0b1e4b] leading-tight text-balance">
                  Membangun Prestasi Melalui{' '}
                  <span className="text-[#2563eb]">Pendekatan Terarah</span>
                </h2>
                <p className="text-sm sm:text-base text-[#475d85] leading-relaxed">
                  Seluruh proses bimbingan belajar—mulai dari pendaftaran online, antrean daftar
                  tunggu transparan, absensi siswa & tutor via smartphone, hingga kuitansi SPP
                  digital dan laporan keuangan pemilik—terintegrasi rapi dalam satu sistem tanpa
                  pencatatan manual.
                </p>
                <div className="pt-1 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handlePortalClick}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold transition-colors shadow-sm"
                  >
                    <span>{currentUser ? 'Buka Portal Sistem' : 'Coba Portal 4 Peran'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('program')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#cbd9f2] bg-white hover:bg-[#eff5ff] text-[#0b1e4b] text-sm font-semibold transition-colors"
                  >
                    <span>Lihat Program</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-3">
                <div className="bg-white border border-[#dde7f8] rounded-xl p-3.5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#2563eb] grid place-items-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono tabular-nums text-[#0b1e4b]">
                      {MIN_CLASS_STUDENTS}–{MAX_CLASS_CAPACITY} Siswa
                    </p>
                    <p className="text-xs text-[#566b94]">Rentang Efektif per Kelas</p>
                  </div>
                </div>

                <div className="bg-white border border-[#dde7f8] rounded-xl p-3.5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#ecfdf5] text-[#059669] grid place-items-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono tabular-nums text-[#0b1e4b]">
                      {SESSION_DURATION_MINUTES} Menit
                    </p>
                    <p className="text-xs text-[#566b94]">{SESSIONS_PER_WEEK}× Pertemuan / Minggu</p>
                  </div>
                </div>

                <div className="bg-white border border-[#dde7f8] rounded-xl p-3.5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#fffbeb] text-[#d97706] grid place-items-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono tabular-nums text-[#0b1e4b]">
                      {formatRupiah(REGISTRATION_FEE)}
                    </p>
                    <p className="text-xs text-[#566b94]">Biaya Daftar Satu Kali</p>
                  </div>
                </div>

                <div className="bg-white border border-[#dde7f8] rounded-xl p-3.5 flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#f5f3ff] text-[#7c3aed] grid place-items-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono tabular-nums text-[#0b1e4b]">
                      {formatRupiah(TUTOR_HONOR_PER_SESSION)}
                    </p>
                    <p className="text-xs text-[#566b94]">Honor Tutor Terstandar / Sesi</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Pillars of the Bimbel Cerdas Integrated Workflow */}
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold tracking-wider uppercase text-[#2563eb]">
                  Ekosistem Digital 4 Peran
                </p>
                <h2 className="text-2xl font-display font-bold text-[#0b1e4b] mt-1">
                  Cara Kerja Sistem Informasi Bimbel Cerdas
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#dce6f7] rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-semibold text-[#2563eb]">01 · Orang Tua</p>
                  <h3 className="text-base font-bold text-[#0b1e4b]">Pendaftaran & Pantauan</h3>
                  <p className="text-xs text-[#475d85] leading-relaxed">
                    Daftar anak online, pantau jadwal & riwayat absensi, unduh kuitansi, serta
                    ajukan keringanan pembayaran dari satu portal.
                  </p>
                </div>
                <div className="bg-white border border-[#dce6f7] rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-semibold text-[#059669]">02 · Tutor</p>
                  <h3 className="text-base font-bold text-[#0b1e4b]">Absensi Mobile & Pengganti</h3>
                  <p className="text-xs text-[#475d85] leading-relaxed">
                    Input kehadiran siswa lewat smartphone, konfirmasi sesi mengajar, dan dukung
                    alokasi honor otomatis untuk tutor pengganti.
                  </p>
                </div>
                <div className="bg-white border border-[#dce6f7] rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-semibold text-[#d97706]">03 · Admin</p>
                  <h3 className="text-base font-bold text-[#0b1e4b]">Operasional & Penagihan</h3>
                  <p className="text-xs text-[#475d85] leading-relaxed">
                    Kelola kelas, promosi daftar tunggu, penerbitan kuitansi SPP digital, hingga
                    tindak lanjut telepon saat siswa absen 3× berturut-turut.
                  </p>
                </div>
                <div className="bg-white border border-[#dce6f7] rounded-2xl p-5 space-y-2">
                  <p className="text-xs font-semibold text-[#7c3aed]">04 · Pemilik</p>
                  <h3 className="text-base font-bold text-[#0b1e4b]">Laporan & Persetujuan</h3>
                  <p className="text-xs text-[#475d85] leading-relaxed">
                    Pantau arus kas masuk-keluar, rekap honor tutor, daftar tunggakan, ekspor PDF,
                    dan putuskan pengajuan keringanan orang tua.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === 'program' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Left: Filter & Program Cards */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-wider uppercase text-[#2563eb]">
                      Program Akademik Kami
                    </p>
                    <h2 className="text-2xl font-display font-bold text-[#0b1e4b] mt-1">
                      Jelajahi Pilihan <span className="text-[#2563eb]">Program Belajar</span>
                    </h2>
                  </div>

                  {/* Interactive Jenjang Filter */}
                  <div className="flex items-center gap-1 p-1 bg-[#e6eefc] rounded-lg self-start">
                    {(['Semua', 'SD', 'SMP', 'SMA', 'UTBK'] as const).map((j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => setJenjangFilter(j)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                          jenjangFilter === j
                            ? 'bg-white text-[#0b1e4b] shadow-sm font-semibold'
                            : 'text-[#374f7d] hover:text-[#0b1e4b]'
                        }`}
                      >
                        {j}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {filteredPrograms.map((prog, idx) => {
                    const palette = PROGRAM_PALETTES[idx % PROGRAM_PALETTES.length];
                    const progClasses = classes.filter((c) => c.idProgram === prog.id);
                    const totalOpenSlots = progClasses.reduce(
                      (acc, c) => acc + Math.max(0, c.kapasitasMaksimal - c.jumlahTerisi),
                      0
                    );
                    return (
                      <div
                        key={prog.id}
                        className={`rounded-2xl border p-5 flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${palette.card}`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-xl grid place-items-center ${palette.iconBg}`}>
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <span className={`text-xs font-semibold ${palette.accent}`}>
                              Jenjang {prog.jenjang}
                            </span>
                          </div>
                          <h3 className="text-lg font-display font-bold text-[#0b1e4b]">
                            {prog.namaProgram}
                          </h3>
                          <p className="text-xs text-[#475d85] mt-1.5 leading-relaxed">
                            {prog.deskripsi}
                          </p>
                          <p className="text-[11px] text-[#566b94] mt-3">
                            {prog.frekuensiMingguan}× sesi/minggu · {prog.durasiMenit} menit/sesi
                          </p>
                        </div>

                        <div className="mt-5 pt-3.5 border-t border-black/5 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] text-[#566b94]">SPP Bulanan</p>
                            <p className="text-base font-mono font-bold text-[#0b1e4b] tabular-nums">
                              {formatRupiah(prog.biayaSpp)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handlePortalClick}
                            className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${palette.accent}`}
                          >
                            <span>{totalOpenSlots} kursi · Daftar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Info & Visual Highlight */}
              <div className="lg:col-span-5 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#eff6ff] text-[#2563eb] grid place-items-center">
                      <Bell className="w-4 h-4" />
                    </div>
                    <h2 className="text-xl font-display font-bold text-[#0b1e4b]">
                      Info & Pengumuman
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('biaya')}
                    className="text-xs font-semibold text-[#2563eb] hover:underline"
                  >
                    Cek Rincian Biaya →
                  </button>
                </div>

                <div className="rounded-2xl overflow-hidden border border-[#dce6f7] bg-white">
                  <div className="aspect-[16/9] w-full overflow-hidden">
                    <ResilientPhoto
                      src="/src/assets/images/program_utbk_focus_1795022874712.jpg"
                      alt="Siswa SMA berlatih soal persiapan UTBK SNBT"
                      fallbackTitle="Fokus Persiapan UTBK SNBT"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="rounded-xl bg-[#f8fbff] border border-[#e1ebfa] p-4">
                      <div className="flex items-center justify-between text-xs text-[#566b94]">
                        <span className="font-semibold text-[#2563eb]">Pendaftaran Online</span>
                        <span>Tahun Ajaran Aktif</span>
                      </div>
                      <p className="text-sm font-bold text-[#0b1e4b] mt-1">
                        Pendaftaran Siswa Baru SD, SMP, SMA & UTBK Dibuka
                      </p>
                      <p className="text-xs text-[#475d85] mt-1 leading-relaxed">
                        Biaya daftar {formatRupiah(REGISTRATION_FEE)} satu kali. Kelas dibuka minimal{' '}
                        {MIN_CLASS_STUDENTS} siswa dan maksimal {MAX_CLASS_CAPACITY} siswa per kelas.
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#f8fbff] border border-[#e1ebfa] p-4">
                      <div className="flex items-center justify-between text-xs text-[#566b94]">
                        <span className="font-semibold text-[#059669]">Potongan Keluarga</span>
                        <span>Otomatis di Sistem</span>
                      </div>
                      <p className="text-sm font-bold text-[#0b1e4b] mt-1">
                        Diskon SPP {SIBLING_DISCOUNT_PERCENT}% Anak Ke-2 & Seterusnya
                      </p>
                      <p className="text-xs text-[#475d85] mt-1 leading-relaxed">
                        Berlaku otomatis untuk seluruh anak berikutnya yang terdaftar pada akun
                        keluarga yang sama.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Public Class Capacity & Schedule Table */}
            <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#e8f0fb] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-display font-bold text-[#0b1e4b]">
                    Ketersediaan Kelas & Jadwal Belajar Aktif
                  </h3>
                  <p className="text-xs text-[#566b94]">
                    Kelas berstatus Penuh otomatis mengarahkan pendaftar baru ke antrean Daftar Tunggu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePortalClick}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563eb] hover:underline self-start sm:self-auto"
                >
                  <span>Daftar via Portal Orang Tua</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#284070]">
                      <th className="py-3 px-5">Kelas & Program</th>
                      <th className="py-3 px-5">Jadwal & Ruangan</th>
                      <th className="py-3 px-5 text-right">Keterisian Kursi</th>
                      <th className="py-3 px-5">Status Kelas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eaf0fb]">
                    {classes
                      .filter((c) => jenjangFilter === 'Semua' || c.jenjang === jenjangFilter)
                      .map((cls) => {
                        const clsSchedules = schedules.filter((s) => s.idKelas === cls.id);
                        return (
                          <tr key={cls.id} className="hover:bg-[#f8fbff]">
                            <td className="py-3.5 px-5">
                              <p className="font-semibold text-[#0b1e4b]">{cls.namaKelas}</p>
                              <p className="text-xs text-[#566b94]">
                                {cls.namaProgram} · {cls.jenjang}
                              </p>
                            </td>
                            <td className="py-3.5 px-5 text-xs text-[#475d85]">
                              {clsSchedules.length > 0 ? (
                                <div className="space-y-0.5">
                                  {clsSchedules.map((sch) => (
                                    <p key={sch.id}>
                                      {sch.hari}, {sch.jamMulai}–{sch.jamSelesai} ({sch.ruangan})
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <span>Jadwal disesuaikan bersama admin</span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono tabular-nums font-semibold">
                              {cls.jumlahTerisi}/{cls.kapasitasMaksimal} siswa
                            </td>
                            <td className="py-3.5 px-5 text-xs font-semibold">
                              <span
                                className={
                                  cls.statusKelas === 'Penuh'
                                    ? 'text-[#dc2626]'
                                    : cls.statusKelas === 'Aktif'
                                    ? 'text-[#059669]'
                                    : 'text-[#d97706]'
                                }
                              >
                                {cls.statusKelas}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activePage === 'biaya' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
            {/* Tuition Table */}
            <div className="space-y-4">
              <div className="max-w-2xl">
                <p className="text-xs font-bold tracking-wider text-[#2563eb] uppercase">
                  Tarif Resmi Bulanan
                </p>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0b1e4b] mt-1">
                  Rincian Biaya Pendaftaran dan SPP Bulanan
                </h2>
                <p className="text-sm text-[#475d85] mt-2 leading-relaxed">
                  Biaya pendaftaran sebesar{' '}
                  <strong className="text-[#0b1e4b] font-mono">
                    {formatRupiah(REGISTRATION_FEE)}
                  </strong>{' '}
                  dibayarkan satu kali saat mendaftar. Anak kedua dan seterusnya dari keluarga yang
                  sama otomatis mendapat potongan SPP {SIBLING_DISCOUNT_PERCENT}% setiap bulan.
                </p>
              </div>

              <div className="bg-white overflow-x-auto border border-[#dce6f7] rounded-2xl shadow-sm">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-[#284070] text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-5 font-semibold">Program & Jenjang</th>
                      <th className="py-3.5 px-5 font-semibold">Jadwal & Durasi</th>
                      <th className="py-3.5 px-5 font-semibold">Biaya Daftar (1×)</th>
                      <th className="py-3.5 px-5 font-semibold text-right">SPP Anak ke-1 / bln</th>
                      <th className="py-3.5 px-5 font-semibold text-right">
                        SPP Anak ke-2+ (Diskon 10%)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eaf0fb]">
                    {programs.map((prog) => {
                      const discounted = Math.round(prog.biayaSpp * 0.9);
                      return (
                        <tr key={prog.id} className="hover:bg-[#f8fbff]">
                          <td className="py-4 px-5">
                            <p className="font-semibold text-[#0b1e4b]">{prog.namaProgram}</p>
                            <p className="text-xs text-[#566b94]">Jenjang {prog.jenjang}</p>
                          </td>
                          <td className="py-4 px-5 text-[#475d85]">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#2563eb]" />
                              {prog.frekuensiMingguan}×/minggu · {prog.durasiMenit} menit
                            </span>
                          </td>
                          <td className="py-4 px-5 font-mono tabular-nums text-[#0b1e4b]">
                            {formatRupiah(prog.biayaPendaftaran)}
                          </td>
                          <td className="py-4 px-5 font-mono font-semibold tabular-nums text-right text-[#0b1e4b]">
                            {formatRupiah(prog.biayaSpp)}
                          </td>
                          <td className="py-4 px-5 font-mono font-semibold tabular-nums text-right text-[#059669]">
                            {formatRupiah(discounted)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Interactive Family Discount & Fee Simulator */}
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-6 sm:p-8 grid lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#2563eb] grid place-items-center">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-[#0b1e4b]">
                      Simulasi Estimasi Biaya Keluarga
                    </h3>
                    <p className="text-xs text-[#566b94]">
                      Hitung otomatis biaya pendaftaran dan SPP bulanan beserta diskon anak ke-2+.
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#374f7d] mb-2">
                    Jumlah Anak yang Didaftarkan
                  </p>
                  <div className="inline-flex items-center gap-1 p-1 bg-[#e6eefc] rounded-lg">
                    {([1, 2, 3] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setChildCount(n)}
                        className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          childCount === n
                            ? 'bg-white text-[#0b1e4b] font-semibold shadow-sm'
                            : 'text-[#374f7d] hover:text-[#0b1e4b]'
                        }`}
                      >
                        {n} Anak
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {Array.from({ length: childCount }).map((_, idx) => (
                    <div key={idx} className="space-y-1">
                      <label
                        htmlFor={`sim-child-${idx}`}
                        className="block text-xs font-semibold text-[#374f7d]"
                      >
                        Program Anak ke-{idx + 1}{' '}
                        {idx >= 1 && (
                          <span className="text-[#059669]">
                            (Otomatis Diskon {SIBLING_DISCOUNT_PERCENT}%)
                          </span>
                        )}
                      </label>
                      <select
                        id={`sim-child-${idx}`}
                        value={childPrograms[idx]}
                        onChange={(e) => {
                          const next: [string, string, string] = [...childPrograms] as [
                            string,
                            string,
                            string,
                          ];
                          next[idx] = e.target.value;
                          setChildPrograms(next);
                        }}
                        className="w-full rounded-lg border border-[#cbd9f2] bg-[#f8fbff] px-3 py-2 text-sm text-[#0b1e4b]"
                      >
                        {programs.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.namaProgram} ({p.jenjang}) — {formatRupiah(p.biayaSpp)}/bln
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#f8fbff] border border-[#dce6f7] rounded-2xl p-5 sm:p-6 space-y-4">
                <h4 className="text-sm font-semibold text-[#0b1e4b]">Rincian Simulasi Tagihan</h4>
                <div className="divide-y divide-[#e2ebfa] text-sm">
                  {simulationRows.map((row) => (
                    <div key={row.order} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#0b1e4b]">
                          Anak ke-{row.order} · {row.programName}
                        </p>
                        <p className="text-xs text-[#566b94]">
                          {row.diskonPersen > 0
                            ? `Tarif ${formatRupiah(row.nominalDasar)} − Diskon ${row.diskonPersen}% (${formatRupiah(row.nominalDiskon)})`
                            : 'Tarif reguler tanpa potongan'}
                        </p>
                      </div>
                      <p className="font-mono font-semibold tabular-nums text-[#0b1e4b]">
                        {formatRupiah(row.jumlahTagihan)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#cbd9f2] space-y-2 text-sm">
                  <div className="flex justify-between text-[#475d85]">
                    <span>Total Biaya Pendaftaran (1× di awal)</span>
                    <span className="font-mono tabular-nums font-medium text-[#0b1e4b]">
                      {formatRupiah(totalRegistration)}
                    </span>
                  </div>
                  {totalMonthlyDiscount > 0 && (
                    <div className="flex justify-between text-[#059669]">
                      <span>Penghematan Diskon Keluarga / Bulan</span>
                      <span className="font-mono tabular-nums font-semibold">
                        −{formatRupiah(totalMonthlyDiscount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-[#0b1e4b] pt-1">
                    <span>Total SPP Bulanan</span>
                    <span className="font-mono tabular-nums text-[#2563eb]">
                      {formatRupiah(totalMonthlySpp)}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePortalClick}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold transition-colors"
                  >
                    <span>{currentUser ? 'Lanjut ke Portal Orang Tua' : 'Daftar Online Sekarang'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 3 Important Policy Cards */}
            <div className="grid sm:grid-cols-3 gap-4 text-xs text-[#475d85]">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#dce6f7]">
                <Users className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
                <span>
                  Kelas baru dibuka apabila minimal {MIN_CLASS_STUDENTS} siswa terdaftar (maksimal{' '}
                  {MAX_CLASS_CAPACITY} siswa).
                </span>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#dce6f7]">
                <BookOpen className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                <span>
                  Pembayaran SPP dicatat oleh admin dengan kuitansi digital yang dapat dicetak kapan
                  saja.
                </span>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#dce6f7]">
                <Check className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
                <span>
                  Keringanan atau penundaan pembayaran dapat diajukan langsung lewat Portal Orang
                  Tua.
                </span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Deep Academic Blue Footer */}
      <footer className="bg-[#071a48] text-[#dbeafe]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>
            © {new Date().getFullYear()} Bimbel Cerdas. Sistem Informasi Manajemen Bimbingan Belajar.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            {NAV_PAGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`transition-colors ${
                  activePage === item.id
                    ? 'text-white font-semibold underline underline-offset-4'
                    : 'hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handlePortalClick}
              className="font-semibold text-[#93c5fd] hover:text-white hover:underline"
            >
              Portal Sistem
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
