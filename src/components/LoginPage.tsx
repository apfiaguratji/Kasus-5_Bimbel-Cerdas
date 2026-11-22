import React, { useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Check,
  Copy,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext.tsx';
import { TEST_ACCOUNTS_BY_ROLE } from '../data/seedData.ts';
import type { UserRole } from '../types.ts';

const ROLE_VISUALS: Record<
  UserRole,
  {
    icon: typeof Users;
    badgeStyle: string;
    borderHover: string;
  }
> = {
  orang_tua: {
    icon: Users,
    badgeStyle: 'bg-[#2563eb] text-white',
    borderHover: 'hover:border-[#2563eb]',
  },
  tutor: {
    icon: GraduationCap,
    badgeStyle: 'bg-[#10b981] text-white',
    borderHover: 'hover:border-[#10b981]',
  },
  admin: {
    icon: ShieldCheck,
    badgeStyle: 'bg-[#f59e0b] text-white',
    borderHover: 'hover:border-[#f59e0b]',
  },
  pemilik: {
    icon: Briefcase,
    badgeStyle: 'bg-[#7c3aed] text-white',
    borderHover: 'hover:border-[#7c3aed]',
  },
};

export function LoginPage() {
  const { setView, loginWithGoogle, loginAsDemo, loginWithTestCredential, isLoggingIn, addToast } =
    useAppData();

  const [email, setEmail] = useState(TEST_ACCOUNTS_BY_ROLE[0].email);
  const [kodeUji, setKodeUji] = useState(TEST_ACCOUNTS_BY_ROLE[0].kodeUji);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<UserRole | null>('orang_tua');

  const handleCopy = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      addToast('info', `${label} disalin`, text);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      addToast('error', 'Gagal menyalin', 'Salin teks secara manual dari kartu akun uji.');
    }
  };

  const handleCredentialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const result = loginWithTestCredential(email, kodeUji);
    if (!result.ok && result.error) {
      setFormError(result.error);
    }
  };

  const handleAutofill = (accEmail: string, accCode: string, role: UserRole) => {
    setEmail(accEmail);
    setKodeUji(accCode);
    setFormError('');
    setExpandedRole(role);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-gradient-to-br from-[#061845] via-[#0b276b] to-[#133d9e] text-white">
      {/* Left Brand Story Panel — Royal Cobalt & Deep Academic Navy */}
      <section className="lg:col-span-5 relative overflow-hidden p-8 sm:p-10 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/15">
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

        <div className="relative z-10 my-10 lg:my-0 max-w-md">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#93c5fd] uppercase">
            Belajar · Tumbuh · Berprestasi
          </p>
          <h1 className="mt-4 text-3xl sm:text-4xl xl:text-5xl font-display font-bold leading-[1.1] text-balance">
            Setiap langkah kecil membawa{' '}
            <span className="text-[#93c5fd]">masa depan</span> lebih besar.
          </h1>
          <p className="mt-5 text-sm sm:text-base text-[#dbeafe]/85 leading-relaxed">
            Gunakan akun Google untuk menyimpan data ke database Firestore, atau pilih salah satu
            dari 4 akun uji resmi (Orang Tua, Tutor, Admin, Pemilik) untuk menguji seluruh skenario
            sistem.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-[#93c5fd]/85">
          <span>Belajar dengan arah. Bertumbuh dengan percaya diri.</span>
          <span>4 Aktor Terintegrasi</span>
        </div>
      </section>

      {/* Right Auth & 4-Role Test Account Panel */}
      <section className="lg:col-span-7 flex items-center justify-center p-5 sm:p-8 lg:p-10 bg-[#f4f8ff] text-[#0b1e4b]">
        <div className="w-full max-w-2xl rounded-3xl border border-[#dce6f7] bg-white p-6 sm:p-8 space-y-6 shadow-[0_24px_60px_-15px_rgba(11,47,118,0.14)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e5edf9] pb-5">
            <div>
              <p className="text-xs font-bold tracking-wider text-[#2563eb] uppercase">
                Portal Sistem Informasi
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold mt-1 text-[#0b1e4b]">
                Masuk ke Bimbel Cerdas
              </h2>
            </div>

            <button
              onClick={loginWithGoogle}
              disabled={isLoggingIn}
              className="py-2.5 px-5 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-xs sm:text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 whitespace-nowrap"
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google (Live DB)'}</span>
            </button>
          </div>

          {/* Manual Test Credential Login Form */}
          <form
            onSubmit={handleCredentialSubmit}
            className="rounded-2xl border border-[#dce6f7] bg-[#f8fbff] p-4 sm:p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#2563eb]" />
                <h3 className="text-sm font-bold text-[#0b1e4b]">
                  Masuk dengan Kredensial Akun Uji
                </h3>
              </div>
              <span className="text-[11px] font-medium text-[#475d85]">
                Mode Sandbox Terisolasi
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="test-login-email"
                  className="block text-xs font-semibold text-[#374f7d] mb-1"
                >
                  Email Akun Uji
                </label>
                <input
                  id="test-login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh: admin@bimbelcerdas.id"
                  className="w-full rounded-xl border border-[#cbd9f2] bg-white px-3 py-2 text-sm text-[#0b1e4b] focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label
                  htmlFor="test-login-password"
                  className="block text-xs font-semibold text-[#374f7d] mb-1"
                >
                  Kata Sandi Uji
                </label>
                <div className="relative">
                  <input
                    id="test-login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={kodeUji}
                    onChange={(e) => setKodeUji(e.target.value)}
                    placeholder="Masukkan kata sandi uji"
                    className="w-full rounded-xl border border-[#cbd9f2] bg-white pl-3 pr-9 py-2 text-sm text-[#0b1e4b] focus:outline-none focus:border-[#2563eb]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#566b94] hover:text-[#0b1e4b]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {formError && (
              <p className="text-xs font-medium text-[#dc2626]" role="alert">
                {formError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-0.5">
              <p className="text-xs text-[#566b94]">
                Pilih akun di bawah untuk mengisi form otomatis atau masuk langsung 1 klik.
              </p>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#0b1e4b] hover:bg-[#163475] text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk dengan Akun Uji</span>
              </button>
            </div>
          </form>

          {/* 4-Actor Test Accounts Directory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold tracking-wider text-[#2563eb] uppercase">
                Akun Uji per Aktor (4 Peran Siap Uji)
              </p>
              <span className="text-[11px] text-[#566b94]">
                Klik kartu untuk lihat skenario pengujian
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEST_ACCOUNTS_BY_ROLE.map((acc) => {
                const visual = ROLE_VISUALS[acc.role];
                const Icon = visual.icon;
                const isExpanded = expandedRole === acc.role;
                const emailCopied = copiedKey === `${acc.role}-email`;
                const codeCopied = copiedKey === `${acc.role}-code`;

                return (
                  <div
                    key={acc.role}
                    className={`rounded-2xl border border-[#dce6f7] bg-[#f8fbff] p-4 transition-all ${visual.borderHover} ${
                      isExpanded ? 'ring-1 ring-[#2563eb]/30 bg-white' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedRole(isExpanded ? null : acc.role)}
                        className="flex items-center gap-2.5 text-left min-w-0"
                      >
                        <span
                          className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${visual.badgeStyle}`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#0b1e4b] leading-tight">
                            {acc.label}
                          </p>
                          <p className="text-xs text-[#475d85] truncate">{acc.nama}</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => loginAsDemo(acc.role)}
                        className="px-3 py-1 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                      >
                        Masuk Langsung
                      </button>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs bg-white border border-[#e5edf9] rounded-xl p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#566b94] shrink-0">Email:</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <code className="font-mono text-[11px] text-[#0b1e4b] truncate">
                            {acc.email}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(`${acc.role}-email`, acc.email, 'Email')}
                            aria-label={`Salin email ${acc.label}`}
                            className="p-1 rounded hover:bg-[#eff5ff] text-[#2563eb] shrink-0"
                          >
                            {emailCopied ? (
                              <Check className="w-3.5 h-3.5 text-[#10b981]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#566b94] shrink-0">Sandi:</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <code className="font-mono text-[11px] font-semibold text-[#0b1e4b]">
                            {acc.kodeUji}
                          </code>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(`${acc.role}-code`, acc.kodeUji, 'Kata sandi uji')
                            }
                            aria-label={`Salin sandi ${acc.label}`}
                            className="p-1 rounded hover:bg-[#eff5ff] text-[#2563eb] shrink-0"
                          >
                            {codeCopied ? (
                              <Check className="w-3.5 h-3.5 text-[#10b981]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="mt-2.5 text-xs text-[#475d85] leading-relaxed">
                      {acc.ringkasanData}
                    </p>

                    {isExpanded && (
                      <ul className="mt-2.5 pt-2.5 border-t border-[#e5edf9] space-y-1 text-[11px] text-[#374f7d] list-disc pl-4">
                        {acc.skenarioUji.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleAutofill(acc.email, acc.kodeUji, acc.role)}
                        className="text-xs font-semibold text-[#2563eb] hover:underline"
                      >
                        Isi ke Form Login
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedRole(isExpanded ? null : acc.role)}
                        className="text-[11px] text-[#566b94] hover:text-[#0b1e4b]"
                      >
                        {isExpanded ? 'Tutup skenario' : 'Lihat skenario uji'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
