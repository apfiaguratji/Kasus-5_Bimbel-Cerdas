import React, { useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  CreditCard,
  FileText,
  PlusCircle,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext.tsx';
import { DEMO_USERS } from '../../data/seedData.ts';
import {
  calculateSppInvoice,
  formatRupiah,
  REGISTRATION_FEE,
  SIBLING_DISCOUNT_PERCENT,
} from '../../lib/businessRules.ts';
import type { Receipt, ReliefType } from '../../types.ts';
import { DashboardShell, type NavItem } from '../DashboardShell.tsx';
import { ReceiptModal } from '../ReceiptModal.tsx';
import { StatusText } from '../StatusText.tsx';

export function ParentDashboard() {
  const {
    authMode,
    currentUser,
    programs,
    classes,
    schedules,
    students,
    registrations,
    waitlists,
    studentAttendance,
    invoices,
    receipts,
    notifications,
    reliefRequests,
    registerChild,
    markNotificationRead,
    submitReliefRequest,
    updateOwnProfile,
    addToast,
  } = useAppData();

  const effectiveParentUid =
    authMode === 'demo' ? DEMO_USERS.orang_tua.uid : currentUser?.uid || '';

  const myStudents = useMemo(
    () => students.filter((s) => s.parentUid === effectiveParentUid),
    [students, effectiveParentUid]
  );
  const myStudentIds = useMemo(() => new Set(myStudents.map((s) => s.id)), [myStudents]);
  const myRegistrations = useMemo(
    () => registrations.filter((r) => r.parentUid === effectiveParentUid),
    [registrations, effectiveParentUid]
  );
  const myWaitlists = useMemo(
    () => waitlists.filter((w) => w.parentUid === effectiveParentUid && w.statusAntrean === 'Menunggu'),
    [waitlists, effectiveParentUid]
  );
  const myAttendance = useMemo(
    () =>
      studentAttendance
        .filter((a) => a.parentUid === effectiveParentUid || myStudentIds.has(a.idSiswa))
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [studentAttendance, effectiveParentUid, myStudentIds]
  );
  const myInvoices = useMemo(
    () => invoices.filter((i) => i.parentUid === effectiveParentUid),
    [invoices, effectiveParentUid]
  );
  const myReceipts = useMemo(
    () => receipts.filter((r) => r.parentUid === effectiveParentUid),
    [receipts, effectiveParentUid]
  );
  const myNotifications = useMemo(
    () => notifications.filter((n) => n.parentUid === effectiveParentUid),
    [notifications, effectiveParentUid]
  );
  const myReliefs = useMemo(
    () => reliefRequests.filter((r) => r.parentUid === effectiveParentUid),
    [reliefRequests, effectiveParentUid]
  );

  const unreadCount = myNotifications.filter((n) => !n.sudahDibaca).length;

  const navItems: NavItem[] = [
    { id: 'ringkasan', label: 'Ringkasan Anak', icon: Users },
    { id: 'daftar', label: 'Daftarkan Anak', icon: PlusCircle },
    { id: 'jadwal', label: 'Jadwal & Kehadiran', icon: Calendar },
    { id: 'tagihan', label: 'SPP & Kuitansi', icon: CreditCard },
    { id: 'notifikasi', label: 'Notifikasi', icon: Bell, badge: unreadCount },
    { id: 'profil', label: 'Profil Orang Tua', icon: User },
  ];

  const [tab, setTab] = useState('ringkasan');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [reliefModalInvoiceId, setReliefModalInvoiceId] = useState<string | null>(null);
  const [reliefType, setReliefType] = useState<ReliefType>('Penundaan Jatuh Tempo');
  const [reliefReason, setReliefReason] = useState('');

  // Form daftar anak
  const [form, setForm] = useState({
    namaSiswa: '',
    tanggalLahir: '',
    jenisKelamin: 'L' as 'L' | 'P',
    asalSekolah: '',
    idProgram: programs[0]?.id || '',
    idKelas: '',
  });
  const [submittingChild, setSubmittingChild] = useState(false);

  // Form profil orang tua
  const [profileForm, setProfileForm] = useState({
    nama: currentUser?.nama || '',
    noTelepon: currentUser?.noTelepon || '',
    alamat: currentUser?.alamat || '',
  });

  const selectedProgram = programs.find((p) => p.id === form.idProgram);
  const filteredClasses = classes.filter((c) => c.idProgram === form.idProgram);
  const nextChildOrder = myStudents.length + 1;
  const previewSpp = selectedProgram
    ? calculateSppInvoice(selectedProgram.biayaSpp, nextChildOrder)
    : null;

  const unpaidTotal = myInvoices
    .filter((i) => i.statusTagihan !== 'Lunas')
    .reduce((sum, i) => sum + i.jumlahTagihan, 0);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaSiswa.trim() || !form.tanggalLahir || !form.asalSekolah.trim() || !form.idProgram || !form.idKelas) {
      addToast('error', 'Data belum lengkap', 'Harap lengkapi seluruh kolom pendaftaran anak.');
      return;
    }
    setSubmittingChild(true);
    try {
      await registerChild(form);
      setForm({
        namaSiswa: '',
        tanggalLahir: '',
        jenisKelamin: 'L',
        asalSekolah: '',
        idProgram: programs[0]?.id || '',
        idKelas: '',
      });
      setTab('ringkasan');
    } catch (err: unknown) {
      addToast('error', 'Pendaftaran gagal', err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSubmittingChild(false);
    }
  };

  const handleReliefSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reliefModalInvoiceId || reliefReason.trim().length < 5) {
      addToast('error', 'Alasan terlalu singkat', 'Tuliskan alasan minimal 5 karakter.');
      return;
    }
    await submitReliefRequest({
      idTagihan: reliefModalInvoiceId,
      jenisPengajuan: reliefType,
      alasan: reliefReason,
    });
    setReliefModalInvoiceId(null);
    setReliefReason('');
  };

  return (
    <DashboardShell navItems={navItems} activeTab={tab} onSelectTab={setTab}>
      {tab === 'ringkasan' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
                Informasi Belajar Keluarga
              </h1>
              <p className="text-sm text-[#475d85] mt-1">
                Pantau status kelas, kehadiran, tagihan SPP, dan notifikasi anak yang terhubung dengan akun Anda.
              </p>
            </div>
            <button
              onClick={() => setTab('daftar')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8] whitespace-nowrap self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Daftarkan Anak</span>
            </button>
          </div>

          {/* 4 KPI Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Anak Terdaftar</p>
              <p className="text-2xl font-display font-semibold mt-1 tabular-nums">{myStudents.length}</p>
            </div>
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Tagihan Belum Lunas</p>
              <p className="text-2xl font-mono font-semibold mt-1 tabular-nums text-[#0b1e4b]">
                {formatRupiah(unpaidTotal)}
              </p>
            </div>
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Antrean Daftar Tunggu</p>
              <p className="text-2xl font-display font-semibold mt-1 tabular-nums">{myWaitlists.length}</p>
            </div>
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Notifikasi Baru</p>
              <p className="text-2xl font-display font-semibold mt-1 tabular-nums text-[#d97706]">
                {unreadCount}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <div className="bg-[#fffbeb] border border-[#f5d58c] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#b45309]">
                  Anda memiliki {unreadCount} notifikasi penting yang belum dibaca
                </p>
                <p className="text-xs text-[#b45309]/85 mt-0.5">{myNotifications.find((n) => !n.sudahDibaca)?.judul}</p>
              </div>
              <button
                onClick={() => setTab('notifikasi')}
                className="px-3.5 py-2 rounded-lg bg-[#d97706] text-white text-xs font-semibold hover:bg-[#b45309] whitespace-nowrap self-start sm:self-auto"
              >
                Buka Notifikasi
              </button>
            </div>
          )}

          {myStudents.length === 0 ? (
            <div className="bg-white border border-dashed border-[#cbd9f2] rounded-2xl p-10 text-center">
              <Users className="w-8 h-8 text-[#2563eb] mx-auto mb-3" />
              <h2 className="text-lg font-display font-semibold">Belum ada anak terdaftar</h2>
              <p className="text-sm text-[#475d85] mt-1 max-w-md mx-auto">
                Daftarkan anak secara online untuk memilih kelas, memantau jadwal, dan melihat tagihan SPP.
              </p>
              <button
                onClick={() => setTab('daftar')}
                className="mt-5 px-5 py-2.5 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8]"
              >
                Mulai Pendaftaran Anak
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {myStudents.map((sis) => {
                const classScheds = schedules.filter((sc) => sc.idKelas === sis.idKelas);
                const reg = myRegistrations.find((r) => r.idSiswa === sis.id);
                const sisAbsen = myAttendance.filter((a) => a.idSiswa === sis.id);
                const hadirCount = sisAbsen.filter((a) => a.statusKehadiran === 'Hadir').length;

                return (
                  <div key={sis.id} className="bg-white border border-[#dce6f7] rounded-2xl p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-[#566b94]">
                          Anak ke-{sis.urutanAnak}
                          {sis.urutanAnak >= 2 ? ` · Diskon Keluarga ${SIBLING_DISCOUNT_PERCENT}%` : ''} ·{' '}
                          {sis.jenjang}
                        </p>
                        <h2 className="text-xl font-display font-semibold text-[#0b1e4b] mt-0.5">
                          {sis.namaSiswa}
                        </h2>
                        <p className="text-xs text-[#475d85] mt-0.5">{sis.asalSekolah}</p>
                      </div>
                      <StatusText status={sis.statusSiswa} />
                    </div>

                    <div className="pt-3 border-t border-[#e8f0fb] text-sm space-y-1.5">
                      <div className="flex justify-between gap-4">
                        <span className="text-[#566b94]">Program & Kelas</span>
                        <span className="font-medium text-right">
                          {sis.namaProgram} · {sis.namaKelas}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#566b94]">Biaya Pendaftaran</span>
                        <span className="font-medium">
                          {reg?.statusBayarDaftar || 'Belum Bayar'} ({formatRupiah(REGISTRATION_FEE)})
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-[#566b94]">Kehadiran Tercatat</span>
                        <span className="font-mono tabular-nums">
                          {hadirCount}/{sisAbsen.length} sesi hadir
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#e8f0fb]">
                      <p className="text-xs font-semibold text-[#374f7d] mb-1.5">Jadwal Belajar</p>
                      {classScheds.length === 0 ? (
                        <p className="text-xs text-[#566b94]">Jadwal belum ditentukan.</p>
                      ) : (
                        <ul className="space-y-1 text-xs text-[#1e3366]">
                          {classScheds.map((sc) => (
                            <li key={sc.id} className="flex justify-between gap-2">
                              <span>
                                {sc.hari}, <span className="font-mono tabular-nums">{sc.jamMulai}–{sc.jamSelesai}</span>
                              </span>
                              <span className="text-[#566b94]">{sc.namaTutor}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'daftar' && (
        <div className="max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Pendaftaran Siswa Online
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Biaya pendaftaran satu kali sebesar {formatRupiah(REGISTRATION_FEE)}. Kapasitas kelas maksimal 8 siswa.
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="bg-white border border-[#dce6f7] rounded-2xl p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={form.namaSiswa}
                  onChange={(e) => setForm({ ...form, namaSiswa: e.target.value })}
                  placeholder="Contoh: Rania Putri"
                  className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">Tanggal Lahir</label>
                <input
                  type="date"
                  required
                  value={form.tanggalLahir}
                  onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                  className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">Jenis Kelamin</label>
                <select
                  value={form.jenisKelamin}
                  onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value as 'L' | 'P' })}
                  className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">Asal Sekolah</label>
                <input
                  type="text"
                  required
                  value={form.asalSekolah}
                  onChange={(e) => setForm({ ...form, asalSekolah: e.target.value })}
                  placeholder="Nama sekolah saat ini"
                  className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">Program Bimbel</label>
                <select
                  required
                  value={form.idProgram}
                  onChange={(e) => setForm({ ...form, idProgram: e.target.value, idKelas: '' })}
                  className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.namaProgram} — {formatRupiah(p.biayaSpp)}/bln
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">Pilih Kelas</label>
                <select
                  required
                  value={form.idKelas}
                  onChange={(e) => setForm({ ...form, idKelas: e.target.value })}
                  className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="">Pilih kelas tersedia</option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.namaKelas} ({c.jumlahTerisi}/{c.kapasitasMaksimal} siswa
                      {c.jumlahTerisi >= c.kapasitasMaksimal ? ' · Penuh, masuk Daftar Tunggu' : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {previewSpp && (
              <div className="rounded-lg bg-[#eff5ff] border border-[#dce6f7] p-4 text-sm space-y-1">
                <p className="font-semibold text-[#0b1e4b]">
                  Estimasi Biaya (Pendaftaran Anak ke-{nextChildOrder})
                </p>
                <div className="flex justify-between text-xs text-[#475d85]">
                  <span>Biaya Pendaftaran (1×)</span>
                  <span className="font-mono tabular-nums">{formatRupiah(REGISTRATION_FEE)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#475d85]">
                  <span>
                    SPP Bulanan{' '}
                    {previewSpp.diskonPersen > 0
                      ? `(Otomatis Diskon ${previewSpp.diskonPersen}% Anak ke-2+)`
                      : ''}
                  </span>
                  <span className="font-mono font-semibold text-[#2563eb] tabular-nums">
                    {formatRupiah(previewSpp.jumlahTagihan)}/bulan
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submittingChild}
              className="px-5 py-2.5 rounded-lg bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {submittingChild ? 'Menyimpan pendaftaran...' : 'Kirim Pendaftaran Online'}
            </button>
          </form>
        </div>
      )}

      {tab === 'jadwal' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Jadwal Belajar & Riwayat Kehadiran
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Setiap kelas berlangsung 2× seminggu dengan durasi 90 menit per sesi.
            </p>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e8f0fb]">
              <h2 className="text-base font-semibold">Jadwal Belajar Mingguan Anak</h2>
            </div>
            {myStudents.length === 0 ? (
              <p className="p-6 text-sm text-[#566b94]">Belum ada anak terdaftar pada kelas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                      <th className="py-3 px-5">Siswa</th>
                      <th className="py-3 px-5">Kelas</th>
                      <th className="py-3 px-5">Hari</th>
                      <th className="py-3 px-5">Waktu (90 Menit)</th>
                      <th className="py-3 px-5">Tutor</th>
                      <th className="py-3 px-5">Ruangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8f0fb]">
                    {myStudents.flatMap((sis) => {
                      const clsScheds = schedules.filter((sc) => sc.idKelas === sis.idKelas);
                      if (clsScheds.length === 0) {
                        return [
                          <tr key={`empty-${sis.id}`} className="hover:bg-[#f8fbff]">
                            <td className="py-3 px-5 font-medium">{sis.namaSiswa}</td>
                            <td className="py-3 px-5">{sis.namaKelas}</td>
                            <td colSpan={4} className="py-3 px-5 text-xs text-[#566b94]">
                              Jadwal belum diatur oleh admin.
                            </td>
                          </tr>,
                        ];
                      }
                      return clsScheds.map((sc) => (
                        <tr key={`${sis.id}-${sc.id}`} className="hover:bg-[#f8fbff]">
                          <td className="py-3 px-5 font-medium">{sis.namaSiswa}</td>
                          <td className="py-3 px-5 text-[#475d85]">{sis.namaKelas}</td>
                          <td className="py-3 px-5 font-semibold text-[#2563eb]">{sc.hari}</td>
                          <td className="py-3 px-5 font-mono text-xs tabular-nums">
                            {sc.jamMulai} – {sc.jamSelesai}
                          </td>
                          <td className="py-3 px-5">{sc.namaTutor}</td>
                          <td className="py-3 px-5 text-xs text-[#566b94]">{sc.ruangan || 'Ruang Utama'}</td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e8f0fb]">
              <h2 className="text-base font-semibold">Riwayat Kehadiran Siswa</h2>
            </div>
            {myAttendance.length === 0 ? (
              <p className="p-6 text-sm text-[#566b94]">Belum ada catatan kehadiran.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                      <th className="py-3 px-5">Tanggal</th>
                      <th className="py-3 px-5">Siswa</th>
                      <th className="py-3 px-5">Kelas</th>
                      <th className="py-3 px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8f0fb]">
                    {myAttendance.map((att) => (
                      <tr key={att.id} className="hover:bg-[#f8fbff]">
                        <td className="py-3 px-5 font-mono text-xs tabular-nums">{att.tanggal}</td>
                        <td className="py-3 px-5 font-medium">{att.namaSiswa}</td>
                        <td className="py-3 px-5 text-[#475d85]">{att.namaKelas}</td>
                        <td className="py-3 px-5">
                          <StatusText status={att.statusKehadiran} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'tagihan' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Tagihan SPP, Status Pembayaran & Kuitansi
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Unduh atau cetak kuitansi digital untuk pembayaran lunas, atau ajukan keringanan jika diperlukan.
            </p>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e8f0fb]">
              <h2 className="text-base font-semibold">Daftar Tagihan SPP Anak</h2>
            </div>
            {myInvoices.length === 0 ? (
              <p className="p-6 text-sm text-[#566b94]">Belum ada tagihan SPP.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                      <th className="py-3 px-5">Siswa</th>
                      <th className="py-3 px-5">Periode</th>
                      <th className="py-3 px-5 text-right">Tagihan</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8f0fb]">
                    {myInvoices.map((inv) => {
                      const relief = myReliefs.find((r) => r.idTagihan === inv.id);
                      const receipt = myReceipts.find((rc) => rc.idTagihan === inv.id);
                      return (
                        <tr key={inv.id} className="hover:bg-[#f8fbff]">
                          <td className="py-3.5 px-5">
                            <p className="font-medium text-[#0b1e4b]">{inv.namaSiswa}</p>
                            <p className="text-xs text-[#566b94]">{inv.namaProgram}</p>
                          </td>
                          <td className="py-3.5 px-5">{inv.periodeLabel}</td>
                          <td className="py-3.5 px-5 text-right font-mono tabular-nums">
                            <p className="font-semibold">{formatRupiah(inv.jumlahTagihan)}</p>
                            {inv.diskonPersen > 0 && (
                              <p className="text-xs text-[#2563eb]">Diskon {inv.diskonPersen}%</p>
                            )}
                          </td>
                          <td className="py-3.5 px-5">
                            <StatusText status={inv.statusTagihan} />
                            {relief && (
                              <p className="text-xs text-[#566b94] mt-1">
                                Keringanan: {relief.statusKeputusan}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            {inv.statusTagihan === 'Lunas' && receipt && (
                              <button
                                onClick={() => setSelectedReceipt(receipt)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#cbd9f2] text-xs font-medium text-[#2563eb] hover:bg-[#eff5ff]"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Lihat Kuitansi</span>
                              </button>
                            )}
                            {inv.statusTagihan !== 'Lunas' && !relief && (
                              <button
                                onClick={() => setReliefModalInvoiceId(inv.id)}
                                className="px-3 py-1.5 rounded-lg border border-[#d6c298] text-xs font-medium text-[#b45309] hover:bg-[#fffbeb]"
                              >
                                Ajukan Keringanan
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'notifikasi' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Pusat Notifikasi Orang Tua
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Informasi otomatis ketidakhadiran 3 kali berturut-turut, penempatan daftar tunggu, dan keputusan keringanan.
            </p>
          </div>

          {myNotifications.length === 0 ? (
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-8 text-center text-sm text-[#566b94]">
              Belum ada notifikasi.
            </div>
          ) : (
            <div className="space-y-3">
              {myNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    notif.sudahDibaca
                      ? 'bg-white border-[#dce6f7]'
                      : 'bg-[#fffcf4] border-[#ecc97c]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 text-xs text-[#566b94]">
                      <StatusText status={notif.kategori} />
                      <span>·</span>
                      <span className="font-mono tabular-nums">{notif.createdAt}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#0b1e4b]">{notif.judul}</h3>
                    <p className="text-sm text-[#374f7d] leading-relaxed">{notif.pesan}</p>
                  </div>
                  {!notif.sudahDibaca && (
                    <button
                      onClick={() => markNotificationRead(notif.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#cbd5ce] bg-white text-xs font-medium text-[#0b1e4b] hover:bg-[#eff5f1] whitespace-nowrap shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Tandai Dibaca</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'profil' && (
        <div className="max-w-lg space-y-6">
          <div>
            <h1 className="text-2xl font-display font-semibold text-[#0b1e4b]">Profil Orang Tua</h1>
            <p className="text-sm text-[#475d85] mt-1">
              Nomor telepon digunakan admin saat menindaklanjuti ketidakhadiran siswa.
            </p>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await updateOwnProfile(profileForm);
            }}
            className="bg-white border border-[#dce6f7] rounded-2xl p-6 space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">Nama Lengkap</label>
              <input
                type="text"
                required
                value={profileForm.nama}
                onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">No. HP / WhatsApp</label>
              <input
                type="text"
                required
                value={profileForm.noTelepon}
                onChange={(e) => setProfileForm({ ...profileForm, noTelepon: e.target.value })}
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">Alamat</label>
              <textarea
                rows={3}
                value={profileForm.alamat}
                onChange={(e) => setProfileForm({ ...profileForm, alamat: e.target.value })}
                className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8]"
            >
              Simpan Profil
            </button>
          </form>
        </div>
      )}

      {/* Modal Pengajuan Keringanan (Pengganti window.prompt) */}
      {reliefModalInvoiceId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <form
            onSubmit={handleReliefSubmit}
            className="bg-white border border-[#dce6f7] rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">Ajukan Keringanan Pembayaran</h2>
              <button
                type="button"
                onClick={() => setReliefModalInvoiceId(null)}
                className="p-1.5 rounded-lg hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#475d85]">
              Pengajuan keringanan atau penundaan pembayaran akan diteruskan untuk persetujuan Pemilik.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">Jenis Pengajuan</label>
              <select
                value={reliefType}
                onChange={(e) => setReliefType(e.target.value as ReliefType)}
                className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
              >
                <option value="Penundaan Jatuh Tempo">Penundaan Jatuh Tempo</option>
                <option value="Keringanan Nominal">Keringanan Nominal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">Alasan Pengajuan</label>
              <textarea
                rows={3}
                required
                value={reliefReason}
                onChange={(e) => setReliefReason(e.target.value)}
                placeholder="Jelaskan alasan atau tanggal rencana pembayaran..."
                className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReliefModalInvoiceId(null)}
                className="px-4 py-2 rounded-lg border border-[#cbd9f2] text-sm font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8]"
              >
                Kirim Pengajuan
              </button>
            </div>
          </form>
        </div>
      )}

      <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
    </DashboardShell>
  );
}
