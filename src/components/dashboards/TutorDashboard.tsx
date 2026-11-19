import React, { useMemo, useState } from 'react';
import { BookOpen, Calendar, CheckCircle2, ClipboardCheck, History, Users } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext.tsx';
import { formatRupiah, TUTOR_HONOR_PER_SESSION } from '../../lib/businessRules.ts';
import type { AttendanceStatus } from '../../types.ts';
import { DashboardShell, type NavItem } from '../DashboardShell.tsx';
import { StatusText } from '../StatusText.tsx';

export function TutorDashboard() {
  const {
    currentUser,
    tutors,
    classes,
    schedules,
    students,
    tutorAttendance,
    recordTutorSessionAndAttendance,
    addToast,
  } = useAppData();

  const currentTutor = useMemo(() => {
    if (currentUser?.linkedTutorId) {
      return tutors.find((t) => t.id === currentUser.linkedTutorId) || tutors[0];
    }
    return tutors[0];
  }, [currentUser, tutors]);

  const mySchedules = useMemo(
    () => schedules.filter((s) => s.idTutor === currentTutor?.id),
    [schedules, currentTutor]
  );

  const myClassIds = useMemo(() => new Set(mySchedules.map((s) => s.idKelas)), [mySchedules]);
  const myClasses = useMemo(
    () => classes.filter((c) => myClassIds.has(c.id)),
    [classes, myClassIds]
  );

  const myTeachingHistory = useMemo(
    () =>
      tutorAttendance
        .filter((ta) => ta.idTutorMengajar === currentTutor?.id || ta.idTutorAsli === currentTutor?.id)
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [tutorAttendance, currentTutor]
  );

  const myHonorTotal = useMemo(
    () =>
      tutorAttendance
        .filter((ta) => ta.idTutorMengajar === currentTutor?.id && ta.statusHadir)
        .reduce((sum, ta) => sum + ta.honorSesi, 0),
    [tutorAttendance, currentTutor]
  );

  const navItems: NavItem[] = [
    { id: 'absensi', label: 'Absensi & Konfirmasi', icon: ClipboardCheck },
    { id: 'jadwal', label: 'Jadwal Mengajar', icon: Calendar },
    { id: 'kelas', label: 'Kelas Diampu', icon: BookOpen },
    { id: 'riwayat', label: 'Riwayat & Honor', icon: History },
  ];

  const [tab, setTab] = useState('absensi');
  const [selectedScheduleId, setSelectedScheduleId] = useState(mySchedules[0]?.id || schedules[0]?.id || '');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [isPengganti, setIsPengganti] = useState(false);
  const [hadirMengajar, setHadirMengajar] = useState(true);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [lastSavedSummary, setLastSavedSummary] = useState<{
    kelas: string;
    tanggal: string;
    hadir: number;
    tidakHadir: number;
    honorAwarded: boolean;
    triggeredAlerts: number;
  } | null>(null);

  const activeSchedule = schedules.find((s) => s.id === selectedScheduleId);
  const classStudents = useMemo(
    () =>
      students.filter(
        (s) =>
          s.idKelas === activeSchedule?.idKelas &&
          (s.statusSiswa === 'Aktif' || s.statusSiswa === 'Menunggu Kelas')
      ),
    [students, activeSchedule]
  );

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchedule) {
      addToast('error', 'Pilih sesi mengajar terlebih dahulu');
      return;
    }
    setSaving(true);
    try {
      const kehadiranList = classStudents.map((s) => ({
        idSiswa: s.id,
        status: attendanceMap[s.id] || ('Hadir' as AttendanceStatus),
      }));
      const res = await recordTutorSessionAndAttendance({
        idJadwal: activeSchedule.id,
        tanggal,
        hadirMengajar,
        isPengganti,
        idTutorPengganti: isPengganti ? currentTutor?.id : undefined,
        kehadiran: kehadiranList,
      });
      const hadirCount = kehadiranList.filter((k) => k.status === 'Hadir').length;
      setLastSavedSummary({
        kelas: activeSchedule.namaKelas,
        tanggal,
        hadir: hadirCount,
        tidakHadir: kehadiranList.length - hadirCount,
        honorAwarded: hadirMengajar,
        triggeredAlerts: res.triggeredAlerts,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell navItems={navItems} activeTab={tab} onSelectTab={setTab}>
      {tab === 'absensi' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
                Input Absensi Siswa & Konfirmasi Mengajar
              </h1>
              <p className="text-sm text-[#475d85] mt-1">
                Dioptimalkan untuk pengisian cepat lewat smartphone setelah sesi 90 menit selesai.
              </p>
            </div>
            <p className="text-xs font-mono font-semibold text-[#2563eb] tabular-nums">
              Honor: {formatRupiah(TUTOR_HONOR_PER_SESSION)} / sesi 90 menit
            </p>
          </div>

          {lastSavedSummary && (
            <div className="bg-[#eff5ff] border border-[#bfdbfe] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 text-xs sm:text-sm text-[#0b1e4b]">
                <p className="font-semibold text-[#2563eb]">
                  Absensi {lastSavedSummary.kelas} ({lastSavedSummary.tanggal}) tersimpan
                </p>
                <p className="text-[#1e3366]">
                  {lastSavedSummary.hadir} hadir · {lastSavedSummary.tidakHadir} tidak hadir ·{' '}
                  {lastSavedSummary.honorAwarded
                    ? `Honor ${formatRupiah(TUTOR_HONOR_PER_SESSION)} tercatat`
                    : 'Tanpa klaim honor'}
                  {lastSavedSummary.triggeredAlerts > 0
                    ? ` · ${lastSavedSummary.triggeredAlerts} peringatan absen 3× dikirim`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setTab('riwayat')}
                  className="px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-semibold hover:bg-[#1d4ed8]"
                >
                  Lihat Riwayat & Honor
                </button>
                <button
                  type="button"
                  onClick={() => setLastSavedSummary(null)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#bfdbfe] text-xs text-[#1e3366]"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSaveSession}
            className="bg-white border border-[#dce6f7] rounded-2xl p-5 sm:p-6 space-y-5"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">
                  Pilih Sesi / Kelas
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedScheduleId(nextId);
                    const sc = schedules.find((x) => x.id === nextId);
                    if (sc && currentTutor) {
                      setIsPengganti(sc.idTutor !== currentTutor.id);
                    }
                  }}
                  className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="">Pilih sesi kelas...</option>
                  {schedules.map((sc) => {
                    const isMine = sc.idTutor === currentTutor?.id;
                    return (
                      <option key={sc.id} value={sc.id}>
                        {sc.namaKelas} · {sc.hari} {sc.jamMulai}–{sc.jamSelesai}{' '}
                        {isMine ? '(Kelas Saya)' : `(Pengganti ${sc.namaTutor})`}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374f7d] mb-1.5">
                  Tanggal Mengajar
                </label>
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-lg border border-[#cbd9f2] px-3 py-2.5 text-sm focus:outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>

            {activeSchedule && (
              <>
                <div className="rounded-lg bg-[#eff5ff] border border-[#dce6f7] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-[#1e3366]">
                    <span className="font-semibold">{activeSchedule.namaKelas}</span> ·{' '}
                    <span>{activeSchedule.ruangan || 'Ruang Utama'}</span> ·{' '}
                    <span>Tutor utama: {activeSchedule.namaTutor}</span>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0b1e4b] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPengganti}
                      onChange={(e) => setIsPengganti(e.target.checked)}
                      className="w-4 h-4 accent-[#2563eb]"
                    />
                    <span>Saya mengajar sebagai Tutor Pengganti</span>
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-[#0b1e4b]">
                      Daftar Hadir Siswa ({classStudents.length} siswa)
                    </h2>
                    <span className="text-xs text-[#566b94]">Ketuk tombol untuk ubah status</span>
                  </div>

                  {classStudents.length === 0 ? (
                    <p className="text-sm text-[#566b94] py-4">
                      Belum ada siswa aktif pada kelas ini.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#e8f0fb] border border-[#dce6f7] rounded-xl">
                      {classStudents.map((sis) => {
                        const status = attendanceMap[sis.id] || 'Hadir';
                        return (
                          <div
                            key={sis.id}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-[#0b1e4b]">{sis.namaSiswa}</p>
                              <p className="text-xs text-[#566b94]">{sis.asalSekolah}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:w-56">
                              <button
                                type="button"
                                onClick={() => setAttendanceMap({ ...attendanceMap, [sis.id]: 'Hadir' })}
                                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                                  status === 'Hadir'
                                    ? 'bg-[#059669] text-white border-[#059669]'
                                    : 'bg-white text-[#374f7d] border-[#cbd9f2]'
                                }`}
                              >
                                Hadir
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAttendanceMap({ ...attendanceMap, [sis.id]: 'Tidak Hadir' })
                                }
                                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                                  status === 'Tidak Hadir'
                                    ? 'bg-[#dc2626] text-white border-[#dc2626]'
                                    : 'bg-white text-[#374f7d] border-[#cbd9f2]'
                                }`}
                              >
                                Tidak Hadir
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#e8f0fb] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <label className="inline-flex items-start gap-2.5 text-sm text-[#0b1e4b] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hadirMengajar}
                      onChange={(e) => setHadirMengajar(e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-[#2563eb]"
                    />
                    <span>
                      Konfirmasi kehadiran mengajar sesi ini (90 menit · honor{' '}
                      <strong className="font-mono">{formatRupiah(TUTOR_HONOR_PER_SESSION)}</strong>
                      {isPengganti ? ' dialihkan ke tutor pengganti' : ''})
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] disabled:opacity-60 whitespace-nowrap"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Absensi Sesi'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {tab === 'jadwal' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Ringkasan Jadwal Mengajar
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Tutor aktif: <span className="font-semibold text-[#0b1e4b]">{currentTutor?.namaTutor}</span> ·{' '}
              {currentTutor?.bidangKeahlian}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mySchedules.map((sc) => (
              <div key={sc.id} className="bg-white border border-[#dce6f7] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-[#566b94]">
                  <span className="font-semibold text-[#2563eb]">{sc.hari}</span>
                  <span className="font-mono tabular-nums">{sc.durasiMenit} menit</span>
                </div>
                <h3 className="text-lg font-display font-semibold text-[#0b1e4b]">{sc.namaKelas}</h3>
                <p className="text-sm font-mono tabular-nums text-[#1e3366]">
                  {sc.jamMulai} – {sc.jamSelesai}
                </p>
                <p className="text-xs text-[#566b94]">{sc.ruangan || 'Ruang Utama'}</p>
                <button
                  onClick={() => {
                    setSelectedScheduleId(sc.id);
                    setIsPengganti(false);
                    setTab('absensi');
                  }}
                  className="w-full py-2 rounded-lg border border-[#cbd9f2] text-xs font-semibold text-[#2563eb] hover:bg-[#eff5ff]"
                >
                  Isi Absensi Sesi Ini
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'kelas' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Daftar Kelas yang Diampu
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Menampilkan siswa aktif pada setiap kelas yang Anda ajar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {myClasses.map((cls) => {
              const members = students.filter((s) => s.idKelas === cls.id && s.statusSiswa !== 'Daftar Tunggu');
              return (
                <div key={cls.id} className="bg-white border border-[#dce6f7] rounded-2xl p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#566b94]">{cls.namaProgram}</p>
                      <h2 className="text-xl font-display font-semibold">{cls.namaKelas}</h2>
                    </div>
                    <StatusText status={cls.statusKelas} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#475d85]">
                    <Users className="w-4 h-4 text-[#2563eb]" />
                    <span className="font-mono tabular-nums">
                      {cls.jumlahTerisi}/{cls.kapasitasMaksimal} siswa
                    </span>
                  </div>
                  <div className="pt-3 border-t border-[#e8f0fb]">
                    <p className="text-xs font-semibold text-[#374f7d] mb-2">Daftar Siswa</p>
                    {members.length === 0 ? (
                      <p className="text-xs text-[#566b94]">Belum ada siswa.</p>
                    ) : (
                      <ul className="space-y-1 text-sm text-[#1e3366]">
                        {members.map((m) => (
                          <li key={m.id} className="flex justify-between">
                            <span>{m.namaSiswa}</span>
                            <span className="text-xs text-[#566b94]">{m.asalSekolah}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'riwayat' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
                Riwayat Absensi Mengajar & Honor
              </h1>
              <p className="text-sm text-[#475d85] mt-1">
                Sesi terkonfirmasi otomatis dihitung dalam rekap honor (Rp75.000/sesi).
              </p>
            </div>
            <div className="bg-white border border-[#dce6f7] rounded-xl px-4 py-3">
              <p className="text-xs text-[#566b94]">Akumulasi Honor Anda</p>
              <p className="text-xl font-mono font-semibold text-[#2563eb] tabular-nums">
                {formatRupiah(myHonorTotal)}
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                    <th className="py-3 px-5">Tanggal</th>
                    <th className="py-3 px-5">Kelas</th>
                    <th className="py-3 px-5">Peran Sesi</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Honor Sesi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8f0fb]">
                  {myTeachingHistory.map((item) => {
                    const isPaidToMe = item.idTutorMengajar === currentTutor?.id && item.statusHadir;
                    return (
                      <tr key={item.id} className="hover:bg-[#f8fbff]">
                        <td className="py-3.5 px-5 font-mono text-xs tabular-nums">{item.tanggal}</td>
                        <td className="py-3.5 px-5 font-medium">{item.namaKelas}</td>
                        <td className="py-3.5 px-5 text-xs">
                          {item.isPengganti
                            ? `Tutor Pengganti (${item.namaTutorMengajar})`
                            : 'Tutor Utama'}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563eb]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {item.statusHadir ? 'Terkonfirmasi' : 'Tidak Hadir'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-semibold tabular-nums">
                          {isPaidToMe ? formatRupiah(item.honorSesi) : 'Dialihkan'}
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
    </DashboardShell>
  );
}
