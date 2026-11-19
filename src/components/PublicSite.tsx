import { useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Calendar,
  Check,
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
  formatRupiah,
  MAX_CLASS_CAPACITY,
  MIN_CLASS_STUDENTS,
  REGISTRATION_FEE,
  SESSION_DURATION_MINUTES,
  SESSIONS_PER_WEEK,
  SIBLING_DISCOUNT_PERCENT,
  TUTOR_HONOR_PER_SESSION,
} from '../lib/businessRules.ts';

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

export function PublicSite() {
  const { setView, currentUser, programs, classes } = useAppData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handlePortalClick = () => {
    setView(currentUser ? 'dashboard' : 'login');
  };

  return (
    <div className="min-h-screen bg-[#f4f8ff] text-[#0b1e4b]">
      {/* Hero Banner with Integrated 3-Zone Top Bar */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#061845] via-[#0e348c] to-[#1e5ae2] text-white pb-20 lg:pb-24">
        {/* Soft atmospheric blue radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#3b82f6]/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-10 right-0 w-[30rem] h-[30rem] rounded-full bg-[#60a5fa]/20 blur-3xl"
        />

        {/* Strict 3-Zone Top Bar Contract */}
        <header className="relative z-30 max-w-7xl mx-auto px-4 sm:px-8 pt-5 pb-3">
          <div className="flex items-center justify-between gap-8">
            <a
              href="#beranda"
              className="text-xl font-display font-bold tracking-tight text-white whitespace-nowrap shrink-0"
            >
              Bimbel Cerdas
            </a>

            <nav className="hidden md:flex items-center gap-7 px-6 py-2.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 text-sm font-medium text-white/90">
              <a href="#beranda" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
                Beranda
              </a>
              <a href="#profil" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
                Profil
              </a>
              <a href="#program" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
                Program
              </a>
              <a href="#biaya" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
                Biaya
              </a>
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handlePortalClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] border border-white/25 text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                <span>{currentUser ? 'Buka Portal' : 'Masuk & Daftar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Menu navigasi"
                className="md:hidden p-2 rounded-full bg-white/15 border border-white/25 text-white"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav className="md:hidden mt-3 rounded-2xl bg-[#0a235e]/95 backdrop-blur-md border border-white/20 px-4 py-3 flex flex-col gap-1 text-sm font-medium text-white">
              <a href="#beranda" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 rounded-lg hover:bg-white/10">
                Beranda
              </a>
              <a href="#profil" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 rounded-lg hover:bg-white/10">
                Profil Bimbel
              </a>
              <a href="#program" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 rounded-lg hover:bg-white/10">
                Program Belajar
              </a>
              <a href="#biaya" onClick={() => setMobileMenuOpen(false)} className="py-2 px-2 rounded-lg hover:bg-white/10">
                Informasi Biaya
              </a>
            </nav>
          )}
        </header>

        {/* Hero Split */}
        <section id="beranda" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-8 lg:pt-12">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-white/12 border border-white/20 text-xs font-medium text-[#dbeafe] mb-5">
                <GraduationCap className="w-3.5 h-3.5" />
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
                  onClick={handlePortalClick}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] border border-white/25 text-white text-sm font-semibold shadow-md transition-colors whitespace-nowrap"
                >
                  <span>{currentUser ? 'Masuk ke Dashboard' : 'Daftar & Masuk Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#program"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/12 hover:bg-white/20 border border-white/25 text-white text-sm font-medium backdrop-blur-sm transition-colors whitespace-nowrap"
                >
                  <span>Jelajahi Program</span>
                </a>
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
                  <p className="text-xs font-mono tabular-nums text-white/90 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-3 py-1">
                    Maks. {MAX_CLASS_CAPACITY} Siswa / Kelas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Overlapping 4-Card Glassmorphic Feature Strip */}
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

      {/* About & Quick Metrics 3-Column Split */}
      <section id="profil" className="max-w-7xl mx-auto px-4 sm:px-8 py-16">
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
              Seluruh proses bimbingan belajar—mulai dari pendaftaran online, antrean daftar tunggu
              transparan, absensi siswa & tutor via smartphone, hingga kuitansi SPP digital dan
              laporan keuangan pemilik—terintegrasi rapi dalam satu sistem tanpa pencatatan manual.
            </p>
            <div className="pt-1">
              <button
                onClick={handlePortalClick}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <span>{currentUser ? 'Buka Portal Sistem' : 'Coba Portal 4 Peran'}</span>
                <ArrowRight className="w-4 h-4" />
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
      </section>

      {/* Programs & Latest Notices Split Section */}
      <section id="program" className="bg-white border-t border-b border-[#e2ebfa] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid lg:grid-cols-12 gap-8 items-start">
          {/* Left: Explore Our Programs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wider uppercase text-[#2563eb]">
                  Program Akademik Kami
                </p>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0b1e4b] mt-1">
                  Jelajahi Pilihan <span className="text-[#2563eb]">Program Belajar</span>
                </h2>
              </div>
              <a
                href="#biaya"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline whitespace-nowrap"
              >
                <span>Lihat Rincian Biaya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {programs.map((prog, idx) => {
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
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-black/5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] text-[#566b94]">SPP Bulanan</p>
                        <p className="text-base font-mono font-bold text-[#0b1e4b] tabular-nums">
                          {formatRupiah(prog.biayaSpp)}
                        </p>
                      </div>
                      <button
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

          {/* Right: Latest Info & Announcements */}
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
                onClick={handlePortalClick}
                className="text-xs font-semibold text-[#2563eb] hover:underline"
              >
                Buka Portal →
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-[#dce6f7] bg-[#f8fbff]">
              <div className="aspect-[16/9] w-full overflow-hidden">
                <ResilientPhoto
                  src="/src/assets/images/program_utbk_focus_1795022874712.jpg"
                  alt="Siswa SMA berlatih soal persiapan UTBK SNBT"
                  fallbackTitle="Fokus Persiapan UTBK SNBT"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 space-y-3">
                <div className="rounded-xl bg-white border border-[#e1ebfa] p-4">
                  <div className="flex items-center justify-between text-xs text-[#566b94]">
                    <span className="font-semibold text-[#2563eb]">Pendaftaran Online</span>
                    <span>Tahun Ajaran Aktif</span>
                  </div>
                  <p className="text-sm font-bold text-[#0b1e4b] mt-1">
                    Pendaftaran Siswa Baru SD, SMP, SMA & UTBK Dibuka
                  </p>
                  <p className="text-xs text-[#475d85] mt-1 leading-relaxed">
                    Biaya daftar Rp100.000 satu kali. Kelas dibuka minimal {MIN_CLASS_STUDENTS} siswa
                    dan maksimal {MAX_CLASS_CAPACITY} siswa per kelas.
                  </p>
                </div>

                <div className="rounded-xl bg-white border border-[#e1ebfa] p-4">
                  <div className="flex items-center justify-between text-xs text-[#566b94]">
                    <span className="font-semibold text-[#059669]">Potongan Keluarga</span>
                    <span>Otomatis di Sistem</span>
                  </div>
                  <p className="text-sm font-bold text-[#0b1e4b] mt-1">
                    Diskon SPP {SIBLING_DISCOUNT_PERCENT}% Anak Ke-2 & Seterusnya
                  </p>
                  <p className="text-xs text-[#475d85] mt-1 leading-relaxed">
                    Berlaku otomatis untuk seluruh anak berikutnya yang terdaftar pada akun keluarga yang sama.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Informasi Biaya Section */}
      <section id="biaya" className="max-w-7xl mx-auto px-4 sm:px-8 py-16">
        <div className="max-w-2xl mb-8">
          <p className="text-xs font-bold tracking-wider text-[#2563eb] uppercase">
            Informasi Biaya Transparan
          </p>
          <h2 className="text-3xl font-display font-bold text-[#0b1e4b] mt-1">
            Rincian biaya pendaftaran dan SPP bulanan
          </h2>
          <p className="text-sm text-[#475d85] mt-2 leading-relaxed">
            Biaya pendaftaran sebesar{' '}
            <strong className="text-[#0b1e4b] font-mono">{formatRupiah(REGISTRATION_FEE)}</strong>{' '}
            dibayarkan satu kali saat mendaftar. Anak kedua dan seterusnya dari keluarga yang sama
            otomatis mendapat potongan SPP {SIBLING_DISCOUNT_PERCENT}% setiap bulan.
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
                <th className="py-3.5 px-5 font-semibold text-right">SPP Anak ke-2+ (Diskon 10%)</th>
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

        <div className="mt-6 grid sm:grid-cols-3 gap-4 text-xs text-[#475d85]">
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
              Pembayaran SPP dicatat oleh admin dengan kuitansi digital yang dapat dicetak kapan saja.
            </span>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#dce6f7]">
            <Check className="w-4 h-4 text-[#7c3aed] shrink-0 mt-0.5" />
            <span>
              Keringanan atau penundaan pembayaran dapat diajukan langsung lewat Portal Orang Tua.
            </span>
          </div>
        </div>
      </section>

      {/* Deep Academic Blue Footer */}
      <footer className="bg-[#071a48] text-[#dbeafe]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>
            © {new Date().getFullYear()} Bimbel Cerdas. Sistem Informasi Manajemen Bimbingan Belajar.
          </p>
          <div className="flex items-center gap-6">
            <a href="#beranda" className="hover:text-white transition-colors">
              Beranda
            </a>
            <a href="#program" className="hover:text-white transition-colors">
              Program
            </a>
            <a href="#biaya" className="hover:text-white transition-colors">
              Biaya
            </a>
            <button
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
