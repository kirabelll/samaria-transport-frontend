import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { reportApi } from '../services/api';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { TrendingUp, Truck, Package, DollarSign, Download, FileText, Shield, Bell, Clock, CheckCircle } from 'lucide-react';
import DateInput from '../components/ui/DateInput';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

type ReportTab = 'financial' | 'trips' | 'fleet' | 'kpis'
  | 'tripSummary' | 'orderFulfillment' | 'podStatus' | 'delayedTrips' | 'swapHistory'
  | 'cashierDaily' | 'cashFlow' | 'settlementSummary' | 'receivablesAging'
  | 'penaltySummary' | 'approvalTurnaround' | 'alertResolution' | 'complianceStatus';

const REPORT_CATEGORIES = [
  {
    label: 'Operational',
    icon: Truck,
    tabs: [
      { key: 'financial' as ReportTab, label: 'Financial' },
      { key: 'trips' as ReportTab, label: 'Trips' },
      { key: 'fleet' as ReportTab, label: 'Fleet' },
      { key: 'kpis' as ReportTab, label: 'KPIs' },
      { key: 'tripSummary' as ReportTab, label: 'Trip Summary' },
      { key: 'orderFulfillment' as ReportTab, label: 'Order Fulfillment' },
      { key: 'podStatus' as ReportTab, label: 'POD Status' },
      { key: 'delayedTrips' as ReportTab, label: 'Delayed Trips' },
      { key: 'swapHistory' as ReportTab, label: 'Vehicle Swaps' },
    ],
  },
  {
    label: 'Financial',
    icon: DollarSign,
    tabs: [
      { key: 'cashierDaily' as ReportTab, label: 'Cashier Daily' },
      { key: 'cashFlow' as ReportTab, label: 'Cash Flow' },
      { key: 'settlementSummary' as ReportTab, label: 'Settlements' },
      { key: 'receivablesAging' as ReportTab, label: 'Receivables Aging' },
    ],
  },
  {
    label: 'Controls',
    icon: Shield,
    tabs: [
      { key: 'penaltySummary' as ReportTab, label: 'Penalties' },
      { key: 'approvalTurnaround' as ReportTab, label: 'Approvals' },
      { key: 'alertResolution' as ReportTab, label: 'Alerts' },
      { key: 'complianceStatus' as ReportTab, label: 'Compliance' },
    ],
  },
];

