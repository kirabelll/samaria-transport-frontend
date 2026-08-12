import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useIdleTimeout } from '../../hooks/useIdleTimeout';
import { useAuthStore } from '../../store/auth';
import { AlertTriangle } from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuthStore();
  const { showWarning, secondsLeft, stayLoggedIn } = useIdleTimeout();

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={closeSidebar} />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-40 lg:static lg:z-auto
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onNavigate={closeSidebar} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* Idle-timeout warning overlay */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">Session expiring</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You will be logged out in <strong>{secondsLeft}s</strong> due to inactivity.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { logout(); window.location.href = '/login'; }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Log out now
              </button>
              <button
                onClick={stayLoggedIn}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Stay logged in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
