import { useEffect, useState } from 'react';
import {
  Truck, Navigation, ClipboardList, AlertTriangle, Activity, Wrench, Package,
  Users, TrendingUp, DollarSign, Percent, Fuel, Shield, Bell, CheckCircle,
  Clock, Lock, FileText, ArrowUpRight, ArrowDownRight, Wallet, BarChart3,
  Calendar, Search, ChevronRight, AlertCircle, RefreshCw, ExternalLink,
  LucideIcon
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Area, AreaChart, Legend
} from 'recharts';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<'overview' | 'cashier' | 'receivables' | 'delivery' | 'truck' | 'alerts' | 'financial'>('overview');
  const [deliveryPeriod, setDeliveryPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [truckSearch, setTruckSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState<'all' | 'insurance' | 'compliance' | 'maintenance'>('all');

  const fetchDashboard = () => {
    setLoading(true);
    dashboardApi.get()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-gray-400 space-y-3">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
        <p className="text-sm font-medium text-gray-500">Loading comprehensive dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <AlertTriangle className="text-red-500 mx-auto mb-2" size={32} />
        <h3 className="text-lg font-semibold text-red-800">Failed to load dashboard data</h3>
        <p className="text-sm text-red-600 mb-4">Please check your connection or backend server status.</p>
        <button onClick={fetchDashboard} className="btn-primary">Retry</button>
      </div>
    );
  }

  const fmt = (n: number) => `ETB ${(n || 0).toLocaleString()}`;
  const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

  const cashierSummary = data.cashierSummary || {
    totalBalance: data.cashierBalance || 0,
    activeCashiersCount: data.cashiers?.length || 0,
    todayCashIn: 0,
    todayCashOut: 0,
    cashiers: data.cashiers || []
  };

  const receivablesSummary = data.receivablesSummary || {
    totalReceivable: data.outstandingInvoices?.total || 0,
    totalOverdue: 0,
    totalBilled: 0,
    totalCollected: 0,
    collectionRate: 0,
    customerDetails: data.uncollectedMoney?.details || [],
    pendingSettlementsCount: data.financial?.pendingSettlements || 0
  };

  const deliverySummary = data.deliverySummary || {
    day: data.today || { totalTrips: 0, activeTrips: 0, completedTrips: 0, tonnage: 0, revenue: 0, cost: 0, profit: 0 },
    week: { totalTrips: 0, completedTrips: 0, tonnage: 0, revenue: 0, cost: 0, profit: 0 },
    month: data.monthSummary || { totalTrips: 0, completedTrips: 0, tonnage: 0, revenue: 0, cost: 0, profit: 0, shortageRate: data.shortageRate || 0 },
    trend: data.revenueTrend || []
  };

  const truckSummary = data.truckSummary || {
    todayGarageExpense: 0,
    weekGarageExpense: 0,
    monthGarageExpense: data.ytd?.maintenanceCost || 0,
    activeWorkOrdersCount: 0,
    truckExpenses: [],
    garageTrend: []
  };

  const alertSummary = data.alertSummary || {
    totalInsuranceAlerts: 0,
    expiredInsuranceCount: 0,
    urgentInsuranceCount: 0,
    warningInsuranceCount: 0,
    insuranceAlerts: [],
    complianceAlerts: [],
    maintenanceAlerts: [],
    vehicleStatus: data.vehicles || { total: 0, active: 0, maintenance: 0, breakdown: 0, inactive: 0, locked: 0 }
  };

  // Filtered lists
  const filteredTrucks = (truckSummary.truckExpenses || []).filter((t: any) =>
    t.plateNumber?.toLowerCase().includes(truckSearch.toLowerCase()) ||
    t.make?.toLowerCase().includes(truckSearch.toLowerCase()) ||
    t.model?.toLowerCase().includes(truckSearch.toLowerCase())
  );

  const filteredCustomers = (receivablesSummary.customerDetails || []).filter((c: any) =>
    c.customerName?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const sections: {
    key: 'overview' | 'cashier' | 'receivables' | 'delivery' | 'truck' | 'alerts' | 'financial';
    label: string;
    icon: LucideIcon;
    badge?: number;
    alert?: boolean;
  }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'cashier', label: '1. Cashier Accounts', icon: Wallet, badge: cashierSummary.activeCashiersCount },
    { key: 'receivables', label: '2. Receivables', icon: DollarSign, badge: receivablesSummary.customerDetails?.length },
    { key: 'delivery', label: '3. Delivery Summary', icon: Navigation, badge: deliverySummary.day?.totalTrips },
    { key: 'truck', label: '4. Truck & Garage', icon: Truck, badge: truckSummary.activeWorkOrdersCount },
    { key: 'alerts', label: '5. Alerts & Expiries', icon: AlertTriangle, badge: (alertSummary.insuranceAlerts?.length || 0) + (alertSummary.complianceAlerts?.length || 0), alert: (alertSummary.expiredInsuranceCount || 0) > 0 },
  ];

  return (
    <div className="space-y-6">
      {/* ── TOP 5 EXECUTIVE SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Cashier Account */}
        <div
          onClick={() => setSection('cashier')}
          className="card cursor-pointer hover:shadow-md transition-all border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/30 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">1. Cashier Account</span>
            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
              <Wallet size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(cashierSummary.totalBalance)}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-emerald-100">
            <span>{cashierSummary.activeCashiersCount} Active Cashiers</span>
            <span className="text-emerald-600 font-medium">Details →</span>
          </div>
        </div>

        {/* 2. Receivable Account */}
        <div
          onClick={() => setSection('receivables')}
          className="card cursor-pointer hover:shadow-md transition-all border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/30 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">2. Receivable Account</span>
            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-900">{fmt(receivablesSummary.totalReceivable)}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-blue-100">
            <span>Overdue: <strong className="text-red-600">{fmt(receivablesSummary.totalOverdue)}</strong></span>
            <span className="text-blue-600 font-medium">Aging →</span>
          </div>
        </div>

        {/* 3. Delivery Summary */}
        <div
          onClick={() => setSection('delivery')}
          className="card cursor-pointer hover:shadow-md transition-all border-l-4 border-l-indigo-500 bg-gradient-to-br from-white to-indigo-50/30 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">3. Delivery Summary</span>
            <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
              <Navigation size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900">{deliverySummary.day?.totalTrips ?? 0} <span className="text-xs font-normal text-gray-500">Today</span></p>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-indigo-100">
            <span>W: <strong>{deliverySummary.week?.totalTrips ?? 0}</strong> | M: <strong>{deliverySummary.month?.totalTrips ?? 0}</strong></span>
            <span className="text-indigo-600 font-medium">Trips →</span>
          </div>
        </div>

        {/* 4. Truck & Garage Summary */}
        <div
          onClick={() => setSection('truck')}
          className="card cursor-pointer hover:shadow-md transition-all border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/30 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">4. Truck & Garage</span>
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
              <Wrench size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{fmt(truckSummary.monthGarageExpense)}</p>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-amber-100">
            <span>Today: {fmt(truckSummary.todayGarageExpense)}</span>
            <span className="text-amber-600 font-medium">Per Truck →</span>
          </div>
        </div>

        {/* 5. Alert Summary */}
        <div
          onClick={() => setSection('alerts')}
          className="card cursor-pointer hover:shadow-md transition-all border-l-4 border-l-rose-500 bg-gradient-to-br from-white to-rose-50/30 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">5. Alert Summary</span>
            <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-rose-600">{alertSummary.totalInsuranceAlerts}</p>
            <span className="text-xs text-gray-500">Expiring / Expired</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-rose-100">
            <span>{alertSummary.expiredInsuranceCount > 0 ? <strong className="text-red-600">{alertSummary.expiredInsuranceCount} Expired!</strong> : 'All Valid (>7d)'}</span>
            <span className="text-rose-600 font-medium">Days Left →</span>
          </div>
        </div>
      </div>

      {/* ── SECTION NAVIGATION TABS ── */}
      <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-xl overflow-x-auto border border-gray-200">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-all ${
              section === s.key
                ? 'bg-white text-blue-600 shadow-sm border border-gray-100'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <s.icon size={16} className={section === s.key ? 'text-blue-600' : 'text-gray-400'} />
            {s.label}
            {s.badge !== undefined && s.badge > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                s.alert ? 'bg-red-100 text-red-700' : section === s.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'
              }`}>
                {s.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: OVERVIEW
      ══════════════════════════════════════════════════════════ */}
      {section === 'overview' && (
        <div className="space-y-6">
          {/* Quick stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Fleet Size" value={alertSummary.vehicleStatus?.total ?? 0} icon={Truck} color="blue" sub={`${alertSummary.vehicleStatus?.active ?? 0} Active Trucks`} />
            <StatCard title="Today's Trips" value={deliverySummary.day?.totalTrips ?? 0} icon={Navigation} color="green" sub={`${(deliverySummary.day?.tonnage || 0).toFixed(1)} tons delivered`} />
            <StatCard title="Today's Revenue" value={fmt(deliverySummary.day?.revenue)} icon={TrendingUp} color="orange" sub="Gross freight revenue" />
            <StatCard title="Total Cashier Funds" value={fmt(cashierSummary.totalBalance)} icon={Wallet} color="purple" sub={`${cashierSummary.activeCashiersCount} active cashiers`} />
          </div>

          {/* Delivery & Revenue Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title">7-Day Delivery & Trip Trend</h3>
                <span className="text-xs text-gray-400 font-medium">Trips & Tonnage</span>
              </div>
              {deliverySummary.trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deliverySummary.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="dayName" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}t`} />
                    <Tooltip formatter={(value, name) => [name === 'revenue' ? `ETB ${value.toLocaleString()}` : value, name]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="trips" fill="#3b82f6" name="Trips" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="tonnage" fill="#10b981" name="Tons" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-400 text-center py-12">No delivery data yet</div>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title">7-Day Revenue vs Expenses</h3>
                <span className="text-xs text-gray-400 font-medium">Daily Cash In/Out</span>
              </div>
              {deliverySummary.trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={deliverySummary.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="dayName" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`ETB ${v.toLocaleString()}`]} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" fill="#3b82f620" stroke="#3b82f6" strokeWidth={2} name="Freight Revenue" />
                    <Area type="monotone" dataKey="cost" fill="#ef444420" stroke="#ef4444" strokeWidth={2} name="Trip Direct Cost" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-400 text-center py-12">No financial trend data yet</div>
              )}
            </div>
          </div>

          {/* Quick 3-Column Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cashier Quick Card */}
            <div className="card">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Wallet size={16} className="text-emerald-600" /> Cashier Balances
                </h4>
                <button onClick={() => setSection('cashier')} className="text-xs text-blue-600 font-medium hover:underline">View All</button>
              </div>
              <div className="space-y-3 mt-3">
                {cashierSummary.cashiers.slice(0, 4).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.code} • {c.location}</p>
                    </div>
                    <span className="font-bold text-gray-900">{fmt(c.currentBalance || c.balance)}</span>
                  </div>
                ))}
                {cashierSummary.cashiers.length === 0 && (
                  <p className="text-xs text-gray-400 py-4 text-center">No cashiers registered</p>
                )}
              </div>
            </div>

            {/* Uncollected Receivables Quick Card */}
            <div className="card">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <DollarSign size={16} className="text-blue-600" /> Top Receivables
                </h4>
                <button onClick={() => setSection('receivables')} className="text-xs text-blue-600 font-medium hover:underline">View All</button>
              </div>
              <div className="space-y-3 mt-3">
                {(receivablesSummary.customerDetails || []).slice(0, 4).map((cust: any) => (
                  <div key={cust.customerId} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{cust.customerName}</p>
                      <p className="text-xs text-gray-400">{cust.invoiceCount} invoices</p>
                    </div>
                    <span className="font-bold text-blue-700">{fmt(cust.remainingBalance)}</span>
                  </div>
                ))}
                {(!receivablesSummary.customerDetails?.length) && (
                  <p className="text-xs text-gray-400 py-4 text-center">No outstanding receivables</p>
                )}
              </div>
            </div>

            {/* Urgent Alerts Quick Card */}
            <div className="card">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-600" /> Compliance & Insurance
                </h4>
                <button onClick={() => setSection('alerts')} className="text-xs text-blue-600 font-medium hover:underline">View All</button>
              </div>
              <div className="space-y-3 mt-3">
                {(alertSummary.insuranceAlerts || []).slice(0, 4).map((a: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-bold text-gray-900">{a.plateNumber}</p>
                      <p className="text-xs text-gray-400">Insurance ({a.expiryDate})</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      a.daysRemaining < 0
                        ? 'bg-red-100 text-red-700'
                        : a.daysRemaining <= 7
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {a.daysRemaining < 0 ? `Expired ${Math.abs(a.daysRemaining)}d ago` : `${a.daysRemaining} days left`}
                    </span>
                  </div>
                ))}
                {(!alertSummary.insuranceAlerts?.length) && (
                  <p className="text-xs text-emerald-600 py-4 text-center flex items-center justify-center gap-1">
                    <CheckCircle size={14} /> All insurance policies up to date
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Operations Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-0">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="section-title">Recent Trips</h3>
                <Link to="/trips" className="text-xs text-blue-600 hover:underline">Full Trip Log →</Link>
              </div>
              <div className="table-container rounded-none border-0">
                <table className="table">
                  <thead><tr>
                    <th className="th">Trip #</th><th className="th">Vehicle</th><th className="th">Status</th><th className="th">Tons</th><th className="th">Revenue</th>
                  </tr></thead>
                  <tbody>
                    {(data.recentTrips || []).map((t: any) => (
                      <tr key={t.id} className="tr">
                        <td className="td font-mono text-xs font-semibold">{t.tripNumber}</td>
                        <td className="td font-medium">{t.vehicle?.plateNumber}</td>
                        <td className="td"><StatusBadge status={t.status} /></td>
                        <td className="td">{t.deliveredQuantityTons || t.loadedQuantityTons ? `${t.deliveredQuantityTons || t.loadedQuantityTons} t` : '-'}</td>
                        <td className="td font-semibold text-gray-900">{t.revenue ? fmt(t.revenue) : '-'}</td>
                      </tr>
                    ))}
                    {(!data.recentTrips?.length) && (
                      <tr><td colSpan={5} className="td text-center text-gray-400 py-8">No recent trips found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-0">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="section-title">Recent Customer Orders</h3>
                <Link to="/dispatch" className="text-xs text-blue-600 hover:underline">Dispatch Board →</Link>
              </div>
              <div className="table-container rounded-none border-0">
                <table className="table">
                  <thead><tr>
                    <th className="th">Order #</th><th className="th">Customer</th><th className="th">Qty</th><th className="th">Status</th>
                  </tr></thead>
                  <tbody>
                    {(data.recentOrders || []).map((o: any) => (
                      <tr key={o.id} className="tr">
                        <td className="td font-mono text-xs font-semibold">{o.orderNumber}</td>
                        <td className="td font-medium">{o.customer?.companyName}</td>
                        <td className="td">{o.quantity} t</td>
                        <td className="td"><StatusBadge status={o.status} /></td>
                      </tr>
                    ))}
                    {(!data.recentOrders?.length) && (
                      <tr><td colSpan={4} className="td text-center text-gray-400 py-8">No recent orders found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: CASHIER ACCOUNT SUMMARY (Requirement 1)
      ══════════════════════════════════════════════════════════ */}
      {section === 'cashier' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="text-emerald-600" /> 1. Cashier Account Summary
              </h2>
              <p className="text-sm text-gray-500">Real-time balances, today's cash movement, and active cashier registers.</p>
            </div>
            <Link to="/cashier" className="btn-primary flex items-center gap-2 text-sm self-start">
              Open Cashier Manager <ExternalLink size={14} />
            </Link>
          </div>

          {/* Cashier Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
              <p className="text-xs font-semibold uppercase text-emerald-700">Total Cashier Balance</p>
              <p className="text-3xl font-extrabold text-emerald-900 mt-1">{fmt(cashierSummary.totalBalance)}</p>
              <p className="text-xs text-gray-500 mt-1">Sum across all cashier registers</p>
            </div>
            <div className="card bg-gradient-to-br from-blue-50 to-white border-blue-200">
              <p className="text-xs font-semibold uppercase text-blue-700">Active Cashiers</p>
              <p className="text-3xl font-extrabold text-blue-900 mt-1">{cashierSummary.activeCashiersCount}</p>
              <p className="text-xs text-gray-500 mt-1">Authorized operating cashiers</p>
            </div>
            <div className="card bg-gradient-to-br from-green-50 to-white border-green-200">
              <p className="text-xs font-semibold uppercase text-green-700">Today Cash Inflow</p>
              <p className="text-3xl font-extrabold text-green-700 mt-1">{fmt(cashierSummary.todayCashIn)}</p>
              <p className="text-xs text-gray-500 mt-1">Received from trips/collections</p>
            </div>
            <div className="card bg-gradient-to-br from-rose-50 to-white border-rose-200">
              <p className="text-xs font-semibold uppercase text-rose-700">Today Cash Outflow</p>
              <p className="text-3xl font-extrabold text-rose-700 mt-1">{fmt(cashierSummary.todayCashOut)}</p>
              <p className="text-xs text-gray-500 mt-1">Disbursed (fuel, advance, garage)</p>
            </div>
          </div>

          {/* Cashier Detailed Table */}
          <div className="card p-0">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="section-title">Cashier Register Accounts</h3>
                <p className="text-xs text-gray-400">Current balances and session statuses</p>
              </div>
            </div>
            <div className="table-container rounded-none border-0">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Cashier Name</th>
                    <th className="th">Code</th>
                    <th className="th">Location</th>
                    <th className="th">Session Status</th>
                    <th className="th">Today In</th>
                    <th className="th">Today Out</th>
                    <th className="th text-right">Current Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {cashierSummary.cashiers.map((c: any) => (
                    <tr key={c.id} className="tr">
                      <td className="td font-bold text-gray-900">{c.name}</td>
                      <td className="td font-mono text-xs text-gray-600">{c.code}</td>
                      <td className="td text-gray-500">{c.location || 'Main Office'}</td>
                      <td className="td">
                        {c.hasOpenSession ? (
                          <span className="badge bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Open Session
                          </span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-600">Closed</span>
                        )}
                      </td>
                      <td className="td text-green-600 font-medium">{c.todayIn ? fmt(c.todayIn) : '-'}</td>
                      <td className="td text-rose-600 font-medium">{c.todayOut ? fmt(c.todayOut) : '-'}</td>
                      <td className="td text-right font-bold text-lg text-emerald-700">{fmt(c.currentBalance)}</td>
                    </tr>
                  ))}
                  {cashierSummary.cashiers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="td text-center text-gray-400 py-10">No cashier accounts available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: RECEIVABLE ACCOUNT SUMMARY (Requirement 2)
      ══════════════════════════════════════════════════════════ */}
      {section === 'receivables' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="text-blue-600" /> 2. Receivable Account (Uncollected Money)
              </h2>
              <p className="text-sm text-gray-500">Track outstanding balances, collection efficiency, and overdue client invoices.</p>
            </div>
            <Link to="/accounting" className="btn-primary flex items-center gap-2 text-sm self-start">
              Open Accounting / Invoices <ExternalLink size={14} />
            </Link>
          </div>

          {/* Receivable Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-blue-50 to-white border-blue-200">
              <p className="text-xs font-semibold uppercase text-blue-700">Total Outstanding Balance</p>
              <p className="text-3xl font-extrabold text-blue-900 mt-1">{fmt(receivablesSummary.totalReceivable)}</p>
              <p className="text-xs text-gray-500 mt-1">Across all open client invoices</p>
            </div>
            <div className="card bg-gradient-to-br from-rose-50 to-white border-rose-200">
              <p className="text-xs font-semibold uppercase text-rose-700">Total Overdue Amount</p>
              <p className="text-3xl font-extrabold text-rose-700 mt-1">{fmt(receivablesSummary.totalOverdue)}</p>
              <p className="text-xs text-gray-500 mt-1">{receivablesSummary.overdueCount ?? 0} invoices past due date</p>
            </div>
            <div className="card bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
              <p className="text-xs font-semibold uppercase text-emerald-700">Total Collected</p>
              <p className="text-3xl font-extrabold text-emerald-800 mt-1">{fmt(receivablesSummary.totalCollected)}</p>
              <p className="text-xs text-gray-500 mt-1">Collection Rate: <strong>{receivablesSummary.collectionRate}%</strong></p>
            </div>
            <div className="card bg-gradient-to-br from-purple-50 to-white border-purple-200">
              <p className="text-xs font-semibold uppercase text-purple-700">Pending Settlements</p>
              <p className="text-3xl font-extrabold text-purple-900 mt-1">{receivablesSummary.pendingSettlementsCount ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Draft / In-review settlements</p>
            </div>
          </div>

          {/* Customer Receivables Table */}
          <div className="card p-0">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="section-title">Uncollected Money By Customer</h3>
                <p className="text-xs text-gray-400">Detailed customer receivables breakdown</p>
              </div>
              <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customer name..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="input pl-9 text-xs py-1.5 w-full"
                />
              </div>
            </div>
            <div className="table-container rounded-none border-0">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Customer Name</th>
                    <th className="th">Phone</th>
                    <th className="th">Open Invoices</th>
                    <th className="th">Total Billed</th>
                    <th className="th">Total Collected</th>
                    <th className="th">Overdue</th>
                    <th className="th text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c: any) => (
                    <tr key={c.customerId} className="tr">
                      <td className="td font-bold text-gray-900">{c.customerName}</td>
                      <td className="td text-gray-500 text-xs">{c.phone || '-'}</td>
                      <td className="td">
                        <span className="badge bg-gray-100 text-gray-700 font-semibold">
                          {c.invoiceCount} {c.invoiceCount === 1 ? 'inv' : 'invs'}
                        </span>
                      </td>
                      <td className="td text-gray-700">{fmt(c.totalBilled)}</td>
                      <td className="td text-emerald-600 font-medium">{fmt(c.totalCollected)}</td>
                      <td className="td">
                        {c.overdueAmount > 0 ? (
                          <span className="text-rose-600 font-bold text-xs bg-rose-50 px-2 py-0.5 rounded">
                            {fmt(c.overdueAmount)} ({c.overdueCount} overdue)
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="td text-right font-bold text-lg text-blue-800">{fmt(c.remainingBalance)}</td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="td text-center text-gray-400 py-10">No customer receivables found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4: DELIVERY SUMMARY (Requirement 3: Per Day, Per Week, Per Month)
      ══════════════════════════════════════════════════════════ */}
      {section === 'delivery' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Navigation className="text-indigo-600" /> 3. Delivery Summary (Day, Week, Month)
              </h2>
              <p className="text-sm text-gray-500">Trip volumes, delivered tonnage, freight revenues, and shortage rates across time periods.</p>
            </div>
            {/* Day / Week / Month Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 self-start">
              <button
                onClick={() => setDeliveryPeriod('day')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  deliveryPeriod === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Today (Per Day)
              </button>
              <button
                onClick={() => setDeliveryPeriod('week')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  deliveryPeriod === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                This Week (7 Days)
              </button>
              <button
                onClick={() => setDeliveryPeriod('month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  deliveryPeriod === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {/* 3 Comparative Cards (Day vs Week vs Month) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Per Day */}
            <div className={`card border-2 transition-all ${deliveryPeriod === 'day' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-1 rounded">Today Summary</span>
                <Clock size={16} className="text-indigo-500" />
              </div>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">Total Trips:</span>
                  <span className="text-2xl font-black text-gray-900">{deliverySummary.day?.totalTrips ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Completed / Active:</span>
                  <span className="font-semibold text-emerald-600">{deliverySummary.day?.completedTrips ?? 0} completed / {deliverySummary.day?.activeTrips ?? 0} active</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Tonnage Delivered:</span>
                  <span className="font-bold text-gray-900">{(deliverySummary.day?.tonnage || 0).toFixed(1)} tons</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Freight Revenue:</span>
                  <span className="font-bold text-emerald-700">{fmt(deliverySummary.day?.revenue)}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Direct Trip Cost:</span>
                  <span className="font-semibold text-rose-600">{fmt(deliverySummary.day?.cost)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t-2 border-gray-100">
                  <span className="font-bold text-gray-700">Today Profit:</span>
                  <span className={`font-extrabold text-sm ${(deliverySummary.day?.profit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {fmt(deliverySummary.day?.profit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Per Week */}
            <div className={`card border-2 transition-all ${deliveryPeriod === 'week' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-1 rounded">Week Summary (7d)</span>
                <Calendar size={16} className="text-blue-500" />
              </div>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">Total Trips:</span>
                  <span className="text-2xl font-black text-gray-900">{deliverySummary.week?.totalTrips ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Completed Trips:</span>
                  <span className="font-semibold text-emerald-600">{deliverySummary.week?.completedTrips ?? 0} completed</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Tonnage Delivered:</span>
                  <span className="font-bold text-gray-900">{(deliverySummary.week?.tonnage || 0).toFixed(1)} tons</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Freight Revenue:</span>
                  <span className="font-bold text-emerald-700">{fmt(deliverySummary.week?.revenue)}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Direct Trip Cost:</span>
                  <span className="font-semibold text-rose-600">{fmt(deliverySummary.week?.cost)}</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t-2 border-gray-100">
                  <span className="font-bold text-gray-700">Week Profit:</span>
                  <span className={`font-extrabold text-sm ${(deliverySummary.week?.profit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {fmt(deliverySummary.week?.profit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Per Month */}
            <div className={`card border-2 transition-all ${deliveryPeriod === 'month' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-1 rounded">Month Summary</span>
                <BarChart3 size={16} className="text-purple-500" />
              </div>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500">Total Trips:</span>
                  <span className="text-2xl font-black text-gray-900">{deliverySummary.month?.totalTrips ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Completed Trips:</span>
                  <span className="font-semibold text-emerald-600">{deliverySummary.month?.completedTrips ?? 0} completed</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Tonnage Delivered:</span>
                  <span className="font-bold text-gray-900">{(deliverySummary.month?.tonnage || 0).toFixed(1)} tons</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Freight Revenue:</span>
                  <span className="font-bold text-emerald-700">{fmt(deliverySummary.month?.revenue)}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100">
                  <span className="text-gray-500">Shortage Rate:</span>
                  <span className={`font-semibold ${(deliverySummary.month?.shortageRate || 0) > 2 ? 'text-rose-600' : 'text-gray-700'}`}>
                    {deliverySummary.month?.shortageRate ?? 0}% ({deliverySummary.month?.shortageTons ?? 0} t)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t-2 border-gray-100">
                  <span className="font-bold text-gray-700">Month Profit:</span>
                  <span className={`font-extrabold text-sm ${(deliverySummary.month?.profit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {fmt(deliverySummary.month?.profit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Day-by-Day Delivery Breakdown Chart */}
          <div className="card">
            <h3 className="section-title mb-4">Daily Delivery Performance (Past 7 Days)</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Day</th>
                    <th className="th">Trips Launched</th>
                    <th className="th">Trips Completed</th>
                    <th className="th">Tons Delivered</th>
                    <th className="th">Revenue</th>
                    <th className="th">Direct Cost</th>
                    <th className="th text-right">Net Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {(deliverySummary.trend || []).map((d: any, idx: number) => {
                    const margin = (d.revenue || 0) - (d.cost || 0);
                    return (
                      <tr key={idx} className="tr">
                        <td className="td font-mono text-xs">{d.date}</td>
                        <td className="td font-bold text-gray-800">{d.dayName}</td>
                        <td className="td font-medium">{d.trips}</td>
                        <td className="td text-emerald-600 font-semibold">{d.completedTrips}</td>
                        <td className="td font-bold">{d.tonnage} t</td>
                        <td className="td text-emerald-700 font-semibold">{fmt(d.revenue)}</td>
                        <td className="td text-rose-600">{fmt(d.cost)}</td>
                        <td className={`td text-right font-bold ${margin >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {fmt(margin)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 5: TRUCK SUMMARY (Requirement 4: Garage Expense Per Day, Per Truck)
      ══════════════════════════════════════════════════════════ */}
      {section === 'truck' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Wrench className="text-amber-600" /> 4. Truck Summary (Garage Expense Per Day & Per Truck)
              </h2>
              <p className="text-sm text-gray-500">Monitor vehicle repair expenses, daily garage costs, and per-truck maintenance histories.</p>
            </div>
            <Link to="/maintenance" className="btn-primary flex items-center gap-2 text-sm self-start">
              Open Maintenance / Garage <ExternalLink size={14} />
            </Link>
          </div>

          {/* Garage Expense Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-amber-50 to-white border-amber-200">
              <p className="text-xs font-semibold uppercase text-amber-700">Today's Garage Expense</p>
              <p className="text-3xl font-extrabold text-amber-900 mt-1">{fmt(truckSummary.todayGarageExpense)}</p>
              <p className="text-xs text-gray-500 mt-1">Repairs incurred today</p>
            </div>
            <div className="card bg-gradient-to-br from-orange-50 to-white border-orange-200">
              <p className="text-xs font-semibold uppercase text-orange-700">This Week's Garage Expense</p>
              <p className="text-3xl font-extrabold text-orange-900 mt-1">{fmt(truckSummary.weekGarageExpense)}</p>
              <p className="text-xs text-gray-500 mt-1">Last 7 days maintenance</p>
            </div>
            <div className="card bg-gradient-to-br from-rose-50 to-white border-rose-200">
              <p className="text-xs font-semibold uppercase text-rose-700">This Month's Garage Expense</p>
              <p className="text-3xl font-extrabold text-rose-900 mt-1">{fmt(truckSummary.monthGarageExpense)}</p>
              <p className="text-xs text-gray-500 mt-1">Current month fleet repair spend</p>
            </div>
            <div className="card bg-gradient-to-br from-blue-50 to-white border-blue-200">
              <p className="text-xs font-semibold uppercase text-blue-700">Active Work Orders</p>
              <p className="text-3xl font-extrabold text-blue-900 mt-1">{truckSummary.activeWorkOrdersCount}</p>
              <p className="text-xs text-gray-500 mt-1">Trucks currently undergoing repair</p>
            </div>
          </div>

          {/* Per Truck Garage Expense Table */}
          <div className="card p-0">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="section-title">Maintenance & Garage Expenses Per Truck</h3>
                <p className="text-xs text-gray-400">Search and review total repair spend per individual vehicle</p>
              </div>
              <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search truck plate or make..."
                  value={truckSearch}
                  onChange={e => setTruckSearch(e.target.value)}
                  className="input pl-9 text-xs py-1.5 w-full"
                />
              </div>
            </div>
            <div className="table-container rounded-none border-0">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Plate Number</th>
                    <th className="th">Truck Details</th>
                    <th className="th">Status</th>
                    <th className="th">Current Km</th>
                    <th className="th">Today Exp</th>
                    <th className="th">Week Exp</th>
                    <th className="th">Month Exp</th>
                    <th className="th">Work Orders</th>
                    <th className="th text-right">Total Garage Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrucks.map((t: any) => (
                    <tr key={t.id} className="tr">
                      <td className="td font-bold text-gray-900">
                        <Link to={`/vehicles/${t.id}`} className="hover:text-blue-600 hover:underline">
                          {t.plateNumber}
                        </Link>
                      </td>
                      <td className="td text-xs text-gray-600">{t.make} {t.model} ({t.category || 'Truck'})</td>
                      <td className="td"><StatusBadge status={t.status} /></td>
                      <td className="td font-mono text-xs text-gray-600">{t.currentKm ? `${t.currentKm.toLocaleString()} km` : '-'}</td>
                      <td className="td text-xs">{t.todayExpense > 0 ? <strong className="text-amber-700">{fmt(t.todayExpense)}</strong> : '-'}</td>
                      <td className="td text-xs">{t.weekExpense > 0 ? <strong className="text-orange-700">{fmt(t.weekExpense)}</strong> : '-'}</td>
                      <td className="td text-xs font-bold text-rose-700">{t.monthExpense > 0 ? fmt(t.monthExpense) : '-'}</td>
                      <td className="td text-xs">
                        <span className="badge bg-gray-100 text-gray-700">
                          {t.workOrdersCount} total {t.activeWorkOrders > 0 && <span className="text-rose-600 font-bold">({t.activeWorkOrders} in-progress)</span>}
                        </span>
                      </td>
                      <td className="td text-right font-extrabold text-sm text-gray-900">{fmt(t.totalExpense)}</td>
                    </tr>
                  ))}
                  {filteredTrucks.length === 0 && (
                    <tr>
                      <td colSpan={9} className="td text-center text-gray-400 py-10">No vehicles found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 6: ALERT SUMMARY (Requirement 5: Insurance & Days Before Expiry, Truck Compliance)
      ══════════════════════════════════════════════════════════ */}
      {section === 'alerts' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="text-rose-600" /> 5. Alert Summary (Insurance & Expiry Countdown)
              </h2>
              <p className="text-sm text-gray-500">Track insurance expiries, inspection dates, days left before expiration, and overdue vehicle services.</p>
            </div>
            <Link to="/alerts" className="btn-primary flex items-center gap-2 text-sm self-start">
              Open Alerts Center <ExternalLink size={14} />
            </Link>
          </div>

          {/* Alert Overview KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-rose-50 to-white border-rose-200">
              <p className="text-xs font-semibold uppercase text-rose-700">Expired Insurance</p>
              <p className="text-3xl font-extrabold text-rose-700 mt-1">{alertSummary.expiredInsuranceCount ?? 0}</p>
              <p className="text-xs text-rose-600 mt-1 font-semibold">Immediate renewal required!</p>
            </div>
            <div className="card bg-gradient-to-br from-orange-50 to-white border-orange-200">
              <p className="text-xs font-semibold uppercase text-orange-700">Urgent (≤ 7 Days Left)</p>
              <p className="text-3xl font-extrabold text-orange-700 mt-1">{alertSummary.urgentInsuranceCount ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Expiring within one week</p>
            </div>
            <div className="card bg-gradient-to-br from-yellow-50 to-white border-yellow-200">
              <p className="text-xs font-semibold uppercase text-yellow-700">Warning (≤ 30 Days Left)</p>
              <p className="text-3xl font-extrabold text-yellow-800 mt-1">{alertSummary.warningInsuranceCount ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Expiring within 30 days</p>
            </div>
            <div className="card bg-gradient-to-br from-gray-50 to-white border-gray-200">
              <p className="text-xs font-semibold uppercase text-gray-700">Compliance Locked Trucks</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">{alertSummary.vehicleStatus?.locked ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Locked due to compliance violations</p>
            </div>
          </div>

          {/* Insurance Expiry Countdown Table */}
          <div className="card p-0">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="section-title text-rose-700">Truck Insurance Expiry Countdown</h3>
                <p className="text-xs text-gray-400">Monitored list of truck insurance policies and exact days remaining</p>
              </div>
            </div>
            <div className="table-container rounded-none border-0">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Plate Number</th>
                    <th className="th">Vehicle Make & Model</th>
                    <th className="th">Expiry Date</th>
                    <th className="th">Days Left</th>
                    <th className="th">Status & Severity</th>
                    <th className="th text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(alertSummary.insuranceAlerts || []).map((a: any, idx: number) => {
                    const isExpired = a.daysRemaining < 0;
                    const isUrgent = a.daysRemaining >= 0 && a.daysRemaining <= 7;
                    return (
                      <tr key={idx} className={`tr ${isExpired ? 'bg-red-50/40' : isUrgent ? 'bg-orange-50/30' : ''}`}>
                        <td className="td font-bold text-gray-900">{a.plateNumber}</td>
                        <td className="td text-xs text-gray-600">{a.make} {a.model}</td>
                        <td className="td font-mono text-xs font-semibold">{a.expiryDate}</td>
                        <td className="td">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-extrabold inline-block ${
                            isExpired
                              ? 'bg-red-600 text-white'
                              : isUrgent
                              ? 'bg-orange-500 text-white'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isExpired ? `Expired ${Math.abs(a.daysRemaining)} days ago` : `${a.daysRemaining} days remaining`}
                          </span>
                        </td>
                        <td className="td">
                          <span className={`badge ${
                            isExpired ? 'bg-red-100 text-red-800 font-bold' : isUrgent ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {isExpired ? 'CRITICAL - EXPIRED' : isUrgent ? 'URGENT - EXPIRING SOON' : 'UPCOMING'}
                          </span>
                        </td>
                        <td className="td text-right">
                          <Link to={`/vehicles/${a.vehicleId}`} className="text-xs text-blue-600 hover:underline font-semibold">
                            Update Policy →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {(!alertSummary.insuranceAlerts?.length) && (
                    <tr>
                      <td colSpan={6} className="td text-center text-emerald-600 py-10 font-medium">
                        <CheckCircle size={20} className="inline mr-2" /> All truck insurance policies are valid and up to date!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Other Compliance Expiries (Inspection, Permit, Road Fund) */}
          {(alertSummary.complianceAlerts?.length > 0) && (
            <div className="card p-0">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="section-title">Other Compliance Expiries (Inspection / Bolo / Permit)</h3>
                <p className="text-xs text-gray-400">Inspection certificates and transport permits expiring soon</p>
              </div>
              <div className="table-container rounded-none border-0">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="th">Plate Number</th>
                      <th className="th">Document / Certificate</th>
                      <th className="th">Expiry Date</th>
                      <th className="th">Days Left</th>
                      <th className="th text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertSummary.complianceAlerts.map((c: any, idx: number) => (
                      <tr key={idx} className="tr">
                        <td className="td font-bold text-gray-900">{c.plateNumber}</td>
                        <td className="td font-medium text-gray-700">{c.docType}</td>
                        <td className="td font-mono text-xs">{c.expiryDate}</td>
                        <td className="td">
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                            c.daysRemaining < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {c.daysRemaining < 0 ? `Expired ${Math.abs(c.daysRemaining)}d ago` : `${c.daysRemaining} days left`}
                          </span>
                        </td>
                        <td className="td text-right">
                          <Link to={`/vehicles/${c.vehicleId}`} className="text-xs text-blue-600 hover:underline">
                            View Vehicle →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Overdue Maintenance Schedules */}
          {(alertSummary.maintenanceAlerts?.length > 0) && (
            <div className="card p-0">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="section-title">Overdue Maintenance Schedules</h3>
                <p className="text-xs text-gray-400">Scheduled vehicle services and preventive maintenance overdue</p>
              </div>
              <div className="table-container rounded-none border-0">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="th">Plate Number</th>
                      <th className="th">Service Type</th>
                      <th className="th">Due Date</th>
                      <th className="th">Status</th>
                      <th className="th text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertSummary.maintenanceAlerts.map((m: any) => (
                      <tr key={m.id} className="tr">
                        <td className="td font-bold text-gray-900">{m.plateNumber}</td>
                        <td className="td font-medium capitalize text-gray-800">{m.maintenanceType?.replace('_', ' ')}</td>
                        <td className="td font-mono text-xs">{m.dueDate || 'Overdue by mileage'}</td>
                        <td className="td">
                          <span className="badge bg-red-100 text-red-800 font-bold">OVERDUE</span>
                        </td>
                        <td className="td text-right">
                          <Link to="/maintenance" className="text-xs text-blue-600 hover:underline font-semibold">
                            Create Work Order →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
