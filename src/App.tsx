/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppDataProvider, useAppData } from './context/AppDataContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { PublicSite } from './components/PublicSite.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { AdminDashboard } from './components/dashboards/AdminDashboard.tsx';
import { OwnerDashboard } from './components/dashboards/OwnerDashboard.tsx';
import { ParentDashboard } from './components/dashboards/ParentDashboard.tsx';
import { TutorDashboard } from './components/dashboards/TutorDashboard.tsx';

function AppRouter() {
  const { view, authReady, currentUser, activeRole } = useAppData();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#07110d] text-[#a6c3b0] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-[#244632] border-t-[#42d18e] animate-spin" />
        <p className="text-sm">Menyiapkan Bimbel Cerdas...</p>
      </div>
    );
  }

  if (view === 'public') {
    return <PublicSite />;
  }

  if (view === 'login' || !currentUser) {
    return <LoginPage />;
  }

  if (activeRole === 'tutor') return <TutorDashboard />;
  if (activeRole === 'admin') return <AdminDashboard />;
  if (activeRole === 'pemilik') return <OwnerDashboard />;
  return <ParentDashboard />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppDataProvider>
        <AppRouter />
        <ToastContainer />
      </AppDataProvider>
    </ErrorBoundary>
  );
}
