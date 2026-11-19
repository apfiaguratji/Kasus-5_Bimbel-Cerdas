import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  FileDown,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext.tsx';
import {
  calculateTutorHonorRecap,
  formatRupiah,
  MONTH_NAMES_ID,
} from '../../lib/businessRules.ts';
import { exportOwnerReportPdf } from '../../lib/pdfReport.ts';
import { DashboardShell, type NavItem } from '../DashboardShell.tsx';
import { StatusText } from '../StatusText.tsx';

export function OwnerDashboard() {
  const {
    tutors,
    classes,
    students,
    invoices,
    payments,
    tutorAttendance,
    reliefRequests,
    decideReliefRequest,
    addToast,
  } = useAppData();

  const pendingReliefCount = reliefRequests.filter((r) => r.statusKeputusan === 'Menunggu').length;
  const overdueInvoices = useMemo(
    () => invoices.filter((i) => i.statusTagihan !== 'Lunas'),
    [invoices]
  );

  const navItems: NavItem[] = [
    { id: 'keuangan', label: 'Ringkasan Keuangan', icon: BarChart3 },
    { id: 'honor', label: 'Rekap Honor Tutor', icon: Wallet },
    { id: 'tunggakan', label: 'Daftar Tunggakan', icon: AlertTriangle, badge: overdueInvoices.length },
    { id: 'keringanan', label: 'Persetujuan Keringanan', icon: ShieldCheck, badge: pendingReliefCount },
    { id: 'laporan', label: 'Laporan Bulanan', icon: FileSpreadsheet },
  ];

  const [tab, setTab] = useState('keuangan');
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [ownerNotes, setOwnerNotes] = useState<Record<string, string>>({});
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const periodPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  const periodPayments = useMemo(
    () => payments.filter((p) => p.tanggalBayar.startsWith(periodPrefix)),
    [payments, periodPrefix]
  );

  const totalSppMasuk = useMemo(
    () =>
      periodPayments
        .filter((p) => p.jenisPembayaran === 'SPP')
        .reduce((sum, p) => sum + p.jumlahBayar, 0),
    [periodPayments]
  );

  const totalDaftarMasuk = useMemo(
    () =>
      periodPayments
        .filter((p) => p.jenisPembayaran === 'Pendaftaran')
        .reduce((sum, p) => sum + p.jumlahBayar, 0),
    [periodPayments]
  );

  const totalPemasukan = totalSppMasuk + totalDaftarMasuk;

  const periodTutorAtt = useMemo(
    () => tutorAttendance.filter((ta) => ta.tanggal.startsWith(periodPrefix)),
    [tutorAttendance, periodPrefix]
  );

  const honorRecap = useMemo(
    () => calculateTutorHonorRecap(periodTutorAtt, tutors),
    [periodTutorAtt, tutors]
  );

  const totalHonorTutor = useMemo(
    () => honorRecap.reduce((sum, r) => sum + r.totalHonor, 0),
    [honorRecap]
  );

  const kasBersih = totalPemasukan - totalHonorTutor;
  const maxBar = Math.max(totalPemasukan, totalHonorTutor, 1);

  const exportCsvReport = () => {
    const rows = [
      ['Laporan Bulanan Bimbel Cerdas', `${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear}`],
      [],
      ['Ringkasan Keuangan', 'Nominal'],
      ['Total Penerimaan SPP', String(totalSppMasuk)],
      ['Total Penerimaan Pendaftaran', String(totalDaftarMasuk)],
      ['Total Pemasukan', String(totalPemasukan)],
      ['Total Pengeluaran Honor Tutor', String(totalHonorTutor)],
      ['Kas Bersih', String(kasBersih)],
      [],
      ['Rekap Honor Tutor', 'Sesi Reguler', 'Sesi Pengganti', 'Total Sesi', 'Total Honor'],
      ...honorRecap.map((h) => [
        h.namaTutor,
        String(h.sesiReguler),
        String(h.sesiPengganti),
        String(h.totalSesi),
        String(h.totalHonor),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-bimbel-cerdas-${periodPrefix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdfReport = () => {
    setIsDownloadingPdf(true);
    try {
      const filename = exportOwnerReportPdf({
        selectedMonth,
        selectedYear,
        periodPrefix,
        totalSppMasuk,
        totalDaftarMasuk,
        totalPemasukan,
        totalHonorTutor,
        kasBersih,
        honorRecap,
        periodTutorAtt,
        students,
        classes,
        overdueInvoices,
        reliefRequests,
      });
      addToast('success', 'Laporan PDF berhasil diunduh', `File ${filename} telah disimpan.`);
    } catch (error) {
      addToast(
        'error',
        'Gagal mengekspor laporan PDF',
        error instanceof Error ? error.message : 'Terjadi kesalahan saat membuat dokumen PDF.'
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <DashboardShell navItems={navItems} activeTab={tab} onSelectTab={setTab}>
      {/* Period Selector */}
      <div className="no-print mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dce6f7]">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-[#2563eb]">
            Dashboard Eksekutif Pemilik
          </p>
          <p className="text-sm text-[#475d85]">
            Periode laporan:{' '}
            <strong className="text-[#0b1e4b]">
              {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
            </strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Pilih bulan"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-lg border border-[#cbd9f2] bg-white px-3 py-1.5 text-sm"
          >
            {MONTH_NAMES_ID.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            aria-label="Pilih tahun"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-[#cbd9f2] bg-white px-3 py-1.5 text-sm font-mono"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isDownloadingPdf}
            onClick={handleDownloadPdfReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-60 whitespace-nowrap"
          >
            <FileDown className="w-4 h-4" />
            <span>{isDownloadingPdf ? 'Menyiapkan PDF...' : 'Download Report (PDF)'}</span>
          </button>
        </div>
      </div>

      {tab === 'keuangan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Total Penerimaan SPP</p>
              <p className="text-2xl font-mono font-semibold mt-1 tabular-nums text-[#2563eb]">
                {formatRupiah(totalSppMasuk)}
              </p>
            </div>
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Total Pemasukan</p>
              <p className="text-2xl font-mono font-semibold mt-1 tabular-nums">
                {formatRupiah(totalPemasukan)}
              </p>
              <p className="text-xs text-[#566b94] mt-0.5">SPP + Pendaftaran</p>
            </div>
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Pengeluaran Honor Tutor</p>
              <p className="text-2xl font-mono font-semibold mt-1 tabular-nums text-[#d97706]">
                {formatRupiah(totalHonorTutor)}
              </p>
            </div>
            <div className="bg-white border border-[#dce6f7] rounded-2xl p-4">
              <p className="text-xs text-[#566b94]">Saldo Kas Bersih</p>
              <p
                className={`text-2xl font-mono font-semibold mt-1 tabular-nums ${
                  kasBersih >= 0 ? 'text-[#2563eb]' : 'text-[#dc2626]'
                }`}
              >
                {formatRupiah(kasBersih)}
              </p>
            </div>
          </div>

          {/* Perbandingan Pemasukan vs Pengeluaran */}
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white border border-[#dce6f7] rounded-2xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-display font-semibold">
                  Perbandingan Pemasukan & Pengeluaran
                </h2>
                <p className="text-xs text-[#566b94] mt-0.5">
                  Arus kas masuk (SPP & Pendaftaran) dibandingkan pengeluaran honor mengajar tutor.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">Pemasukan (SPP + Daftar)</span>
                    <span className="font-mono font-semibold text-[#2563eb] tabular-nums">
                      {formatRupiah(totalPemasukan)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[#e6eefc] overflow-hidden">
                    <div
                      className="h-full bg-[#2563eb]"
                      style={{ width: `${Math.round((totalPemasukan / maxBar) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">Pengeluaran Honor Tutor</span>
                    <span className="font-mono font-semibold text-[#d97706] tabular-nums">
                      {formatRupiah(totalHonorTutor)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[#fef3c7] overflow-hidden">
                    <div
                      className="h-full bg-[#d97706]"
                      style={{ width: `${Math.round((totalHonorTutor / maxBar) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white border border-[#dce6f7] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold">Keterisian Kelas</h2>
                <span className="text-xs text-[#566b94]">{students.length} total siswa</span>
              </div>
              <div className="divide-y divide-[#e8f0fb]">
                {classes.map((cls) => (
                  <div key={cls.id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{cls.namaKelas}</p>
                      <p className="text-xs text-[#566b94]">
                        {cls.jumlahTerisi}/{cls.kapasitasMaksimal} siswa
                        {cls.jumlahTerisi < cls.jumlahMinimal ? ' · Di bawah minimal (3)' : ''}
                      </p>
                    </div>
                    <StatusText status={cls.statusKelas} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'honor' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Rekap Honor & Sesi Mengajar Tutor
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Tarif tetap Rp75.000 per sesi 90 menit. Sesi yang digantikan otomatis dibayarkan ke tutor pengganti.
            </p>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                    <th className="py-3 px-5">Nama Tutor</th>
                    <th className="py-3 px-5 text-right">Sesi Reguler</th>
                    <th className="py-3 px-5 text-right">Sesi Pengganti</th>
                    <th className="py-3 px-5 text-right">Total Sesi</th>
                    <th className="py-3 px-5 text-right">Total Honor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8f0fb]">
                  {honorRecap.map((h) => (
                    <tr key={h.idTutor} className="hover:bg-[#f8fbff]">
                      <td className="py-3.5 px-5 font-semibold">{h.namaTutor}</td>
                      <td className="py-3.5 px-5 text-right font-mono tabular-nums">{h.sesiReguler}</td>
                      <td className="py-3.5 px-5 text-right font-mono tabular-nums">{h.sesiPengganti}</td>
                      <td className="py-3.5 px-5 text-right font-mono font-semibold tabular-nums">
                        {h.totalSesi} sesi
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-semibold text-[#2563eb] tabular-nums">
                        {formatRupiah(h.totalHonor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e8f0fb]">
              <h2 className="text-base font-semibold">Rincian Sesi Mengajar Periode Ini</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                    <th className="py-3 px-5">Tanggal</th>
                    <th className="py-3 px-5">Kelas</th>
                    <th className="py-3 px-5">Tutor Penerima Honor</th>
                    <th className="py-3 px-5">Keterangan</th>
                    <th className="py-3 px-5 text-right">Honor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8f0fb]">
                  {periodTutorAtt.map((ta) => (
                    <tr key={ta.id}>
                      <td className="py-3 px-5 font-mono text-xs tabular-nums">{ta.tanggal}</td>
                      <td className="py-3 px-5">{ta.namaKelas}</td>
                      <td className="py-3 px-5 font-medium">{ta.namaTutorMengajar}</td>
                      <td className="py-3 px-5 text-xs text-[#566b94]">
                        {ta.isPengganti ? 'Tutor Pengganti (honor dialihkan)' : 'Tutor Utama'}
                      </td>
                      <td className="py-3 px-5 text-right font-mono tabular-nums">
                        {formatRupiah(ta.honorSesi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'tunggakan' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Daftar Tunggakan & Tagihan Belum Lunas
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Pemantauan tagihan yang belum dibayarkan atau melewati tanggal jatuh tempo.
            </p>
          </div>

          <div className="bg-white border border-[#dce6f7] rounded-2xl overflow-hidden">
            {overdueInvoices.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#2563eb]">
                Seluruh tagihan SPP telah lunas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#eff5ff] border-b border-[#dce6f7] text-xs uppercase tracking-wider text-[#374f7d]">
                      <th className="py-3 px-5">Siswa</th>
                      <th className="py-3 px-5">Periode</th>
                      <th className="py-3 px-5">Jatuh Tempo</th>
                      <th className="py-3 px-5 text-right">Jumlah</th>
                      <th className="py-3 px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8f0fb]">
                    {overdueInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#f8fbff]">
                        <td className="py-3.5 px-5 font-semibold">{inv.namaSiswa}</td>
                        <td className="py-3.5 px-5">{inv.periodeLabel}</td>
                        <td className="py-3.5 px-5 font-mono text-xs tabular-nums">{inv.jatuhTempo}</td>
                        <td className="py-3.5 px-5 text-right font-mono font-semibold tabular-nums">
                          {formatRupiah(inv.jumlahTagihan)}
                        </td>
                        <td className="py-3.5 px-5">
                          <StatusText status={inv.statusTagihan} />
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

      {tab === 'keringanan' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
              Persetujuan Keringanan Pembayaran
            </h1>
            <p className="text-sm text-[#475d85] mt-1">
              Sesuai aturan bisnis, seluruh pengajuan keringanan atau penundaan pembayaran wajib disetujui oleh Pemilik.
            </p>
          </div>

          <div className="space-y-4">
            {reliefRequests.map((req) => (
              <div key={req.id} className="bg-white border border-[#dce6f7] rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#566b94]">
                      {req.jenisPengajuan} · Diajukan {req.tanggalPengajuan}
                    </p>
                    <h2 className="text-xl font-display font-semibold">
                      {req.namaSiswa} — {req.periode}
                    </h2>
                    <p className="text-sm font-mono font-semibold text-[#2563eb] tabular-nums mt-0.5">
                      Nominal Tagihan: {formatRupiah(req.jumlahTagihan)}
                    </p>
                  </div>
                  <StatusText status={req.statusKeputusan} />
                </div>

                <p className="text-sm text-[#1e3366] bg-[#f8fbff] border border-[#dce6f7] rounded-lg p-3.5">
                  Alasan orang tua: {req.alasan}
                </p>

                {req.statusKeputusan === 'Menunggu' ? (
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <input
                      type="text"
                      value={ownerNotes[req.id] || ''}
                      onChange={(e) => setOwnerNotes({ ...ownerNotes, [req.id]: e.target.value })}
                      placeholder="Catatan keputusan pemilik (opsional)..."
                      className="flex-1 rounded-lg border border-[#cbd9f2] px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          decideReliefRequest(req.id, 'Disetujui', ownerNotes[req.id] || '')
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8]"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Setujui</span>
                      </button>
                      <button
                        onClick={() =>
                          decideReliefRequest(req.id, 'Ditolak', ownerNotes[req.id] || '')
                        }
                        className="px-4 py-2 rounded-lg border border-[#e3baba] text-sm font-medium text-[#dc2626] hover:bg-[#fef2f2]"
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                ) : (
                  req.catatanPemilik && (
                    <p className="text-xs text-[#566b94]">
                      Catatan Pemilik ({req.tanggalKeputusan}): {req.catatanPemilik}
                    </p>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'laporan' && (
        <div className="space-y-6">
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#0b1e4b]">
                Laporan Bulanan Keuangan & Operasional
              </h1>
              <p className="text-sm text-[#475d85] mt-1">
                Siap diunduh sebagai PDF resmi, dicetak, atau diekspor ke spreadsheet (CSV).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={exportCsvReport}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#cbd9f2] bg-white text-sm font-medium hover:bg-[#eff5ff]"
              >
                <Download className="w-4 h-4" />
                <span>Unduh CSV</span>
              </button>
              <button
                type="button"
                disabled={isDownloadingPdf}
                onClick={handleDownloadPdfReport}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                <FileDown className="w-4 h-4" />
                <span>{isDownloadingPdf ? 'Menyiapkan PDF...' : 'Download Report'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#cbd9f2] bg-white text-sm font-medium hover:bg-[#eff5ff]"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Laporan</span>
              </button>
            </div>
          </div>

          <div className="print-only-area bg-white border border-[#dce6f7] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-[#dce6f7] pb-4 flex justify-between items-start gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#2563eb]">
                  Bimbel Cerdas · Laporan Resmi
                </p>
                <h2 className="text-2xl font-display font-semibold mt-1">
                  Laporan Keuangan & Operasional — {MONTH_NAMES_ID[selectedMonth - 1]} {selectedYear}
                </h2>
              </div>
              <p className="text-xs font-mono text-[#566b94]">
                Dicetak: {new Date().toISOString().slice(0, 10)}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold mb-3">Ringkasan Arus Kas</h3>
                <dl className="divide-y divide-[#e8f0fb] text-sm">
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#566b94]">Penerimaan SPP</dt>
                    <dd className="font-mono tabular-nums">{formatRupiah(totalSppMasuk)}</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#566b94]">Biaya Pendaftaran</dt>
                    <dd className="font-mono tabular-nums">{formatRupiah(totalDaftarMasuk)}</dd>
                  </div>
                  <div className="py-2 flex justify-between font-semibold">
                    <dt>Total Pemasukan</dt>
                    <dd className="font-mono tabular-nums text-[#2563eb]">
                      {formatRupiah(totalPemasukan)}
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#566b94]">Total Honor Tutor</dt>
                    <dd className="font-mono tabular-nums text-[#d97706]">
                      -{formatRupiah(totalHonorTutor)}
                    </dd>
                  </div>
                  <div className="py-2.5 flex justify-between text-base font-semibold">
                    <dt>Kas Bersih Periode</dt>
                    <dd className="font-mono tabular-nums">{formatRupiah(kasBersih)}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3">Ringkasan Akademik</h3>
                <dl className="divide-y divide-[#e8f0fb] text-sm">
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#566b94]">Total Siswa Terdaftar</dt>
                    <dd className="font-mono tabular-nums">{students.length} siswa</dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#566b94]">Jumlah Kelas Aktif</dt>
                    <dd className="font-mono tabular-nums">
                      {classes.filter((c) => c.statusKelas === 'Aktif' || c.statusKelas === 'Penuh').length}{' '}
                      kelas
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#566b94]">Total Sesi Mengajar</dt>
                    <dd className="font-mono tabular-nums">
                      {periodTutorAtt.filter((t) => t.statusHadir).length} sesi
                    </dd>
                  </div>
                  <div className="py-2 flex justify-between">
                    <dt className="text-[#566b94]">Tagihan Belum Lunas</dt>
                    <dd className="font-mono tabular-nums text-[#dc2626]">
                      {overdueInvoices.length} tagihan
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
