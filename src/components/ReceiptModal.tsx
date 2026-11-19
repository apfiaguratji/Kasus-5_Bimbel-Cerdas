import { Printer, X } from 'lucide-react';
import { formatRupiah } from '../lib/businessRules.ts';
import type { Receipt } from '../types.ts';

export function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: Receipt | null;
  onClose: () => void;
}) {
  if (!receipt) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kuitansi Digital Bimbel Cerdas"
      className="fixed inset-0 z-50 bg-[#07183d]/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="print-only-area bg-white text-[#0b1e4b] border border-[#d6e2f7] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-[0_24px_60px_-15px_rgba(7,24,61,0.35)]">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-dashed border-[#c7d6f0]">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#2563eb] uppercase">
              Bimbel Cerdas · Bukti Pembayaran Sah
            </p>
            <h2 className="text-2xl font-display font-bold mt-1">Kuitansi Digital</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup kuitansi"
            className="no-print p-2 rounded-xl text-[#475d85] hover:bg-[#eff5ff]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <dl className="divide-y divide-dashed divide-[#dce6f7] text-sm my-4">
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-[#566b94]">No. Kuitansi</dt>
            <dd className="font-mono font-semibold tabular-nums">{receipt.nomorKuitansi}</dd>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-[#566b94]">Tanggal Pembayaran</dt>
            <dd className="font-mono tabular-nums">{receipt.tanggalBayar}</dd>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-[#566b94]">Nama Siswa</dt>
            <dd className="font-semibold">{receipt.namaSiswa}</dd>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-[#566b94]">Orang Tua / Wali</dt>
            <dd>{receipt.namaOrangTua}</dd>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-[#566b94]">Jenis & Periode</dt>
            <dd>
              {receipt.jenisPembayaran} · {receipt.periode}
            </dd>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-[#566b94]">Tarif Dasar</dt>
            <dd className="font-mono tabular-nums">{formatRupiah(receipt.nominalDasar)}</dd>
          </div>
          {receipt.diskonPersen > 0 && (
            <div className="py-2.5 flex justify-between gap-4 text-[#059669]">
              <dt>Diskon Keluarga (Anak ke-2+)</dt>
              <dd className="font-mono font-medium tabular-nums">-{receipt.diskonPersen}%</dd>
            </div>
          )}
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-[#566b94]">Metode Pembayaran</dt>
            <dd>{receipt.metodeBayar}</dd>
          </div>
          <div className="py-3 flex justify-between gap-4 text-base font-semibold">
            <dt>Total Dibayarkan</dt>
            <dd className="font-mono text-[#2563eb] tabular-nums">
              {formatRupiah(receipt.jumlahBayar)}
            </dd>
          </div>
          <div className="py-2.5 flex justify-between gap-4 text-xs text-[#566b94]">
            <dt>Dicatat oleh</dt>
            <dd>{receipt.adminPencatat}</dd>
          </div>
        </dl>

        <div className="no-print flex items-center justify-end gap-3 pt-4 border-t border-[#e5edf9]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[#cbd9f2] text-sm font-medium text-[#0b1e4b] hover:bg-[#eff5ff] whitespace-nowrap"
          >
            Tutup
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] whitespace-nowrap shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kuitansi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
