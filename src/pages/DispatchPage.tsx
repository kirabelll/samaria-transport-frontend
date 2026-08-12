import { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Truck,
  Package,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Wrench,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import { dispatchApi, employeeApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import DateInput from '../components/ui/DateInput';

/* ── Types ─────────────────────────────────────────────── */

interface VehicleInfo {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  capacityTons: number;
  status: string;
}

interface TripInfo {
  id: string;
  tripNumber: string;
  pickupLocation: string;
  deliveryLocation: string;
  status: string;
}

interface MaintenanceInfo {
  id: string;
  type: string;
  status: string;
}

interface BoardCell {
  date: string;
  status: string;
  trips: TripInfo[];
  maintenance: MaintenanceInfo[];
}

interface GridRow {
  vehicle: VehicleInfo;
  cells: BoardCell[];
}

interface PendingOrder {
  id: string;
  orderNumber: string;
  customer: string;
  orderType: string;
  quantity: number;
  pickup: string;
  delivery: string;
}

interface AvailableDriver {
  id: string;
  name: string;
  busy: boolean;
}

interface BoardSummary {
  totalVehicles: number;
  activeVehicles: number;
  tripsScheduled: number;
  pendingOrdersCount: number;
}

interface AssignForm {
  vehicleId: string;
  driverId: string;
  orderId: string;
  pickupLocation: string;
  deliveryLocation: string;
  plannedQuantityTons: string;
  ratePerTon: string;
  orderType: string;
  tripDate: string;
}

const emptyForm: AssignForm = {
  vehicleId: '',
  driverId: '',
  orderId: '',
  pickupLocation: '',
  deliveryLocation: '',
  plannedQuantityTons: '',
  ratePerTon: '',
  orderType: 'cement',
  tripDate: '',
};

/* ── Helpers ───────────────────────────────────────────── */

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function fmtShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function fmtDayNum(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDate().toString();
}

function routeSnippet(pickup: string, delivery: string, maxLen = 20): string {
  const route = `${pickup} - ${delivery}`;
  return route.length > maxLen ? route.slice(0, maxLen) + '...' : route;
}

/* ── Component ─────────────────────────────────────────── */

export default function DispatchPage() {
  /* State */
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [dates, setDates] = useState<string[]>([]);
  const [grid, setGrid] = useState<GridRow[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<AvailableDriver[]>([]);
  const [summary, setSummary] = useState<BoardSummary>({
    totalVehicles: 0,
    activeVehicles: 0,
    tripsScheduled: 0,
    pendingOrdersCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* Modal state */
  const [assignModal, setAssignModal] = useState(false);
  const [form, setForm] = useState<AssignForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  /* Sidebar visibility on mobile */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Data loading ──────────────────────────────────────── */

  const loadBoard = useCallback(() => {
    setLoading(true);
    setError('');
    const start = fmtDate(weekStart);
    const end = fmtDate(addDays(weekStart, 6));
    dispatchApi
      .board({ start, end })
      .then((res) => {
        const d = res.data;
        setDates(d.dates || []);
        setGrid(d.grid || []);
        setPendingOrders(d.pendingOrders || []);
        setAvailableDrivers(d.availableDrivers || []);
        setSummary(
          d.summary || {
            totalVehicles: 0,
            activeVehicles: 0,
            tripsScheduled: 0,
            pendingOrdersCount: 0,
          },
        );
      })
      .catch((e: any) => {
        setError(e.response?.data?.error || 'Failed to load dispatch board');
      })
      .finally(() => setLoading(false));
  }, [weekStart]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  /* ── Week navigation ───────────────────────────────────── */

  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date()));

  const weekLabel = `${fmtShort(fmtDate(weekStart))} - ${fmtShort(fmtDate(addDays(weekStart, 6)))}`;

  /* ── Quick-assign helpers ──────────────────────────────── */

  const openAssign = (vehicleId: string, date: string) => {
    setForm({ ...emptyForm, vehicleId, tripDate: date });
    setSaveError('');
    setAssignModal(true);
  };

  const fillFromOrder = (order: PendingOrder) => {
    setForm((f) => ({
      ...f,
      orderId: order.id,
      pickupLocation: order.pickup,
      deliveryLocation: order.delivery,
      plannedQuantityTons: order.quantity?.toString() || '',
      orderType: order.orderType || 'cement',
    }));
    if (!assignModal) {
      setSaveError('');
      setAssignModal(true);
    }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      await dispatchApi.quickAssign({
        vehicleId: form.vehicleId,
        driverId: form.driverId,
        orderId: form.orderId || undefined,
        pickupLocation: form.pickupLocation,
        deliveryLocation: form.deliveryLocation,
        plannedQuantityTons: Number(form.plannedQuantityTons),
        ratePerTon: Number(form.ratePerTon),
        orderType: form.orderType,
        tripDate: form.tripDate,
      });
      setAssignModal(false);
      setForm(emptyForm);
      loadBoard();
    } catch (e: any) {
      setSaveError(e.response?.data?.error || 'Assignment failed');
    } finally {
      setSaving(false);
    }
  };

  /* ── Cell rendering ────────────────────────────────────── */

  const renderCell = (row: GridRow, cell: BoardCell) => {
    const vehicle = row.vehicle;

    // Inactive vehicle
    if (vehicle.status === 'inactive') {
      return (
        <td key={cell.date} className="border border-gray-200 p-1.5 align-top">
          <div className="bg-gray-100 rounded p-2 h-full min-h-[56px] flex items-center justify-center">
            <span className="text-xs text-gray-400 italic">Inactive</span>
          </div>
        </td>
      );
    }

    // Maintenance
    if (cell.status === 'maintenance' || cell.maintenance?.length > 0) {
      return (
        <td key={cell.date} className="border border-gray-200 p-1.5 align-top">
          <div className="bg-red-50 border border-red-200 rounded p-2 h-full min-h-[56px]">
            <div className="flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span className="text-xs font-medium text-red-700">Maintenance</span>
            </div>
            {cell.maintenance?.[0]?.type && (
              <p className="text-[10px] text-red-500 mt-0.5 truncate">{cell.maintenance[0].type}</p>
            )}
          </div>
        </td>
      );
    }

    // Has trip(s)
    if (cell.trips?.length > 0) {
      return (
        <td key={cell.date} className="border border-gray-200 p-1.5 align-top">
          <div className="bg-blue-50 border border-blue-200 rounded p-2 h-full min-h-[56px]">
            {cell.trips.map((trip, i) => (
              <div key={trip.id || i} className={i > 0 ? 'mt-1 pt-1 border-t border-blue-100' : ''}>
                <p className="text-xs font-semibold text-blue-700 truncate">
                  {trip.tripNumber || `Trip #${i + 1}`}
                </p>
                <p className="text-[10px] text-blue-500 truncate">
                  {routeSnippet(trip.pickupLocation, trip.deliveryLocation)}
                </p>
              </div>
            ))}
          </div>
        </td>
      );
    }

    // Available
    return (
      <td key={cell.date} className="border border-gray-200 p-1.5 align-top">
        <button
          onClick={() => openAssign(vehicle.id, cell.date)}
          className="bg-green-50 border border-green-200 rounded p-2 h-full min-h-[56px] w-full
                     hover:bg-green-100 hover:border-green-300 transition-colors cursor-pointer
                     flex flex-col items-center justify-center gap-0.5 group"
        >
          <Plus className="w-4 h-4 text-green-400 group-hover:text-green-600 transition-colors" />
          <span className="text-[10px] text-green-500 group-hover:text-green-700">Assign</span>
        </button>
      </td>
    );
  };

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Dispatch Board
          </h1>
          <p className="text-sm text-gray-500 mt-1">Plan and assign trips for the fleet</p>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn-secondary flex items-center gap-2 sm:hidden"
        >
          <ClipboardList className="w-4 h-4" />
          Pending Orders ({summary.pendingOrdersCount})
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Vehicles" value={summary.totalVehicles} icon={Truck} color="blue" />
        <StatCard
          title="Active"
          value={summary.activeVehicles}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Trips Scheduled"
          value={summary.tripsScheduled}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Pending Orders"
          value={summary.pendingOrdersCount}
          icon={Package}
          color="orange"
        />
      </div>

      {/* Week Navigation */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="btn-ghost p-2">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextWeek} className="btn-ghost p-2">
              <ChevronRight className="w-5 h-5" />
            </button>
            <button onClick={goToday} className="btn-secondary text-sm">
              Today
            </button>
          </div>
          <h2 className="text-base font-semibold text-gray-900">{weekLabel}</h2>
        </div>
      </div>

      {/* Main content: grid + sidebar */}
      <div className="flex gap-6">
        {/* Grid area */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="card flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-500">Loading dispatch board...</span>
            </div>
          ) : error ? (
            <div className="card flex items-center gap-3 py-10 justify-center text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <button onClick={loadBoard} className="btn-secondary text-sm ml-3">
                Retry
              </button>
            </div>
          ) : grid.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 text-gray-400">
              <Truck className="w-12 h-12 mb-3" />
              <p className="text-sm">No vehicles found. Add vehicles first.</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[160px]">
                        Vehicle
                      </th>
                      {dates.map((date) => {
                        const isToday = date === fmtDate(new Date());
                        return (
                          <th
                            key={date}
                            className={`border border-gray-200 px-2 py-2.5 text-center text-xs font-semibold tracking-wider min-w-[120px] ${
                              isToday
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 uppercase'
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-[10px]">{fmtDayName(date)}</span>
                              <span className={`text-sm font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                                {fmtDayNum(date)}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {grid.map((row) => (
                      <tr key={row.vehicle.id} className="hover:bg-gray-50/50">
                        <td className="border border-gray-200 px-3 py-2 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                row.vehicle.status === 'active'
                                  ? 'bg-green-500'
                                  : row.vehicle.status === 'maintenance'
                                  ? 'bg-red-500'
                                  : 'bg-gray-400'
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {row.vehicle.plateNumber}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">
                                {row.vehicle.make} {row.vehicle.model} &middot;{' '}
                                {row.vehicle.capacityTons}T
                              </p>
                            </div>
                          </div>
                        </td>
                        {row.cells.map((cell) => renderCell(row, cell))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-green-50 border border-green-200" />
                  <span className="text-[11px] text-gray-500">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-50 border border-blue-200" />
                  <span className="text-[11px] text-gray-500">Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
                  <span className="text-[11px] text-gray-500">Maintenance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
                  <span className="text-[11px] text-gray-500">Inactive</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Pending Orders (desktop always visible, mobile toggleable) */}
        <div
          className={`w-80 flex-shrink-0 space-y-3 ${
            sidebarOpen
              ? 'fixed inset-0 z-50 bg-white p-4 overflow-y-auto sm:relative sm:inset-auto sm:z-auto sm:bg-transparent sm:p-0'
              : 'hidden lg:block'
          }`}
        >
          {/* Mobile sidebar header */}
          {sidebarOpen && (
            <div className="flex items-center justify-between sm:hidden mb-3">
              <h3 className="text-base font-semibold text-gray-900">Pending Orders</h3>
              <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-2 text-sm">
                Close
              </button>
            </div>
          )}

          <div className="hidden lg:flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Pending Orders</h3>
            <span className="text-xs text-gray-400">{pendingOrders.length} orders</span>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-10 text-gray-400">
              <Package className="w-8 h-8 mb-2" />
              <p className="text-xs">No pending orders</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {pendingOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    fillFromOrder(order);
                    setSidebarOpen(false);
                  }}
                  className="card w-full text-left hover:ring-2 hover:ring-blue-200 transition-all cursor-pointer p-3"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-900">{order.orderNumber}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-medium">
                      {order.orderType}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1 truncate">{order.customer}</p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
                    <Package className="w-3 h-3" />
                    <span>{order.quantity} tons</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{order.pickup}</span>
                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{order.delivery}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick-Assign Modal */}
      {assignModal && (
        <Modal title="Quick Assign Trip" onClose={() => setAssignModal(false)} size="max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {saveError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {saveError}
              </div>
            )}

            {/* Vehicle (read-only display) */}
            <div>
              <label className="label">Vehicle</label>
              <div className="input bg-gray-50 text-sm text-gray-700">
                {grid.find((r) => r.vehicle.id === form.vehicleId)?.vehicle.plateNumber ||
                  form.vehicleId}
              </div>
            </div>

            {/* Trip Date */}
            <div>
              <label className="label">Trip Date</label>
              <DateInput
                value={form.tripDate}
                onChange={(val) => setForm((f) => ({ ...f, tripDate: val }))}
                required
              />
            </div>

            {/* Driver */}
            <div>
              <label className="label">Driver</label>
              <select
                className="select"
                value={form.driverId}
                onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
                required
              >
                <option value="">Select driver...</option>
                {availableDrivers.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.busy}>
                    {d.name} {d.busy ? '(Busy)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Order (optional) */}
            <div>
              <label className="label">
                Linked Order <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                className="select"
                value={form.orderId}
                onChange={(e) => {
                  const orderId = e.target.value;
                  if (orderId) {
                    const order = pendingOrders.find((o) => o.id === orderId);
                    if (order) {
                      setForm((f) => ({
                        ...f,
                        orderId,
                        pickupLocation: order.pickup,
                        deliveryLocation: order.delivery,
                        plannedQuantityTons: order.quantity?.toString() || '',
                        orderType: order.orderType || f.orderType,
                      }));
                      return;
                    }
                  }
                  setForm((f) => ({ ...f, orderId }));
                }}
              >
                <option value="">No linked order</option>
                {pendingOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} - {o.customer}
                  </option>
                ))}
              </select>
            </div>

            {/* Route */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Pickup Location</label>
                <input
                  className="input"
                  placeholder="e.g. Addis Ababa"
                  value={form.pickupLocation}
                  onChange={(e) => setForm((f) => ({ ...f, pickupLocation: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Delivery Location</label>
                <input
                  className="input"
                  placeholder="e.g. Mekelle"
                  value={form.deliveryLocation}
                  onChange={(e) => setForm((f) => ({ ...f, deliveryLocation: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Quantity, Rate, Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Quantity (tons)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  placeholder="0.00"
                  value={form.plannedQuantityTons}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, plannedQuantityTons: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="label">Rate / ton</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  placeholder="0.00"
                  value={form.ratePerTon}
                  onChange={(e) => setForm((f) => ({ ...f, ratePerTon: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Order Type</label>
                <select
                  className="select"
                  value={form.orderType}
                  onChange={(e) => setForm((f) => ({ ...f, orderType: e.target.value }))}
                >
                  <option value="cement">Cement</option>
                  <option value="goods">Goods</option>
                  <option value="fuel">Fuel</option>
                  <option value="container">Container</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setAssignModal(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Assigning...' : 'Assign Trip'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
