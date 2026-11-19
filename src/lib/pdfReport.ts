import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  ClassRoom,
  Invoice,
  ReliefRequest,
  Student,
  TutorAttendance,
} from '../types.ts';
import type { TutorHonorRecap } from './businessRules.ts';
import { formatRupiah, MONTH_NAMES_ID } from './businessRules.ts';

export interface OwnerPdfReportPayload {
  selectedMonth: number;
  selectedYear: number;
  periodPrefix: string;
  totalSppMasuk: number;
  totalDaftarMasuk: number;
  totalPemasukan: number;
  totalHonorTutor: number;
  kasBersih: number;
  honorRecap: TutorHonorRecap[];
  periodTutorAtt: TutorAttendance[];
  students: Student[];
  classes: ClassRoom[];
  overdueInvoices: Invoice[];
  reliefRequests: ReliefRequest[];
}

interface JsPdfWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY?: number;
  };
}

function getAfterTableY(doc: JsPdfWithAutoTable, fallback: number): number {
  const finalY = doc.lastAutoTable?.finalY;
  return typeof finalY === 'number' ? finalY + 10 : fallback;
}

export function exportOwnerReportPdf(payload: OwnerPdfReportPayload): string {
  const {
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
  } = payload;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as JsPdfWithAutoTable;

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const periodLabel = `${MONTH_NAMES_ID[selectedMonth - 1] || selectedMonth} ${selectedYear}`;
  const printedDate = new Date().toISOString().slice(0, 10);

  // Header Banner
  doc.setFillColor(11, 30, 75); // #0b1e4b
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('BIMBEL CERDAS', marginX, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Laporan Keuangan & Operasional — Periode ${periodLabel}`, marginX, 21);

  doc.setFontSize(9);
  doc.text(`Dicetak: ${printedDate}`, pageWidth - marginX, 21, { align: 'right' });

  let cursorY = 39;

  // Section 1: Ringkasan Keuangan
  doc.setTextColor(11, 30, 75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Ringkasan Keuangan (Arus Kas Periode)', marginX, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: marginX, right: marginX },
    head: [['Komponen Keuangan', 'Nominal']],
    body: [
      ['Total Penerimaan SPP', formatRupiah(totalSppMasuk)],
      ['Total Penerimaan Biaya Pendaftaran', formatRupiah(totalDaftarMasuk)],
      ['Total Pemasukan Periode', formatRupiah(totalPemasukan)],
      ['Total Pengeluaran Honor Tutor', `- ${formatRupiah(totalHonorTutor)}`],
      ['Saldo Kas Bersih Periode', formatRupiah(kasBersih)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [11, 30, 75] },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' },
    },
  });

  cursorY = getAfterTableY(doc, cursorY + 46);

  // Section 2: Ringkasan Operasional & Akademik
  const activeStudentsCount = students.filter((s) => s.statusSiswa === 'Aktif').length;
  const activeClassesCount = classes.filter(
    (c) => c.statusKelas === 'Aktif' || c.statusKelas === 'Penuh'
  ).length;
  const taughtSessionsCount = periodTutorAtt.filter((t) => t.statusHadir).length;
  const totalOverdueAmount = overdueInvoices.reduce((sum, i) => sum + i.jumlahTagihan, 0);
  const pendingReliefCount = reliefRequests.filter((r) => r.statusKeputusan === 'Menunggu').length;

  doc.setTextColor(11, 30, 75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Ringkasan Operasional & Akademik', marginX, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: marginX, right: marginX },
    head: [['Indikator Operasional', 'Nilai']],
    body: [
      ['Total Siswa Terdaftar', `${students.length} siswa (${activeStudentsCount} aktif)`],
      ['Kelas Berjalan (Aktif / Penuh)', `${activeClassesCount} dari ${classes.length} kelas`],
      ['Total Sesi Mengajar Terlaksana', `${taughtSessionsCount} sesi`],
      [
        'Tagihan Belum Lunas / Tunggakan',
        `${overdueInvoices.length} tagihan (${formatRupiah(totalOverdueAmount)})`,
      ],
      ['Pengajuan Keringanan Menunggu', `${pendingReliefCount} pengajuan`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [11, 30, 75], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [11, 30, 75] },
    columnStyles: {
      1: { halign: 'right' },
    },
  });

  cursorY = getAfterTableY(doc, cursorY + 48);

  // Section 3: Rekap Honor & Sesi Mengajar Tutor
  if (cursorY > 235) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setTextColor(11, 30, 75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. Rekap Honor & Sesi Mengajar Tutor', marginX, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: marginX, right: marginX },
    head: [['Nama Tutor', 'Sesi Reguler', 'Sesi Pengganti', 'Total Sesi', 'Total Honor']],
    body:
      honorRecap.length > 0
        ? honorRecap.map((h) => [
            h.namaTutor,
            String(h.sesiReguler),
            String(h.sesiPengganti),
            `${h.totalSesi} sesi`,
            formatRupiah(h.totalHonor),
          ])
        : [['Belum ada data sesi mengajar pada periode ini', '-', '-', '0 sesi', formatRupiah(0)]],
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [11, 30, 75] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });

  cursorY = getAfterTableY(doc, cursorY + 42);

  // Section 4: Keterisian & Status Kelas
  if (cursorY > 235) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setTextColor(11, 30, 75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('4. Keterisian & Status Kelas', marginX, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: marginX, right: marginX },
    head: [['Nama Kelas', 'Program', 'Keterisian', 'Status']],
    body:
      classes.length > 0
        ? classes.map((c) => [
            c.namaKelas,
            c.namaProgram,
            `${c.jumlahTerisi} / ${c.kapasitasMaksimal} siswa`,
            c.statusKelas,
          ])
        : [['Belum ada data kelas', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [11, 30, 75], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [11, 30, 75] },
    columnStyles: {
      2: { halign: 'right' },
    },
  });

  cursorY = getAfterTableY(doc, cursorY + 42);

  // Section 5: Daftar Tunggakan & Tagihan Belum Lunas
  if (cursorY > 235) {
    doc.addPage();
    cursorY = 20;
  }

  doc.setTextColor(11, 30, 75);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('5. Daftar Tunggakan & Tagihan Belum Lunas', marginX, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: marginX, right: marginX },
    head: [['Nama Siswa', 'Periode', 'Jatuh Tempo', 'Nominal', 'Status']],
    body:
      overdueInvoices.length > 0
        ? overdueInvoices.map((inv) => [
            inv.namaSiswa,
            inv.periodeLabel,
            inv.jatuhTempo,
            formatRupiah(inv.jumlahTagihan),
            inv.statusTagihan,
          ])
        : [['Seluruh tagihan SPP telah lunas', '-', '-', formatRupiah(0), 'Lunas']],
    theme: 'striped',
    headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [11, 30, 75] },
    columnStyles: {
      3: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // Page numbers footer
  const totalPages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(86, 107, 148);
    doc.text(
      'Bimbel Cerdas · Dokumen Laporan Keuangan & Operasional',
      marginX,
      pageHeight - 8
    );
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - marginX, pageHeight - 8, {
      align: 'right',
    });
  }

  const filename = `laporan-bimbel-cerdas-${periodPrefix}.pdf`;
  doc.save(filename);
  return filename;
}
