import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Truck, MapPin, Users, Package, FileText, UserCheck, Calendar, PieChart as PieIcon, BarChart3, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { profitabilityApi } from '../services/api';
import StatCard from '../components/ui/StatCard';
import DateInput from '../components/ui/DateInput';
import { formatDualDate } from '../utils/ethCalendar';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ProfitabilityPage() {
  const [tab, setTab] = useState<'vehicle'|'route'|'customer'|'cargo'|'order'|'driver'|'period'|'margin'|'costdrivers'>('vehicle');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
  const [periodGroup, setPeriodGroup] = useState('month');
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  const load = () => {
    setLoading(true);
    const params: any = { from, to };
    let p: Promise<any>;
    if (tab === 'vehicle') p = profitabilityApi.vehicles(params);
    else if (tab === 'route') p = profitabilityApi.byRoute(params);
    else if (tab === 'customer') p = profitabilityApi.byCustomer(params);
    else if (tab === 'cargo') p = profitabilityApi.byCargo(params);
    else if (tab === 'order') p = profitabilityApi.byOrder(params);
    else if (tab === 'driver') p = profitabilityApi.byDriver(params);
    else if (tab === 'period') { params.groupBy = periodGroup; p = profitabilityApi.byPeriod(params); }
    else if (tab === 'margin') p = profitabilityApi.marginAnalysis(params);
    else p = profitabilityApi.costDrivers(params);
    p.then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab, from, to, periodGroup]);

  const fmt = (n: number) => `ETB ${(n || 0).toLocaleString()}`;
  const fmtN = (n: number) => (n || 0).toLocaleString();

  const loadOrderDetail = async (orderId: string) => {
    try {
      const r = await profitabilityApi.byOrderDetail(orderId);
      setOrderDetail(r.data);
      setShowOrderDetail(true);
    } catch (e) { console.error(e); }
  };

  const tabs = [
    { key: 'vehicle', label: 'By Vehicle', icon: Truck },
    { key: 'route', label: 'By Route', icon: MapPin },
    { key: 'customer', label: 'By Customer', icon: Users },
    { key: 'cargo', label: 'By Cargo', icon: Package },
    { key: 'order', label: 'By Order', icon: FileText },
    { key: 'driver', label: 'By Driver', icon: UserCheck },
    { key: 'period', label: 'Trends', icon: Calendar },
    { key: 'margin', label: 'Margins', icon: BarChart3 },
    { key: 'costdrivers', label: 'Cost Drivers', icon: PieIcon },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><TrendingUp className="w-5 h-5" />Profitability Analysis</h2>
        <div className="flex gap-2 items-center flex-wrap">
          {tab === 'period' && (
            <select className="input w-28" value={periodGroup} onChange={e => setPeriodGroup(e.target.value)}>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
            </select>
          )}
          <label className="text-sm text-gray-500">From:</label>
          <DateInput className="input w-36" value={from} onChange={val => setFrom(val)} />
          <label className="text-sm text-gray-500">To:</label>
          <DateInput className="input w-36" value={to} onChange={val => setTo(val)} />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : <>

        {/* === BY VEHICLE === */}
        {tab === 'vehicle' && data?.vehicles && <>
          {data.totals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Total Revenue" value={fmt(data.totals.revenue)} icon={DollarSign} color="green" />
              <StatCard title="Total Costs" value={fmt(data.totals.totalCost)} icon={DollarSign} color="red" />
              <StatCard title="Net Profit" value={fmt(data.totals.netProfit)} icon={TrendingUp} color={data.totals.netProfit >= 0 ? 'green' : 'red'} />
              <StatCard title="Vehicles" value={data.vehicles.length} icon={Truck} color="blue" />
            </div>
          )}
          {data.vehicles.length > 0 && (
            <div className="card">
              <h3 className="section-title mb-4">Top 10 Vehicles</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.vehicles.slice(0, 10).map((v: any) => ({ name: v.plateNumber, revenue: v.revenue, cost: v.totalCost, profit: v.netProfit }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                  <Bar dataKey="cost" fill="#ef4444" name="Cost" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Vehicle</th><th className="th">Category</th><th className="th">Trips</th>
                <th className="th">Revenue</th><th className="th">Fuel</th><th className="th">Maint.</th>
                <th className="th">Total Cost</th><th className="th">Net Profit</th><th className="th">Margin</th>
              </tr></thead>
              <tbody>
                {data.vehicles.length === 0 ? <tr><td colSpan={9} className="td text-center py-10 text-gray-400">No data</td></tr>
                : data.vehicles.map((v: any) => (
                  <tr key={v.vehicleId} className="tr">
                    <td className="td font-medium">{v.plateNumber}</td>
                    <td className="td text-sm capitalize text-gray-500">{v.category?.replace(/_/g, ' ')}</td>
                    <td className="td">{v.tripCount}</td>
                    <td className="td text-green-700">{fmt(v.revenue)}</td>
                    <td className="td text-red-600">{fmt(v.fuelCost)}</td>
                    <td className="td text-red-600">{fmt(v.maintenanceCost)}</td>
                    <td className="td font-semibold text-red-600">{fmt(v.totalCost)}</td>
                    <td className={`td font-bold ${v.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(v.netProfit)}</td>
                    <td className={`td ${Number(v.margin) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{v.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {/* === BY ROUTE === */}
        {tab === 'route' && data?.routes && <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard title="Routes" value={data.routes.length} icon={MapPin} color="blue" />
            <StatCard title="Total Revenue" value={fmt(data.routes.reduce((s: number, r: any) => s + r.totalRevenue, 0))} icon={DollarSign} color="green" />
            <StatCard title="Net Profit" value={fmt(data.routes.reduce((s: number, r: any) => s + r.netProfit, 0))} icon={TrendingUp} color="green" />
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Route</th><th className="th">Trips</th><th className="th">Tonnage</th>
                <th className="th">Revenue</th><th className="th">Fuel</th><th className="th">Net Profit</th>
                <th className="th">Margin</th><th className="th">Avg/Trip</th>
              </tr></thead>
              <tbody>
                {data.routes.length === 0 ? <tr><td colSpan={8} className="td text-center py-10 text-gray-400">No data</td></tr>
                : data.routes.map((r: any, i: number) => (
                  <tr key={i} className="tr">
                    <td className="td font-medium text-sm">{r.route}</td>
                    <td className="td">{r.trips}</td>
                    <td className="td">{r.totalTonnage?.toFixed(1)} t</td>
                    <td className="td text-green-700">{fmt(r.totalRevenue)}</td>
                    <td className="td text-red-600">{fmt(r.totalFuel)}</td>
                    <td className={`td font-bold ${r.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(r.netProfit)}</td>
                    <td className={`td ${r.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{r.margin}%</td>
                    <td className="td text-gray-500">{fmt(r.avgRevenuePerTrip)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {/* === BY CUSTOMER === */}
        {tab === 'customer' && data?.customers && <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard title="Customers" value={data.customers.length} icon={Users} color="blue" />
            <StatCard title="Total Revenue" value={fmt(data.customers.reduce((s: number, c: any) => s + c.totalRevenue, 0))} icon={DollarSign} color="green" />
            <StatCard title="Net Profit" value={fmt(data.customers.reduce((s: number, c: any) => s + c.netProfit, 0))} icon={TrendingUp} color="green" />
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Customer</th><th className="th">Payment</th><th className="th">Trips</th>
                <th className="th">Tonnage</th><th className="th">Revenue</th><th className="th">Net Profit</th>
                <th className="th">Margin</th><th className="th">Outstanding</th>
              </tr></thead>
              <tbody>
                {data.customers.length === 0 ? <tr><td colSpan={8} className="td text-center py-10 text-gray-400">No data</td></tr>
                : data.customers.map((c: any) => (
                  <tr key={c.customerId} className="tr">
                    <td className="td font-medium">{c.name}</td>
                    <td className="td text-sm capitalize text-gray-500">{c.paymentType}</td>
                    <td className="td">{c.trips}</td>
                    <td className="td">{c.totalTonnage?.toFixed(1)} t</td>
                    <td className="td text-green-700">{fmt(c.totalRevenue)}</td>
                    <td className={`td font-bold ${c.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(c.netProfit)}</td>
                    <td className={`td ${c.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{c.margin}%</td>
                    <td className={`td ${c.outstanding > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>{c.outstanding > 0 ? fmt(c.outstanding) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {/* === BY CARGO TYPE === */}
        {tab === 'cargo' && data?.cargoTypes && <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="section-title mb-4">Revenue by Cargo Type</h3>
              {data.cargoTypes.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={data.cargoTypes.map((c: any) => ({ name: c.cargoType, value: c.totalRevenue }))}
                      cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                      dataKey="value">
                      {data.cargoTypes.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="text-gray-400 text-center py-10">No data</div>}
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr>
                  <th className="th">Cargo Type</th><th className="th">Trips</th><th className="th">Tonnage</th>
                  <th className="th">Revenue</th><th className="th">Net Profit</th><th className="th">Margin</th>
                </tr></thead>
                <tbody>
                  {data.cargoTypes.length === 0 ? <tr><td colSpan={6} className="td text-center py-10 text-gray-400">No data</td></tr>
                  : data.cargoTypes.map((c: any) => (
                    <tr key={c.cargoType} className="tr">
                      <td className="td font-medium capitalize">{c.cargoType}</td>
                      <td className="td">{c.trips}</td>
                      <td className="td">{c.totalTonnage?.toFixed(1)} t</td>
                      <td className="td text-green-700">{fmt(c.totalRevenue)}</td>
                      <td className={`td font-bold ${c.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(c.netProfit)}</td>
                      <td className={`td ${c.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{c.margin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {/* === BY ORDER === */}
        {tab === 'order' && data?.orders && <>
          {data.totals && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard title="Orders" value={data.count} icon={FileText} color="blue" />
              <StatCard title="Revenue" value={fmt(data.totals.revenue)} icon={DollarSign} color="green" />
              <StatCard title="Costs" value={fmt(data.totals.totalCost)} icon={DollarSign} color="red" />
              <StatCard title="Penalties" value={fmt(data.totals.totalPenalties)} icon={AlertTriangle} color="amber" />
              <StatCard title="Net Profit" value={fmt(data.totals.netProfit)} icon={TrendingUp} color={data.totals.netProfit >= 0 ? 'green' : 'red'} />
            </div>
          )}

          {/* Order detail modal */}
          {showOrderDetail && orderDetail && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowOrderDetail(false)}>
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Order: {orderDetail.order?.orderNumber}</h3>
                    <p className="text-sm text-gray-500">{orderDetail.order?.customer} — {orderDetail.order?.route || orderDetail.order?.pickupLocation + ' → ' + orderDetail.order?.deliveryLocation}</p>
                  </div>
                  <button onClick={() => setShowOrderDetail(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                </div>
                {orderDetail.summary && (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                    <div className="bg-green-50 rounded p-2 text-center"><div className="text-xs text-gray-500">Revenue</div><div className="font-bold text-green-700">{fmt(orderDetail.summary.totalRevenue)}</div></div>
                    <div className="bg-red-50 rounded p-2 text-center"><div className="text-xs text-gray-500">Cost</div><div className="font-bold text-red-600">{fmt(orderDetail.summary.totalCost)}</div></div>
                    <div className="bg-amber-50 rounded p-2 text-center"><div className="text-xs text-gray-500">Penalties</div><div className="font-bold text-amber-600">{fmt(orderDetail.summary.totalPenalties)}</div></div>
                    <div className={`${orderDetail.summary.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded p-2 text-center`}><div className="text-xs text-gray-500">Net Profit</div><div className={`font-bold ${orderDetail.summary.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(orderDetail.summary.netProfit)}</div></div>
                    <div className="bg-blue-50 rounded p-2 text-center"><div className="text-xs text-gray-500">Margin</div><div className="font-bold text-blue-700">{orderDetail.summary.margin}%</div></div>
                    <div className="bg-gray-50 rounded p-2 text-center"><div className="text-xs text-gray-500">Delivered</div><div className="font-bold">{orderDetail.summary.deliveredTons?.toFixed(1)} t</div></div>
                  </div>
                )}
                {/* Trips */}
                <h4 className="font-semibold text-sm mb-2 text-gray-700">Trips ({orderDetail.trips?.length || 0})</h4>
                <div className="table-container mb-4">
                  <table className="table">
                    <thead><tr><th className="th">Trip</th><th className="th">Date</th><th className="th">Driver</th><th className="th">Vehicle</th><th className="th">Delivered</th><th className="th">Revenue</th><th className="th">Cost</th><th className="th">Profit</th></tr></thead>
                    <tbody>
                      {(orderDetail.trips || []).map((t: any) => (
                        <tr key={t.id} className="tr">
                          <td className="td font-medium text-sm">{t.tripNumber}</td>
                          <td className="td text-sm">{formatDualDate(t.tripDate)}</td>
                          <td className="td text-sm">{t.driverName}</td>
                          <td className="td text-sm">{t.plateNumber}</td>
                          <td className="td">{(t.deliveredQuantityTons || 0).toFixed(1)} t</td>
                          <td className="td text-green-700">{fmt(t.revenue || 0)}</td>
                          <td className="td text-red-600">{fmt(t.cost || 0)}</td>
                          <td className={`td font-semibold ${(t.profit || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(t.profit || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Penalties */}
                {orderDetail.penalties?.length > 0 && <>
                  <h4 className="font-semibold text-sm mb-2 text-gray-700">Penalties ({orderDetail.penalties.length})</h4>
                  <div className="table-container mb-4">
                    <table className="table">
                      <thead><tr><th className="th">Type</th><th className="th">Description</th><th className="th">Amount</th><th className="th">Status</th></tr></thead>
                      <tbody>
                        {orderDetail.penalties.map((p: any) => (
                          <tr key={p.id} className="tr">
                            <td className="td capitalize">{p.type}</td>
                            <td className="td text-sm">{p.description || '-'}</td>
                            <td className="td text-red-600 font-semibold">{fmt(p.amount)}</td>
                            <td className="td"><span className={`badge ${p.status === 'waived' ? 'badge-blue' : p.status === 'approved' || p.status === 'applied' ? 'badge-red' : 'badge-yellow'}`}>{p.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>}
              </div>
            </div>
          )}

          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Order</th><th className="th">Customer</th><th className="th">Route</th>
                <th className="th">Trips</th><th className="th">Delivered</th><th className="th">Revenue</th>
                <th className="th">Costs</th><th className="th">Penalties</th><th className="th">Net Profit</th><th className="th">Margin</th>
              </tr></thead>
              <tbody>
                {data.orders.length === 0 ? <tr><td colSpan={10} className="td text-center py-10 text-gray-400">No orders</td></tr>
                : data.orders.map((o: any) => (
                  <tr key={o.orderId} className="tr cursor-pointer hover:bg-blue-50" onClick={() => loadOrderDetail(o.orderId)}>
                    <td className="td font-medium text-blue-700">{o.orderNumber}</td>
                    <td className="td text-sm">{o.customer}</td>
                    <td className="td text-sm text-gray-500">{o.route}</td>
                    <td className="td">{o.tripCount}</td>
                    <td className="td">{o.deliveredTons?.toFixed(1)} t</td>
                    <td className="td text-green-700">{fmt(o.revenue)}</td>
                    <td className="td text-red-600">{fmt(o.totalCost)}</td>
                    <td className={`td ${o.totalPenalties > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>{o.totalPenalties > 0 ? fmt(o.totalPenalties) : '-'}</td>
                    <td className={`td font-bold ${o.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(o.netProfit)}</td>
                    <td className={`td ${o.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{o.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {/* === BY DRIVER === */}
        {tab === 'driver' && data?.drivers && <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Drivers" value={data.drivers.length} icon={UserCheck} color="blue" />
            <StatCard title="Total Revenue" value={fmt(data.drivers.reduce((s: number, d: any) => s + d.totalRevenue, 0))} icon={DollarSign} color="green" />
            <StatCard title="Total Trips" value={data.drivers.reduce((s: number, d: any) => s + d.trips, 0)} icon={Truck} color="purple" />
            <StatCard title="Net Profit" value={fmt(data.drivers.reduce((s: number, d: any) => s + d.netProfit, 0))} icon={TrendingUp} color="green" />
          </div>
          {data.drivers.length > 0 && (
            <div className="card">
              <h3 className="section-title mb-4">Top 10 Drivers by Profit</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.drivers.slice(0, 10).map((d: any) => ({ name: d.name?.split(' ')[0] || 'N/A', revenue: d.totalRevenue, cost: d.totalCost, profit: d.netProfit }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                  <Bar dataKey="cost" fill="#ef4444" name="Cost" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Driver</th><th className="th">Trips</th><th className="th">Tonnage</th>
                <th className="th">Revenue</th><th className="th">Fuel</th><th className="th">Advance</th>
                <th className="th">Total Cost</th><th className="th">Net Profit</th><th className="th">Margin</th>
                <th className="th">Avg/Trip</th><th className="th">Shortage %</th>
              </tr></thead>
              <tbody>
                {data.drivers.length === 0 ? <tr><td colSpan={11} className="td text-center py-10 text-gray-400">No data</td></tr>
                : data.drivers.map((d: any) => (
                  <tr key={d.driverId} className="tr">
                    <td className="td font-medium">{d.name}</td>
                    <td className="td">{d.trips}</td>
                    <td className="td">{d.totalTonnage?.toFixed(1)} t</td>
                    <td className="td text-green-700">{fmt(d.totalRevenue)}</td>
                    <td className="td text-red-600">{fmt(d.totalFuel)}</td>
                    <td className="td text-red-600">{fmt(d.totalAdvance)}</td>
                    <td className="td font-semibold text-red-600">{fmt(d.totalCost)}</td>
                    <td className={`td font-bold ${d.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(d.netProfit)}</td>
                    <td className={`td ${d.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{d.margin}%</td>
                    <td className="td text-gray-500">{fmt(d.avgRevenuePerTrip)}</td>
                    <td className={`td ${d.shortageRate > 2 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{d.shortageRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {/* === TRENDS (BY PERIOD) === */}
        {tab === 'period' && data?.periods && <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="section-title mb-4">Revenue & Profit Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.periods}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" fill="#10b98133" stroke="#10b981" name="Revenue" />
                  <Area type="monotone" dataKey="netProfit" fill="#3b82f633" stroke="#3b82f6" name="Net Profit" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="section-title mb-4">Trips & Tonnage</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.periods}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="trips" fill="#3b82f6" name="Trips" />
                  <Bar yAxisId="right" dataKey="tonnage" fill="#f59e0b" name="Tonnage (t)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <h3 className="section-title mb-4">Margin Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.periods}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Line type="monotone" dataKey="margin" stroke="#8b5cf6" strokeWidth={2} name="Margin %" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Period</th><th className="th">Trips</th><th className="th">Tonnage</th>
                <th className="th">Revenue</th><th className="th">Fuel</th><th className="th">Driver</th>
                <th className="th">Total Cost</th><th className="th">Net Profit</th><th className="th">Margin</th>
              </tr></thead>
              <tbody>
                {data.periods.length === 0 ? <tr><td colSpan={9} className="td text-center py-10 text-gray-400">No data</td></tr>
                : data.periods.map((p: any) => (
                  <tr key={p.period} className="tr">
                    <td className="td font-medium">{p.period}</td>
                    <td className="td">{p.trips}</td>
                    <td className="td">{p.tonnage?.toFixed(1)} t</td>
                    <td className="td text-green-700">{fmt(p.revenue)}</td>
                    <td className="td text-red-600">{fmt(p.fuelCost)}</td>
                    <td className="td text-red-600">{fmt(p.driverCost)}</td>
                    <td className="td font-semibold text-red-600">{fmt(p.totalCost)}</td>
                    <td className={`td font-bold ${p.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(p.netProfit)}</td>
                    <td className={`td ${p.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{p.margin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {/* === MARGIN ANALYSIS === */}
        {tab === 'margin' && data && <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Trips" value={data.totalTrips} icon={Truck} color="blue" />
            <StatCard title="Avg Margin" value={`${data.avgMargin}%`} icon={TrendingUp} color={data.avgMargin >= 15 ? 'green' : 'amber'} />
            <StatCard title="High Margin (>30%)" value={data.distribution?.high || 0} icon={ChevronUp} color="green" />
            <StatCard title="Negative Margin" value={data.distribution?.negative || 0} icon={ChevronDown} color="red" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="section-title mb-4">Margin Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={[
                    { name: 'Negative (<0%)', value: data.distribution?.negative || 0 },
                    { name: 'Low (0-15%)', value: data.distribution?.low || 0 },
                    { name: 'Medium (15-30%)', value: data.distribution?.medium || 0 },
                    { name: 'High (>30%)', value: data.distribution?.high || 0 },
                  ].filter(d => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} dataKey="value">
                    <Cell fill="#ef4444" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <div className="card">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Distribution Breakdown</h4>
                <div className="space-y-2">
                  {[
                    { label: 'High Margin (>30%)', count: data.distribution?.high, color: 'bg-green-500' },
                    { label: 'Medium (15-30%)', count: data.distribution?.medium, color: 'bg-blue-500' },
                    { label: 'Low (0-15%)', count: data.distribution?.low, color: 'bg-amber-500' },
                    { label: 'Negative (<0%)', count: data.distribution?.negative, color: 'bg-red-500' },
                  ].map(d => (
                    <div key={d.label} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${d.color}`} />
                      <span className="text-sm flex-1">{d.label}</span>
                      <span className="font-semibold">{d.count || 0}</span>
                      <span className="text-xs text-gray-400">({data.totalTrips > 0 ? ((d.count || 0) / data.totalTrips * 100).toFixed(0) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Margin Trips */}
          <div className="card">
            <h3 className="section-title mb-3 text-green-700">Top Margin Trips</h3>
            <div className="table-container">
              <table className="table">
                <thead><tr>
                  <th className="th">Trip</th><th className="th">Date</th><th className="th">Route</th>
                  <th className="th">Customer</th><th className="th">Driver</th><th className="th">Revenue</th>
                  <th className="th">Cost</th><th className="th">Profit</th><th className="th">Margin</th>
                </tr></thead>
                <tbody>
                  {(data.topMargin || []).slice(0, 15).map((t: any) => (
                    <tr key={t.tripNumber} className="tr">
                      <td className="td font-medium text-sm">{t.tripNumber}</td>
                      <td className="td text-sm">{formatDualDate(t.tripDate)}</td>
                      <td className="td text-sm text-gray-500">{t.route}</td>
                      <td className="td text-sm">{t.customer}</td>
                      <td className="td text-sm">{t.driver}</td>
                      <td className="td text-green-700">{fmt(t.revenue)}</td>
                      <td className="td text-red-600">{fmt(t.cost)}</td>
                      <td className="td text-green-700 font-semibold">{fmt(t.profit)}</td>
                      <td className="td text-green-700 font-bold">{t.margin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Margin Trips */}
          <div className="card">
            <h3 className="section-title mb-3 text-red-600">Lowest Margin Trips</h3>
            <div className="table-container">
              <table className="table">
                <thead><tr>
                  <th className="th">Trip</th><th className="th">Date</th><th className="th">Route</th>
                  <th className="th">Customer</th><th className="th">Driver</th><th className="th">Revenue</th>
                  <th className="th">Cost</th><th className="th">Profit</th><th className="th">Margin</th>
                </tr></thead>
                <tbody>
                  {(data.bottomMargin || []).slice(0, 15).map((t: any) => (
                    <tr key={t.tripNumber} className="tr">
                      <td className="td font-medium text-sm">{t.tripNumber}</td>
                      <td className="td text-sm">{formatDualDate(t.tripDate)}</td>
                      <td className="td text-sm text-gray-500">{t.route}</td>
                      <td className="td text-sm">{t.customer}</td>
                      <td className="td text-sm">{t.driver}</td>
                      <td className="td text-green-700">{fmt(t.revenue)}</td>
                      <td className="td text-red-600">{fmt(t.cost)}</td>
                      <td className={`td font-semibold ${t.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(t.profit)}</td>
                      <td className={`td font-bold ${t.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{t.margin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        {/* === COST DRIVERS === */}
        {tab === 'costdrivers' && data && <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Revenue" value={fmt(data.totalRevenue)} icon={DollarSign} color="green" />
            <StatCard title="Total Cost" value={fmt(data.totalCost)} icon={DollarSign} color="red" />
            <StatCard title="Net Profit" value={fmt(data.netProfit)} icon={TrendingUp} color={data.netProfit >= 0 ? 'green' : 'red'} />
            <StatCard title="Margin" value={`${data.margin}%`} icon={BarChart3} color={data.margin >= 15 ? 'green' : 'amber'} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="section-title mb-4">Cost Breakdown</h3>
              {(data.costBreakdown || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.costBreakdown.map((c: any) => ({ name: c.category, value: c.amount }))}
                      cx="50%" cy="50%" outerRadius={100} innerRadius={50}
                      label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} dataKey="value">
                      {data.costBreakdown.map((c: any, i: number) => <Cell key={i} fill={c.color || COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="text-gray-400 text-center py-10">No cost data</div>}
            </div>
            <div className="space-y-4">
              <div className="card">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Cost Categories</h4>
                <div className="space-y-3">
                  {(data.costBreakdown || []).map((c: any) => (
                    <div key={c.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{c.category}</span>
                        <span>{fmt(c.amount)} ({c.percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${c.percentage}%`, backgroundColor: c.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Additional Deductions</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Shortage Deductions</span><span className="font-semibold text-amber-600">{fmt(data.shortageDeductions || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Total Penalties</span><span className="font-semibold text-red-600">{fmt(data.totalPenalties || 0)}</span></div>
                  {data.penaltyByType && Object.keys(data.penaltyByType).length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      {Object.entries(data.penaltyByType).map(([type, amount]) => (
                        <div key={type} className="flex justify-between text-xs"><span className="text-gray-400 capitalize">{type}</span><span>{fmt(amount as number)}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="card bg-blue-50 border-blue-200">
                <div className="text-sm text-blue-700">
                  <strong>{data.tripCount}</strong> completed trips analyzed
                </div>
              </div>
            </div>
          </div>
        </>}
      </>}
    </div>
  );
}