import { AlertTriangle, CheckCircle2, Clock, Info, XCircle } from 'lucide-react';

export function StatusText({ status }: { status: string }) {
  const s = status.toLowerCase();

  if (
    s.includes('tunggakan') ||
    s.includes('tidak hadir') ||
    s.includes('tidak aktif') ||
    s.includes('nonaktif') ||
    s.includes('ditolak') ||
    s.includes('dibatalkan') ||
    s.includes('penuh')
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#dc2626] whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }

  if (
    s.includes('lunas') ||
    s.includes('aktif') ||
    s.includes('disetujui') ||
    s === 'hadir' ||
    s.includes('selesai') ||
    s.includes('ditempatkan')
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669] whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }

  if (
    s.includes('menunggu') ||
    s.includes('belum') ||
    s.includes('daftar tunggu') ||
    s.includes('di bawah minimal') ||
    s.includes('sedang dihubungi')
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d97706] whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }

  if (s.includes('absensi')) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#dc2626] whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563eb] whitespace-nowrap">
      <Info className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
}
