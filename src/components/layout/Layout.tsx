import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useIdleTimeout } from '../../hooks/useIdleTimeout';
import { useAuthStore } from '../../store/auth';
import { AlertTriangle, LogOut } from 'lucide-react';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';

function LayoutContent() {
  const { isMobileOpen, setMobileOpen, toggleMobile } = useSidebar();
  const { logout } = useAuthStore();
  const { showWarning, secondsLeft, stayLoggedIn } = useIdleTimeout();

  const closeSidebar = () => setMobileOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground antialiased">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-fadeIn"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Navigation */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:z-auto
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        <Sidebar onNavigate={closeSidebar} />
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background transition-all duration-300">
        <TopBar onMenuToggle={toggleMobile} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <Outlet />
        </main>
      </div>

      {/* Idle-timeout warning modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-modal max-w-md w-full p-6 animate-zoomIn">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-foreground font-heading">
                  Session Timeout Warning
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  You will be automatically logged out in{' '}
                  <span className="font-bold text-destructive font-mono">{secondsLeft}s</span> due
                  to inactivity.
                </p>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2.5 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="btn btn-secondary text-xs sm:text-sm"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Log out
              </button>
              <button
                onClick={stayLoggedIn}
                className="btn btn-primary text-xs sm:text-sm"
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

export default function Layout() {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
}
