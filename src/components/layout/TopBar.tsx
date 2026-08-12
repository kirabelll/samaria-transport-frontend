import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, Loader2 } from 'lucide-react';
import { searchApi } from '../../services/api';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard', '/trips': 'Trip Management',
  '/orders': 'Customer Orders', '/vehicles': 'Fleet Management',
  '/maintenance': 'Maintenance', '/inventory': 'Inventory & Store',
  '/procurement': 'Procurement', '/cashier': 'Cashier & Finance',
  '/rental': 'Rental Operations', '/customers': 'Customers',
  '/employees': 'Employees', '/hr': 'Attendance',
  '/payroll': 'Payroll', '/reports': 'Reports & Analytics',
  '/users': 'User Management', '/tracking': 'Live Tracking',
  '/telegram': 'Telegram', '/permissions': 'Permissions',
  '/handovers': 'Handovers', '/driver-ledger': 'Driver Ledger',
  '/profitability': 'Profitability', '/compliance': 'Compliance',
  '/audit': 'Audit Trail', '/payment-requests': 'Payment Requests',
};

export default function TopBar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = titles[pathname] || 'Wonde ERP';

  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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
    setOpen(false); setQ('');
    navigate(`${r.url}?ref=${encodeURIComponent(r.label)}`);
  };

  const typeColor = (t: string) => {
    switch (t) {
      case 'Trip': return 'bg-blue-100 text-blue-700';
      case 'Order': return 'bg-emerald-100 text-emerald-700';
      case 'PO': return 'bg-purple-100 text-purple-700';
      case 'WO': return 'bg-amber-100 text-amber-700';
      case 'PaymentReq': return 'bg-rose-100 text-rose-700';
      case 'Settlement': return 'bg-indigo-100 text-indigo-700';
      case 'Vehicle': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuToggle} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 lg:hidden">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-800 truncate">{title}</h1>
      </div>

      {/* Global reference search */}
      <div className="flex-1 max-w-md relative hidden md:block" ref={wrapRef}>
        <div className="relative">
          {loading
            ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search trip, order, PO, WO, invoice, plate…"
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => pickResult(r)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${typeColor(r.type)}`}>{r.type}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{r.label}</div>
                  {r.subtitle && <div className="text-xs text-gray-500 truncate">{r.subtitle}</div>}
                </div>
              </button>
            ))}
          </div>
        )}
        {open && q.length >= 2 && !loading && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-sm text-gray-500 text-center z-50">
            No matches for "<strong>{q}</strong>"
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <Bell className="w-5 h-5" />
        </button>
        <span className="text-xs text-gray-400 hidden sm:inline">
          {new Date().toLocaleDateString('en-ET', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
      </div>
    </header>
  );
}
