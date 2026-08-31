import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, Loader2, Calendar, PanelLeft } from 'lucide-react';
import { searchApi } from '../../services/api';
import ThemeSwitch from '../ui/ThemeSwitch';
import { useSidebar } from '../../context/SidebarContext';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dispatch': 'Dispatch Board',
  '/trips': 'Trip Management',
  '/orders': 'Customer Orders',
  '/vehicles': 'Fleet Management',
  '/fleet-board': 'Fleet Board',
  '/maintenance': 'Maintenance',
  '/fuel-control': 'Fuel Control',
  '/inventory': 'Inventory & Store',
  '/procurement': 'Procurement',
  '/procurement-report': 'Procurement Report',
  '/cashier': 'Cashier & Finance',
  '/rental': 'Rental Operations',
  '/customers': 'Customers',
  '/employees': 'Employees',
  '/hr': 'Attendance & HR',
  '/payroll': 'Payroll',
  '/reports': 'Reports & Analytics',
  '/users': 'User Management',
  '/tracking': 'Live Tracking',
  '/telegram': 'Telegram Notifications',
  '/permissions': 'Role Permissions',
  '/handovers': 'Truck Handovers',
  '/driver-ledger': 'Driver Ledger',
  '/driver-scoring': 'Driver Scoring',
  '/profitability': 'Profitability Analytics',
  '/compliance': 'Fleet Compliance',
  '/audit': 'Audit Trail',
  '/payment-requests': 'Payment Requests',
  '/accounting': 'Accounting & Ledger',
  '/settlements': 'Trip Settlements',
  '/accidents': 'Accident Records',
  '/revenue-share': 'Revenue Sharing',
  '/brokers': 'Brokers Directory',
  '/company-docs': 'Company Documents',
  '/approvals': 'Approval Requests',
  '/alerts': 'System Alerts',
};

export default function TopBar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = titles[pathname] || 'Wonde ERP';
  const { toggleSidebar } = useSidebar();

  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!q || q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchApi.refs(q.trim());
        setResults(res.data.results || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const pickResult = (r: any) => {
    setOpen(false);
    setQ('');
    navigate(`${r.url}?ref=${encodeURIComponent(r.label)}`);
  };

  const typeBadgeStyle = (t: string) => {
    switch (t) {
      case 'Trip': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'Order': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'PO': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'WO': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'PaymentReq': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'Settlement': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'Vehicle': return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <header className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sm:px-6 flex-shrink-0 gap-3 sticky top-0 z-30">
      {/* Title / Hamburger / Collapse */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onMenuToggle}
          aria-label="Open menu"
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground lg:hidden border border-border/50"
        >
          <Menu className="w-4 h-4" />
        </button>

        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle sidebar (Ctrl+B)"
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground hidden lg:flex border border-border/50 transition-colors"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-border hidden lg:block mx-1" />

        <div>
          <h1 className="text-base sm:text-lg font-bold text-foreground font-heading tracking-tight truncate">
            {title}
          </h1>
        </div>
      </div>

      {/* Global Reference Search */}
      <div className="flex-1 max-w-md relative hidden md:block" ref={wrapRef}>
        <div className="relative flex items-center">
          {loading ? (
            <Loader2 className="absolute left-3 w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search trips, orders, POs, vehicles, invoices..."
            className="w-full pl-9 pr-14 py-2 text-xs sm:text-sm bg-muted/50 border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">Ctrl</span>K
          </kbd>
        </div>

        {/* Search Results Dropdown */}
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover text-popover-foreground border border-border rounded-xl shadow-dropdown max-h-96 overflow-y-auto z-50 p-1 divide-y divide-border/50 animate-slideDown">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Search Results
            </div>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => pickResult(r)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent rounded-lg transition-colors group"
              >
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeBadgeStyle(r.type)}`}>
                  {r.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {r.label}
                  </div>
                  {r.subtitle && (
                    <div className="text-[11px] text-muted-foreground truncate">{r.subtitle}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {open && q.length >= 2 && !loading && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-dropdown p-4 text-xs sm:text-sm text-muted-foreground text-center z-50">
            No matches found for "<span className="text-foreground font-semibold">{q}</span>"
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date Display */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground text-xs font-medium border border-border/50">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Theme Switcher */}
        <ThemeSwitch />

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          title="Notifications"
          aria-label="Notifications"
          onClick={() => navigate('/alerts')}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-card animate-pulse" />
        </button>
      </div>
    </header>
  );
}