function exportCSV(data: any[], filename: string) {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => {
    const v = row[k];
    if (v === null || v === undefined) return '';
    if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n')))
      return `"${v.replace(/"/g, '""')}"`;
    return v;
  }).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('financial');
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [catOpen, setCatOpen] = useState<string>('Operational');

  const load = useCallback(() => {
    setLoading(true);
    const params = { from, to };
    const calls: Record<ReportTab, () => Promise<any>> = {
      financial: () => reportApi.financial(params),
      trips: () => reportApi.trips(params),
      fleet: () => reportApi.fleet(params),
      kpis: () => reportApi.kpis(params),
      tripSummary: () => reportApi.tripSummary(params),
      orderFulfillment: () => reportApi.orderFulfillment(params),
      podStatus: () => reportApi.podStatus(params),
      delayedTrips: () => reportApi.delayedTrips(),
      swapHistory: () => reportApi.vehicleSwapHistory(params),
      cashierDaily: () => reportApi.cashierDaily({ date: to }),
      cashFlow: () => reportApi.cashFlow(params),
      settlementSummary: () => reportApi.settlementSummary(params),
      receivablesAging: () => reportApi.receivablesAging(),
      penaltySummary: () => reportApi.penaltySummary(params),
      approvalTurnaround: () => reportApi.approvalTurnaround(params),
      alertResolution: () => reportApi.alertResolution(params),
      complianceStatus: () => reportApi.complianceStatus(),
    };
    calls[tab]().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [tab, from, to]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) => `ETB ${(n || 0).toLocaleString()}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4 items-start justify-between">
        {/* Report selector */}
        <div className="flex-1 min-w-0">
          <div className="space-y-1">
            {REPORT_CATEGORIES.map(cat => (
              <div key={cat.label}>
                <button
                  onClick={() => setCatOpen(catOpen === cat.label ? '' : cat.label)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 py-1"
                >
                  <cat.icon size={14} />
                  {cat.label}
                  <span className="text-xs text-gray-400">{catOpen === cat.label ? '▾' : '▸'}</span>
                </button>
                {catOpen === cat.label && (
                  <div className="flex flex-wrap gap-1 ml-5 mb-2">
                    {cat.tabs.map(t => (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          tab === t.key
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Date filters */}
        <div className="flex gap-2 items-center flex-shrink-0">
          <label className="text-sm text-gray-500">From:</label>
          <DateInput className="input w-36" value={from} onChange={val => setFrom(val)} />
          <label className="text-sm text-gray-500">To:</label>
          <DateInput className="input w-36" value={to} onChange={val => setTo(val)} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading reports...</div>
      ) : !data ? null : (
        <>
          {/* ── EXISTING: Financial ── */}
          {tab === 'financial' && (
            <div className="space-y-5">
              <div className="flex justify-end">
                <button onClick={() => exportCSV(data.monthly || [], 'financial-report')} className="btn btn-secondary text-xs flex items-center gap-1">
                  <Download size={14} /> Export CSV
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Revenue" value={fmt(data.summary?.totalRevenue)} icon={TrendingUp} color="green" />
                <StatCard title="Rental Costs" value={fmt(data.summary?.totalRentalCost)} icon={Truck} color="orange" />
                <StatCard title="Fuel Costs" value={fmt(data.summary?.totalFuelCost)} icon={DollarSign} color="red" />
                <StatCard title="Gross Margin" value={fmt(data.summary?.grossMargin)} icon={TrendingUp} color="blue" />
              </div>
              {data.monthly?.length > 0 && (
                <div className="card">
                  <h3 className="section-title mb-4">Revenue vs Costs (Monthly)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.monthly}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} /><Legend />
                      <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                      <Bar dataKey="costs" fill="#ef4444" name="Costs" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {data.byCustomer?.length > 0 && (
                <div className="card">
                  <h3 className="section-title mb-4">Revenue by Customer</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.byCustomer} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(v: any) => fmt(Number(v))} /><Bar dataKey="revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── EXISTING: Trips ── */}
          {tab === 'trips' && (
            <div className="space-y-5">
              <div className="flex justify-end">
                <button onClick={() => exportCSV(data.byVehicle || [], 'trips-report')} className="btn btn-secondary text-xs flex items-center gap-1">
                  <Download size={14} /> Export CSV
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Trips" value={data.summary?.totalTrips || 0} icon={Truck} color="blue" />
                <StatCard title="Total Tonnage" value={`${(data.summary?.totalTonnage || 0).toFixed(1)} t`} icon={Package} color="green" />
                <StatCard title="Total Shortage" value={`${(data.summary?.totalShortage || 0).toFixed(1)} t`} icon={Package} color="red" />
                <StatCard title="Avg Cycle (min)" value={Math.round(data.summary?.avgCycleMinutes || 0)} icon={TrendingUp} color="orange" />
              </div>
              {data.daily?.length > 0 && (
                <div className="card">
                  <h3 className="section-title mb-4">Daily Trips & Tonnage</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.daily}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" />
                      <YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" />
                      <Tooltip /><Legend />
                      <Line yAxisId="left" type="monotone" dataKey="trips" stroke="#3b82f6" name="Trips" />
                      <Line yAxisId="right" type="monotone" dataKey="tonnage" stroke="#10b981" name="Tonnage (t)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {data.byVehicle?.length > 0 && renderTable('Trips by Vehicle', ['Vehicle', 'Trips', 'Tonnage', 'Revenue', 'Shortage'],
                data.byVehicle.map((v: any) => [v.plateNumber, v.trips, `${(v.tonnage || 0).toFixed(1)} t`, fmt(v.revenue), `${(v.shortage || 0).toFixed(1)} t`])
              )}
            </div>
          )}

          {/* ── EXISTING: Fleet ── */}
          {tab === 'fleet' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Vehicles" value={data.summary?.total || 0} icon={Truck} color="blue" />
                <StatCard title="Active" value={data.summary?.active || 0} icon={Truck} color="green" />
                <StatCard title="In Maintenance" value={data.summary?.inMaintenance || 0} icon={Truck} color="orange" />
                <StatCard title="Total Depreciation" value={fmt(data.summary?.totalDepreciation)} icon={DollarSign} color="red" />
              </div>
              {data.statusBreakdown?.length > 0 && (
                <div className="card flex items-center justify-center">
                  <div>
                    <h3 className="section-title mb-4 text-center">Fleet Status</h3>
                    <PieChart width={300} height={250}>
                      <Pie data={data.statusBreakdown} cx={150} cy={110} outerRadius={90} dataKey="count" nameKey="status" label={({ status, count }: any) => `${status}: ${count}`}>
                        {data.statusBreakdown.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EXISTING: KPIs ── */}
          {tab === 'kpis' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {data.kpis && Object.entries(data.kpis).map(([key, val]: any) => (
                  <div key={key} className="card text-center">
                    <div className="text-2xl font-bold text-blue-600">{typeof val === 'number' ? (Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2)) : val}</div>
                    <div className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  </div>
                ))}
              </div>
              {data.driverPerformance?.length > 0 && renderTable('Driver Performance', ['Driver', 'Trips', 'Tonnage', 'Shortage', 'Revenue'],
                data.driverPerformance.map((d: any) => [`${d.firstName} ${d.lastName}`, d.trips, `${(d.tonnage || 0).toFixed(1)} t`, `${(d.shortage || 0).toFixed(1)} t`, fmt(d.revenue)])
              )}
            </div>
          )}

          {/* ── NEW: Trip Summary ── */}
          {tab === 'tripSummary' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="section-title">Trip Summary by Status</h3>
                <button onClick={() => exportCSV(data.byStatus || [], 'trip-summary')} className="btn btn-secondary text-xs flex items-center gap-1">
                  <Download size={14} /> Export CSV
                </button>
              </div>
              {data.totals && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Total Trips" value={data.totals.totalTrips || 0} icon={Truck} color="blue" />
                  <StatCard title="Total Revenue" value={fmt(data.totals.totalRevenue)} icon={DollarSign} color="green" />
                  <StatCard title="Total Tonnage" value={`${(data.totals.totalTonnage || 0).toFixed(1)} t`} icon={Package} color="orange" />
                  <StatCard title="Avg Revenue/Trip" value={fmt(data.totals.avgRevenuePerTrip)} icon={TrendingUp} color="blue" />
                </div>
              )}
              {data.byStatus?.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={data.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={({ status, count }: any) => `${status}: ${count}`}>
                          {data.byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {renderTable('Status Breakdown', ['Status', 'Count', 'Revenue', 'Tonnage'],
                    data.byStatus.map((s: any) => [s.status, s.count, fmt(s.revenue), `${(s.tonnage || 0).toFixed(1)} t`])
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── NEW: Order Fulfillment ── */}
          {tab === 'orderFulfillment' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="section-title">Order Fulfillment</h3>
                <button onClick={() => exportCSV(data.orders || [], 'order-fulfillment')} className="btn btn-secondary text-xs flex items-center gap-1">
                  <Download size={14} /> Export CSV
                </button>
              </div>
              {data.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Total Orders" value={data.summary.totalOrders || 0} icon={FileText} color="blue" />
                  <StatCard title="Fully Delivered" value={data.summary.fullyDelivered || 0} icon={CheckCircle} color="green" />
                  <StatCard title="In Progress" value={data.summary.inProgress || 0} icon={Clock} color="orange" />
                  <StatCard title="Fulfillment Rate" value={`${(data.summary.fulfillmentRate || 0).toFixed(1)}%`} icon={TrendingUp} color="blue" />
                </div>
              )}
              {data.orders?.length > 0 && renderTable('Orders', ['Order #', 'Customer', 'Ordered', 'Delivered', 'Remaining', 'Trips', 'Fulfillment %', 'Status'],
                data.orders.map((o: any) => [o.orderNumber, o.customerName || o.customer, o.quantity || o.ordered, (o.totalDelivered || o.delivered || 0).toFixed(1), ((o.quantity || o.ordered || 0) - (o.totalDelivered || o.delivered || 0)).toFixed(1), o.trips || 0, `${(o.fulfillmentPct || 0).toFixed(1)}%`, o.status])
              )}
            </div>
          )}

          {/* ── NEW: POD Status ── */}
          {tab === 'podStatus' && (
            <div className="space-y-5">
              <h3 className="section-title">POD (Proof of Delivery) Status</h3>
              {data.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Total Completed" value={data.summary.totalCompleted || 0} icon={FileText} color="blue" />
                  <StatCard title="POD Uploaded" value={data.summary.withPod || 0} icon={CheckCircle} color="green" />
                  <StatCard title="Missing POD" value={data.summary.withoutPod || 0} icon={Clock} color="red" />
                  <StatCard title="Upload Rate" value={`${(data.summary.uploadRate || 0).toFixed(1)}%`} icon={TrendingUp} color="blue" />
                </div>
              )}
              {data.aging?.length > 0 && renderTable('Missing POD Aging', ['Trip #', 'Vehicle', 'Driver', 'Completed Date', 'Days Ago'],
                data.aging.map((t: any) => [t.tripNumber, t.plateNumber, t.driverName, t.completedAt?.slice(0, 10), t.daysAgo])
              )}
            </div>
          )}

          {/* ── NEW: Delayed Trips ── */}
          {tab === 'delayedTrips' && (
            <div className="space-y-5">
              <h3 className="section-title">Currently Delayed / Active Trips</h3>
              {data.trips?.length > 0 ? renderTable('Delayed Trips', ['Trip #', 'Vehicle', 'Driver', 'Status', 'Hours In Status', 'Departed'],
                data.trips.map((t: any) => [t.tripNumber, t.plateNumber, t.driverName, t.status, (t.hoursInStatus || 0).toFixed(1), t.departureTime?.slice(0, 16) || '-']),
                () => exportCSV(data.trips, 'delayed-trips')
              ) : <div className="text-gray-400 text-center py-10">No delayed trips</div>}
            </div>
          )}

          {/* ── NEW: Vehicle Swap History ── */}
          {tab === 'swapHistory' && (
            <div className="space-y-5">
              <h3 className="section-title">Vehicle Swap History</h3>
              {data.swaps?.length > 0 ? renderTable('Swaps', ['Trip #', 'From Vehicle', 'To Vehicle', 'Reason', 'Swapped By', 'Date'],
                data.swaps.map((s: any) => [s.tripNumber, s.fromPlate, s.toPlate, s.reason, s.swappedByName, s.swappedAt?.slice(0, 16)]),
                () => exportCSV(data.swaps, 'vehicle-swaps')
              ) : <div className="text-gray-400 text-center py-10">No vehicle swaps recorded</div>}
            </div>
          )}

          {/* ── NEW: Cashier Daily ── */}
          {tab === 'cashierDaily' && (
            <div className="space-y-5">
              <h3 className="section-title">Cashier Daily Sessions ({to})</h3>
              {data.sessions?.length > 0 ? renderTable('Sessions', ['Cashier', 'Location', 'Opening', 'Cash In', 'Cash Out', 'Closing', 'Variance', 'Status'],
                data.sessions.map((s: any) => [s.cashierName, s.location || '-', fmt(s.openingBalance), fmt(s.totalCashIn), fmt(s.totalCashOut), fmt(s.closingBalance), fmt(s.variance), s.status]),
                () => exportCSV(data.sessions, 'cashier-daily')
              ) : <div className="text-gray-400 text-center py-10">No sessions for this date</div>}
            </div>
          )}

          {/* ── NEW: Cash Flow ── */}
          {tab === 'cashFlow' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="section-title">Cash Flow Report</h3>
                <button onClick={() => exportCSV(data.dailyFlow || [], 'cash-flow')} className="btn btn-secondary text-xs flex items-center gap-1">
                  <Download size={14} /> Export CSV
                </button>
              </div>
              {data.summary && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard title="Total Cash In" value={fmt(data.summary.totalIn)} icon={TrendingUp} color="green" />
                  <StatCard title="Total Cash Out" value={fmt(data.summary.totalOut)} icon={DollarSign} color="red" />
                  <StatCard title="Net Flow" value={fmt(data.summary.netFlow)} icon={DollarSign} color="blue" />
                </div>
              )}
              {data.byCategory?.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <h3 className="section-title mb-3">By Category</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data.byCategory}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="category" tick={{ fontSize: 10 }} /><YAxis />
                        <Tooltip formatter={(v: any) => fmt(Number(v))} /><Legend />
                        <Bar dataKey="cashIn" fill="#10b981" name="In" />
                        <Bar dataKey="cashOut" fill="#ef4444" name="Out" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {data.dailyFlow?.length > 0 && (
                    <div className="card">
                      <h3 className="section-title mb-3">Daily Net Flow</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={data.dailyFlow}>
                          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis />
                          <Tooltip formatter={(v: any) => fmt(Number(v))} />
                          <Line type="monotone" dataKey="netFlow" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── NEW: Settlement Summary ── */}
          {tab === 'settlementSummary' && (
            <div className="space-y-5">
              <h3 className="section-title">Settlement Summary</h3>
              {data.byStatus?.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {data.byStatus.map((s: any) => (
                      <div key={s.status} className="card text-center">
                        <p className="text-xs text-gray-500 capitalize mb-1">{s.status}</p>
                        <p className="text-2xl font-bold text-blue-600">{s.count}</p>
                        <p className="text-sm text-gray-400">{fmt(s.totalNet)}</p>
                      </div>
                    ))}
                  </div>
                  {renderTable('Settlements by Status', ['Status', 'Count', 'Total Gross', 'Total Penalties', 'Total Net'],
                    data.byStatus.map((s: any) => [s.status, s.count, fmt(s.totalGross), fmt(s.totalPenalties), fmt(s.totalNet)]),
                    () => exportCSV(data.byStatus, 'settlement-summary')
                  )}
                </>
              ) : <div className="text-gray-400 text-center py-10">No settlements found</div>}
            </div>
          )}

          {/* ── NEW: Receivables Aging ── */}
          {tab === 'receivablesAging' && (
            <div className="space-y-5">
              <h3 className="section-title">Receivables Aging</h3>
              {data.summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="card text-center border-l-4 border-l-green-500">
                    <p className="text-xs text-gray-500 mb-1">Current</p>
                    <p className="text-xl font-bold">{fmt(data.summary.current)}</p>
                  </div>
                  <div className="card text-center border-l-4 border-l-yellow-500">
                    <p className="text-xs text-gray-500 mb-1">1-30 Days</p>
                    <p className="text-xl font-bold">{fmt(data.summary.days30)}</p>
                  </div>
                  <div className="card text-center border-l-4 border-l-orange-500">
                    <p className="text-xs text-gray-500 mb-1">31-60 Days</p>
                    <p className="text-xl font-bold">{fmt(data.summary.days60)}</p>
                  </div>
                  <div className="card text-center border-l-4 border-l-red-500">
                    <p className="text-xs text-gray-500 mb-1">61-90 Days</p>
                    <p className="text-xl font-bold">{fmt(data.summary.days90)}</p>
                  </div>
                  <div className="card text-center border-l-4 border-l-red-700">
                    <p className="text-xs text-gray-500 mb-1">90+ Days</p>
                    <p className="text-xl font-bold">{fmt(data.summary.days90plus)}</p>
                  </div>
                </div>
              )}
              {data.byCustomer?.length > 0 && renderTable('By Customer', ['Customer', 'Current', '1-30d', '31-60d', '61-90d', '90+d', 'Total'],
                data.byCustomer.map((c: any) => [c.customerName, fmt(c.current), fmt(c.days30), fmt(c.days60), fmt(c.days90), fmt(c.days90plus), fmt(c.total)]),
                () => exportCSV(data.byCustomer, 'receivables-aging')
              )}
            </div>
          )}

          {/* ── NEW: Penalty Summary ── */}
          {tab === 'penaltySummary' && (
            <div className="space-y-5">
              <h3 className="section-title">Penalty Summary</h3>
              {data.byType?.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <h3 className="section-title mb-3">By Type</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={data.byType} dataKey="totalAmount" nameKey="type" cx="50%" cy="50%" outerRadius={90} label={({ type, count }: any) => `${type}: ${count}`}>
                          {data.byType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmt(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {renderTable('Penalty Breakdown', ['Type', 'Count', 'Total Amount', 'Approved', 'Waived'],
                    data.byType.map((p: any) => [p.type, p.count, fmt(p.totalAmount), p.approvedCount || 0, p.waivedCount || 0]),
                    () => exportCSV(data.byType, 'penalty-summary')
                  )}
                </div>
              ) : <div className="text-gray-400 text-center py-10">No penalties found</div>}
              {data.byStatus?.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.byStatus.map((s: any) => (
                    <div key={s.status} className="card text-center">
                      <p className="text-xs text-gray-500 capitalize mb-1">{s.status}</p>
                      <p className="text-2xl font-bold text-blue-600">{s.count}</p>
                      <p className="text-sm text-gray-400">{fmt(s.totalAmount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── NEW: Approval Turnaround ── */}
          {tab === 'approvalTurnaround' && (
            <div className="space-y-5">
              <h3 className="section-title">Approval Turnaround</h3>
              {data.byType?.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card">
                      <h3 className="section-title mb-3">Avg Resolution Hours by Type</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data.byType}>
                          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" tick={{ fontSize: 10 }} /><YAxis />
                          <Tooltip /><Bar dataKey="avgResolutionHours" fill="#3b82f6" name="Avg Hours" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {renderTable('Approval Types', ['Type', 'Total', 'Approved', 'Rejected', 'Pending', 'Avg Hours'],
                      data.byType.map((a: any) => [a.type, a.total, a.approved, a.rejected, a.pending, (a.avgResolutionHours || 0).toFixed(1)]),
                      () => exportCSV(data.byType, 'approval-turnaround')
                    )}
                  </div>
                </>
              ) : <div className="text-gray-400 text-center py-10">No approval data found</div>}
            </div>
          )}

          {/* ── NEW: Alert Resolution ── */}
          {tab === 'alertResolution' && (
            <div className="space-y-5">
              <h3 className="section-title">Alert Resolution</h3>
              {data.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Total Alerts" value={data.summary.total || 0} icon={Bell} color="blue" />
                  <StatCard title="Resolved" value={data.summary.resolved || 0} icon={CheckCircle} color="green" />
                  <StatCard title="Unresolved" value={data.summary.unresolved || 0} icon={Clock} color="red" />
                  <StatCard title="Resolution Rate" value={`${(data.summary.resolutionRate || 0).toFixed(1)}%`} icon={TrendingUp} color="blue" />
                </div>
              )}
              {data.byType?.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data.byType}>
                        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" tick={{ fontSize: 10 }} /><YAxis />
                        <Tooltip /><Legend />
                        <Bar dataKey="resolved" fill="#10b981" name="Resolved" stackId="a" />
                        <Bar dataKey="unresolved" fill="#ef4444" name="Unresolved" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {renderTable('By Type', ['Type', 'Total', 'Resolved', 'Unresolved', 'Avg Resolution Hours'],
                    data.byType.map((a: any) => [a.type, a.total, a.resolved, a.unresolved, (a.avgResolutionHours || 0).toFixed(1)]),
                    () => exportCSV(data.byType, 'alert-resolution')
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── NEW: Compliance Status ── */}
          {tab === 'complianceStatus' && (
            <div className="space-y-5">
              <h3 className="section-title">Fleet Compliance Status</h3>
              {data.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card text-center border-l-4 border-l-green-500">
                    <p className="text-xs text-gray-500 mb-1">Compliant</p>
                    <p className="text-2xl font-bold text-green-600">{data.summary.compliant || 0}</p>
                  </div>
                  <div className="card text-center border-l-4 border-l-yellow-500">
                    <p className="text-xs text-gray-500 mb-1">Expiring Soon</p>
                    <p className="text-2xl font-bold text-yellow-600">{data.summary.expiringSoon || 0}</p>
                  </div>
                  <div className="card text-center border-l-4 border-l-red-500">
                    <p className="text-xs text-gray-500 mb-1">Expired</p>
                    <p className="text-2xl font-bold text-red-600">{data.summary.expired || 0}</p>
                  </div>
                  <div className="card text-center border-l-4 border-l-red-700">
                    <p className="text-xs text-gray-500 mb-1">Locked</p>
                    <p className="text-2xl font-bold text-red-700">{data.summary.locked || 0}</p>
                  </div>
                </div>
              )}
              {data.vehicles?.length > 0 && renderTable('Vehicle Compliance', ['Plate', 'Status', 'Insurance', 'Inspection', 'Permit', 'Locked'],
                data.vehicles.map((v: any) => [v.plateNumber, v.status, v.insuranceExpiry?.slice(0, 10) || '-', v.inspectionExpiry?.slice(0, 10) || '-', v.permitExpiry?.slice(0, 10) || '-', v.complianceLocked ? 'Yes' : 'No']),
                () => exportCSV(data.vehicles, 'compliance-status')
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function renderTable(title: string, headers: string[], rows: any[][], onExport?: () => void) {
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <h3 className="section-title">{title}</h3>
        {onExport && (
          <button onClick={onExport} className="btn btn-secondary text-xs flex items-center gap-1">
            <Download size={14} /> CSV
          </button>
        )}
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>{headers.map(h => <th key={h} className="th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="tr">
                {row.map((cell, j) => <td key={j} className="td">{cell}</td>)}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={headers.length} className="td text-center text-gray-400 py-8">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
