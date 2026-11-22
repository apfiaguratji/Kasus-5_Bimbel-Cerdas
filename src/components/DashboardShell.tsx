import React, { useState } from 'react';
import { Eye, EyeOff, Globe, KeyRound, Lock, LogOut, Menu, X } from 'lucide-react';
import { useAppData } from '../context/AppDataContext.tsx';
import type { UserRole } from '../types.ts';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const ROLE_LABELS: Record<UserRole, string> = {
  orang_tua: 'Orang Tua',
  tutor: 'Tutor',
  admin: 'Admin',
  pemilik: 'Pemilik',
};

export function DashboardShell({
  navItems,
  activeTab,
  onSelectTab,
  children,
}: {
  navItems: NavItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  children: React.ReactNode;
}) {
  const {
    currentUser,
    activeRole,
    hasPasswordProvider,
    syncEmailPasswordCredential,
    isLoggingIn,
    setView,
    logout,
  } = useAppData();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const handleOpenPwdModal = () => {
    setNewPwd('');
    setConfirmPwd('');
    setPwdError('');
    setShowPwd(false);
    setPwdModalOpen(true);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    if (newPwd.length < 6) {
      setPwdError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    const res = await syncEmailPasswordCredential(newPwd);
    if (res.ok) {
      setPwdModalOpen(false);
    } else if (res.error) {
      setPwdError(res.error);
    }
  };

  const activeNav = navItems.find((n) => n.id === activeTab) || navItems[0];

  const SidebarBody = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#071a48] via-[#0a235e] to-[#0d2d78] text-[#e8f0fe]">
      <div className="px-5 h-16 flex items-center justify-between border-b border-white/12">
        <button
          onClick={() => setView('public')}
          className="text-lg font-display font-bold tracking-tight text-white whitespace-nowrap"
        >
          Bimbel Cerdas
        </button>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="p-1.5 rounded-lg text-[#bfdbfe] hover:bg-white/10 lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-5 py-4 border-b border-white/12">
        <p className="text-[11px] font-semibold tracking-wider uppercase text-[#93c5fd]">
          Portal {ROLE_LABELS[activeRole]}
        </p>
        <p className="text-sm font-semibold text-white mt-0.5 truncate">{currentUser?.nama}</p>
        <p className="text-xs text-[#bfdbfe]/75 truncate">{currentUser?.email}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onClose?.();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-[#2563eb] text-white shadow-sm'
                  : 'text-[#cbd5f5] hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-white text-[#1d4ed8] font-bold tabular-nums shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-white/12 bg-[#06153b] space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#93c5fd]">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>Hak Akses Terkunci</span>
        </div>
        <p className="text-[11px] text-[#cbd5f5]/85 leading-snug">
          Sesi aktif hanya untuk peran <strong className="text-white">{ROLE_LABELS[activeRole]}</strong>. Keluar untuk berganti akun aktor lain.
        </p>
      </div>

      <div className="p-3 border-t border-white/12 space-y-1">
        <button
          onClick={() => {
            onClose?.();
            handleOpenPwdModal();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#cbd5f5] hover:bg-white/10 hover:text-white transition-colors"
        >
          <KeyRound className="w-4 h-4 shrink-0" />
          <span>{hasPasswordProvider ? 'Ubah Kata Sandi Login' : 'Atur Kata Sandi Email'}</span>
        </button>
        <button
          onClick={() => setView('public')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#cbd5f5] hover:bg-white/10 hover:text-white transition-colors"
        >
          <Globe className="w-4 h-4 shrink-0" />
          <span>Halaman Publik</span>
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#fecaca] hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f8ff] text-[#0b1e4b] flex">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:block w-64 shrink-0 border-r border-[#12327a] sticky top-0 h-screen">
        <SidebarBody />
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#061845]/60 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative z-10 w-68 max-w-[82vw] h-full shadow-xl">
            <SidebarBody onClose={() => setMobileDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="no-print sticky top-0 z-20 h-14 bg-white/95 backdrop-blur border-b border-[#dce6f7] px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#0b1e4b] hover:bg-[#eff5ff]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-[#566b94] hidden sm:inline">Portal {ROLE_LABELS[activeRole]}</span>
              <span className="text-[#a5b8d9] hidden sm:inline">/</span>
              <span className="font-semibold text-[#0b1e4b] truncate">{activeNav?.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setView('public')}
              className="text-xs font-semibold text-[#2563eb] hover:underline whitespace-nowrap hidden sm:inline"
            >
              Lihat Info Program
            </button>
            <button
              onClick={logout}
              className="px-3.5 py-1.5 rounded-full border border-[#cbd9f2] text-xs font-medium text-[#0b1e4b] hover:bg-[#eff5ff] whitespace-nowrap"
            >
              Keluar
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>

      {pwdModalOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#061845]/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#dce6f7] bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-display font-bold text-[#0b1e4b]">
                  {hasPasswordProvider ? 'Ubah Kata Sandi Login' : 'Atur Kata Sandi Email'}
                </h3>
                <p className="text-xs text-[#566b94] mt-1">
                  Sinkronkan kata sandi untuk{' '}
                  <strong className="text-[#0b1e4b] break-all">{currentUser?.email}</strong> agar dapat
                  masuk lewat form Email &amp; Kata Sandi maupun Google.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPwdModalOpen(false)}
                aria-label="Tutup modal kata sandi"
                className="p-1.5 rounded-lg text-[#566b94] hover:bg-[#eff5ff]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-3.5">
              <div>
                <label
                  htmlFor="sync-new-password"
                  className="block text-xs font-semibold text-[#374f7d] mb-1"
                >
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    id="sync-new-password"
                    type={showPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-xl border border-[#cbd9f2] bg-white pl-3.5 pr-10 py-2 text-sm text-[#0b1e4b] focus:outline-none focus:border-[#2563eb]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((prev) => !prev)}
                    aria-label={showPwd ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#566b94] hover:text-[#0b1e4b]"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="sync-confirm-password"
                  className="block text-xs font-semibold text-[#374f7d] mb-1"
                >
                  Ulangi Kata Sandi Baru
                </label>
                <input
                  id="sync-confirm-password"
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Ketik ulang kata sandi"
                  className="w-full rounded-xl border border-[#cbd9f2] bg-white px-3.5 py-2 text-sm text-[#0b1e4b] focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              {pwdError && (
                <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs font-medium text-[#dc2626]">
                  {pwdError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPwdModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#cbd9f2] text-xs font-semibold text-[#374f7d] hover:bg-[#eff5ff]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold disabled:opacity-60"
                >
                  {isLoggingIn ? 'Menyimpan...' : 'Simpan & Sinkronkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
