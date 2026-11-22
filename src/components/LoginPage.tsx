import React, { useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  MailCheck,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext.tsx';

type AuthFormMode = 'login' | 'register' | 'reset';

export function LoginPage() {
  const {
    setView,
    loginWithGoogle,
    loginWithEmailPassword,
    registerWithEmailPassword,
    sendPasswordReset,
    resendVerificationEmail,
    checkEmailVerification,
    logout,
    pendingVerificationEmail,
    isLoggingIn,
  } = useAppData();

  const [mode, setMode] = useState<AuthFormMode>('login');
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formInfo, setFormInfo] = useState('');

  const switchMode = (nextMode: AuthFormMode) => {
    setMode(nextMode);
    setFormError('');
    setFormInfo('');
    if (nextMode === 'reset') {
      setPassword('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormInfo('');

    if (mode === 'login') {
      const res = await loginWithEmailPassword(email, password);
      if (!res.ok && res.error) {
        setFormError(res.error);
      }
      return;
    }

    if (mode === 'register') {
      const res = await registerWithEmailPassword(nama, email, password);
      if (!res.ok && res.error) {
        setFormError(res.error);
      }
      return;
    }

    const res = await sendPasswordReset(email);
    if (!res.ok && res.error) {
      setFormError(res.error);
    } else if (res.ok) {
      setFormInfo('Tautan reset kata sandi telah dikirim. Periksa kotak masuk atau folder spam email Anda.');
    }
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
            type="button"
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
            Masuk menggunakan email dan kata sandi Anda atau lanjutkan dengan akun Google untuk
            mengakses portal Bimbel Cerdas sesuai peran akun.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-[#93c5fd]/85">
          <span>Belajar dengan arah. Bertumbuh dengan percaya diri.</span>
          <span>Portal Resmi</span>
        </div>
      </section>

      {/* Right Auth Panel */}
      <section className="lg:col-span-7 flex items-center justify-center p-5 sm:p-8 lg:p-10 bg-[#f4f8ff] text-[#0b1e4b]">
        <div className="w-full max-w-md rounded-3xl border border-[#dce6f7] bg-white p-6 sm:p-8 space-y-6 shadow-[0_24px_60px_-15px_rgba(11,47,118,0.14)]">
          {pendingVerificationEmail ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#eff5ff] border border-[#cbd9f2] text-[#2563eb] grid place-items-center shrink-0">
                  <MailCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold tracking-wider text-[#2563eb] uppercase">
                    Verifikasi Email
                  </p>
                  <h2 className="text-xl font-display font-bold text-[#0b1e4b]">
                    Konfirmasi Alamat Email Anda
                  </h2>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dce6f7] bg-[#f8fbff] p-4 space-y-2 text-sm text-[#374f7d]">
                <p>
                  Tautan verifikasi telah dikirim ke{' '}
                  <strong className="text-[#0b1e4b] break-all">{pendingVerificationEmail}</strong>.
                </p>
                <p className="text-xs text-[#566b94] leading-relaxed">
                  Buka kotak masuk atau folder spam email Anda, klik tautan verifikasi tersebut, lalu
                  tekan tombol konfirmasi di bawah untuk masuk ke dashboard.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => void checkEmailVerification()}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoggingIn ? 'animate-spin' : ''}`} />
                  <span>{isLoggingIn ? 'Memeriksa...' : 'Saya Sudah Verifikasi Email'}</span>
                </button>

                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => void resendVerificationEmail()}
                  className="w-full py-2.5 px-4 rounded-xl border border-[#cbd9f2] bg-white hover:bg-[#eff5ff] text-[#0b1e4b] text-sm font-medium transition-colors disabled:opacity-60"
                >
                  Kirim Ulang Email Verifikasi
                </button>

                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => void logout()}
                  className="w-full py-2 px-4 text-xs font-medium text-[#566b94] hover:text-[#0b1e4b]"
                >
                  Keluar &amp; Gunakan Akun Lain
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-bold tracking-wider text-[#2563eb] uppercase">
                  Portal Sistem Informasi
                </p>
                <h2 className="text-2xl sm:text-3xl font-display font-bold mt-1 text-[#0b1e4b]">
                  {mode === 'login'
                    ? 'Masuk ke Bimbel Cerdas'
                    : mode === 'register'
                      ? 'Daftar Akun Baru'
                      : 'Reset Kata Sandi'}
                </h2>
                <p className="text-sm text-[#566b94] mt-1">
                  {mode === 'login'
                    ? 'Masukkan email dan kata sandi Anda untuk melanjutkan.'
                    : mode === 'register'
                      ? 'Buat akun dengan email aktif untuk mulai menggunakan portal.'
                      : 'Masukkan email akun Anda untuk menerima tautan reset kata sandi.'}
                </p>
              </div>

              {mode !== 'reset' && (
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#eff5ff] border border-[#dce6f7]">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      mode === 'login'
                        ? 'bg-white text-[#0b1e4b] shadow-sm'
                        : 'text-[#475d85] hover:text-[#0b1e4b]'
                    }`}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      mode === 'register'
                        ? 'bg-white text-[#0b1e4b] shadow-sm'
                        : 'text-[#475d85] hover:text-[#0b1e4b]'
                    }`}
                  >
                    Daftar Akun
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="auth-nama"
                      className="block text-xs font-semibold text-[#374f7d] mb-1.5"
                    >
                      Nama Lengkap
                    </label>
                    <input
                      id="auth-nama"
                      type="text"
                      autoComplete="name"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Masukkan nama lengkap"
                      className="w-full rounded-xl border border-[#cbd9f2] bg-white px-3.5 py-2.5 text-sm text-[#0b1e4b] placeholder:text-[#8fa3c7] focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-semibold text-[#374f7d] mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full rounded-xl border border-[#cbd9f2] bg-white px-3.5 py-2.5 text-sm text-[#0b1e4b] placeholder:text-[#8fa3c7] focus:outline-none focus:border-[#2563eb]"
                  />
                </div>

                {mode !== 'reset' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="auth-password"
                        className="block text-xs font-semibold text-[#374f7d]"
                      >
                        Kata Sandi
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => switchMode('reset')}
                          className="text-xs font-medium text-[#2563eb] hover:underline"
                        >
                          Lupa kata sandi?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          mode === 'register' ? 'Minimal 6 karakter' : 'Masukkan kata sandi'
                        }
                        className="w-full rounded-xl border border-[#cbd9f2] bg-white pl-3.5 pr-10 py-2.5 text-sm text-[#0b1e4b] placeholder:text-[#8fa3c7] focus:outline-none focus:border-[#2563eb]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#566b94] hover:text-[#0b1e4b]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {formError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-xs font-medium text-[#dc2626]"
                  >
                    {formError}
                  </div>
                )}

                {formInfo && (
                  <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3.5 py-2.5 text-xs font-medium text-[#15803d]">
                    {formInfo}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0b1e4b] hover:bg-[#163475] text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {mode === 'login' && <LogIn className="w-4 h-4" />}
                  {mode === 'register' && <UserPlus className="w-4 h-4" />}
                  {mode === 'reset' && <KeyRound className="w-4 h-4" />}
                  <span>
                    {isLoggingIn
                      ? 'Memproses...'
                      : mode === 'login'
                        ? 'Masuk'
                        : mode === 'register'
                          ? 'Daftar Akun'
                          : 'Kirim Tautan Reset'}
                  </span>
                </button>

                {mode === 'reset' && (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="w-full py-2 text-xs font-medium text-[#475d85] hover:text-[#0b1e4b]"
                  >
                    Kembali ke halaman Masuk
                  </button>
                )}
              </form>

              {mode !== 'reset' && (
                <>
                  <div className="relative flex items-center py-1">
                    <div className="flex-grow border-t border-[#e5edf9]" />
                    <span className="shrink-0 px-3 text-xs text-[#7286ad]">atau</span>
                    <div className="flex-grow border-t border-[#e5edf9]" />
                  </div>

                  <button
                    type="button"
                    onClick={() => void loginWithGoogle()}
                    disabled={isLoggingIn}
                    className="w-full py-2.5 px-4 rounded-xl border border-[#cbd9f2] bg-white hover:bg-[#eff5ff] text-[#0b1e4b] font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2.5 disabled:opacity-60"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                    <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
