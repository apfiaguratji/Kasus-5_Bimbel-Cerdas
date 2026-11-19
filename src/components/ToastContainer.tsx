import { CheckCircle2, Info, X, AlertCircle } from 'lucide-react';
import { useAppData } from '../context/AppDataContext.tsx';

export function ToastContainer() {
  const { toasts, dismissToast } = useAppData();
  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => {
        const tone =
          t.type === 'success'
            ? 'border-[#a7f3d0] bg-[#ecfdf5] text-[#065f46]'
            : t.type === 'error'
              ? 'border-[#fecaca] bg-[#fef2f2] text-[#991b1b]'
              : 'border-[#c7d9fa] bg-white text-[#0b1e4b]';
        const Icon =
          t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertCircle : Info;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-[0_12px_28px_-8px_rgba(11,30,75,0.16)] transition-all ${tone}`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">{t.title}</p>
              {t.description && (
                <p className="text-xs opacity-85 mt-0.5 leading-relaxed">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Tutup notifikasi"
              className="p-1 rounded-lg hover:bg-black/5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
