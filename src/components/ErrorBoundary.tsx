import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let readable = error.message;
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error) {
        readable = `Akses database ditolak (${parsed.operationType || 'operasi'}): ${parsed.error}`;
      }
    } catch {
      // plain error message
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4f8ff] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#dce6f7] rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-xl font-bold text-[#0b1e4b]">Terjadi kendala pada aplikasi</h2>
            <p className="text-sm text-[#475d85] leading-relaxed">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] transition-colors"
            >
              Muat ulang halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
