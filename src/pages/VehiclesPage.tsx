import { useEffect, useState } from 'react';
import { Plus, Edit, Truck, TrendingDown, Play, History, ChevronDown, Download, MapPin, Check, Link, SkipForward } from 'lucide-react';
import api, { vehicleApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import StatCard from '../components/ui/StatCard';
import { formatDualDate } from '../utils/ethCalendar';

const CATEGORIES = ['cement_tanker','gravel_tipper','office_car','office_pickup','motorbike','minibus'];
const VEHICLE_TYPES = ['standalone','power_unit','trailer'];
const STATUSES = ['active','maintenance','breakdown','inactive'];

const empty: any = { plateNumber:'', category:'cement_tanker', vehicleType:'standalone', make:'', model:'', year:'',
  capacityTons:'', purchaseCost:'', usefulLifeYears:'8', residualValue:'', fuelTankCapacity:'',
  color:'', engineNumber:'', chassisNumber:'', fuelType:'diesel', ownership:'company', ownerName:'',
  insuranceExpiry:'', inspectionExpiry:'', permitExpiry:'',
  libreExpiry:'', boloExpiry:'', roadFundExpiry:'', roadworthinessExpiry:'' };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function VehiclesPage() {
  const [tab, setTab] = useState<'fleet'|'depreciation'|'pairings'|'tyres'|'assignments'>('fleet');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Depreciation state
  const [deprData, setDeprData] = useState<any>(null);
  const [deprLoading, setDeprLoading] = useState(false);
  const [deprDetail, setDeprDetail] = useState<any>(null);
  const [deprHistory, setDeprHistory] = useState<any[]>([]);
  const [deprHistoryLoading, setDeprHistoryLoading] = useState(false);
  const [runMonth, setRunMonth] = useState(new Date().getMonth() + 1);
  const [runYear, setRunYear] = useState(new Date().getFullYear());
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  // GPS Import state
  const [gpsModal, setGpsModal] = useState(false);
  const [gpsVehicles, setGpsVehicles] = useState<any[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSelected, setGpsSelected] = useState<Set<string>>(new Set());
  const [gpsImporting, setGpsImporting] = useState(false);
  const [gpsResult, setGpsResult] = useState<any>(null);

  // Assign-primary-driver modal state
  const [assignModal, setAssignModal] = useState<any>(null); // selected vehicle
  const [assignDrivers, setAssignDrivers] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState<{ driverId: string; reason: string }>({ driverId: '', reason: '' });
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');

  const openAssign = (v: any) => {
    setAssignModal(v);
    setAssignForm({ driverId: v.assignedDriverId || '', reason: '' });
    setAssignError('');
    // Lazy-load drivers the first time
    if (assignDrivers.length === 0) {
      api.get('/employees', { params: { role: 'driver' } })
        .then(r => setAssignDrivers(r.data.employees || []))
        .catch(() => setAssignDrivers([]));
    }
  };

  const submitAssign = async () => {
    if (!assignModal || !assignForm.driverId) {
      setAssignError('Please select a driver');
      return;
    }
    setAssignSaving(true);
    setAssignError('');
    try {
      await api.post('/vehicles/assignments', {
        vehicleId: assignModal.id,
        driverId: assignForm.driverId,
        reason: assignForm.reason || null,
      });
      setAssignModal(null);
      load(); // refresh to show new assigned driver name
    } catch (e: any) {
      setAssignError(e.response?.data?.error || 'Failed to assign driver');
    } finally {
      setAssignSaving(false);
    }
  };

  const clearAssign = async (v: any) => {
    if (!v.assignedDriverId) return;
    if (!confirm(`Remove ${v.assignedDriver?.firstName || 'this driver'} as primary driver of ${v.plateNumber}?`)) return;
    try {
      // End the active assignment by reassigning to the same driver with a blank... better:
      // call a dedicated end endpoint. For now we POST with the same driver — back end
      // ends the previous assignment as part of reassigning. To truly clear, we must
      // null out assignedDriverId directly via vehicle update.
      await api.put(`/vehicles/${v.id}`, { assignedDriverId: null });
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      vehicleApi.list({ status: filterStatus || undefined, category: filterCategory || undefined }),
      vehicleApi.stats(),
    ]).then(([vRes, sRes]) => {
      setVehicles(vRes.data.vehicles || []);
      setStats(sRes.data || {});
    }).catch(console.error).finally(() => setLoading(false));
  };

  const loadDepreciation = () => {
    setDeprLoading(true);
    vehicleApi.depreciationOverview()
      .then(r => setDeprData(r.data))
      .catch(console.error)
      .finally(() => setDeprLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus, filterCategory]);
  useEffect(() => { if (tab === 'depreciation') loadDepreciation(); }, [tab]);

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setModal(true); };
  const openEdit = (v: any) => {
    setEditing(v);
    setForm({ plateNumber: v.plateNumber, category: v.category, make: v.make, model: v.model||'',
      year: v.year||'', capacityTons: v.capacityTons||'', purchaseCost: v.purchaseCost||'',
      usefulLifeYears: v.usefulLifeYears||'8', residualValue: v.residualValue||'',
      vehicleType: v.vehicleType||'standalone', fuelTankCapacity: v.fuelTankCapacity||'',
      fuelType: v.fuelType||'diesel', ownership: v.ownership||'company', ownerName: v.ownerName||'',
      color: v.color||'', engineNumber: v.engineNumber||'', chassisNumber: v.chassisNumber||'',
      insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.slice(0,10) : '',
      inspectionExpiry: v.inspectionExpiry ? v.inspectionExpiry.slice(0,10) : '',
      permitExpiry: v.permitExpiry ? v.permitExpiry.slice(0,10) : '',
      libreExpiry: v.libreExpiry ? v.libreExpiry.slice(0,10) : '',
      boloExpiry: v.boloExpiry ? v.boloExpiry.slice(0,10) : '',
      roadFundExpiry: v.roadFundExpiry ? v.roadFundExpiry.slice(0,10) : '',
      roadworthinessExpiry: v.roadworthinessExpiry ? v.roadworthinessExpiry.slice(0,10) : '' });
    setError(''); setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await vehicleApi.update(editing.id, form);
      else await vehicleApi.create(form);
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const F = (k: string, label: string, type='text', opts?: string[]) => (
    <div key={k}>
      <label className="label">{label}</label>
      {opts ? (
        <select className="select" value={form[k]} onChange={e => setForm((f:any) => ({...f,[k]:e.target.value}))}>
          {opts.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
        </select>
      ) : (
        <input type={type} className="input" value={form[k]}
          onChange={e => setForm((f:any) => ({...f,[k]:e.target.value}))} />
      )}
    </div>
  );

  const openDeprDetail = (vehicle: any) => {
    setDeprDetail(vehicle);
    setDeprHistoryLoading(true);
    vehicleApi.depreciationHistory(vehicle.vehicleId)
      .then(r => setDeprHistory(r.data.entries || []))
      .catch(console.error)
      .finally(() => setDeprHistoryLoading(false));
  };

  const handleRunAll = async () => {
    setRunning(true); setRunResult(null);
    try {
      const r = await vehicleApi.runAllDepreciation({ month: runMonth, year: runYear });
      setRunResult(r.data);
      loadDepreciation();
    } catch (e: any) { setRunResult({ error: e.response?.data?.error || 'Failed' }); }
    finally { setRunning(false); }
  };

  const openGpsImport = async () => {
    setGpsModal(true); setGpsLoading(true); setGpsResult(null); setGpsSelected(new Set());
    try {
      const r = await vehicleApi.gpsImportPreview();
      setGpsVehicles(r.data.gpsVehicles || []);
      // Pre-select all "new" vehicles
      const newImeis = (r.data.gpsVehicles || []).filter((v: any) => v.status === 'new').map((v: any) => v.imei);
      setGpsSelected(new Set(newImeis));
    } catch (e) { console.error(e); }
    finally { setGpsLoading(false); }
  };

  const toggleGpsSelect = (imei: string) => {
    setGpsSelected(prev => {
      const next = new Set(prev);
      if (next.has(imei)) next.delete(imei); else next.add(imei);
      return next;
    });
  };

  const handleGpsImport = async () => {
    setGpsImporting(true); setGpsResult(null);
    try {
      const r = await vehicleApi.gpsImport([...gpsSelected]);
      setGpsResult(r.data);
      load(); // Refresh vehicle list
    } catch (e: any) { setGpsResult({ error: e.response?.data?.error || 'Import failed' }); }
    finally { setGpsImporting(false); }
  };

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[['fleet', 'Fleet Management'], ['pairings', 'Pairings'], ['tyres', 'Tyres'], ['assignments', 'Driver History'], ['depreciation', 'Depreciation']] .map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{l}</button>
        ))}
      </div>

      {tab === 'fleet' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[['Total',stats.total,'blue'],['Active',stats.active,'green'],
              ['Maintenance',stats.maintenance,'red'],['Breakdown',stats.breakdown,'red'],
              ['Inactive',stats.inactive,'gray']].map(([l,v,c]) => (
              <div key={l as string} className="card py-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{v??0}</p>
                <p className="text-xs text-gray-500">{l as string}</p>
              </div>
            ))}
          </div>

          {/* Filters + Add */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex gap-2">
              <select className="select w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="select w-44" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={openGpsImport} className="btn-secondary"><MapPin className="w-4 h-4"/>Import from GPS</button>
              <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4"/>Add Vehicle</button>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Plate Number</th><th className="th">Category</th>
                <th className="th">Make / Model</th><th className="th">Capacity</th>
                <th className="th">KM</th><th className="th">Driver</th>
                <th className="th">Insurance</th><th className="th">Status</th><th className="th">Actions</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="td text-center py-10 text-gray-400">Loading...</td></tr>
                ) : vehicles.length === 0 ? (
                  <tr><td colSpan={9} className="td text-center py-10 text-gray-400">No vehicles found</td></tr>
                ) : vehicles.map(v => (
                  <tr key={v.id} className="tr">
                    <td className="td font-semibold text-blue-700">{v.plateNumber}</td>
                    <td className="td"><StatusBadge status={v.category} /></td>
                    <td className="td">{v.make} {v.model}</td>
                    <td className="td">{v.capacityTons ? `${v.capacityTons}t` : '-'}</td>
                    <td className="td">{v.currentKm ? v.currentKm.toLocaleString() : 0} km</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <span>
                          {v.assignedDriver
                            ? `${v.assignedDriver.firstName} ${v.assignedDriver.lastName}`
                            : <span className="text-gray-400">Unassigned</span>}
                        </span>
                        <button
                          onClick={() => openAssign(v)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          title={v.assignedDriver ? 'Reassign primary driver' : 'Assign primary driver'}
                        >
                          {v.assignedDriver ? 'Change' : 'Assign'}
                        </button>
                        {v.assignedDriver && (
                          <button
                            onClick={() => clearAssign(v)}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline"
                            title="Remove primary driver"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="td">{v.insuranceExpiry ? formatDualDate(v.insuranceExpiry) : '-'}</td>
                    <td className="td"><StatusBadge status={v.status} /></td>
                    <td className="td">
                      <button onClick={() => openEdit(v)} className="btn-ghost py-1 px-2">
                        <Edit className="w-3.5 h-3.5"/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'depreciation' && (
        <>
          {/* Summary Cards */}
          {deprData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="card py-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{deprData.summary.vehicleCount}</p>
                <p className="text-xs text-gray-500">Tracked Assets</p>
              </div>
              <div className="card py-3 text-center bg-blue-50 border-blue-200">
                <p className="text-lg font-bold text-blue-700">ETB {deprData.summary.totalPurchaseCost?.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Purchase Cost</p>
              </div>
              <div className="card py-3 text-center bg-green-50 border-green-200">
                <p className="text-lg font-bold text-green-700">ETB {deprData.summary.totalBookValue?.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Current Book Value</p>
              </div>
              <div className="card py-3 text-center bg-amber-50 border-amber-200">
                <p className="text-lg font-bold text-amber-700">ETB {deprData.summary.totalAccumulatedDepr?.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Accumulated Depreciation</p>
              </div>
              <div className="card py-3 text-center bg-red-50 border-red-200">
                <p className="text-lg font-bold text-red-700">ETB {deprData.summary.totalMonthlyDepr?.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Monthly Depreciation</p>
              </div>
            </div>
          )}

          {/* Run Depreciation Section */}
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Run Monthly Depreciation</h3>
                <p className="text-xs text-gray-500">Record depreciation entries for all vehicles for a specific month</p>
              </div>
              <div className="flex items-center gap-2">
                <select className="select w-28" value={runMonth} onChange={e => setRunMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <input type="number" className="input w-24" value={runYear} onChange={e => setRunYear(Number(e.target.value))} />
                <button onClick={handleRunAll} disabled={running} className="btn-primary">
                  <Play className="w-4 h-4" />
                  {running ? 'Running...' : 'Run All'}
                </button>
              </div>
            </div>
            {runResult && (
              <div className={`mt-3 p-3 rounded text-sm ${runResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {runResult.error ? runResult.error : `Processed ${runResult.processed} of ${runResult.total} vehicles for ${MONTHS[runMonth-1]} ${runYear}`}
              </div>
            )}
          </div>

          {/* Depreciation Table */}
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Vehicle</th>
                <th className="th">Category</th>
                <th className="th text-right">Purchase Cost</th>
                <th className="th text-right">Book Value</th>
                <th className="th text-right">Accumulated</th>
                <th className="th text-right">Monthly Depr.</th>
                <th className="th text-center">Life Remaining</th>
                <th className="th text-center">Depreciated %</th>
                <th className="th">Actions</th>
              </tr></thead>
              <tbody>
                {deprLoading ? (
                  <tr><td colSpan={9} className="td text-center py-10 text-gray-400">Loading...</td></tr>
                ) : !deprData?.fleet?.length ? (
                  <tr><td colSpan={9} className="td text-center py-10 text-gray-400">No depreciation records found. Add vehicles with purchase cost to track depreciation.</td></tr>
                ) : deprData.fleet.map((v: any) => (
                  <tr key={v.vehicleId} className="tr">
                    <td className="td">
                      <div>
                        <p className="font-semibold text-blue-700">{v.plateNumber}</p>
                        <p className="text-xs text-gray-500">{v.make} {v.model}</p>
                      </div>
                    </td>
                    <td className="td"><StatusBadge status={v.category} /></td>
                    <td className="td text-right font-mono">ETB {v.purchaseCost?.toLocaleString()}</td>
                    <td className="td text-right font-mono font-semibold">ETB {v.bookValue?.toLocaleString()}</td>
                    <td className="td text-right font-mono text-amber-700">ETB {v.accumulatedDepr?.toLocaleString()}</td>
                    <td className="td text-right font-mono text-red-600">ETB {v.monthlyDepreciation?.toLocaleString()}</td>
                    <td className="td text-center">
                      <span className={`text-sm font-medium ${v.remainingYears <= 1 ? 'text-red-600' : v.remainingYears <= 2 ? 'text-amber-600' : 'text-green-600'}`}>
                        {v.remainingYears} yrs
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                          <div className={`h-2 rounded-full ${v.depreciationPct > 80 ? 'bg-red-500' : v.depreciationPct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(100, v.depreciationPct)}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-10 text-right">{v.depreciationPct}%</span>
                      </div>
                    </td>
                    <td className="td">
                      <button onClick={() => openDeprDetail(v)} className="btn-ghost py-1 px-2 text-blue-600" title="Depreciation History">
                        <History className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Vehicle Modal */}
      {modal && (
        <Modal title={editing ? 'Edit Vehicle' : 'Add Vehicle'} onClose={() => setModal(false)} size="max-w-2xl">
          <form onSubmit={save} className="grid grid-cols-2 gap-4">
            {error && <div className="col-span-2 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            {F('plateNumber','Plate Number *')}
            {F('category','Category *','text',CATEGORIES)}
            {F('make','Make *')}
            {F('model','Model')}
            {F('year','Year','number')}
            {F('capacityTons','Capacity (tons)','number')}
            {F('purchaseCost','Purchase Cost (ETB)','number')}
            {F('usefulLifeYears','Useful Life (years)','number')}
            {F('residualValue','Residual Value (ETB)','number')}
            {F('color','Color')}
            {F('engineNumber','Engine Number')}
            {F('chassisNumber','Chassis Number')}
            {F('vehicleType','Vehicle Type','text',VEHICLE_TYPES)}
            {F('fuelTankCapacity','Fuel Tank (L)','number')}
            {F('ownership','Ownership','text',['company','rented','leased'])}
            {form.ownership !== 'company' && F('ownerName','Owner Name')}
            {F('insuranceExpiry','Insurance Expiry','date')}
            {F('inspectionExpiry','Inspection Expiry','date')}
            {F('permitExpiry','Permit Expiry','date')}
            {F('libreExpiry','Libre Expiry','date')}
            {F('boloExpiry','Bolo Expiry','date')}
            {F('roadFundExpiry','Road Fund Expiry','date')}
            {F('roadworthinessExpiry','Roadworthiness Expiry','date')}
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Vehicle'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Depreciation Detail Modal */}
      {deprDetail && (
        <Modal title={`Depreciation: ${deprDetail.plateNumber}`} onClose={() => { setDeprDetail(null); setDeprHistory([]); }} size="max-w-2xl">
          <div className="space-y-4">
            {/* Asset Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card bg-blue-50 border-blue-200 py-2 px-3">
                <p className="text-xs text-gray-500">Purchase Cost</p>
                <p className="text-sm font-bold text-blue-700">ETB {deprDetail.purchaseCost?.toLocaleString()}</p>
              </div>
              <div className="card bg-green-50 border-green-200 py-2 px-3">
                <p className="text-xs text-gray-500">Book Value</p>
                <p className="text-sm font-bold text-green-700">ETB {deprDetail.bookValue?.toLocaleString()}</p>
              </div>
              <div className="card bg-amber-50 border-amber-200 py-2 px-3">
                <p className="text-xs text-gray-500">Accumulated</p>
                <p className="text-sm font-bold text-amber-700">ETB {deprDetail.accumulatedDepr?.toLocaleString()}</p>
              </div>
              <div className="card bg-gray-50 py-2 px-3">
                <p className="text-xs text-gray-500">Residual Value</p>
                <p className="text-sm font-bold text-gray-700">ETB {deprDetail.residualValue?.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-4 text-sm">
              <div><span className="text-gray-500">Method:</span> <strong className="capitalize">{deprDetail.method?.replace(/_/g, ' ')}</strong></div>
              <div><span className="text-gray-500">Useful Life:</span> <strong>{deprDetail.usefulLifeYears} years</strong></div>
              <div><span className="text-gray-500">Remaining:</span> <strong className={deprDetail.remainingYears <= 1 ? 'text-red-600' : ''}>{deprDetail.remainingYears} years</strong></div>
              <div><span className="text-gray-500">Monthly:</span> <strong className="text-red-600">ETB {deprDetail.monthlyDepreciation?.toLocaleString()}</strong></div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Depreciation Progress</span>
                <span>{deprDetail.depreciationPct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className={`h-3 rounded-full transition-all ${deprDetail.depreciationPct > 80 ? 'bg-red-500' : deprDetail.depreciationPct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, deprDetail.depreciationPct)}%` }} />
              </div>
            </div>

            {/* History */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Monthly Entries</h4>
              {deprHistoryLoading ? (
                <div className="text-center py-4 text-gray-400">Loading history...</div>
              ) : deprHistory.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">No depreciation entries recorded yet. Use "Run All" to record monthly depreciation.</div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="table">
                    <thead><tr>
                      <th className="th">Period</th>
                      <th className="th text-right">Amount</th>
                      <th className="th text-right">Book Value After</th>
                    </tr></thead>
                    <tbody>
                      {deprHistory.map((e: any) => (
                        <tr key={e.id} className="tr">
                          <td className="td font-medium">{MONTHS[e.month-1]} {e.year}</td>
                          <td className="td text-right font-mono text-red-600">ETB {e.amount?.toLocaleString()}</td>
                          <td className="td text-right font-mono">ETB {e.bookValueAfter?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* GPS Import Modal */}
      {gpsModal && (
        <Modal title="Import Vehicles from GPS" onClose={() => setGpsModal(false)} size="max-w-3xl">
          <div className="space-y-4">
            {gpsResult?.summary && (
              <div className="p-3 bg-green-50 text-green-700 rounded text-sm">
                Import complete: <strong>{gpsResult.summary.created} created</strong>, <strong>{gpsResult.summary.linked} linked</strong>, {gpsResult.summary.skipped} skipped
              </div>
            )}
            {gpsResult?.error && (
              <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{gpsResult.error}</div>
            )}

            {gpsLoading ? (
              <div className="text-center py-10 text-gray-400">Fetching GPS vehicles...</div>
            ) : gpsVehicles.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No GPS vehicles found</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {gpsVehicles.filter(v => v.status === 'new').length} new vehicles, {' '}
                    {gpsVehicles.filter(v => v.status === 'linked').length} already linked, {' '}
                    {gpsVehicles.filter(v => v.status === 'plate_exists').length} plate matches
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setGpsSelected(new Set(gpsVehicles.filter(v => v.status !== 'linked').map(v => v.imei)))}
                      className="text-xs text-blue-600 hover:underline">Select All New</button>
                    <button onClick={() => setGpsSelected(new Set())}
                      className="text-xs text-gray-500 hover:underline">Clear</button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="table">
                    <thead><tr>
                      <th className="th w-8"></th>
                      <th className="th">Vehicle Name</th>
                      <th className="th">Group</th>
                      <th className="th">Odometer</th>
                      <th className="th">Status</th>
                    </tr></thead>
                    <tbody>
                      {gpsVehicles.map((v: any) => (
                        <tr key={v.imei} className={`tr ${v.status === 'linked' ? 'opacity-50' : ''}`}>
                          <td className="td">
                            {v.status !== 'linked' ? (
                              <input type="checkbox" checked={gpsSelected.has(v.imei)}
                                onChange={() => toggleGpsSelect(v.imei)}
                                className="rounded border-gray-300 text-blue-600" />
                            ) : (
                              <Check className="w-4 h-4 text-green-500" />
                            )}
                          </td>
                          <td className="td font-medium">{v.name}</td>
                          <td className="td text-gray-500 text-xs">{v.group || '-'}</td>
                          <td className="td font-mono text-xs">{Number(v.odometer).toLocaleString()} km</td>
                          <td className="td">
                            {v.status === 'linked' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"><Link className="w-3 h-3"/>Linked</span>
                            )}
                            {v.status === 'plate_exists' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700"><Link className="w-3 h-3"/>Will Link</span>
                            )}
                            {v.status === 'new' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"><Plus className="w-3 h-3"/>New</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <p className="text-sm text-gray-500">{gpsSelected.size} vehicles selected</p>
                  <div className="flex gap-3">
                    <button onClick={() => setGpsModal(false)} className="btn-secondary">Cancel</button>
                    <button onClick={handleGpsImport} disabled={gpsImporting || gpsSelected.size === 0} className="btn-primary">
                      <Download className="w-4 h-4" />
                      {gpsImporting ? 'Importing...' : `Import ${gpsSelected.size} Vehicles`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ═══ ASSIGN PRIMARY DRIVER MODAL ═══ */}
      {assignModal && (
        <Modal title={`Assign Primary Driver: ${assignModal.plateNumber}`} onClose={() => setAssignModal(null)} size="max-w-md">
          <div className="space-y-3">
            {assignError && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{assignError}</div>}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
              <p className="font-semibold mb-1">Primary driver = the driver this vehicle normally "belongs to".</p>
              <p>This is an HR/fleet decision. Per-trip drivers are still chosen separately on the Trips page.</p>
            </div>
            {assignModal.assignedDriver && (
              <div className="p-2 bg-gray-50 rounded text-sm">
                <span className="text-gray-500">Currently assigned:</span>{' '}
                <strong>{assignModal.assignedDriver.firstName} {assignModal.assignedDriver.lastName}</strong>
                <span className="text-xs text-gray-500 ml-2">(will be ended when you save)</span>
              </div>
            )}
            <div>
              <label className="label">New Primary Driver *</label>
              <select
                className="select"
                value={assignForm.driverId}
                onChange={e => setAssignForm(f => ({ ...f, driverId: e.target.value }))}
                required
              >
                <option value="">Select driver...</option>
                {assignDrivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}{d.phone ? ` · ${d.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Reason / Notes</label>
              <textarea
                className="input"
                rows={2}
                value={assignForm.reason}
                onChange={e => setAssignForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. promoted, swap, previous driver on leave"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setAssignModal(null)} className="btn-secondary" disabled={assignSaving}>Cancel</button>
              <button onClick={submitAssign} disabled={assignSaving || !assignForm.driverId} className="btn-primary">
                {assignSaving ? 'Saving...' : 'Assign Driver'}
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              This creates a record in the <strong>Driver History</strong> tab.
            </p>
          </div>
        </Modal>
      )}

      {/* ═══ PAIRINGS TAB ═══ */}
      {tab === 'pairings' && <PairingsTab vehicles={vehicles} />}

      {/* ═══ TYRES TAB ═══ */}
      {tab === 'tyres' && <TyresTab vehicles={vehicles} />}

      {/* ═══ DRIVER ASSIGNMENTS TAB ═══ */}
      {tab === 'assignments' && <AssignmentsTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAIRINGS TAB
// ═══════════════════════════════════════════════════════════════════════════
function PairingsTab({ vehicles }: { vehicles: any[] }) {
  const [pairings, setPairings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ frontVehicleId: '', backVehicleId: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); api.get('/vehicles/pairings').then(r => setPairings(r.data.pairings||[])).catch(console.error).finally(() => setLoading(false)); };
  useEffect(load, []);

  const powerUnits = vehicles.filter(v => v.vehicleType === 'power_unit' || v.category?.includes('truck') || v.category?.includes('tractor'));
  const trailers = vehicles.filter(v => v.vehicleType === 'trailer' || v.category?.includes('tanker') || v.category?.includes('trailer'));
  const allVehicles = vehicles; // fallback

  const pair = async () => {
    if (!form.frontVehicleId || !form.backVehicleId) return alert('Select both front and back vehicle');
    setSaving(true);
    try { await api.post('/vehicles/pairings', form); setForm({ frontVehicleId: '', backVehicleId: '', notes: '' }); load(); } catch (e: any) { alert(e.response?.data?.error || 'Error'); } finally { setSaving(false); }
  };
  const unpair = async (id: string) => { if (!confirm('Unpair these vehicles?')) return; await api.put(`/vehicles/pairings/${id}/unpair`); load(); };

  return (<div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold mb-4">Front / Back Truck Pairings</h3>
    <div className="grid grid-cols-4 gap-3 mb-4">
      <select value={form.frontVehicleId} onChange={e => setForm({...form, frontVehicleId: e.target.value})} className="inp"><option value="">-- Power Unit --</option>{(powerUnits.length > 0 ? powerUnits : allVehicles).map((v: any) => <option key={v.id} value={v.id}>{v.plateNumber} ({v.make})</option>)}</select>
      <select value={form.backVehicleId} onChange={e => setForm({...form, backVehicleId: e.target.value})} className="inp"><option value="">-- Trailer --</option>{(trailers.length > 0 ? trailers : allVehicles).map((v: any) => <option key={v.id} value={v.id}>{v.plateNumber} ({v.make})</option>)}</select>
      <input placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="inp"/>
      <button onClick={pair} disabled={saving} className="btn-primary">{saving ? 'Pairing...' : 'Pair Vehicles'}</button>
    </div>
    {loading ? <p>Loading...</p> : (
      <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-left"><th className="th">Front (Power)</th><th className="th">Back (Trailer)</th><th className="th">Paired Date</th><th className="th">Status</th><th className="th">Actions</th></tr></thead><tbody>
        {pairings.map((p: any) => (<tr key={p.id} className="border-b"><td className="td">{p.frontVehicle?.plateNumber}</td><td className="td">{p.backVehicle?.plateNumber}</td><td className="td">{formatDualDate(p.pairedDate)}</td><td className="td"><span className={`px-2 py-0.5 rounded text-xs ${p.status==='active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{p.status}</span></td><td className="td">{p.status==='active'&&<button onClick={()=>unpair(p.id)} className="text-red-600 text-xs hover:underline">Unpair</button>}</td></tr>))}
        {pairings.length===0&&<tr><td colSpan={5} className="td text-center text-gray-400">No pairings</td></tr>}
      </tbody></table>
    )}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════════
// TYRES TAB
// ═══════════════════════════════════════════════════════════════════════════
function TyresTab({ vehicles }: { vehicles: any[] }) {
  const [tyres, setTyres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ serialNumber: '', brand: '', size: '', pattern: '', purchaseCost: '' });
  const [saving, setSaving] = useState(false);
  const [fitModal, setFitModal] = useState<any>(null);
  const [fitForm, setFitForm] = useState({ vehicleId: '', position: 'FL' });

  const load = () => { setLoading(true); api.get('/vehicles/tyres').then(r => setTyres(r.data.tyres||[])).catch(console.error).finally(() => setLoading(false)); };
  useEffect(load, []);

  const addTyre = async () => {
    if (!form.serialNumber) return alert('Serial number required');
    setSaving(true);
    try { await api.post('/vehicles/tyres', form); setForm({ serialNumber: '', brand: '', size: '', pattern: '', purchaseCost: '' }); load(); } catch (e: any) { alert(e.response?.data?.error||'Error'); } finally { setSaving(false); }
  };

  const fitTyre = async () => {
    if (!fitForm.vehicleId) return alert('Select vehicle');
    try { await api.put(`/vehicles/tyres/${fitModal.id}/fit`, fitForm); setFitModal(null); load(); } catch (e: any) { alert(e.response?.data?.error||'Error'); }
  };

  const removeTyre = async (id: string) => {
    const reason = prompt('Reason for removal:');
    const condition = prompt('Condition (good/fair/worn/scrap):') || 'worn';
    try { await api.put(`/vehicles/tyres/${id}/remove`, { reason, condition }); load(); } catch (e: any) { alert(e.response?.data?.error||'Error'); }
  };

  const fmt = (n: number) => n ? n.toLocaleString() : '-';

  return (<div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold mb-4">Tyre Lifecycle Management</h3>
    <div className="grid grid-cols-6 gap-3 mb-4">
      <input placeholder="Serial Number *" value={form.serialNumber} onChange={e => setForm({...form, serialNumber: e.target.value})} className="inp"/>
      <input placeholder="Brand" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} className="inp"/>
      <input placeholder="Size" value={form.size} onChange={e => setForm({...form, size: e.target.value})} className="inp"/>
      <input placeholder="Pattern" value={form.pattern} onChange={e => setForm({...form, pattern: e.target.value})} className="inp"/>
      <input placeholder="Cost" type="number" value={form.purchaseCost} onChange={e => setForm({...form, purchaseCost: e.target.value})} className="inp"/>
      <button onClick={addTyre} disabled={saving} className="btn-primary">{saving ? 'Adding...' : 'Add Tyre'}</button>
    </div>

    <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
      <div className="bg-blue-50 p-3 rounded"><strong>{tyres.length}</strong> Total Tyres</div>
      <div className="bg-green-50 p-3 rounded"><strong>{tyres.filter((t: any)=>t.status==='fitted').length}</strong> Fitted</div>
      <div className="bg-yellow-50 p-3 rounded"><strong>{tyres.filter((t: any)=>t.status==='in_stock').length}</strong> In Stock</div>
      <div className="bg-red-50 p-3 rounded"><strong>{tyres.filter((t: any)=>t.status==='scrap').length}</strong> Scrapped</div>
    </div>

    {loading ? <p>Loading...</p> : (
      <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-left"><th className="th">Serial</th><th className="th">Brand/Size</th><th className="th">Vehicle</th><th className="th">Position</th><th className="th">KM Run</th><th className="th">Cost/KM</th><th className="th">Condition</th><th className="th">Status</th><th className="th">Actions</th></tr></thead><tbody>
        {tyres.map((t: any) => (<tr key={t.id} className="border-b"><td className="td font-mono">{t.serialNumber}</td><td className="td">{t.brand} {t.size}</td><td className="td">{t.currentVehicle?.plateNumber||'-'}</td><td className="td">{t.position||'-'}</td><td className="td">{fmt(t.totalKmRun)}</td><td className="td">{t.costPerKm?`ETB ${t.costPerKm.toFixed(2)}`:'-'}</td><td className="td">{t.condition}</td><td className="td"><span className={`px-2 py-0.5 rounded text-xs ${t.status==='fitted'?'bg-green-100 text-green-700':t.status==='in_stock'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>{t.status}</span></td>
          <td className="td"><div className="flex gap-1">{t.status==='in_stock'&&<button onClick={()=>{setFitModal(t);setFitForm({vehicleId:'',position:'FL'})}} className="text-blue-600 text-xs hover:underline">Fit</button>}{t.status==='fitted'&&<button onClick={()=>removeTyre(t.id)} className="text-red-600 text-xs hover:underline">Remove</button>}</div></td>
        </tr>))}
      </tbody></table>
    )}

    {fitModal && (<div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-lg w-96">
      <h4 className="font-semibold mb-3">Fit Tyre: {fitModal.serialNumber}</h4>
      <select value={fitForm.vehicleId} onChange={e=>setFitForm({...fitForm,vehicleId:e.target.value})} className="inp w-full mb-3"><option value="">-- Select Vehicle --</option>{vehicles.map((v: any)=><option key={v.id} value={v.id}>{v.plateNumber}</option>)}</select>
      <select value={fitForm.position} onChange={e=>setFitForm({...fitForm,position:e.target.value})} className="inp w-full mb-3"><option value="FL">Front Left</option><option value="FR">Front Right</option><option value="RL1">Rear Left 1</option><option value="RL2">Rear Left 2</option><option value="RR1">Rear Right 1</option><option value="RR2">Rear Right 2</option><option value="spare">Spare</option></select>
      <div className="flex gap-2 justify-end"><button onClick={()=>setFitModal(null)} className="btn-secondary">Cancel</button><button onClick={fitTyre} className="btn-primary">Fit Tyre</button></div>
    </div></div>)}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER ASSIGNMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════
function AssignmentsTab() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/vehicles/assignments/history').then(r => setAssignments(r.data.assignments||[])).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (<div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold mb-4">Driver-to-Vehicle Assignment History</h3>
    <p className="text-sm text-gray-500 mb-3">Assignments are managed from the Fleet tab when assigning drivers. This view shows the full history.</p>
    {loading ? <p>Loading...</p> : (
      <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-left"><th className="th">Driver</th><th className="th">Vehicle</th><th className="th">Previous Plate</th><th className="th">Effective Date</th><th className="th">End Date</th><th className="th">Reason</th><th className="th">Status</th></tr></thead><tbody>
        {assignments.map((a: any) => (<tr key={a.id} className="border-b"><td className="td">{a.driver?.firstName} {a.driver?.lastName}</td><td className="td">{a.vehicle?.plateNumber}</td><td className="td">{a.previousPlate||'-'}</td><td className="td">{formatDualDate(a.effectiveDate)}</td><td className="td">{a.endDate?formatDualDate(a.endDate):'Current'}</td><td className="td">{a.reason||'-'}</td><td className="td"><span className={`px-2 py-0.5 rounded text-xs ${a.status==='active'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{a.status}</span></td></tr>))}
        {assignments.length===0&&<tr><td colSpan={7} className="td text-center text-gray-400">No assignment history</td></tr>}
      </tbody></table>
    )}
  </div>);
}
