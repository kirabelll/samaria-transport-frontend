import { useEffect, useState } from 'react';
import { Plus, Play, Square, CheckCircle, Clock, Timer, Sparkles, FileText, Upload, History, AlertTriangle } from 'lucide-react';
import { tripApi, vehicleApi, employeeApi, customerApi, orderApi, rentalApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDualDate } from '../utils/ethCalendar';
import Pagination from '../components/ui/Pagination';
import DateTimeInput from '../components/ui/DateTimeInput';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const empty = { orderId:'', vehicleId:'', driverId:'', helperId:'', customerId:'',
  orderType:'cement', pickupLocation:'', deliveryLocation:'', plannedQuantityTons:'',
  ratePerTon:'', tripDate:'' };
const closeEmpty = { deliveredQuantityTons:'', notes:'', customerDeducted:false, customerDeductionAmount:'', driverPenaltyAmount:'' };

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [closeModal, setCloseModal] = useState<any>(null);
  const [closeForm, setCloseForm] = useState(closeEmpty);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState<any>({});
  const [suggestions, setSuggestions] = useState<any>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  // Phase 1: POD, confirmation, status history
  const [podModal, setPodModal] = useState<any>(null);
  const [podFilename, setPodFilename] = useState('');
  const [podFile, setPodFile] = useState<File | null>(null);
  const [podUploading, setPodUploading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<any>(null);
  const [confirmStatus, setConfirmStatus] = useState('confirmed');
  const [disputeReason, setDisputeReason] = useState('');
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Depart modal (loaded qty gating)
  const [departModal, setDepartModal] = useState<any>(null);
  const [loadedQty, setLoadedQty] = useState('');
  // Rental-driver auto-assignment
  const [rentalDriverInfo, setRentalDriverInfo] = useState<any>(null);
  const [rentalDriverLoading, setRentalDriverLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      tripApi.list({ status: filterStatus||undefined, page, limit: 20 }),
      tripApi.kpis(),
    ]).then(([tRes, kRes]) => {
      setTrips(tRes.data.trips || []);
      setTotal(tRes.data.total || 0);
      setKpis(kRes.data || {});
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus, page]);
  useEffect(() => {
    Promise.all([
      vehicleApi.list({ status: 'active' }),
      employeeApi.list({ role: 'driver' }),
      customerApi.list(),
      orderApi.list({ limit: 100 }),
      tripApi.list({ status: '', limit: 200 }),
      rentalApi.listVehicles().catch(() => ({ data: { vehicles: [] } })),
    ]).then(([vR, dR, cR, oR, tR, rR]) => {
      // Mark drivers/vehicles busy if on active trip
      const activeTrips = (tR.data.trips || []).filter((t: any) => !['completed','cancelled'].includes(t.status));
      const busyDriverIds = new Set(activeTrips.map((t: any) => t.driverId).filter(Boolean));
      const busyVehicleIds = new Set(activeTrips.map((t: any) => t.vehicleId).filter(Boolean));
      const ownVehicles = (vR.data.vehicles || []).map((v: any) => ({ ...v, _busy: busyVehicleIds.has(v.id), _isRental: false }));
      // Rental vehicles are a separate entity (RentalVehicle) with no FK into Vehicle,
      // so they cannot be selected for a regular Trip. We show them as disabled
      // options with a lock emoji so dispatchers can see them at a glance and
      // know they must use the Rental module to book them.
      const rentalVehicles = (rR.data?.vehicles || []).map((rv: any) => ({
        id: `rental:${rv.id}`,
        plateNumber: rv.plateNumber,
        make: rv.vehicleType?.replace(/_/g, ' ') || 'Rental',
        model: rv.owner?.name ? `(${rv.owner.name})` : '',
        capacityTons: rv.capacityTons,
        _busy: false,
        _isRental: true,
      }));
      setVehicles([...ownVehicles, ...rentalVehicles]);
      setDrivers((dR.data.employees || []).map((d: any) => ({ ...d, _busy: busyDriverIds.has(d.id) })));
      setCustomers(cR.data.customers || []);
      setOrders(oR.data.orders || []);
    });
  }, []);

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      await tripApi.create({ ...form,
        plannedQuantityTons: Number(form.plannedQuantityTons),
        ratePerTon: Number(form.ratePerTon),
        tripDate: form.tripDate ? new Date(form.tripDate).toISOString() : undefined });
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string, extraData?: any) => {
    try { await tripApi.updateStatus(id, status, extraData); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const handleDepartConfirm = async () => {
    if (!departModal || !loadedQty || Number(loadedQty) <= 0) {
      alert('Please enter a valid loaded quantity.');
      return;
    }
    await updateStatus(departModal.id, 'in_transit', { loadedQuantityTons: Number(loadedQty) });
    setDepartModal(null);
    setLoadedQty('');
  };

  const closeTrip = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      await tripApi.close(closeModal.id, {
        deliveredQuantityTons: Number(closeForm.deliveredQuantityTons),
        notes: closeForm.notes,
        customerDeducted: closeForm.customerDeducted,
        customerDeductionAmount: closeForm.customerDeductionAmount ? Number(closeForm.customerDeductionAmount) : undefined,
        driverPenaltyAmount: closeForm.driverPenaltyAmount ? Number(closeForm.driverPenaltyAmount) : undefined,
      });
      setCloseModal(null); load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const uploadPod = async () => {
    if (!podModal) return;
    if (!podFile && !podFilename) { alert('Please attach a scan/photo or enter a reference'); return; }
    setPodUploading(true);
    try {
      if (podFile) {
        const fd = new FormData();
        fd.append('file', podFile);
        if (podFilename) fd.append('podReference', podFilename);
        await tripApi.uploadPod(podModal.id, fd);
      } else {
        await tripApi.uploadPod(podModal.id, { podFilename });
      }
      setPodModal(null); setPodFilename(''); setPodFile(null); load();
    } catch (e: any) { alert('Failed to upload POD'); }
    finally { setPodUploading(false); }
  };

  const confirmDelivery = async () => {
    if (!confirmModal) return;
    try {
      await tripApi.confirmDelivery(confirmModal.id, {
        customerConfirmationStatus: confirmStatus,
        customerDisputeReason: confirmStatus === 'disputed' ? disputeReason : undefined,
      });
      setConfirmModal(null); load();
    } catch (e: any) { alert('Failed to confirm delivery'); }
  };

  const openStatusHistory = async (trip: any) => {
    setHistoryModal(trip); setHistoryLoading(true);
    try {
      const res = await tripApi.statusHistory(trip.id);
      setHistoryData(res.data.history || []);
    } catch { setHistoryData([]); }
    finally { setHistoryLoading(false); }
  };

  const nextAction = (t: any) => {
    if (t.status === 'planned') return { label: 'Dispatch', status: 'dispatched', icon: Play };
    if (t.status === 'dispatched') return { label: 'Start Loading', status: 'loading', icon: Play };
    if (t.status === 'loading') return { label: 'Depart', status: 'in_transit', icon: Play };
    if (t.status === 'in_transit') return { label: 'Arrived', status: 'delivering', icon: CheckCircle };
    return null;
  };

  const [view, setView] = useState<'trips'|'analytics'|'pod-aging'>('trips');
  const [timeData, setTimeData] = useState<any>(null);
  const [timeLoading, setTimeLoading] = useState(false);
  const [podAgingData, setPodAgingData] = useState<any>(null);
  const [podAgingLoading, setPodAgingLoading] = useState(false);

  useEffect(() => {
    if (view === 'analytics' && !timeData) {
      setTimeLoading(true);
      tripApi.timeAnalytics().then(r => setTimeData(r.data)).catch(console.error).finally(() => setTimeLoading(false));
    }
    if (view === 'pod-aging' && !podAgingData) {
      setPodAgingLoading(true);
      tripApi.podAging().then(r => setPodAgingData(r.data)).catch(console.error).finally(() => setPodAgingLoading(false));
    }
  }, [view]);

  const STATUSES = ['planned','dispatched','loading','in_transit','delivering','completed','cancelled'];
  const fmt = (n: number|null) => n != null ? `ETB ${n.toLocaleString()}` : '-';
  const fmtMin = (m: number) => m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`;

  return (
    <div className="space-y-5">
      {/* View toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button onClick={() => setView('trips')} className={`px-3 py-1.5 rounded text-sm font-medium ${view==='trips' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Trips</button>
        <button onClick={() => setView('analytics')} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium ${view==='analytics' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}><Timer className="w-4 h-4"/>Time Analytics</button>
        <button onClick={() => setView('pod-aging')} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium ${view==='pod-aging' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}><FileText className="w-4 h-4"/>POD Tracking</button>
      </div>

      {/* POD Aging View */}
      {view === 'pod-aging' && (
        podAgingLoading ? <div className="text-center py-10 text-gray-400">Loading POD data...</div> : podAgingData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="card py-3 text-center">
                <p className="text-xl font-bold text-red-600">{podAgingData.summary.total}</p>
                <p className="text-xs text-gray-500">Missing PODs</p>
              </div>
              <div className="card py-3 text-center">
                <p className="text-xl font-bold text-green-600">{podAgingData.summary.within3Days}</p>
                <p className="text-xs text-gray-500">0-3 Days</p>
              </div>
              <div className="card py-3 text-center">
                <p className="text-xl font-bold text-yellow-600">{podAgingData.summary.within7Days}</p>
                <p className="text-xs text-gray-500">4-7 Days</p>
              </div>
              <div className="card py-3 text-center">
                <p className="text-xl font-bold text-red-600">{podAgingData.summary.over7Days}</p>
                <p className="text-xs text-gray-500">7+ Days</p>
              </div>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr>
                  <th className="th">Trip #</th><th className="th">Vehicle</th><th className="th">Customer</th>
                  <th className="th">Destination</th><th className="th">Delivered</th>
                  <th className="th">Age</th><th className="th">Confirmation</th><th className="th">Actions</th>
                </tr></thead>
                <tbody>
                  {(podAgingData.trips || []).map((t: any) => (
                    <tr key={t.id} className="tr">
                      <td className="td font-mono text-xs">{t.tripNumber}</td>
                      <td className="td">{t.vehicle?.plateNumber}</td>
                      <td className="td">{t.customer?.companyName || '-'}</td>
                      <td className="td text-xs">{t.deliveryLocation}</td>
                      <td className="td">{t.deliveredQuantityTons || '-'} t</td>
                      <td className="td">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${t.ageDays > 7 ? 'bg-red-100 text-red-700' : t.ageDays > 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {t.ageDays} days
                        </span>
                      </td>
                      <td className="td"><StatusBadge status={t.customerConfirmationStatus || 'pending'} /></td>
                      <td className="td">
                        <button onClick={() => { setPodModal(t); setPodFilename(''); }} className="btn-primary py-1 px-2 text-xs">
                          <Upload className="w-3 h-3"/>Upload POD
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <div className="text-center py-10 text-gray-400">No POD data available</div>
      )}

      {/* Time Analytics View */}
      {view === 'analytics' && (
        timeLoading ? <div className="text-center py-10 text-gray-400">Loading time analytics...</div> : timeData ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ['Trips Analyzed', timeData.summary?.totalTrips || 0],
                ['Avg Cycle', fmtMin(timeData.summary?.avgCycleMin || 0)],
                ['Avg Loading', fmtMin(timeData.summary?.avgLoadingMin || 0)],
                ['Avg Travel', fmtMin(timeData.summary?.avgTravelMin || 0)],
                ['Avg Unloading', fmtMin(timeData.summary?.avgUnloadingMin || 0)],
              ].map(([l, v]) => (
                <div key={l as string} className="card py-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{v}</p>
                  <p className="text-xs text-gray-500">{l as string}</p>
                </div>
              ))}
            </div>

            {timeData.byRoute?.length > 0 && (
              <div className="card">
                <h3 className="section-title mb-4">Time Breakdown by Route</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeData.byRoute.slice(0, 8).map((r: any) => ({ name: r.route.length > 30 ? r.route.slice(0,30)+'...' : r.route, Loading: r.avgLoading, Travel: r.avgTravel, Unloading: r.avgUnloading, Wait: r.avgWait }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={80} />
                    <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(v: any) => `${v} min`} />
                    <Legend />
                    <Bar dataKey="Loading" fill="#3b82f6" stackId="a" />
                    <Bar dataKey="Travel" fill="#10b981" stackId="a" />
                    <Bar dataKey="Unloading" fill="#f59e0b" stackId="a" />
                    <Bar dataKey="Wait" fill="#ef4444" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="section-title mb-2">Route Performance</h3>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th className="th">Route</th><th className="th">Trips</th><th className="th">Avg Cycle</th><th className="th">Avg Travel</th></tr></thead>
                    <tbody>
                      {(timeData.byRoute || []).map((r: any, i: number) => (
                        <tr key={i} className="tr">
                          <td className="td text-sm font-medium">{r.route}</td>
                          <td className="td">{r.trips}</td>
                          <td className="td">{fmtMin(r.avgTotal)}</td>
                          <td className="td">{fmtMin(r.avgTravel)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="section-title mb-2">Driver Speed Ranking</h3>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th className="th">#</th><th className="th">Driver</th><th className="th">Trips</th><th className="th">Avg Cycle</th></tr></thead>
                    <tbody>
                      {(timeData.byDriver || []).map((d: any, i: number) => (
                        <tr key={d.driverId} className="tr">
                          <td className="td font-bold text-gray-400">{i + 1}</td>
                          <td className="td font-medium">{d.name}</td>
                          <td className="td">{d.trips}</td>
                          <td className="td">{fmtMin(d.avgCycle)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : <div className="text-center py-10 text-gray-400">No time data available</div>
      )}

      {/* Trips list view */}
      {view === 'trips' && <>
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Total Trips', kpis.total ?? 0],
          ['Completed', kpis.completed ?? 0],
          ['Total Tonnage', `${(kpis.totalTonnage||0).toFixed(1)} t`],
          ['Total Revenue', fmt(kpis.totalRevenue)],
        ].map(([l,v]) => (
          <div key={l as string} className="card py-3 text-center">
            <p className="text-xl font-bold text-gray-900">{v}</p>
            <p className="text-xs text-gray-500">{l as string}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <select className="select w-44" value={filterStatus} onChange={e=>{ setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
        <button onClick={()=>{ setForm(empty); setError(''); setModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4"/>Create Trip
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th className="th">Trip #</th><th className="th">Order</th><th className="th">Vehicle</th>
            <th className="th">Driver</th><th className="th">Route</th>
            <th className="th">Planned (t)</th><th className="th">POD</th>
            <th className="th">Confirmed</th><th className="th">Status</th>
            <th className="th">Revenue</th><th className="th">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : trips.length === 0 ? (
              <tr><td colSpan={11} className="td text-center py-10 text-gray-400">No trips found</td></tr>
            ) : trips.map((t:any) => {
              const action = nextAction(t);
              return (
                <tr key={t.id} className="tr">
                  <td className="td font-mono text-xs font-semibold text-blue-700">{t.tripNumber}</td>
                  <td className="td font-mono text-xs">{t.order?.orderNumber || <span className="text-amber-500">No order</span>}</td>
                  <td className="td">{t.vehicle?.plateNumber}</td>
                  <td className="td">{t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : '-'}</td>
                  <td className="td text-xs text-gray-500 max-w-xs">
                    <span>{t.pickupLocation}</span>
                    <span className="mx-1">-&gt;</span>
                    <span>{t.deliveryLocation}</span>
                  </td>
                  <td className="td">{t.plannedQuantityTons}</td>
                  <td className="td">
                    {t.podUrl || t.podDocument ? (
                      (() => {
                        const raw = t.podUrl || t.podDocument || '';
                        const isFile = typeof raw === 'string' && raw.startsWith('/uploads/');
                        return isFile ? (
                          <a href={raw} target="_blank" rel="noreferrer"
                             title={`View POD: ${t.podDocument || 'document'}`}
                             className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline">
                            <FileText className="w-4 h-4" /><span className="text-xs">View</span>
                          </a>
                        ) : (
                          <span title={`POD reference: ${raw}`} className="inline-flex items-center gap-1 text-green-600">
                            <FileText className="w-4 h-4" /><span className="text-xs">{String(raw).slice(0, 12)}</span>
                          </span>
                        );
                      })()
                    ) : t.status === 'completed' ? (
                      <span title="POD missing"><AlertTriangle className="w-4 h-4 text-red-400 inline" /></span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="td">
                    <StatusBadge status={t.customerConfirmationStatus || 'pending'} />
                  </td>
                  <td className="td"><StatusBadge status={t.status} /></td>
                  <td className="td">{t.revenue ? `ETB ${t.revenue.toLocaleString()}` : '-'}</td>
                  <td className="td">
                    <div className="flex gap-1 flex-wrap">
                      {action && (
                        <button onClick={()=>{
                          if (action.status === 'in_transit') {
                            setDepartModal(t);
                            setLoadedQty(t.loadedQuantityTons ? String(t.loadedQuantityTons) : String(t.plannedQuantityTons || ''));
                          } else {
                            updateStatus(t.id, action.status);
                          }
                        }} className="btn-primary py-1 px-2 text-xs">
                          <action.icon className="w-3 h-3"/>{action.label}
                        </button>
                      )}
                      {t.status === 'delivering' && (
                        <button onClick={()=>{ setCloseModal(t); setCloseForm(closeEmpty); }} className="btn-success py-1 px-2 text-xs">
                          <Square className="w-3 h-3"/>Close
                        </button>
                      )}
                      {t.status === 'completed' && !t.podUrl && !t.podDocument && (
                        <button onClick={()=>{ setPodModal(t); setPodFilename(''); }} className="py-1 px-2 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100">
                          <Upload className="w-3 h-3 inline mr-0.5"/>POD
                        </button>
                      )}
                      {t.status === 'completed' && t.customerConfirmationStatus === 'pending' && (
                        <button onClick={()=>{ setConfirmModal(t); setConfirmStatus('confirmed'); setDisputeReason(''); }} className="py-1 px-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                          <CheckCircle className="w-3 h-3 inline mr-0.5"/>Confirm
                        </button>
                      )}
                      <button onClick={()=>openStatusHistory(t)} className="py-1 px-2 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100" title="Status History">
                        <History className="w-3 h-3"/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination total={total} page={page} limit={20} onChange={setPage} />
      </div>
      </>}

      {/* Create Trip Modal */}
      {modal && (
        <Modal title="Create Trip" onClose={()=>setModal(false)} size="max-w-2xl">
          <form onSubmit={save} className="grid grid-cols-2 gap-3">
            {error && <div className="col-span-2 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div className="col-span-2">
              <button type="button" onClick={() => {
                setSuggestLoading(true); setSuggestions(null);
                tripApi.suggestAssignment({
                  plannedQuantityTons: form.plannedQuantityTons || undefined,
                  pickupLocation: form.pickupLocation || undefined,
                  deliveryLocation: form.deliveryLocation || undefined,
                  tripDate: form.tripDate || undefined,
                }).then(r => setSuggestions(r.data)).catch(console.error).finally(() => setSuggestLoading(false));
              }} className="btn-secondary w-full py-1.5 text-sm" disabled={suggestLoading}>
                <Sparkles className="w-4 h-4"/>{suggestLoading ? 'Finding best matches...' : 'Auto-Suggest Vehicle & Driver'}
              </button>
            </div>
            {suggestions && (
              <div className="col-span-2 p-3 bg-purple-50 border border-purple-200 rounded space-y-2 text-sm">
                <p className="font-semibold text-purple-700">Recommended Assignments</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Top Vehicles</p>
                    {(suggestions.vehicles || []).slice(0, 3).map((v: any) => (
                      <button key={v.id} type="button" onClick={() => setForm((f:any)=>({...f, vehicleId: v.id}))}
                        className={`w-full text-left px-2 py-1 rounded text-xs mb-1 ${form.vehicleId === v.id ? 'bg-purple-200 font-bold' : 'bg-white hover:bg-purple-100'}`}>
                        {v.plateNumber} ({v.capacityTons}t) - Score: {v.score}
                      </button>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Top Drivers</p>
                    {(suggestions.drivers || []).slice(0, 3).map((d: any) => (
                      <button key={d.id} type="button" onClick={() => setForm((f:any)=>({...f, driverId: d.id}))}
                        className={`w-full text-left px-2 py-1 rounded text-xs mb-1 ${form.driverId === d.id ? 'bg-purple-200 font-bold' : 'bg-white hover:bg-purple-100'}`}>
                        {d.name} - Score: {d.score}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="col-span-2">
              <label className="label">Order</label>
              <select className="select" value={form.orderId} onChange={e=>{
                const ord = orders.find((o:any) => o.id === e.target.value);
                setForm((f:any)=>({...f, orderId: e.target.value,
                  customerId: ord?.customerId || f.customerId,
                  pickupLocation: ord?.pickupLocation || f.pickupLocation,
                  deliveryLocation: ord?.deliveryLocation || f.deliveryLocation,
                  ratePerTon: ord?.ratePerTon || ord?.baseRate || f.ratePerTon,
                }));
              }}>
                <option value="">Select order...</option>
                {orders.map((o:any)=><option key={o.id} value={o.id}>{o.orderNumber} - {o.customer?.companyName || ''} ({o.status})</option>)}
              </select>
              <p className="text-xs text-amber-600 mt-1">Note: Trip cannot be dispatched without an assigned order.</p>
            </div>
            <div className="col-span-2">
              <label className="label">Vehicle *</label>
              <select className="select" value={form.vehicleId} onChange={async e=>{
                const newVehicleId = e.target.value;
                setForm((f:any)=>({...f, vehicleId: newVehicleId}));
                // If a rental vehicle was picked, auto-assign its driver
                if (newVehicleId.startsWith('rental:')) {
                  const rentalId = newVehicleId.slice('rental:'.length);
                  setRentalDriverLoading(true);
                  setRentalDriverInfo(null);
                  try {
                    const res = await rentalApi.ensureDriver(rentalId);
                    const emp = res.data.employee;
                    setRentalDriverInfo(emp);
                    // Auto-select the rental driver
                    setForm((f:any)=>({...f, driverId: emp.id}));
                    // Ensure this driver is in the drivers list so the dropdown shows their name
                    setDrivers(prev => prev.find((d:any)=>d.id===emp.id) ? prev : [...prev, { ...emp, _isRentalDriver: true, _busy: false }]);
                  } catch (err:any) {
                    setRentalDriverInfo({ _error: err.response?.data?.error || 'Could not auto-assign rental driver' });
                  } finally {
                    setRentalDriverLoading(false);
                  }
                } else {
                  setRentalDriverInfo(null);
                }
              }} required>
                <option value="">Select vehicle...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id} disabled={v._busy}>
                    {v._isRental ? '\uD83D\uDD12 ' : ''}
                    {v.plateNumber} - {v.make}{v._isRental ? ' ' + (v.model || '') : ''} ({v.capacityTons}t)
                    {v._isRental ? ' [rental]' : ''}
                    {v._busy ? ' [ON TRIP]' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">🔒 marks rented vehicles. Picking one auto-assigns the rental driver.</p>
              {rentalDriverLoading && (
                <p className="text-xs text-blue-600 mt-1">Loading rental driver…</p>
              )}
              {rentalDriverInfo && !rentalDriverInfo._error && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <strong>Rental driver auto-assigned:</strong> {rentalDriverInfo.firstName} {rentalDriverInfo.lastName}
                  {rentalDriverInfo.phone && rentalDriverInfo.phone !== '-' && <> · {rentalDriverInfo.phone}</>}
                  {rentalDriverInfo.nationalId && <> · Lic. {rentalDriverInfo.nationalId}</>}
                </div>
              )}
              {rentalDriverInfo?._error && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                  ⚠ {rentalDriverInfo._error}
                </div>
              )}
            </div>
            <div>
              <label className="label">Driver *</label>
              <select className="select" value={form.driverId} onChange={e=>setForm((f:any)=>({...f,driverId:e.target.value}))} required>
                <option value="">Select driver...</option>
                {drivers.map(d=><option key={d.id} value={d.id} disabled={d._busy}>{d.firstName} {d.lastName}{d._busy ? ' [ON TRIP]' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Customer</label>
              <select className="select" value={form.customerId} onChange={e=>setForm((f:any)=>({...f,customerId:e.target.value}))}>
                <option value="">Select customer...</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Order Type</label>
              <select className="select" value={form.orderType} onChange={e=>setForm((f:any)=>({...f,orderType:e.target.value}))}>
                <option value="cement">Cement</option>
                <option value="gravel">Gravel</option>
              </select>
            </div>
            <div>
              <label className="label">Trip Date</label>
              <DateTimeInput value={form.tripDate} onChange={val=>setForm((f:any)=>({...f,tripDate:val}))} />
            </div>
            <div>
              <label className="label">Pickup Location *</label>
              <input className="input" value={form.pickupLocation} onChange={e=>setForm((f:any)=>({...f,pickupLocation:e.target.value}))} required />
            </div>
            <div>
              <label className="label">Delivery Location *</label>
              <input className="input" value={form.deliveryLocation} onChange={e=>setForm((f:any)=>({...f,deliveryLocation:e.target.value}))} required />
            </div>
            <div>
              <label className="label">Planned Quantity (tons) *</label>
              <input type="number" className="input" value={form.plannedQuantityTons} onChange={e=>setForm((f:any)=>({...f,plannedQuantityTons:e.target.value}))} required />
            </div>
            <div>
              <label className="label">Rate Per Ton (ETB) *</label>
              <input type="number" className="input" value={form.ratePerTon} onChange={e=>setForm((f:any)=>({...f,ratePerTon:e.target.value}))} required />
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving?'Creating...':'Create Trip'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Close Trip Modal */}
      {closeModal && (
        <Modal title={`Close Trip: ${closeModal.tripNumber}`} onClose={()=>setCloseModal(null)}>
          <form onSubmit={closeTrip} className="space-y-4">
            <div className="p-3 bg-blue-50 rounded text-sm space-y-1">
              <p><span className="text-gray-500">Loaded:</span> <strong>{closeModal.loadedQuantityTons || closeModal.plannedQuantityTons} tons</strong></p>
              <p><span className="text-gray-500">Rate:</span> <strong>ETB {closeModal.ratePerTon}/ton</strong></p>
            </div>
            <div>
              <label className="label">Delivered Quantity (tons) *</label>
              <input type="number" step="0.01" className="input" value={closeForm.deliveredQuantityTons}
                onChange={e=>setCloseForm(f=>({...f,deliveredQuantityTons:e.target.value}))} required />
              {closeForm.deliveredQuantityTons && (
                <div className="mt-2 text-xs space-y-1">
                  <p>Shortage: <strong className="text-red-600">
                    {Math.max(0, (closeModal.loadedQuantityTons||closeModal.plannedQuantityTons) - Number(closeForm.deliveredQuantityTons)).toFixed(2)} t
                  </strong></p>
                  <p>Revenue: <strong className="text-green-600">
                    ETB {(Number(closeForm.deliveredQuantityTons) * closeModal.ratePerTon).toLocaleString()}
                  </strong></p>
                </div>
              )}
            </div>
            {/* Shortage deduction fields */}
            {closeForm.deliveredQuantityTons && Number(closeForm.deliveredQuantityTons) < (closeModal.loadedQuantityTons || closeModal.plannedQuantityTons) && (
              <div className="p-3 bg-red-50 rounded border border-red-200 space-y-3">
                <p className="text-sm font-semibold text-red-700">Shortage Detected</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={closeForm.customerDeducted}
                    onChange={e=>setCloseForm(f=>({...f, customerDeducted:e.target.checked}))} />
                  Customer will deduct shortage from payment
                </label>
                {closeForm.customerDeducted && (
                  <div>
                    <label className="label text-xs">Customer Deduction Amount (ETB)</label>
                    <input type="number" step="0.01" className="input" value={closeForm.customerDeductionAmount}
                      onChange={e=>setCloseForm(f=>({...f,customerDeductionAmount:e.target.value}))} placeholder="Amount customer will deduct" />
                  </div>
                )}
                <div>
                  <label className="label text-xs">Driver Penalty Amount (ETB)</label>
                  <input type="number" step="0.01" className="input" value={closeForm.driverPenaltyAmount}
                    onChange={e=>setCloseForm(f=>({...f,driverPenaltyAmount:e.target.value}))} placeholder="Amount to debit from driver ledger" />
                </div>
              </div>
            )}
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={closeForm.notes}
                onChange={e=>setCloseForm(f=>({...f,notes:e.target.value}))} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setCloseModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-success">{saving?'Closing...':'Close Trip'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Depart Modal (loaded qty gating) */}
      {departModal && (
        <Modal title={`Depart: ${departModal.tripNumber}`} onClose={()=>setDepartModal(null)}>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded text-sm space-y-1">
              <p><span className="text-gray-500">Vehicle:</span> <strong>{departModal.vehicle?.plateNumber}</strong></p>
              <p><span className="text-gray-500">Driver:</span> <strong>{departModal.driver ? `${departModal.driver.firstName} ${departModal.driver.lastName}` : '-'}</strong></p>
              <p><span className="text-gray-500">Route:</span> <strong>{departModal.pickupLocation} &rarr; {departModal.deliveryLocation}</strong></p>
              <p><span className="text-gray-500">Planned Qty:</span> <strong>{departModal.plannedQuantityTons} tons</strong></p>
            </div>
            <div>
              <label className="label">Loaded Quantity (tons) *</label>
              <input type="number" step="0.01" min="0.1" className="input" value={loadedQty}
                onChange={e=>setLoadedQty(e.target.value)} required autoFocus />
              <p className="text-xs text-gray-500 mt-1">Enter the actual weight loaded on the truck before departure.</p>
            </div>
            {loadedQty && Number(loadedQty) !== departModal.plannedQuantityTons && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Loaded qty ({loadedQty}t) differs from planned ({departModal.plannedQuantityTons}t) by {Math.abs(Number(loadedQty) - departModal.plannedQuantityTons).toFixed(2)}t
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={()=>setDepartModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleDepartConfirm} className="btn-primary" disabled={!loadedQty || Number(loadedQty) <= 0}>
                <Play className="w-4 h-4" />Confirm Departure
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload POD Modal */}
      {podModal && (
        <Modal title={`Upload POD: ${podModal.tripNumber}`} onClose={()=>{setPodModal(null);setPodFile(null);setPodFilename('');}}>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded text-sm">
              <p><span className="text-gray-500">Vehicle:</span> <strong>{podModal.vehicle?.plateNumber}</strong></p>
              <p><span className="text-gray-500">Destination:</span> <strong>{podModal.deliveryLocation}</strong></p>
            </div>
            <div>
              <label className="label">Attach Scan / Photo</label>
              <input
                type="file"
                accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic"
                onChange={e => setPodFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
              />
              {podFile && (
                <p className="text-xs text-gray-600 mt-1">
                  Selected: <strong>{podFile.name}</strong> ({(podFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">Accepted: images (JPG/PNG/HEIC/WEBP) or PDF, max 15 MB.</p>
            </div>
            <div>
              <label className="label">POD Reference (optional)</label>
              <input className="input" value={podFilename} onChange={e=>setPodFilename(e.target.value)}
                placeholder="e.g. POD-2026-001" />
              <p className="text-xs text-gray-500 mt-1">If omitted, the uploaded filename will be used as the reference.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={()=>{setPodModal(null);setPodFile(null);setPodFilename('');}} className="btn-secondary" disabled={podUploading}>Cancel</button>
              <button onClick={uploadPod} disabled={podUploading || (!podFile && !podFilename)} className="btn-primary">
                {podUploading ? 'Uploading…' : 'Upload POD'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delivery Confirmation Modal */}
      {confirmModal && (
        <Modal title={`Confirm Delivery: ${confirmModal.tripNumber}`} onClose={()=>setConfirmModal(null)}>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded text-sm">
              <p><span className="text-gray-500">Delivered:</span> <strong>{confirmModal.deliveredQuantityTons} tons</strong></p>
              <p><span className="text-gray-500">Customer:</span> <strong>{confirmModal.customer?.companyName || '-'}</strong></p>
            </div>
            <div>
              <label className="label">Confirmation Status *</label>
              <select className="select" value={confirmStatus} onChange={e=>setConfirmStatus(e.target.value)}>
                <option value="confirmed">Confirmed - Delivery accepted</option>
                <option value="disputed">Disputed - Customer disputes delivery</option>
              </select>
            </div>
            {confirmStatus === 'disputed' && (
              <div>
                <label className="label">Dispute Reason</label>
                <textarea className="input" rows={2} value={disputeReason} onChange={e=>setDisputeReason(e.target.value)}
                  placeholder="Reason for dispute..." />
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={()=>setConfirmModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={confirmDelivery} className={confirmStatus === 'confirmed' ? 'btn-success' : 'btn-danger'}>
                {confirmStatus === 'confirmed' ? 'Confirm Delivery' : 'Mark Disputed'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status History Modal */}
      {historyModal && (
        <Modal title={`Status History: ${historyModal.tripNumber}`} onClose={()=>setHistoryModal(null)}>
          {historyLoading ? (
            <div className="text-center py-6 text-gray-400">Loading...</div>
          ) : historyData.length === 0 ? (
            <div className="text-center py-6 text-gray-400">No status history recorded yet</div>
          ) : (
            <div className="space-y-2">
              {historyData.map((h: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-gray-50 text-sm">
                  <div className="text-xs text-gray-400 w-36 shrink-0">{formatDualDate(h.changedAt)}</div>
                  <StatusBadge status={h.fromStatus} />
                  <span className="text-gray-400">-&gt;</span>
                  <StatusBadge status={h.toStatus} />
                  {h.note && <span className="text-gray-500 text-xs ml-2">({h.note})</span>}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
