import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, Building2, ClipboardList,
  Navigation, Wrench, Package, ShoppingCart, Wallet,
  TruckIcon, UserCheck, CreditCard, BarChart3, Settings, LogOut,
  ArrowRightLeft, BookOpen, ShieldAlert, TrendingUp, FileText, Send, Shield, MapPin,
  Trophy, Calendar, Calculator, CheckSquare, Bell, Fuel, AlertTriangle,
  Handshake, DollarSign, FolderOpen, Receipt
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth';
import { getUserPages } from '../../config/permissions';
import { approvalApi } from '../../services/api';

type NavItem = {
  to: string;
  key: string;
  icon: any;
  label: string;
  section?: string; // section header to display above this item
};

const nav: NavItem[] = [
  // ── Overview
  { to: '/dashboard', key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'OVERVIEW' },
  { to: '/dispatch', key: 'dispatch', icon: Calendar, label: 'Dispatch Board' },

  // ── Operations
  { to: '/orders', key: 'orders', icon: ClipboardList, label: 'Orders', section: 'OPERATIONS' },
  { to: '/trips', key: 'trips', icon: Navigation, label: 'Trips' },
  { to: '/customers', key: 'customers', icon: Building2, label: 'Customers' },
  { to: '/settlements', key: 'settlements', icon: FileText, label: 'Settlements' },

  // ── Fleet
  { to: '/vehicles', key: 'vehicles', icon: Truck, label: 'Fleet', section: 'FLEET' },
  { to: '/fleet-board', key: 'fleet-board', icon: TruckIcon, label: 'Fleet Board' },
  { to: '/maintenance', key: 'maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/fuel-control', key: 'fuel-control', icon: Fuel, label: 'Fuel Control' },
  { to: '/compliance', key: 'compliance', icon: ShieldAlert, label: 'Compliance' },
  { to: '/accidents', key: 'accidents', icon: AlertTriangle, label: 'Accidents' },
  { to: '/tracking', key: 'tracking', icon: MapPin, label: 'Live Tracking' },
  { to: '/rental', key: 'rental', icon: TruckIcon, label: 'Rental' },
  { to: '/revenue-share', key: 'revenue-share', icon: DollarSign, label: 'Revenue Share' },

  // ── People
  { to: '/employees', key: 'employees', icon: Users, label: 'Employees', section: 'PEOPLE' },
  { to: '/hr', key: 'hr', icon: UserCheck, label: 'Attendance' },
  { to: '/payroll', key: 'payroll', icon: CreditCard, label: 'Payroll' },
  { to: '/driver-ledger', key: 'driver-ledger', icon: BookOpen, label: 'Driver Ledger' },
  { to: '/driver-scoring', key: 'driver-scoring', icon: Trophy, label: 'Driver Scoring' },
  { to: '/handovers', key: 'handovers', icon: ArrowRightLeft, label: 'Handovers' },

  // ── Finance
  { to: '/cashier', key: 'cashier', icon: Wallet, label: 'Cashier', section: 'FINANCE' },
  { to: '/payment-requests', key: 'payment-requests', icon: Receipt, label: 'Payment Requests' },
  { to: '/accounting', key: 'accounting', icon: Calculator, label: 'Accounting' },
  { to: '/profitability', key: 'profitability', icon: TrendingUp, label: 'Profitability' },

  // ── Supply Chain
  { to: '/inventory', key: 'inventory', icon: Package, label: 'Inventory', section: 'SUPPLY CHAIN' },
  { to: '/procurement', key: 'procurement', icon: ShoppingCart, label: 'Procurement' },
  { to: '/procurement-report', key: 'procurement-report', icon: FileText, label: 'Procurement Report' },
  { to: '/brokers', key: 'brokers', icon: Handshake, label: 'Brokers' },

  // ── Controls & Reports
  { to: '/approvals', key: 'approvals', icon: CheckSquare, label: 'Approvals', section: 'CONTROLS' },
  { to: '/alerts', key: 'alerts', icon: Bell, label: 'Alerts' },
  { to: '/reports', key: 'reports', icon: BarChart3, label: 'Reports' },
  { to: '/audit', key: 'audit', icon: FileText, label: 'Audit Trail' },

  // ── Settings
  { to: '/company-docs', key: 'company-docs', icon: FolderOpen, label: 'Company Docs', section: 'SETTINGS' },
  { to: '/telegram', key: 'telegram', icon: Send, label: 'Telegram' },
  { to: '/users', key: 'users', icon: Settings, label: 'Users' },
  { to: '/permissions', key: 'users', icon: Shield, label: 'Permissions' },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuthStore();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    approvalApi.pendingCount().then(r => setPendingApprovals(r.data.count)).catch(() => {});
    const interval = setInterval(() => {
      approvalApi.pendingCount().then(r => setPendingApprovals(r.data.count)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const allowedPages = user ? getUserPages(user.role, user.permissions) : ['dashboard'];
  const visibleNav = nav.filter(item => allowedPages.includes(item.key as any));

  return (
    <aside className="w-56 h-full flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">Wonde ERP</p>
            <p className="text-xs text-gray-500">Transport System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {visibleNav.map(({ to, icon: Icon, label, key, section }, idx) => (
          <div key={to}>
            {section && (
              <div className={`px-2 pt-${idx === 0 ? '1' : '3'} pb-1`}>
                <p className="text-[10px] font-semibold text-gray-400 tracking-wider">{section}</p>
              </div>
            )}
            <NavLink
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {key === 'approvals' && pendingApprovals > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{pendingApprovals}</span>
              )}
            </NavLink>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 px-3 py-3">
        <div className="flex items-center gap-2 px-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button onClick={logout} className="sidebar-link-inactive w-full">
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
