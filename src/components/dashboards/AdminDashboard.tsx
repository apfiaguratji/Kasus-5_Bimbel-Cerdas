import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CreditCard,
  Download,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Pencil,
  PhoneCall,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext.tsx';
import { TEST_ACCOUNTS_BY_ROLE } from '../../data/seedData.ts';
import {
  computeClassStatus,
  formatRupiah,
  MAX_CLASS_CAPACITY,
  MIN_CLASS_STUDENTS,
  MONTH_NAMES_ID,
  REGISTRATION_FEE,
  SESSION_DURATION_MINUTES,
} from '../../lib/businessRules.ts';
import type {
  FollowupStatus,
  HariBelajar,
  InvoiceStatus,
  Jenjang,
  PaymentMethod,
  Receipt,
  Student,
  StudentStatus,
  UserRole,
} from '../../types.ts';
import { DashboardShell, type NavItem } from '../DashboardShell.tsx';
import { ReceiptModal } from '../ReceiptModal.tsx';
import { StatusText } from '../StatusText.tsx';

export function AdminDashboard() {
  const {
    usersList,
    programs,
    tutors,
    classes,
    schedules,
    students,
    registrations,
    waitlists,
    studentAttendance,
    tutorAttendance,
    invoices,
    payments,
    receipts,
    followups,
    featureFlags,
    isFeatureEnabled,
    toggleFeatureFlag,
    recordInvoicePayment,
    markInvoiceOverdue,
    generateMonthlyInvoices,
    confirmRegistrationPayment,
    updateStudentAdmin,
    promoteWaitlistStudent,
    cancelWaitlist,
    updateFollowupCall,
    updateUserRole,
    saveProgram,
    deleteProgram,
    saveTutor,
    deleteTutor,
    saveClass,
    deleteClass,
    saveSchedule,
    deleteSchedule,
    addToast,
  } = useAppData();

  const openFollowupsCount = followups.filter((f) => f.statusTindakLanjut !== 'Selesai').length;
  const openWaitlistCount = waitlists.filter((w) => w.statusAntrean === 'Menunggu').length;
  const unpaidCount = invoices.filter((i) => i.statusTagihan !== 'Lunas').length;
  const activeBetaCount = featureFlags.filter((f) => isFeatureEnabled(f.key)).length;

  const navItems: NavItem[] = [
    { id: 'ringkasan', label: 'Ringkasan Operasional', icon: LayoutDashboard },
    { id: 'siswa', label: 'Siswa & Pendaftaran', icon: Users },
    { id: 'waitlist', label: 'Daftar Tunggu', icon: UserCheck, badge: openWaitlistCount },
    { id: 'pembayaran', label: 'Pembayaran & Kuitansi', icon: CreditCard, badge: unpaidCount },
    { id: 'tindak', label: 'Tindak Lanjut Bolos', icon: PhoneCall, badge: openFollowupsCount },
    { id: 'master', label: 'Program, Kelas & Jadwal', icon: BookOpen },
    { id: 'akun', label: 'Akun & Hak Akses', icon: Shield },
    { id: 'beta', label: 'Fitur Beta (Flags)', icon: FlaskConical, badge: activeBetaCount },
  ];

  const [tab, setTab] = useState('ringkasan');
  const [searchStudent, setSearchStudent] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | InvoiceStatus>('');
  const [isBulkUpdatingOverdue, setIsBulkUpdatingOverdue] = useState(false);
  const [paymentMethodMap, setPaymentMethodMap] = useState<Record<string, PaymentMethod>>({});
  const [regMethodMap, setRegMethodMap] = useState<Record<string, PaymentMethod>>({});
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [followupNotes, setFollowupNotes] = useState<Record<string, string>>({});
  const [followupStatusMap, setFollowupStatusMap] = useState<Record<string, FollowupStatus>>({});
  const [promoteTargetClass, setPromoteTargetClass] = useState<Record<string, string>>({});

  // Invoice generator state
  const [genBulan, setGenBulan] = useState<number>(new Date().getMonth() + 1);
  const [genTahun, setGenTahun] = useState<number>(new Date().getFullYear());

  // Edit Student modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentEditForm, setStudentEditForm] = useState({
    namaSiswa: '',
    asalSekolah: '',
    idKelas: '',
    statusSiswa: 'Aktif' as StudentStatus,
  });

  // User Role draft state
  const [userDrafts, setUserDrafts] = useState<
    Record<string, { role: UserRole; linkedTutorId: string; statusAktif: boolean }>
  >({});

  // Master Data state
  const [masterTab, setMasterTab] = useState<'program' | 'kelas' | 'tutor' | 'jadwal'>('program');
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  const [progForm, setProgForm] = useState({
    namaProgram: '',
    jenjang: 'SD' as Jenjang,
    biayaSpp: 300000,
    biayaPendaftaran: REGISTRATION_FEE,
    frekuensiMingguan: 2,
    durasiMenit: SESSION_DURATION_MINUTES,
    deskripsi: '',
  });
  const [tutorForm, setTutorForm] = useState({
    namaTutor: '',
    email: '',
    noTelepon: '',
    alamat: '',
    bidangKeahlian: '',
    statusAktif: true,
  });
  const [classForm, setClassForm] = useState({
    idProgram: programs[0]?.id || '',
    namaKelas: '',
    kapasitasMaksimal: MAX_CLASS_CAPACITY,
    jumlahMinimal: MIN_CLASS_STUDENTS,
    jumlahTerisi: 0,
  });
  const [scheduleForm, setScheduleForm] = useState({
    idKelas: classes[0]?.id || '',
    idTutor: tutors[0]?.id || '',
    hari: 'Senin' as HariBelajar,
    jamMulai: '15:00',
    jamSelesai: '16:30',
    durasiMenit: SESSION_DURATION_MINUTES,
    ruangan: 'Ruang 1',
  });

  const filteredStudents = useMemo(() => {
    const q = searchStudent.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.namaSiswa.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q) ||
        s.namaKelas.toLowerCase().includes(q)
    );
  }, [students, searchStudent]);

  const filteredInvoices = useMemo(
    () => invoices.filter((i) => !statusFilter || i.statusTagihan === statusFilter),
    [invoices, statusFilter]
  );

  const resetMasterForms = () => {
    setEditingId(undefined);
    setProgForm({
      namaProgram: '',
      jenjang: 'SD',
      biayaSpp: 300000,
      biayaPendaftaran: REGISTRATION_FEE,
      frekuensiMingguan: 2,
      durasiMenit: SESSION_DURATION_MINUTES,
      deskripsi: '',
    });
    setTutorForm({
      namaTutor: '',
      email: '',
      noTelepon: '',
      alamat: '',
      bidangKeahlian: '',
      statusAktif: true,
    });
    setClassForm({
      idProgram: programs[0]?.id || '',
      namaKelas: '',
      kapasitasMaksimal: MAX_CLASS_CAPACITY,
      jumlahMinimal: MIN_CLASS_STUDENTS,
      jumlahTerisi: 0,
    });
    setScheduleForm({
      idKelas: classes[0]?.id || '',
      idTutor: tutors[0]?.id || '',
      hari: 'Senin',
      jamMulai: '15:00',
      jamSelesai: '16:30',
      durasiMenit: SESSION_DURATION_MINUTES,
      ruangan: 'Ruang 1',
    });
  };

  const handleSaveMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (masterTab === 'program') {
      await saveProgram({ ...progForm, id: editingId });
    } else if (masterTab === 'tutor') {
      await saveTutor({ ...tutorForm, id: editingId });
    } else if (masterTab === 'kelas') {
      const prog = programs.find((p) => p.id === classForm.idProgram);
      if (!prog) return addToast('error', 'Pilih program terlebih dahulu');
      const statusKelas = computeClassStatus(
        classForm.jumlahTerisi,
        classForm.kapasitasMaksimal,
        classForm.jumlahMinimal
      );
      await saveClass({
        id: editingId,
        idProgram: prog.id,
        namaProgram: prog.namaProgram,
        jenjang: prog.jenjang,
        namaKelas: classForm.namaKelas,
        kapasitasMaksimal: classForm.kapasitasMaksimal,
        jumlahMinimal: classForm.jumlahMinimal,
        jumlahTerisi: classForm.jumlahTerisi,
        statusKelas,
      });
    } else {
      const cls = classes.find((c) => c.id === scheduleForm.idKelas);
      const tut = tutors.find((t) => t.id === scheduleForm.idTutor);
      if (!cls || !tut) return addToast('error', 'Pilih kelas dan tutor terlebih dahulu');
      await saveSchedule({
        id: editingId,
        idKelas: cls.id,
        namaKelas: cls.namaKelas,
        idTutor: tut.id,
        namaTutor: tut.namaTutor,
        hari: scheduleForm.hari,
        jamMulai: scheduleForm.jamMulai,
        jamSelesai: scheduleForm.jamSelesai,
        durasiMenit: scheduleForm.durasiMenit,
        ruangan: scheduleForm.ruangan,
      });
    }
    resetMasterForms();
  };

  return (
    <DashboardShell navItems={navItems} activeTab={tab} onSelectTab={setTab}>
      {tab === 'ringkasan' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Ringkasan Operasional Admin
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Pantau siswa aktif, antrean daftar tunggu, tagihan SPP, dan panggilan tindak lanjut.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Total Siswa Terdaftar</p>
              <p className="text-2xl font-display font-semibold mt-1 tabular-nums">{students.length}</p>
            </div>
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Antrean Daftar Tunggu</p>
              <p className="text-2xl font-display font-semibold mt-1 tabular-nums text-[#d97706]">
                {openWaitlistCount}
              </p>
            </div>
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Tagihan Belum Lunas</p>
              <p className="text-2xl font-display font-semibold mt-1 tabular-nums text-[#dc2626]">
                {unpaidCount}
              </p>
            </div>
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Tindak Lanjut Bolos 3×</p>
              <p className="text-2xl font-display font-semibold mt-1 tabular-nums text-[#dc2626]">
                {openFollowupsCount}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">Rekap Keterisian Kelas</h2>
              <span className="text-xs text-[#566b94]">Min. 3 siswa · Maks. 8 siswa</span>
            </div>
            <div className="divide-y divide-[#e8f0fb]">
              {classes.map((cls) => (
                <div key={cls.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0b1e4b]">{cls.namaKelas}</p>
                    <p className="text-xs text-[#566b94]">{cls.namaProgram}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-36 h-2 rounded-full bg-[#e6eefc] overflow-hidden">
                      <div
                        className="h-full bg-[#2563eb]"
                        style={{
                          width: `${Math.min(100, (cls.jumlahTerisi / cls.kapasitasMaksimal) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs tabular-nums w-12 text-right">
                      {cls.jumlahTerisi}/{cls.kapasitasMaksimal}
                    </span>
                    <StatusText status={cls.statusKelas} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rekap Data Operasional (SRS D.4) */}
          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e8f0fb] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-display font-semibold">Rekap Data Operasional per Jenjang</h2>
                <p className="text-xs text-[#566b94]">
                  Tingkat kehadiran siswa keseluruhan:{' '}
                  <strong className="font-mono text-[#2563eb] tabular-nums">
                    {studentAttendance.length > 0
                      ? `${Math.round(
                          (studentAttendance.filter((a) => a.statusKehadiran === 'Hadir').length /
                            studentAttendance.length) *
                            100
                        )}%`
                      : '0%'}
                  </strong>{' '}
                  ({studentAttendance.filter((a) => a.statusKehadiran === 'Hadir').length}/
                  {studentAttendance.length} catatan) · {tutorAttendance.filter((t) => t.statusHadir).length} sesi tutor terlaksana
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const jenjangList: Jenjang[] = ['SD', 'SMP', 'SMA', 'UTBK'];
                  const rows = [
                    ['Jenjang', 'Siswa Aktif', 'Daftar Tunggu', 'Jumlah Kelas', 'Kelas Aktif/Penuh'],
                    ...jenjangList.map((j) => [
                      j,
                      String(students.filter((s) => s.jenjang === j && s.statusSiswa === 'Aktif').length),
                      String(students.filter((s) => s.jenjang === j && s.statusSiswa === 'Daftar Tunggu').length),
                      String(classes.filter((c) => c.jenjang === j).length),
                      String(
                        classes.filter(
                          (c) => c.jenjang === j && (c.statusKelas === 'Aktif' || c.statusKelas === 'Penuh')
                        ).length
                      ),
                    ]),
                  ];
                  const csv = rows.map((r) => r.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'rekap-operasional-bimbel-cerdas.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#cbd9f2] text-xs font-medium text-[#0b1e4b] hover:bg-[#eff5ff] self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Rekap CSV</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                    <th className="py-3 px-5">Jenjang</th>
                    <th className="py-3 px-5 text-right">Siswa Aktif</th>
                    <th className="py-3 px-5 text-right">Menunggu / Antre</th>
                    <th className="py-3 px-5 text-right">Total Kelas</th>
                    <th className="py-3 px-5 text-right">Kelas Aktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8f0fb]">
                  {(['SD', 'SMP', 'SMA', 'UTBK'] as Jenjang[]).map((j) => {
                    const jStudents = students.filter((s) => s.jenjang === j);
                    const jClasses = classes.filter((c) => c.jenjang === j);
                    return (
                      <tr key={j} className="hover:bg-[#f8fbff]">
                        <td className="py-3 px-5 font-semibold">{j}</td>
                        <td className="py-3 px-5 text-right font-mono tabular-nums">
                          {jStudents.filter((s) => s.statusSiswa === 'Aktif').length}
                        </td>
                        <td className="py-3 px-5 text-right font-mono tabular-nums">
                          {jStudents.filter((s) => s.statusSiswa !== 'Aktif' && s.statusSiswa !== 'Nonaktif').length}
                        </td>
                        <td className="py-3 px-5 text-right font-mono tabular-nums">{jClasses.length}</td>
                        <td className="py-3 px-5 text-right font-mono tabular-nums text-[#2563eb]">
                          {jClasses.filter((c) => c.statusKelas === 'Aktif' || c.statusKelas === 'Penuh').length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {isFeatureEnabled('betaAnalyticsForecast') && (
            <div className="bg-white border border-[#bfd4fb] rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2563eb]" />
                  <h2 className="font-semibold text-[#0b1e4b]">
                    Prediksi Kapasitas & Risiko Kelas
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-[#eff5ff] border border-[#bfd4fb] text-[11px] font-semibold text-[#2563eb]">
                    BETA ADMIN
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('master')}
                  className="text-xs font-medium text-[#2563eb] hover:underline inline-flex items-center gap-1"
                >
                  <span>Kelola Kelas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {(() => {
                const totalCap = classes.reduce((sum, c) => sum + c.kapasitasMaksimal, 0);
                const totalFilled = classes.reduce((sum, c) => sum + c.jumlahTerisi, 0);
                const occupancyPct = totalCap > 0 ? Math.round((totalFilled / totalCap) * 100) : 0;
                const nearFull = classes.filter(
                  (c) => c.kapasitasMaksimal > 0 && c.jumlahTerisi / c.kapasitasMaksimal >= 0.75
                );
                const underMin = classes.filter((c) => c.jumlahTerisi < c.jumlahMinimal);
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-[#f8fbff] border border-[#dce6f7] p-4">
                      <p className="text-xs text-[#566b94]">Okupansi Kursi Keseluruhan</p>
                      <p className="text-2xl font-display font-semibold text-[#0b1e4b] mt-1 tabular-nums">
                        {occupancyPct}%
                      </p>
                      <p className="text-xs text-[#475d85] mt-1">
                        {totalFilled} dari {totalCap} kapasitas kursi terisi
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#fffbeb] border border-[#fde68a] p-4">
                      <p className="text-xs text-[#92400e] font-medium">Mendekati Penuh (≥75%)</p>
                      <p className="text-2xl font-display font-semibold text-[#b45309] mt-1 tabular-nums">
                        {nearFull.length} Kelas
                      </p>
                      <p className="text-xs text-[#92400e] mt-1 truncate">
                        {nearFull.length > 0
                          ? `Siapkan paralel: ${nearFull.map((c) => c.namaKelas).join(', ')}`
                          : 'Belum ada kelas mendekati batas kapasitas.'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#fef2f2] border border-[#fecaca] p-4">
                      <p className="text-xs text-[#991b1b] font-medium">Di Bawah Kuota Minimal</p>
                      <p className="text-2xl font-display font-semibold text-[#dc2626] mt-1 tabular-nums">
                        {underMin.length} Kelas
                      </p>
                      <p className="text-xs text-[#991b1b] mt-1 truncate">
                        {underMin.length > 0
                          ? `Perlu rekrutmen: ${underMin.map((c) => c.namaKelas).join(', ')}`
                          : 'Semua kelas memenuhi kuota minimal.'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {isFeatureEnabled('betaCompactAuditStream') && (
            <div className="bg-white border border-[#bfd4fb] rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2563eb]" />
                  <h2 className="font-semibold text-[#0b1e4b]">
                    Linimasa Aktivitas Operasional Terkini
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-[#eff5ff] border border-[#bfd4fb] text-[11px] font-semibold text-[#2563eb]">
                    BETA ADMIN
                  </span>
                </div>
                <span className="text-xs text-[#566b94]">Gabungan Pendaftaran, Pembayaran & Tindak Lanjut</span>
              </div>
              {(() => {
                const events = [
                  ...payments.slice(0, 4).map((p) => ({
                    id: `pay-${p.id}`,
                    title: `Pembayaran ${p.jenisPembayaran} • ${p.namaSiswa}`,
                    detail: `${formatRupiah(p.jumlahBayar)} (${p.metodeBayar})`,
                    date: p.tanggalBayar,
                    targetTab: 'pembayaran',
                    tone: 'text-[#2563eb] bg-[#eff5ff]',
                  })),
                  ...registrations.slice(0, 4).map((r) => ({
                    id: `reg-${r.id}`,
                    title: `Pendaftaran ${r.namaSiswa}`,
                    detail: `${r.namaProgram} • ${r.statusPendaftaran}`,
                    date: r.tanggalDaftar,
                    targetTab: 'siswa',
                    tone: 'text-[#0b1e4b] bg-[#f1f5f9]',
                  })),
                  ...followups
                    .filter((f) => f.statusTindakLanjut !== 'Selesai')
                    .slice(0, 4)
                    .map((f) => ({
                      id: `fu-${f.id}`,
                      title: `Tindak Lanjut Bolos • ${f.namaSiswa}`,
                      detail: `${f.jumlahAbsenBeruntun}x tidak hadir • ${f.statusTindakLanjut}`,
                      date: f.tanggalPemicu,
                      targetTab: 'tindak',
                      tone: 'text-[#d97706] bg-[#fffbeb]',
                    })),
                ]
                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                  .slice(0, 6);

                if (events.length === 0) {
                  return <p className="text-sm text-[#566b94]">Belum ada aktivitas operasional tercatat.</p>;
                }

                return (
                  <div className="divide-y divide-[#e8f0fb]">
                    {events.map((ev) => (
                      <div key={ev.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#0b1e4b] truncate">{ev.title}</p>
                          <p className="text-xs text-[#566b94] truncate">{ev.detail}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${ev.tone}`}>
                            {ev.date}
                          </span>
                          <button
                            type="button"
                            onClick={() => setTab(ev.targetTab)}
                            className="text-xs font-medium text-[#2563eb] hover:underline"
                          >
                            Buka
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {tab === 'siswa' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
                Manajemen Siswa & Pendaftaran
              </h1>
              <p className="text-sm text-[#475d85] mt-1">
                Kelola profil siswa dan konfirmasi pembayaran biaya pendaftaran Rp100.000.
              </p>
            </div>
            <input
              type="search"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Cari siswa, orang tua, atau kelas..."
              className="rounded-lg border border-[#cbd9f2] bg-white px-3.5 py-2 text-sm sm:w-72"
            />
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e8f0fb]">
              <h2 className="text-base font-semibold">Direktori Siswa</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                    <th className="py-3 px-5">Nama Siswa</th>
                    <th className="py-3 px-5">Orang Tua & Kontak</th>
                    <th className="py-3 px-5">Program & Kelas</th>
                    <th className="py-3 px-5">Urutan</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8f0fb]">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-[#f8fbff]">
                      <td className="py-3.5 px-5">
                        <p className="font-semibold">{s.namaSiswa}</p>
                        <p className="text-xs text-[#566b94]">{s.asalSekolah}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <p>{s.parentName}</p>
                        <p className="text-xs font-mono text-[#566b94]">{s.parentPhone || '-'}</p>
                      </td>
                      <td className="py-3.5 px-5">
                        <p>{s.namaKelas}</p>
                        <p className="text-xs text-[#566b94]">{s.namaProgram}</p>
                      </td>
                      <td className="py-3.5 px-5 text-xs">
                        Anak ke-{s.urutanAnak} {s.urutanAnak >= 2 ? '(Diskon 10%)' : ''}
                      </td>
                      <td className="py-3.5 px-5">
                        <StatusText status={s.statusSiswa} />
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingStudent(s);
                            setStudentEditForm({
                              namaSiswa: s.namaSiswa,
                              asalSekolah: s.asalSekolah,
                              idKelas: s.idKelas,
                              statusSiswa: s.statusSiswa,
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#cbd9f2] text-xs font-medium text-[#2563eb] hover:bg-[#eff5ff]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Ubah</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e8f0fb]">
              <h2 className="text-base font-semibold">Pendaftaran & Biaya Registrasi (Rp100.000)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                    <th className="py-3 px-5">Tanggal</th>
                    <th className="py-3 px-5">Siswa</th>
                    <th className="py-3 px-5">Kelas Tujuan</th>
                    <th className="py-3 px-5">Status Kelas</th>
                    <th className="py-3 px-5">Biaya Daftar</th>
                    <th className="py-3 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8f0fb]">
                  {registrations.map((reg) => {
                    const regMethod = regMethodMap[reg.id] || 'Transfer Bank';
                    const regRec = receipts.find((r) => r.idTagihan === reg.id);
                    return (
                      <tr key={reg.id} className="hover:bg-[#f8fbff]">
                        <td className="py-3.5 px-5 font-mono text-xs tabular-nums">{reg.tanggalDaftar}</td>
                        <td className="py-3.5 px-5 font-medium">{reg.namaSiswa}</td>
                        <td className="py-3.5 px-5">{reg.namaKelas}</td>
                        <td className="py-3.5 px-5">
                          <StatusText status={reg.statusPendaftaran} />
                        </td>
                        <td className="py-3.5 px-5">
                          <StatusText status={reg.statusBayarDaftar} />
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          {reg.statusBayarDaftar === 'Belum Bayar' ? (
                            <div className="inline-flex items-center gap-2">
                              <select
                                value={regMethod}
                                onChange={(e) =>
                                  setRegMethodMap({
                                    ...regMethodMap,
                                    [reg.id]: e.target.value as PaymentMethod,
                                  })
                                }
                                className="rounded-lg border border-[#cbd9f2] px-2 py-1.5 text-xs"
                              >
                                <option value="Transfer Bank">Transfer Bank</option>
                                <option value="QRIS">QRIS</option>
                                <option value="Tunai">Tunai</option>
                              </select>
                              <button
                                onClick={async () => {
                                  const createdRec = await confirmRegistrationPayment(reg.id, regMethod);
                                  if (createdRec) setActiveReceipt(createdRec);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-medium hover:bg-[#1d4ed8] whitespace-nowrap"
                              >
                                Lunaskan Daftar (Rp100rb)
                              </button>
                            </div>
                          ) : (
                            regRec && (
                              <button
                                onClick={() => setActiveReceipt(regRec)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#cbd9f2] text-xs font-medium text-[#2563eb] hover:bg-[#eff5ff]"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Kuitansi ({regRec.nomorKuitansi})</span>
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'waitlist' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Manajemen Daftar Tunggu
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Siswa yang mendaftar pada kelas berkapasitas penuh (8/8) dapat ditempatkan saat ada slot atau kelas baru.
            </p>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            {waitlists.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#566b94]">Belum ada antrean daftar tunggu.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                      <th className="py-3 px-5">Urutan</th>
                      <th className="py-3 px-5">Siswa</th>
                      <th className="py-3 px-5">Kelas Asal</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5 text-right">Penempatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8f0fb]">
                    {waitlists.map((w) => {
                      const availableClasses = classes.filter(
                        (c) => c.idProgram === w.idProgram && c.jumlahTerisi < c.kapasitasMaksimal
                      );
                      const chosenId = promoteTargetClass[w.id] || availableClasses[0]?.id || '';
                      return (
                        <tr key={w.id} className="hover:bg-[#f8fbff]">
                          <td className="py-3.5 px-5 font-mono tabular-nums">#{w.urutanAntrean}</td>
                          <td className="py-3.5 px-5 font-semibold">{w.namaSiswa}</td>
                          <td className="py-3.5 px-5">{w.namaKelas}</td>
                          <td className="py-3.5 px-5">
                            <StatusText status={w.statusAntrean} />
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            {w.statusAntrean === 'Menunggu' && (
                              <div className="inline-flex items-center gap-2">
                                <select
                                  value={chosenId}
                                  onChange={(e) =>
                                    setPromoteTargetClass({ ...promoteTargetClass, [w.id]: e.target.value })
                                  }
                                  className="rounded-lg border border-[#cbd9f2] px-2.5 py-1.5 text-xs"
                                >
                                  {availableClasses.length === 0 ? (
                                    <option value="">Belum ada slot kosong</option>
                                  ) : (
                                    availableClasses.map((ac) => (
                                      <option key={ac.id} value={ac.id}>
                                        {ac.namaKelas} ({ac.jumlahTerisi}/{ac.kapasitasMaksimal})
                                      </option>
                                    ))
                                  )}
                                </select>
                                <button
                                  disabled={!chosenId}
                                  onClick={() => promoteWaitlistStudent(w.id, chosenId)}
                                  className="px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-medium hover:bg-[#1d4ed8] disabled:opacity-50 whitespace-nowrap"
                                >
                                  Tempatkan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => cancelWaitlist(w.id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-[#e3baba] text-xs font-medium text-[#dc2626] hover:bg-[#fef2f2] whitespace-nowrap"
                                >
                                  Batalkan
                                </button>
                              </div>
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

      {tab === 'pembayaran' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
                Pembayaran SPP, Tunggakan & Kuitansi
              </h1>
              <p className="text-sm text-[#475d85] mt-1">
                Catat pembayaran SPP dan terbitkan kuitansi digital yang dapat dicetak kapan saja.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#e6eefc] rounded-lg self-start">
              {(['', 'Belum Bayar', 'Tunggakan', 'Lunas'] as const).map((st) => (
                <button
                  key={st || 'all'}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-[#0b1e4b] shadow-sm'
                      : 'text-[#374f7d] hover:text-[#0b1e4b]'
                  }`}
                >
                  {st || 'Semua'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#0b1e4b]">Terbitkan Tagihan SPP Bulanan</p>
              <p className="text-xs text-[#566b94]">
                Otomatis menghitung tarif jenjang (SD Rp300rb, SMP Rp400rb, SMA/UTBK Rp600rb) & diskon anak ke-2+ (10%).
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                aria-label="Bulan tagihan"
                value={genBulan}
                onChange={(e) => setGenBulan(Number(e.target.value))}
                className="rounded-lg border border-[#cbd9f2] px-2.5 py-1.5 text-xs bg-white"
              >
                {MONTH_NAMES_ID.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                aria-label="Tahun tagihan"
                value={genTahun}
                onChange={(e) => setGenTahun(Number(e.target.value))}
                className="rounded-lg border border-[#cbd9f2] px-2.5 py-1.5 text-xs font-mono bg-white"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => generateMonthlyInvoices(genBulan, genTahun)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-semibold hover:bg-[#1d4ed8] whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Tagihan SPP</span>
              </button>
            </div>
          </div>

          {isFeatureEnabled('betaBulkBillingActions') && (
            <div className="bg-[#eff5ff] border border-[#bfd4fb] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2563eb]" />
                  <p className="text-sm font-semibold text-[#0b1e4b]">
                    Aksi Penagihan Massal SPP
                  </p>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-[#bfd4fb] text-[11px] font-semibold text-[#2563eb]">
                    BETA ADMIN
                  </span>
                </div>
                <p className="text-xs text-[#475d85] mt-1">
                  Total nominal belum lunas pada tampilan filter:{' '}
                  <span className="font-mono font-semibold text-[#0b1e4b]">
                    {formatRupiah(
                      filteredInvoices
                        .filter((i) => i.statusTagihan !== 'Lunas')
                        .reduce((sum, i) => sum + i.jumlahTagihan, 0)
                    )}
                  </span>{' '}
                  ({filteredInvoices.filter((i) => i.statusTagihan === 'Belum Bayar').length} tagihan berstatus Belum Bayar).
                </p>
              </div>
              <button
                type="button"
                disabled={
                  isBulkUpdatingOverdue ||
                  filteredInvoices.filter((i) => i.statusTagihan === 'Belum Bayar').length === 0
                }
                onClick={async () => {
                  const targets = filteredInvoices.filter((i) => i.statusTagihan === 'Belum Bayar');
                  if (targets.length === 0) return;
                  setIsBulkUpdatingOverdue(true);
                  try {
                    for (const inv of targets) {
                      await markInvoiceOverdue(inv.id);
                    }
                    addToast(
                      'success',
                      `${targets.length} tagihan Belum Bayar berhasil ditandai menjadi Tunggakan.`
                    );
                  } finally {
                    setIsBulkUpdatingOverdue(false);
                  }
                }}
                className="px-3.5 py-2 rounded-lg bg-[#d97706] text-white text-xs font-semibold hover:bg-[#b45309] disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isBulkUpdatingOverdue
                  ? 'Memproses...'
                  : 'Tandai Semua Belum Bayar → Tunggakan'}
              </button>
            </div>
          )}

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                    <th className="py-3 px-5">Siswa</th>
                    <th className="py-3 px-5">Periode</th>
                    <th className="py-3 px-5 text-right">Nominal</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8f0fb]">
                  {filteredInvoices.map((inv) => {
                    const method = paymentMethodMap[inv.id] || 'Transfer Bank';
                    const rec = receipts.find((r) => r.idTagihan === inv.id);
                    return (
                      <tr key={inv.id} className="hover:bg-[#f8fbff]">
                        <td className="py-3.5 px-5">
                          <p className="font-semibold">{inv.namaSiswa}</p>
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
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          {inv.statusTagihan !== 'Lunas' ? (
                            <div className="inline-flex items-center gap-2">
                              <select
                                value={method}
                                onChange={(e) =>
                                  setPaymentMethodMap({
                                    ...paymentMethodMap,
                                    [inv.id]: e.target.value as PaymentMethod,
                                  })
                                }
                                className="rounded-lg border border-[#cbd9f2] px-2 py-1.5 text-xs"
                              >
                                <option value="Transfer Bank">Transfer Bank</option>
                                <option value="QRIS">QRIS</option>
                                <option value="Tunai">Tunai</option>
                              </select>
                              <button
                                onClick={async () => {
                                  const createdRec = await recordInvoicePayment(inv.id, method);
                                  setActiveReceipt(createdRec);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-medium hover:bg-[#1d4ed8]"
                              >
                                Catat Lunas
                              </button>
                              {inv.statusTagihan === 'Belum Bayar' && (
                                <button
                                  onClick={() => markInvoiceOverdue(inv.id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-[#e3baba] text-xs font-medium text-[#dc2626] hover:bg-[#fef2f2]"
                                >
                                  Tandai Tunggakan
                                </button>
                              )}
                            </div>
                          ) : (
                            rec && (
                              <button
                                onClick={() => setActiveReceipt(rec)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#cbd9f2] text-xs font-medium text-[#2563eb] hover:bg-[#eff5ff]"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Kuitansi ({rec.nomorKuitansi})</span>
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'tindak' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Tindak Lanjut Ketidakhadiran Siswa
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Otomatis muncul saat siswa tidak hadir 3 kali berturut-turut untuk ditelepon dan dicatat hasilnya.
            </p>
          </div>

          {followups.length === 0 ? (
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-8 text-center text-sm text-[#566b94]">
              Tidak ada siswa yang memerlukan tindak lanjut ketidakhadiran.
            </div>
          ) : (
            <div className="space-y-4">
              {followups.map((fu) => {
                const st = followupStatusMap[fu.id] || fu.statusTindakLanjut;
                const note = followupNotes[fu.id] ?? fu.hasilPanggilan ?? '';
                return (
                  <div key={fu.id} className="bg-white border border-[#dce6f7] rounded-2xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#566b94]">
                          Pemicu: {fu.tanggalPemicu} · {fu.jumlahAbsenBeruntun}× tidak hadir beruntun
                        </p>
                        <h2 className="text-xl font-display font-semibold text-[#0b1e4b]">
                          {fu.namaSiswa}
                        </h2>
                        <p className="text-sm text-[#374f7d]">
                          Orang tua: <span className="font-medium">{fu.namaParent}</span> · Telepon:{' '}
                          <span className="font-mono font-semibold text-[#2563eb]">
                            {fu.noTeleponParent}
                          </span>
                        </p>
                      </div>
                      <StatusText status={fu.statusTindakLanjut} />
                    </div>

                    {fu.statusTindakLanjut === 'Selesai' ? (
                      <div className="rounded-lg bg-[#eff5ff] border border-[#dce6f7] p-3.5 text-sm">
                        <p className="text-xs font-semibold text-[#2563eb]">
                          Hasil Panggilan ({fu.tanggalTindakLanjut} · {fu.ditindakOleh})
                        </p>
                        <p className="mt-1 text-[#0b1e4b]">{fu.hasilPanggilan}</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-semibold text-[#374f7d] mb-1">
                            Status Panggilan
                          </label>
                          <select
                            value={st}
                            onChange={(e) =>
                              setFollowupStatusMap({
                                ...followupStatusMap,
                                [fu.id]: e.target.value as FollowupStatus,
                              })
                            }
                            className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                          >
                            <option value="Menunggu Telepon">Menunggu Telepon</option>
                            <option value="Sedang Dihubungi">Sedang Dihubungi</option>
                            <option value="Selesai">Selesai</option>
                          </select>
                        </div>
                        <div className="sm:col-span-6">
                          <label className="block text-xs font-semibold text-[#374f7d] mb-1">
                            Catatan Hasil Panggilan ke Orang Tua
                          </label>
                          <input
                            type="text"
                            value={note}
                            onChange={(e) =>
                              setFollowupNotes({ ...followupNotes, [fu.id]: e.target.value })
                            }
                            placeholder="Contoh: Anak sakit 3 hari, akan masuk kembali minggu depan"
                            className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <button
                            onClick={() => updateFollowupCall(fu.id, st === 'Menunggu Telepon' ? 'Selesai' : st, note || 'Sudah dihubungi')}
                            className="w-full py-2 px-4 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8]"
                          >
                            Simpan Catatan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'master' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
                Manajemen Program, Kelas, Tutor & Jadwal
              </h1>
              <p className="text-sm text-[#475d85] mt-1">
                Menggunakan pilihan relasi nama langsung tanpa input ID manual.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#e6eefc] rounded-lg self-start">
              {(['program', 'kelas', 'tutor', 'jadwal'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMasterTab(m);
                    resetMasterForms();
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize whitespace-nowrap ${
                    masterTab === m ? 'bg-white text-[#0b1e4b] shadow-sm' : 'text-[#374f7d]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveMaster} className="bg-white border border-[#dce6f7] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold">
              {editingId ? 'Ubah Data' : 'Tambah Data'} {masterTab}
            </h2>

            {masterTab === 'program' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Nama Program</label>
                  <input
                    required
                    value={progForm.namaProgram}
                    onChange={(e) => setProgForm({ ...progForm, namaProgram: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Jenjang</label>
                  <select
                    value={progForm.jenjang}
                    onChange={(e) => setProgForm({ ...progForm, jenjang: e.target.value as Jenjang })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  >
                    <option value="SD">SD (Rp300.000)</option>
                    <option value="SMP">SMP (Rp400.000)</option>
                    <option value="SMA">SMA (Rp600.000)</option>
                    <option value="UTBK">UTBK (Rp600.000)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Biaya SPP / Bulan</label>
                  <input
                    type="number"
                    required
                    value={progForm.biayaSpp}
                    onChange={(e) => setProgForm({ ...progForm, biayaSpp: Number(e.target.value) })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Deskripsi Singkat</label>
                  <input
                    required
                    value={progForm.deskripsi}
                    onChange={(e) => setProgForm({ ...progForm, deskripsi: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {masterTab === 'tutor' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Nama Tutor</label>
                  <input
                    required
                    value={tutorForm.namaTutor}
                    onChange={(e) => setTutorForm({ ...tutorForm, namaTutor: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={tutorForm.email}
                    onChange={(e) => setTutorForm({ ...tutorForm, email: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">No. Telepon</label>
                  <input
                    required
                    value={tutorForm.noTelepon}
                    onChange={(e) => setTutorForm({ ...tutorForm, noTelepon: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Bidang Keahlian</label>
                  <input
                    required
                    value={tutorForm.bidangKeahlian}
                    onChange={(e) => setTutorForm({ ...tutorForm, bidangKeahlian: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {masterTab === 'kelas' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Program</label>
                  <select
                    required
                    value={classForm.idProgram}
                    onChange={(e) => setClassForm({ ...classForm, idProgram: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.namaProgram} ({p.jenjang})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Nama Kelas</label>
                  <input
                    required
                    value={classForm.namaKelas}
                    onChange={(e) => setClassForm({ ...classForm, namaKelas: e.target.value })}
                    placeholder="Contoh: UTBK-2 Malam"
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Kapasitas Maksimal</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={classForm.kapasitasMaksimal}
                    onChange={(e) =>
                      setClassForm({ ...classForm, kapasitasMaksimal: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Minimal Buka Kelas</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={classForm.jumlahMinimal}
                    onChange={(e) =>
                      setClassForm({ ...classForm, jumlahMinimal: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>
            )}

            {masterTab === 'jadwal' && (
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Kelas</label>
                  <select
                    required
                    value={scheduleForm.idKelas}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, idKelas: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.namaKelas} ({c.jenjang})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Tutor Pengajar</label>
                  <select
                    required
                    value={scheduleForm.idTutor}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, idTutor: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  >
                    {tutors.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.namaTutor}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Hari</label>
                  <select
                    value={scheduleForm.hari}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, hari: e.target.value as HariBelajar })
                    }
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  >
                    {(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const).map(
                      (h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={scheduleForm.jamMulai}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, jamMulai: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={scheduleForm.jamSelesai}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, jamSelesai: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Ruangan</label>
                  <input
                    value={scheduleForm.ruangan}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, ruangan: e.target.value })}
                    className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8]"
              >
                <Plus className="w-4 h-4" />
                <span>{editingId ? 'Simpan Perubahan' : 'Tambah Data'}</span>
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetMasterForms}
                  className="px-4 py-2 rounded-lg border border-[#cbd9f2] text-sm"
                >
                  Batal Edit
                </button>
              )}
            </div>
          </form>

          {/* Master Data Table */}
          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                    {masterTab === 'program' && (
                      <>
                        <th className="py-3 px-5">Program</th>
                        <th className="py-3 px-5">Jenjang</th>
                        <th className="py-3 px-5 text-right">SPP</th>
                      </>
                    )}
                    {masterTab === 'tutor' && (
                      <>
                        <th className="py-3 px-5">Nama Tutor</th>
                        <th className="py-3 px-5">Keahlian</th>
                        <th className="py-3 px-5">Telepon</th>
                      </>
                    )}
                    {masterTab === 'kelas' && (
                      <>
                        <th className="py-3 px-5">Kelas</th>
                        <th className="py-3 px-5">Program</th>
                        <th className="py-3 px-5">Kapasitas</th>
                        <th className="py-3 px-5">Status</th>
                      </>
                    )}
                    {masterTab === 'jadwal' && (
                      <>
                        <th className="py-3 px-5">Kelas</th>
                        <th className="py-3 px-5">Tutor</th>
                        <th className="py-3 px-5">Waktu</th>
                        <th className="py-3 px-5">Ruang</th>
                      </>
                    )}
                    <th className="py-3 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8f0fb]">
                  {masterTab === 'program' &&
                    programs.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-5 font-medium">{p.namaProgram}</td>
                        <td className="py-3 px-5">{p.jenjang}</td>
                        <td className="py-3 px-5 text-right font-mono tabular-nums">
                          {formatRupiah(p.biayaSpp)}
                        </td>
                        <td className="py-3 px-5 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => {
                              setEditingId(p.id);
                              setProgForm({
                                namaProgram: p.namaProgram,
                                jenjang: p.jenjang,
                                biayaSpp: p.biayaSpp,
                                biayaPendaftaran: p.biayaPendaftaran,
                                frekuensiMingguan: p.frekuensiMingguan,
                                durasiMenit: p.durasiMenit,
                                deskripsi: p.deskripsi,
                              });
                            }}
                            className="text-xs font-semibold text-[#2563eb] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteProgram(p.id)}
                            aria-label="Hapus program"
                            className="text-[#dc2626] hover:opacity-75 inline-flex align-middle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {masterTab === 'tutor' &&
                    tutors.map((t) => (
                      <tr key={t.id}>
                        <td className="py-3 px-5 font-medium">{t.namaTutor}</td>
                        <td className="py-3 px-5 text-[#475d85]">{t.bidangKeahlian}</td>
                        <td className="py-3 px-5 font-mono text-xs">{t.noTelepon}</td>
                        <td className="py-3 px-5 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => {
                              setEditingId(t.id);
                              setTutorForm({
                                namaTutor: t.namaTutor,
                                email: t.email,
                                noTelepon: t.noTelepon,
                                alamat: t.alamat || '',
                                bidangKeahlian: t.bidangKeahlian,
                                statusAktif: t.statusAktif,
                              });
                            }}
                            className="text-xs font-semibold text-[#2563eb] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTutor(t.id)}
                            aria-label="Hapus tutor"
                            className="text-[#dc2626] hover:opacity-75 inline-flex align-middle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {masterTab === 'kelas' &&
                    classes.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 px-5 font-medium">{c.namaKelas}</td>
                        <td className="py-3 px-5 text-[#475d85]">{c.namaProgram}</td>
                        <td className="py-3 px-5 font-mono text-xs tabular-nums">
                          {c.jumlahTerisi}/{c.kapasitasMaksimal}
                        </td>
                        <td className="py-3 px-5">
                          <StatusText status={c.statusKelas} />
                        </td>
                        <td className="py-3 px-5 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => {
                              setEditingId(c.id);
                              setClassForm({
                                idProgram: c.idProgram,
                                namaKelas: c.namaKelas,
                                kapasitasMaksimal: c.kapasitasMaksimal,
                                jumlahMinimal: c.jumlahMinimal,
                                jumlahTerisi: c.jumlahTerisi,
                              });
                            }}
                            className="text-xs font-semibold text-[#2563eb] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteClass(c.id)}
                            aria-label="Hapus kelas"
                            className="text-[#dc2626] hover:opacity-75 inline-flex align-middle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {masterTab === 'jadwal' &&
                    schedules.map((sc) => (
                      <tr key={sc.id}>
                        <td className="py-3 px-5 font-medium">{sc.namaKelas}</td>
                        <td className="py-3 px-5">{sc.namaTutor}</td>
                        <td className="py-3 px-5 text-xs">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#2563eb]" />
                            {sc.hari}, {sc.jamMulai}–{sc.jamSelesai}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-xs text-[#566b94]">{sc.ruangan || '-'}</td>
                        <td className="py-3 px-5 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => {
                              setEditingId(sc.id);
                              setScheduleForm({
                                idKelas: sc.idKelas,
                                idTutor: sc.idTutor,
                                hari: sc.hari,
                                jamMulai: sc.jamMulai,
                                jamSelesai: sc.jamSelesai,
                                durasiMenit: sc.durasiMenit,
                                ruangan: sc.ruangan || 'Ruang 1',
                              });
                            }}
                            className="text-xs font-semibold text-[#2563eb] hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSchedule(sc.id)}
                            aria-label="Hapus jadwal"
                            className="text-[#dc2626] hover:opacity-75 inline-flex align-middle"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'akun' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Manajemen Akun & Hak Akses Pengguna
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Atur peran pengguna (Orang Tua, Tutor, Admin, Pemilik) serta tautkan akun tutor ke profil pengajar.
            </p>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                    <th className="py-3 px-5">Pengguna</th>
                    <th className="py-3 px-5">Peran (Role)</th>
                    <th className="py-3 px-5">Tautan Profil Tutor</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8f0fb]">
                  {usersList.map((u) => {
                    const draft = userDrafts[u.uid] || {
                      role: u.role,
                      linkedTutorId: u.linkedTutorId || '',
                      statusAktif: u.statusAktif,
                    };
                    return (
                      <tr key={u.uid} className="hover:bg-[#f8fbff]">
                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-[#0b1e4b]">{u.nama}</p>
                          <p className="text-xs text-[#566b94]">{u.email}</p>
                        </td>
                        <td className="py-3.5 px-5">
                          <select
                            value={draft.role}
                            onChange={(e) =>
                              setUserDrafts({
                                ...userDrafts,
                                [u.uid]: { ...draft, role: e.target.value as UserRole },
                              })
                            }
                            className="rounded-lg border border-[#cbd9f2] px-2.5 py-1.5 text-xs bg-white"
                          >
                            <option value="orang_tua">Orang Tua</option>
                            <option value="tutor">Tutor</option>
                            <option value="admin">Admin</option>
                            <option value="pemilik">Pemilik</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-5">
                          {draft.role === 'tutor' ? (
                            <select
                              value={draft.linkedTutorId}
                              onChange={(e) =>
                                setUserDrafts({
                                  ...userDrafts,
                                  [u.uid]: { ...draft, linkedTutorId: e.target.value },
                                })
                              }
                              className="rounded-lg border border-[#cbd9f2] px-2.5 py-1.5 text-xs bg-white"
                            >
                              <option value="">Pilih profil tutor...</option>
                              {tutors.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.namaTutor}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-[#566b94]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <button
                            type="button"
                            onClick={() =>
                              setUserDrafts({
                                ...userDrafts,
                                [u.uid]: { ...draft, statusAktif: !draft.statusAktif },
                              })
                            }
                            className="text-left"
                          >
                            <StatusText status={draft.statusAktif ? 'Aktif' : 'Nonaktif'} />
                          </button>
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              updateUserRole(
                                u.uid,
                                draft.role,
                                draft.linkedTutorId,
                                draft.statusAktif
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-medium hover:bg-[#1d4ed8]"
                          >
                            Simpan Akses
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-[#0b1e4b]">
                Daftar Akun Uji Resmi per Aktor (Mode Sandbox)
              </h2>
              <p className="text-xs text-[#475d85] mt-1">
                Kredensial ini dapat digunakan di halaman Login (atau saat presentasi/UAT) untuk
                menguji keempat aktor tanpa mengganggu data produksi Firestore.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TEST_ACCOUNTS_BY_ROLE.map((acc) => (
                <div
                  key={acc.role}
                  className="rounded-xl border border-[#dce6f7] bg-[#f8fbff] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#0b1e4b]">{acc.label}</span>
                    <span className="text-xs text-[#475d85]">{acc.nama}</span>
                  </div>
                  <div className="text-xs space-y-1 bg-white border border-[#e5edf9] rounded-lg p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#566b94]">Email:</span>
                      <code className="font-mono text-[#0b1e4b]">{acc.email}</code>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#566b94]">Sandi Uji:</span>
                      <code className="font-mono font-semibold text-[#0b1e4b]">{acc.kodeUji}</code>
                    </div>
                  </div>
                  <p className="text-xs text-[#475d85] leading-relaxed">{acc.ringkasanData}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'beta' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
                Fitur Beta Dashboard (Feature Flags)
              </h1>
              <span className="px-2.5 py-0.5 rounded-md bg-[#eff5ff] border border-[#bfd4fb] text-xs font-semibold text-[#2563eb]">
                KHUSUS ADMIN
              </span>
            </div>
            <p className="text-sm text-[#475d85] mt-1">
              Aktifkan atau nonaktifkan fitur eksperimental dashboard Admin. Perubahan hanya berlaku untuk peran Admin dan tersimpan otomatis.
            </p>
          </div>

          <div className="bg-[#eff5ff] border border-[#bfd4fb] rounded-2xl p-4 flex items-start gap-3">
            <FlaskConical className="w-5 h-5 text-[#2563eb] shrink-0 mt-0.5" />
            <div className="text-xs text-[#374f7d] space-y-1">
              <p className="font-semibold text-[#0b1e4b]">
                Isolasi Peran & Persistensi Konfigurasi
              </p>
              <p>
                Saat diaktifkan, fitur beta akan langsung muncul pada tab terkait di dashboard Admin tanpa memengaruhi tampilan Orang Tua, Tutor, maupun Pemilik.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {featureFlags.map((flag) => {
              const targetTab =
                flag.key === 'betaBulkBillingActions' ? 'pembayaran' : 'ringkasan';
              const targetLabel =
                flag.key === 'betaBulkBillingActions'
                  ? 'Lihat di Pembayaran & Kuitansi'
                  : 'Lihat di Ringkasan Operasional';
              return (
                <div
                  key={flag.key}
                  className="bg-white border border-[#dce6f7] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-[#0b1e4b]">{flag.label}</h2>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          flag.enabled
                            ? 'bg-[#eff5ff] text-[#2563eb] border border-[#bfd4fb]'
                            : 'bg-[#f1f5f9] text-[#566b94]'
                        }`}
                      >
                        {flag.enabled ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <span className="text-[11px] font-mono text-[#566b94]">{flag.key}</span>
                    </div>
                    <p className="text-sm text-[#475d85]">{flag.description}</p>
                    {flag.enabled && (
                      <button
                        type="button"
                        onClick={() => setTab(targetTab)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline pt-1"
                      >
                        <span>{targetLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-medium text-[#475d85]">
                      {flag.enabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={flag.enabled}
                      aria-label={`Toggle ${flag.label}`}
                      onClick={() => void toggleFeatureFlag(flag.key)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 ${
                        flag.enabled ? 'bg-[#2563eb]' : 'bg-[#cbd9f2]'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          flag.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Edit Siswa / Pindah Kelas */}
      {editingStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await updateStudentAdmin(editingStudent.id, studentEditForm);
              setEditingStudent(null);
            }}
            className="bg-white border border-[#dce6f7] rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-semibold">Ubah Data & Kelas Siswa</h2>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 rounded-lg hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374f7d] mb-1">Nama Siswa</label>
              <input
                required
                value={studentEditForm.namaSiswa}
                onChange={(e) =>
                  setStudentEditForm({ ...studentEditForm, namaSiswa: e.target.value })
                }
                className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374f7d] mb-1">Asal Sekolah</label>
              <input
                required
                value={studentEditForm.asalSekolah}
                onChange={(e) =>
                  setStudentEditForm({ ...studentEditForm, asalSekolah: e.target.value })
                }
                className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374f7d] mb-1">Kelas</label>
              <select
                value={studentEditForm.idKelas}
                onChange={(e) =>
                  setStudentEditForm({ ...studentEditForm, idKelas: e.target.value })
                }
                className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.namaKelas} ({c.jumlahTerisi}/{c.kapasitasMaksimal})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374f7d] mb-1">Status Siswa</label>
              <select
                value={studentEditForm.statusSiswa}
                onChange={(e) =>
                  setStudentEditForm({
                    ...studentEditForm,
                    statusSiswa: e.target.value as StudentStatus,
                  })
                }
                className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
              >
                <option value="Aktif">Aktif</option>
                <option value="Menunggu Kelas">Menunggu Kelas</option>
                <option value="Daftar Tunggu">Daftar Tunggu</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-lg border border-[#cbd9f2] text-sm font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8]"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      <ReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
    </DashboardShell>
  );
}
