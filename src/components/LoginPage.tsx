import { ArrowLeft, Briefcase, GraduationCap, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { useAppData } from '../context/AppDataContext.tsx';
import type { UserRole } from '../types.ts';

const DEMO_CARDS: {
  role: UserRole;
  label: string;
  desc: string;
  icon: typeof Users;
  badgeStyle: string;
}[] = [
  {
    role: 'orang_tua',
    label: 'Orang Tua',
    desc: 'Daftar anak, cek jadwal, absen 3×, SPP & kuitansi',
    icon: Users,
    badgeStyle: 'bg-[#2563eb] text-white',
  },
  {
    role: 'tutor',
    label: 'Tutor',
    desc: 'Jadwal mengajar, absen siswa & konfirmasi honor',
    icon: GraduationCap,
    badgeStyle: 'bg-[#10b981] text-white',
  },
  {
    role: 'admin',
    label: 'Admin',
    desc: 'Siswa, daftar tunggu, bayar SPP, telepon bolos',
    icon: ShieldCheck,
    badgeStyle: 'bg-[#f59e0b] text-white',
  },
  {
    role: 'pemilik',
    label: 'Pemilik',
    desc: 'Kas, honor tutor, tunggakan, acc keringanan',
    icon: Briefcase,
    badgeStyle: 'bg-[#7c3aed] text-white',
  },
];

export function LoginPage() {
  const { setView, loginWithGoogle, loginAsDemo, isLoggingIn } = useAppData();

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-gradient-to-br from-[#061845] via-[#0b276b] to-[#133d9e] text-white">
      {/* Left Brand Story Panel — Royal Cobalt & Deep Academic Navy */}
      <section className="lg:col-span-6 relative overflow-hidden p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/15">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-1/4 w-[420px] h-[420px] rounded-full border border-[#60a5fa]/20 shadow-[0_0_0_28px_rgba(96,165,250,0.03),0_0_0_58px_rgba(96,165,250,0.02)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[8%] top-[40%] w-[210px] h-[210px] rounded-full border border-dashed border-[#93c5fd]/20"
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-[#1446b8] font-display font-bold text-base grid place-items-center shadow-sm">
              BC
            </div>
            <span className="text-xs font-bold tracking-[0.18em] text-[#dbeafe]">
              BIMBEL CERDAS
            </span>
          </div>

          <button
            onClick={() => setView('public')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium text-white transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </button>
        </div>

        <div className="relative z-10 my-12 lg:my-0 max-w-xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#93c5fd] uppercase">
            Belajar · Tumbuh · Berprestasi
          </p>
          <h1 className="mt-4 text-3xl sm:text-5xl font-display font-bold leading-[1.1] text-balance">
            Setiap langkah kecil membawa{' '}
            <span className="text-[#93c5fd]">masa depan</span> lebih besar.
          </h1>
          <p className="mt-5 text-sm sm:text-base text-[#dbeafe]/85 leading-relaxed max-w-md">
            Ruang belajar dan pengelolaan bimbingan belajar yang terhubung untuk orang tua, tutor,
            admin, dan pemilik dalam satu sistem terpadu.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-[#93c5fd]/85">
          <span>Belajar dengan arah. Bertumbuh dengan percaya diri.</span>
          <span>4 Aktor Terintegrasi</span>
        </div>
      </section>

      {/* Right Auth & 4-Role Demo Access Panel */}
      <section className="lg:col-span-6 flex items-center justify-center p-6 sm:p-12 bg-[#f4f8ff] text-[#0b1e4b]">
        <div className="w-full max-w-md rounded-3xl border border-[#dce6f7] bg-white p-7 sm:p-9 space-y-6 shadow-[0_24px_60px_-15px_rgba(11,47,118,0.14)]">
          <div>
            <p className="text-xs font-bold tracking-wider text-[#2563eb] uppercase">
              Portal Sistem Informasi
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold mt-1 text-[#0b1e4b]">
              Masuk ke Bimbel Cerdas
            </h2>
            <p className="text-sm text-[#475d85] mt-1.5 leading-relaxed">
              Masuk dengan akun Google untuk menyimpan data ke database, atau gunakan akses uji coba
              empat peran di bawah ini.
            </p>
          </div>

          {/* Primary Google Sign-In */}
          <div className="space-y-2.5">
            <button
              onClick={loginWithGoogle}
              disabled={isLoggingIn}
              className="w-full py-3 px-5 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-60"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isLoggingIn ? 'Menghubungkan akun...' : 'Masuk / Daftar dengan Google'}</span>
            </button>
            <p className="text-xs text-[#566b94] text-center">
              Pendaftar Google baru otomatis masuk sebagai portal Orang Tua.
            </p>
          </div>

          <div className="border-t border-[#e5edf9] pt-5">
            <p className="text-xs font-bold tracking-wider text-[#2563eb] uppercase mb-3">
              Akses Demo 4 Aktor Siap Uji
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_CARDS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.role}
                    onClick={() => loginAsDemo(item.role)}
                    className="text-left p-3.5 rounded-2xl border border-[#dce6f7] bg-[#f8fbff] hover:border-[#2563eb] hover:bg-white hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-2.5 text-sm font-bold text-[#0b1e4b]">
                      <span className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${item.badgeStyle}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="group-hover:text-[#2563eb] transition-colors">{item.label}</span>
                    </div>
                    <p className="text-xs text-[#566b94] mt-1.5 leading-snug">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
