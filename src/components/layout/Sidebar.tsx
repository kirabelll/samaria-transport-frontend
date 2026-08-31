import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, Building2, ClipboardList,
  Navigation, Wrench, Package, ShoppingCart, Wallet,
  TruckIcon, UserCheck, CreditCard, BarChart3, Settings, LogOut,
  ArrowRightLeft, BookOpen, ShieldAlert, TrendingUp, FileText, Send, Shield, MapPin,
  Trophy, Calendar, Calculator, CheckSquare, Bell, Fuel, AlertTriangle,
  Handshake, DollarSign, FolderOpen, Receipt, ChevronRight, ChevronsUpDown,
  PanelLeftClose, PanelLeftOpen, Sparkles, UserCheck2
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../store/auth';
import { getUserPages } from '../../config/permissions';
import { approvalApi } from '../../services/api';
import { useSidebar } from '../../context/SidebarContext';

type NavItem = {
  to: string;
  key: string;
  icon: any;
  label: string;
  section?: string;
};

const nav: NavItem[] = [
  // ── Overview
  { to: '/dashboard', key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'Overview' },
  { to: '/dispatch', key: 'dispatch', icon: Calendar, label: 'Dispatch Board' },

  // ── Operations
  { to: '/orders', key: 'orders', icon: ClipboardList, label: 'Orders', section: 'Operations' },
  { to: '/trips', key: 'trips', icon: Navigation, label: 'Trips' },
  { to: '/customers', key: 'customers', icon: Building2, label: 'Customers' },
  { to: '/settlements', key: 'settlements', icon: FileText, label: 'Settlements' },

  // ── Fleet
  { to: '/vehicles', key: 'vehicles', icon: Truck, label: 'Fleet', section: 'Fleet Management' },
  { to: '/fleet-board', key: 'fleet-board', icon: TruckIcon, label: 'Fleet Board' },
  { to: '/maintenance', key: 'maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/fuel-control', key: 'fuel-control', icon: Fuel, label: 'Fuel Control' },
  { to: '/compliance', key: 'compliance', icon: ShieldAlert, label: 'Compliance' },
  { to: '/accidents', key: 'accidents', icon: AlertTriangle, label: 'Accidents' },
  { to: '/tracking', key: 'tracking', icon: MapPin, label: 'Live Tracking' },
  { to: '/rental', key: 'rental', icon: TruckIcon, label: 'Rental' },
  { to: '/revenue-share', key: 'revenue-share', icon: DollarSign, label: 'Revenue Share' },

  // ── People
  { to: '/employees', key: 'employees', icon: Users, label: 'Employees', section: 'People & HR' },
  { to: '/hr', key: 'hr', icon: UserCheck, label: 'Attendance' },
  { to: '/payroll', key: 'payroll', icon: CreditCard, label: 'Payroll' },
  { to: '/driver-ledger', key: 'driver-ledger', icon: BookOpen, label: 'Driver Ledger' },
  { to: '/driver-scoring', key: 'driver-scoring', icon: Trophy, label: 'Driver Scoring' },
  { to: '/handovers', key: 'handovers', icon: ArrowRightLeft, label: 'Handovers' },

  // ── Finance
  { to: '/cashier', key: 'cashier', icon: Wallet, label: 'Cashier', section: 'Finance & Accounts' },
  { to: '/payment-requests', key: 'payment-requests', icon: Receipt, label: 'Payment Requests' },
  { to: '/accounting', key: 'accounting', icon: Calculator, label: 'Accounting' },
  { to: '/profitability', key: 'profitability', icon: TrendingUp, label: 'Profitability' },

  // ── Supply Chain
  { to: '/inventory', key: 'inventory', icon: Package, label: 'Inventory', section: 'Supply Chain' },
  { to: '/procurement', key: 'procurement', icon: ShoppingCart, label: 'Procurement' },
  { to: '/procurement-report', key: 'procurement-report', icon: FileText, label: 'Procurement Report' },
  { to: '/brokers', key: 'brokers', icon: Handshake, label: 'Brokers' },

  // ── Controls & Reports
  { to: '/approvals', key: 'approvals', icon: CheckSquare, label: 'Approvals', section: 'Controls & Reports' },
  { to: '/alerts', key: 'alerts', icon: Bell, label: 'Alerts' },
  { to: '/reports', key: 'reports', icon: BarChart3, label: 'Reports' },
  { to: '/audit', key: 'audit', icon: FileText, label: 'Audit Trail' },

  // ── Settings
  { to: '/company-docs', key: 'company-docs', icon: FolderOpen, label: 'Company Docs', section: 'System & Settings' },
  { to: '/telegram', key: 'telegram', icon: Send, label: 'Telegram' },
  { to: '/users', key: 'users', icon: Settings, label: 'Users' },
  { to: '/permissions', key: 'users', icon: Shield, label: 'Permissions' },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { user, logout } = useAuthStore();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    approvalApi.pendingCount().then(r => setPendingApprovals(r.data.count)).catch(() => {});
    const interval = setInterval(() => {
      approvalApi.pendingCount().then(r => setPendingApprovals(r.data.count)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allowedPages = user ? getUserPages(user.role, user.permissions) : ['dashboard'];
  const visibleNav = nav.filter(item => allowedPages.includes(item.key as any));

  return (
    <aside
      className={`h-full flex-shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col justify-between select-none transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[70px]' : 'w-64'
      }`}
    >
      {/* ─── Team Switcher / Brand Header ─── */}
      <div className="h-16 px-3 flex items-center justify-between border-b border-sidebar-border bg-sidebar/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold flex-shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden animate-fadeIn">
              <h2 className="text-sm font-bold tracking-tight text-foreground font-heading truncate leading-tight">
                Wonde ERP
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium truncate">
                Transport & Logistics
              </p>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button (hidden on mobile, visible on desktop) */}
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            title="Collapse sidebar (Ctrl+B)"
            aria-label="Collapse sidebar"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors hidden lg:flex items-center justify-center"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ─── Navigation List ─── */}
      <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'} py-3 space-y-1 overflow-y-auto overflow-x-hidden`}>
        {visibleNav.map(({ to, icon: Icon, label, key, section }) => (
          <div key={to} className="space-y-0.5">
            {/* Section Heading (only in expanded mode) */}
            {section && !isCollapsed && (
              <div className="px-2.5 pt-3 pb-1.5 first:pt-0">
                <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider font-heading">
                  {section}
                </p>
              </div>
            )}
            {section && isCollapsed && (
              <div className="w-full my-2 border-t border-sidebar-border/60" />
            )}

            <div className="relative group">
              <NavLink
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'px-3'
                  } py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                        isActive
                          ? 'text-primary-foreground'
                          : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="flex-1 ml-3 truncate text-xs sm:text-sm">{label}</span>
                    )}

                    {/* Pending Approvals Badge */}
                    {key === 'approvals' && pendingApprovals > 0 && (
                      isCollapsed ? (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-white text-blue-600'
                              : 'bg-destructive text-destructive-foreground animate-pulse'
                          }`}
                        >
                          {pendingApprovals}
                        </span>
                      )
                    )}

                    {!isCollapsed && isActive && (
                      <ChevronRight className="w-3.5 h-3.5 opacity-60 ml-auto" />
                    )}
                  </>
                )}
              </NavLink>

              {/* Floating Tooltip in Collapsed Mode */}
              {isCollapsed && (
                <div className="fixed left-[78px] hidden group-hover:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-popover text-popover-foreground border border-border shadow-dropdown text-xs font-medium z-50 pointer-events-none whitespace-nowrap animate-fadeIn">
                  <span>{label}</span>
                  {key === 'approvals' && pendingApprovals > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {pendingApprovals}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── Expand Button (Collapsed Desktop Mode) ─── */}
      {isCollapsed && (
        <div className="p-2 border-t border-sidebar-border hidden lg:flex justify-center">
          <button
            onClick={toggleSidebar}
            title="Expand sidebar (Ctrl+B)"
            aria-label="Expand sidebar"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Nav User Profile Footer ─── */}
      <div className="p-2 border-t border-sidebar-border bg-sidebar/50 relative" ref={userMenuRef}>
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'p-2 justify-between'
          } rounded-xl hover:bg-sidebar-accent transition-colors group text-left`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email || 'admin@wonde.et'}
                </p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-foreground" />
          )}
        </button>

        {/* User Popup Menu (Transport Shadcn NavUser style) */}
        {userMenuOpen && (
          <div
            className={`absolute ${
              isCollapsed ? 'left-full ml-2 bottom-2' : 'bottom-full left-2 right-2 mb-2'
            } w-56 bg-popover text-popover-foreground rounded-xl border border-border shadow-dropdown p-1.5 z-50 animate-slideDown`}
          >
            <div className="px-2.5 py-2 border-b border-border mb-1">
              <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground uppercase font-medium">
                {user?.role?.replace('_', ' ') || 'Admin'}
              </span>
            </div>

            <NavLink
              to="/users"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <UserCheck2 className="w-3.5 h-3.5" />
              <span>User Profile</span>
            </NavLink>

            <NavLink
              to="/permissions"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Roles & Permissions</span>
            </NavLink>

            <div className="my-1 border-t border-border" />

            <button
              onClick={() => {
                setUserMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
