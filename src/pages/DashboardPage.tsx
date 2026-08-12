import { useEffect, useState } from 'react';
import {
  Truck, Navigation, ClipboardList, AlertTriangle, Activity, Wrench, Package,
  Users, TrendingUp, DollarSign, Percent, Fuel, Shield, Bell, CheckCircle,
  Clock, Lock, FileText, ArrowUpRight, ArrowDownRight, Wallet, BarChart3
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Area, AreaChart, Legend
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<'overview' | 'operations' | 'financial' | 'fleet' | 'controls' | 'profitability'>('overview');

  useEffect(() => {
    dashboardApi.get().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard...</div>;
  if (!data) return <div className="text-red-500 p-4">Failed to load dashboard</div>;

  const fmt = (n: number) => `ETB ${(n || 0).toLocaleString()}`;
  const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

  const sections = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'operations', label: 'Operations', icon: Navigation },
    { key: 'financial', label: 'Financial', icon: DollarSign },
    { key: 'fleet', label: 'Fleet', icon: Truck },
    { key: 'controls', label: 'Controls', icon: Shield },
    { key: 'profitability', label: 'Profitability', icon: TrendingUp },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              section === s.key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <s.icon size={14} />
            {s.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {section === 'overview' && (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Fleet" value={data.vehicles?.total ?? 0} icon={Truck} color="blue" />
            <StatCard title="Today's Trips" value={data.today?.trips ?? 0} icon={Navigation} color="green" />
            <StatCard title="Today's Revenue" value={fmt(data.today?.revenue)} icon={Activity} color="orange" sub="ETB" />
            <StatCard title="Pending Orders" value={data.alerts?.pendingOrders ?? 0} icon={ClipboardList} color="yellow" />
          </div>

          {/* Utilization + Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Fleet Utilization</p>
              <p className="text-3xl font-bold text-blue-600">{data.utilization?.fleet ?? 0}%</p>
              <p className="text-sm text-gray-400">{data.utilization?.vehiclesOnTrip ?? 0} vehicles on trips</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Driver Utilization</p>
              <p className="text-3xl font-bold text-green-600">{data.utilization?.drivers ?? 0}%</p>
              <p className="text-sm text-gray-400">{data.utilization?.driversOnTrip ?? 0} / {data.utilization?.totalDrivers ?? 0} drivers</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Today's Tonnage</p>
              <p className="text-3xl font-bold text-gray-900">{(data.today?.tonnage || 0).toFixed(1)}</p>
              <p className="text-sm text-gray-400">tons delivered</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Cashier Balance</p>
              <p className="text-3xl font-bold text-gray-900">{fmt(data.cashierBalance)}</p>
              <p className="text-sm text-gray-400">total across all cashiers</p>
            </div>
          </div>

          {/* Revenue Trend + YTD */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="section-title mb-4">Revenue vs Cost (Last 7 Days)</h3>
              {data.revenueTrend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`ETB ${v.toLocaleString()}`]} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" fill="#3b82f620" stroke="#3b82f6" name="Revenue" />
                    <Area type="monotone" dataKey="cost" fill="#ef444420" stroke="#ef4444" name="Cost" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-400 text-center py-10">No revenue data yet</div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card">
                <h3 className="section-title mb-3">Year-to-Date P&L</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-lg font-bold text-green-600">{fmt(data.ytd?.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fuel Cost</p>
                    <p className="text-lg font-bold text-red-500">{fmt(data.ytd?.fuelCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Driver Cost</p>
                    <p className="text-lg font-bold text-orange-500">{fmt(data.ytd?.driverCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Maintenance</p>
                    <p className="text-lg font-bold text-orange-500">{fmt(data.ytd?.maintenanceCost)}</p>
                  </div>
                  <div className="col-span-2 pt-2 border-t">
                    <p className="text-xs text-gray-500">Net Profit</p>
                    <p className={`text-xl font-bold ${(data.ytd?.profit || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(data.ytd?.profit)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick alerts summary */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">Pending Approvals</p>
              <p className="text-2xl font-bold text-amber-600">{data.pendingApprovals?.total ?? 0}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">Active Alerts</p>
              <p className="text-2xl font-bold text-red-600">{data.controls?.alertTotal ?? 0}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">Compliance Alerts</p>
              <p className="text-2xl font-bold text-orange-600">{data.alerts?.complianceAlerts ?? 0}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">Outstanding Invoices</p>
              <p className="text-2xl font-bold text-amber-600">{fmt(data.outstandingInvoices?.total)}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">Uncollected Money</p>
              <p className="text-2xl font-bold text-red-600">{fmt(data.uncollectedMoney?.total)}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs text-gray-500 mb-1">Shortage Rate</p>
              <p className="text-2xl font-bold text-red-500">{data.shortageRate ?? 0}%</p>
            </div>
          </div>

          {/* Recent tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-0">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="section-title">Recent Trips</h3>
              </div>
              <div className="table-container rounded-none border-0">
                <table className="table">
                  <thead><tr>
                    <th className="th">Trip #</th><th className="th">Vehicle</th><th className="th">Destination</th><th className="th">Status</th><th className="th">Revenue</th>
                  </tr></thead>
                  <tbody>
                    {(data.recentTrips || []).map((t: any) => (
                      <tr key={t.id} className="tr">
                        <td className="td font-mono text-xs">{t.tripNumber}</td>
                        <td className="td">{t.vehicle?.plateNumber}</td>
                        <td className="td text-gray-500 max-w-xs truncate">{t.deliveryLocation}</td>
                        <td className="td"><StatusBadge status={t.status} /></td>
                        <td className="td">{t.revenue ? `ETB ${t.revenue.toLocaleString()}` : '-'}</td>
                      </tr>
                    ))}
                    {(!data.recentTrips?.length) && (
                      <tr><td colSpan={5} className="td text-center text-gray-400 py-8">No trips yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-0">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="section-title">Recent Orders</h3>
              </div>
              <div className="table-container rounded-none border-0">
                <table className="table">
                  <thead><tr>
                    <th className="th">Order #</th><th className="th">Customer</th><th className="th">Type</th><th className="th">Qty (t)</th><th className="th">Status</th>
                  </tr></thead>
                  <tbody>
                    {(data.recentOrders || []).map((o: any) => (
                      <tr key={o.id} className="tr">
                        <td className="td font-mono text-xs">{o.orderNumber}</td>
                        <td className="td">{o.customer?.companyName}</td>
                        <td className="td"><StatusBadge status={o.orderType} /></td>
                        <td className="td">{o.quantity}</td>
                        <td className="td"><StatusBadge status={o.status} /></td>
                      </tr>
                    ))}
                    {(!data.recentOrders?.length) && (
                      <tr><td colSpan={5} className="td text-center text-gray-400 py-8">No orders yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ OPERATIONS ═══ */}
      {section === 'operations' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Today's Trips" value={data.today?.trips ?? 0} icon={Navigation} color="blue" />
            <StatCard title="Active Trips" value={data.operations?.activeTrips ?? data.today?.activeTrips ?? 0} icon={Activity} color="green" />
            <StatCard title="Delayed Trips" value={data.operations?.delayedTrips ?? 0} icon={Clock} color="red" />
            <StatCard title="Pending POD" value={data.operations?.pendingPod ?? 0} icon={FileText} color="yellow" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Today's Tonnage</p>
              <p className="text-3xl font-bold text-gray-900">{(data.today?.tonnage || 0).toFixed(1)} t</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Qty Mismatch (7d)</p>
              <p className="text-3xl font-bold text-red-600">{data.operations?.qtyMismatchTrips ?? 0}</p>
              <p className="text-sm text-gray-400">trips with shortage</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Fleet Utilization</p>
              <p className="text-3xl font-bold text-blue-600">{data.utilization?.fleet ?? 0}%</p>
              <p className="text-sm text-gray-400">{data.utilization?.vehiclesOnTrip ?? 0} on trip</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Driver Utilization</p>
              <p className="text-3xl font-bold text-green-600">{data.utilization?.drivers ?? 0}%</p>
              <p className="text-sm text-gray-400">{data.utilization?.driversOnTrip ?? 0} / {data.utilization?.totalDrivers ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Pending Handovers</p>
              <p className="text-2xl font-bold text-amber-600">{data.alerts?.pendingHandovers ?? 0}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Shortage Rate (Month)</p>
              <p className="text-2xl font-bold text-red-500">{data.shortageRate ?? 0}%</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Rental Trucks Active</p>
              <p className="text-2xl font-bold text-purple-600">{data.rentalTrucks ?? 0}</p>
            </div>
          </div>

          {/* Revenue trend chart */}
          <div className="card">
            <h3 className="section-title mb-4">Revenue vs Cost Trend (7 Days)</h3>
            {data.revenueTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`ETB ${v.toLocaleString()}`]} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" fill="#ef4444" name="Cost" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-center py-10">No data yet</div>
            )}
          </div>
        </>
      )}

      {/* ═══ FINANCIAL ═══ */}
      {section === 'financial' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Today's Revenue" value={fmt(data.today?.revenue)} icon={TrendingUp} color="green" />
            <StatCard title="Today's Cost" value={fmt(data.today?.cost)} icon={DollarSign} color="red" />
            <StatCard title="Today's Profit" value={fmt(data.today?.profit)} icon={Activity} color="blue" />
            <StatCard title="Today's Fuel" value={fmt(data.today?.fuelCost)} icon={Fuel} color="orange" />
          </div>

          {/* Month summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-green-50 border-green-200">
              <p className="text-xs text-green-600 mb-1">Month Revenue</p>
              <p className="text-2xl font-bold text-green-700">{fmt(data.monthSummary?.revenue)}</p>
            </div>
            <div className="card bg-red-50 border-red-200">
              <p className="text-xs text-red-600 mb-1">Month Fuel Cost</p>
              <p className="text-2xl font-bold text-red-700">{fmt(data.monthSummary?.fuelCost)}</p>
            </div>
            <div className="card bg-orange-50 border-orange-200">
              <p className="text-xs text-orange-600 mb-1">Month Driver Cost</p>
              <p className="text-2xl font-bold text-orange-700">{fmt(data.monthSummary?.driverCost)}</p>
            </div>
            <div className="card bg-blue-50 border-blue-200">
              <p className="text-xs text-blue-600 mb-1">Month Profit</p>
              <p className="text-2xl font-bold text-blue-700">{fmt(data.monthSummary?.profit)}</p>
            </div>
          </div>

          {/* Cashier & Invoices */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Outstanding Invoices</p>
              <p className="text-2xl font-bold text-amber-600">{fmt(data.outstandingInvoices?.total)}</p>
              <p className="text-sm text-gray-400">{data.outstandingInvoices?.count ?? 0} invoices ({data.outstandingInvoices?.overdueCount ?? 0} overdue)</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Pending Settlements</p>
              <p className="text-2xl font-bold text-purple-600">{data.financial?.pendingSettlements ?? 0}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Open Cash Sessions</p>
              <p className="text-2xl font-bold text-blue-600">{data.financial?.cashSessions ?? 0}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Total Cashier Balance</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(data.cashierBalance)}</p>
            </div>
          </div>

          {/* Cashier breakdown */}
          {data.cashiers?.length > 0 && (
            <div className="card">
              <h3 className="section-title mb-3">Cashier Balances</h3>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th className="th">Cashier</th><th className="th">Location</th><th className="th">Balance</th></tr></thead>
                  <tbody>
                    {data.cashiers.map((c: any) => (
                      <tr key={c.id} className="tr">
                        <td className="td font-medium">{c.name}</td>
                        <td className="td text-gray-500">{c.location || '-'}</td>
                        <td className="td font-bold">{fmt(c.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Uncollected Money */}
          {(data.uncollectedMoney?.details?.length > 0) && (
            <div className="card">
              <h3 className="section-title mb-3">Uncollected Customer Money</h3>
              <div className="p-3 bg-red-50 rounded mb-3">
                <p className="text-sm text-red-700">Total Uncollected: <strong>{fmt(data.uncollectedMoney.total)}</strong></p>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead><tr>
                    <th className="th">Customer</th><th className="th">Total Billed</th>
                    <th className="th">Collected</th><th className="th">Remaining</th>
                  </tr></thead>
                  <tbody>
                    {data.uncollectedMoney.details.map((c: any) => (
                      <tr key={c.customerId} className="tr">
                        <td className="td font-medium">{c.customerName}</td>
                        <td className="td">{fmt(c.totalBilled)}</td>
                        <td className="td text-green-600">{fmt(c.totalCollected)}</td>
                        <td className="td font-bold text-red-600">{fmt(c.remainingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* YTD P&L */}
          <div className="card">
            <h3 className="section-title mb-3">Year-to-Date P&L</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div><p className="text-xs text-gray-500">Revenue</p><p className="text-lg font-bold text-green-600">{fmt(data.ytd?.revenue)}</p></div>
              <div><p className="text-xs text-gray-500">Fuel Cost</p><p className="text-lg font-bold text-red-500">{fmt(data.ytd?.fuelCost)}</p></div>
              <div><p className="text-xs text-gray-500">Driver Cost</p><p className="text-lg font-bold text-orange-500">{fmt(data.ytd?.driverCost)}</p></div>
              <div><p className="text-xs text-gray-500">Maintenance</p><p className="text-lg font-bold text-orange-500">{fmt(data.ytd?.maintenanceCost)}</p></div>
              <div><p className="text-xs text-gray-500">Net Profit</p><p className={`text-lg font-bold ${(data.ytd?.profit || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(data.ytd?.profit)}</p></div>
            </div>
          </div>
        </>
      )}

      {/* ═══ FLEET ═══ */}
      {section === 'fleet' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <StatCard title="Total" value={data.vehicles?.total ?? 0} icon={Truck} color="blue" />
            <StatCard title="Active" value={data.vehicles?.active ?? 0} icon={Truck} color="green" />
            <StatCard title="Maintenance" value={data.vehicles?.maintenance ?? 0} icon={Wrench} color="orange" />
            <StatCard title="Breakdown" value={data.vehicles?.breakdown ?? 0} icon={AlertTriangle} color="red" />
            <StatCard title="Inactive" value={data.vehicles?.inactive ?? 0} icon={Truck} color="gray" />
            <StatCard title="Locked" value={data.vehicles?.locked ?? 0} icon={Lock} color="red" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Fleet Utilization</p>
              <p className="text-3xl font-bold text-blue-600">{data.utilization?.fleet ?? 0}%</p>
              <p className="text-sm text-gray-400">{data.utilization?.vehiclesOnTrip ?? 0} vehicles on trips</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Compliance Alerts</p>
              <p className="text-3xl font-bold text-amber-600">{data.alerts?.complianceAlerts ?? 0}</p>
              <p className="text-sm text-gray-400">expiring within 30 days</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Maintenance Due</p>
              <p className="text-3xl font-bold text-red-600">{data.alerts?.maintenanceDue ?? 0}</p>
              <p className="text-sm text-gray-400">overdue schedules</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Rental Trucks</p>
              <p className="text-3xl font-bold text-purple-600">{data.rentalTrucks ?? 0}</p>
              <p className="text-sm text-gray-400">active rentals</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Today's Fuel</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(data.today?.fuelCost)}</p>
              <p className="text-sm text-gray-400">{(data.today?.fuelLiters || 0).toFixed(0)} liters</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Pending Handovers</p>
              <p className="text-2xl font-bold text-amber-600">{data.alerts?.pendingHandovers ?? 0}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Low Stock Parts</p>
              <p className="text-2xl font-bold text-yellow-600">{data.alerts?.lowStock ?? 0}</p>
            </div>
          </div>
        </>
      )}

      {/* ═══ CONTROLS ═══ */}
      {section === 'controls' && (
        <>
          {/* Alerts by severity */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card border-l-4 border-l-red-600">
              <p className="text-xs text-gray-500 mb-1">Critical Alerts</p>
              <p className="text-3xl font-bold text-red-600">{data.controls?.alertCritical ?? 0}</p>
            </div>
            <div className="card border-l-4 border-l-orange-500">
              <p className="text-xs text-gray-500 mb-1">Urgent Alerts</p>
              <p className="text-3xl font-bold text-orange-500">{data.controls?.alertUrgent ?? 0}</p>
            </div>
            <div className="card border-l-4 border-l-yellow-500">
              <p className="text-xs text-gray-500 mb-1">Warnings</p>
              <p className="text-3xl font-bold text-yellow-600">{data.controls?.alertWarning ?? 0}</p>
            </div>
            <div className="card border-l-4 border-l-blue-500">
              <p className="text-xs text-gray-500 mb-1">Total Unresolved</p>
              <p className="text-3xl font-bold text-blue-600">{data.controls?.alertTotal ?? 0}</p>
            </div>
          </div>

          {/* Pending Approvals breakdown */}
          <div className="card">
            <h3 className="section-title mb-4">Pending Approvals ({data.pendingApprovals?.total ?? 0})</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{data.pendingApprovals?.orders ?? 0}</p>
                <p className="text-xs text-gray-500">Orders</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{data.pendingApprovals?.purchases ?? 0}</p>
                <p className="text-xs text-gray-500">Purchases</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{data.pendingApprovals?.advances ?? 0}</p>
                <p className="text-xs text-gray-500">Advances</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{data.pendingApprovals?.payrolls ?? 0}</p>
                <p className="text-xs text-gray-500">Payrolls</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{data.pendingApprovals?.approvalRequests ?? 0}</p>
                <p className="text-xs text-gray-500">Approval Requests</p>
              </div>
            </div>
          </div>

          {/* Other controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Locked Vehicles</p>
              <p className="text-2xl font-bold text-red-600">{data.controls?.lockedVehicles ?? 0}</p>
              <p className="text-sm text-gray-400">compliance locked</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Compliance Expiring</p>
              <p className="text-2xl font-bold text-amber-600">{data.alerts?.complianceAlerts ?? 0}</p>
              <p className="text-sm text-gray-400">within 30 days</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Shortage Rate</p>
              <p className="text-2xl font-bold text-red-500">{data.shortageRate ?? 0}%</p>
              <p className="text-sm text-gray-400">this month</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Overdue Invoices</p>
              <p className="text-2xl font-bold text-amber-600">{data.outstandingInvoices?.overdueCount ?? 0}</p>
              <p className="text-sm text-gray-400">{fmt(data.outstandingInvoices?.total)} total</p>
            </div>
          </div>
        </>
      )}

      {/* ═══ PROFITABILITY ═══ */}
      {section === 'profitability' && (
        <>
          {/* Daily */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 mb-1">Daily Revenue</p>
                  <p className="text-2xl font-bold text-green-700">{fmt(data.profitability?.dailyRevenue)}</p>
                </div>
                <ArrowUpRight className="text-green-500" size={24} />
              </div>
            </div>
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 mb-1">Daily Cost</p>
                  <p className="text-2xl font-bold text-red-700">{fmt(data.profitability?.dailyCost)}</p>
                </div>
                <ArrowDownRight className="text-red-500" size={24} />
              </div>
            </div>
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 mb-1">Daily Profit</p>
                  <p className={`text-2xl font-bold ${(data.profitability?.dailyProfit || 0) >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                    {fmt(data.profitability?.dailyProfit)}
                  </p>
                </div>
                {(data.profitability?.dailyProfit || 0) >= 0
                  ? <ArrowUpRight className="text-blue-500" size={24} />
                  : <ArrowDownRight className="text-red-500" size={24} />
                }
              </div>
            </div>
          </div>

          {/* Monthly */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Month Revenue</p>
              <p className="text-2xl font-bold text-green-600">{fmt(data.profitability?.monthRevenue)}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Month Profit</p>
              <p className={`text-2xl font-bold ${(data.profitability?.monthProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(data.profitability?.monthProfit)}
              </p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Month Margin</p>
              <p className={`text-2xl font-bold ${(data.profitability?.monthMargin || 0) >= 15 ? 'text-green-600' : (data.profitability?.monthMargin || 0) >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                {pct(data.profitability?.monthMargin)}
              </p>
            </div>
          </div>

          {/* Revenue trend */}
          <div className="card">
            <h3 className="section-title mb-4">7-Day Revenue & Cost Trend</h3>
            {data.revenueTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`ETB ${v.toLocaleString()}`]} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" fill="#10b98120" stroke="#10b981" strokeWidth={2} name="Revenue" />
                  <Area type="monotone" dataKey="cost" fill="#ef444420" stroke="#ef4444" strokeWidth={2} name="Cost" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-center py-10">No data yet</div>
            )}
          </div>

          {/* YTD */}
          <div className="card">
            <h3 className="section-title mb-3">Year-to-Date Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div><p className="text-xs text-gray-500">Revenue</p><p className="text-lg font-bold text-green-600">{fmt(data.ytd?.revenue)}</p></div>
              <div><p className="text-xs text-gray-500">Fuel</p><p className="text-lg font-bold text-red-500">{fmt(data.ytd?.fuelCost)}</p></div>
              <div><p className="text-xs text-gray-500">Driver</p><p className="text-lg font-bold text-orange-500">{fmt(data.ytd?.driverCost)}</p></div>
              <div><p className="text-xs text-gray-500">Maintenance</p><p className="text-lg font-bold text-orange-500">{fmt(data.ytd?.maintenanceCost)}</p></div>
              <div><p className="text-xs text-gray-500">Net Profit</p><p className={`text-lg font-bold ${(data.ytd?.profit || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(data.ytd?.profit)}</p></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
