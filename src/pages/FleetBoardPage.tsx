import { useEffect, useState } from 'react';
import { Truck, Lock, Unlock, MapPin, AlertTriangle, RefreshCw, Search, Filter } from 'lucide-react';
import { vehicleApi, complianceApi } from '../services/api';
import StatCard from '../components/ui/StatCard';
import { formatDualDate } from '../utils/ethCalendar';

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-green-100 border-green-300 text-green-800',
  on_trip: 'bg-blue-100 border-blue-300 text-blue-800',
  loading: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  maintenance: 'bg-orange-100 border-orange-300 text-orange-800',
  external: 'bg-purple-100 border-purple-300 text-purple-800',
  locked: 'bg-red-100 border-red-300 text-red-800',
};

const STATUS_DOT: Record<string, string> = {
  idle: 'bg-green-500',
  on_trip: 'bg-blue-500',
  loading: 'bg-yellow-500',
  maintenance: 'bg-orange-500',
  external: 'bg-purple-500',
  locked: 'bg-red-500',
};

export default function FleetBoardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scanning, setScanning] = useState(false);
  const [unlockModal, setUnlockModal] = useState<any>(null);
  const [unlockReason, setUnlockReason] = useState('');

  const load = () => {
    setLoading(true);
    vehicleApi.fleetBoard().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleScanAll = async () => {
    setScanning(true);
    try {
      const r = await complianceApi.complianceScanAll();
      const d = r.data;
      alert(`Scan complete: ${d.locked} locked, ${d.unlocked} unlocked, ${d.alreadyLocked} already locked, ${d.compliant} compliant`);
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Scan failed'); }
    setScanning(false);
  };

  const handleUnlock = async () => {
    if (!unlockModal) return;
    try {
      await complianceApi.unlockVehicle(unlockModal.id, unlockReason);
      setUnlockModal(null);
      setUnlockReason('');
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Unlock failed'); }
  };

  const vehicles = (data?.vehicles || [])
    .filter((v: any) => {
      if (search) {
        const s = search.toLowerCase();
        if (!v.plateNumber.toLowerCase().includes(s) && !v.make?.toLowerCase().includes(s) && !v.model?.toLowerCase().includes(s)) return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'locked') return v.complianceLocked;
        return v.operationalStatus === statusFilter;
      }
      return true;
    });

  const isExpired = (d: any) => d && new Date(d) <= new Date();
  const isExpiringSoon = (d: any) => {
    if (!d) return false;
    const exp = new Date(d);
    const now = new Date();
    return exp > now && exp <= new Date(now.getTime() + 30 * 86400000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Truck className="w-5 h-5" /> Fleet Board
        </h2>
        <div className="flex gap-2">
          <button onClick={handleScanAll} disabled={scanning} className="btn-secondary flex items-center gap-1 text-sm">
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Run Compliance Scan'}
          </button>
          <button onClick={load} className="btn-secondary text-sm">Refresh</button>
        </div>
      </div>

      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatCard title="Total" value={data.summary.total} icon={Truck} color="blue" />
          <StatCard title="Idle" value={data.summary.idle} icon={Truck} color="green" />
          <StatCard title="On Trip" value={data.summary.onTrip} icon={MapPin} color="blue" />
          <StatCard title="Loading" value={data.summary.loading} icon={Truck} color="yellow" />
          <StatCard title="Maintenance" value={data.summary.maintenance} icon={Truck} color="orange" />
          <StatCard title="Locked" value={data.summary.locked} icon={Lock} color="red" />
        </div>
      )}

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plate, make, model..." className="input pl-9 w-full" />
        </div>
        <div className="flex gap-1 items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          {['all', 'idle', 'on_trip', 'loading', 'maintenance', 'locked'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-xs rounded-lg capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="text-center py-20 text-gray-400">Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vehicles.map((v: any) => (
            <div key={v.id} className={`rounded-xl border-2 p-4 space-y-3 ${v.complianceLocked ? 'border-red-300 bg-red-50' : STATUS_COLORS[v.operationalStatus] || 'bg-white border-gray-200'}`}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${v.complianceLocked ? STATUS_DOT.locked : (STATUS_DOT[v.operationalStatus] || 'bg-gray-400')}`} />
                  <span className="font-bold text-sm">{v.plateNumber}</span>
                </div>
                <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-white/50">
                  {v.complianceLocked ? 'LOCKED' : v.operationalStatus?.replace('_', ' ')}
                </span>
              </div>

              {/* Vehicle info */}
              <div className="text-xs text-gray-600 space-y-1">
                <p>{v.make || '-'} {v.model || ''} | {v.category?.replace('_', ' ') || '-'} | {v.capacityTons || 0}T</p>
                {v.assignedDriver && <p>Driver: {v.assignedDriver.firstName} {v.assignedDriver.lastName}</p>}
              </div>

              {/* Current trip/work order */}
              {v.currentTrip && (
                <div className="bg-white/60 rounded-lg p-2 text-xs">
                  <p className="font-medium">Trip: {v.currentTrip.tripNumber}</p>
                  <p className="text-gray-500">{v.currentTrip.pickupLocation || '?'} &rarr; {v.currentTrip.deliveryLocation || '?'}</p>
                  <p className="capitalize text-gray-500">Status: {v.currentTrip.status?.replace('_', ' ')}</p>
                </div>
              )}
              {v.currentWorkOrder && !v.currentTrip && (
                <div className="bg-white/60 rounded-lg p-2 text-xs">
                  <p className="font-medium">Work Order</p>
                  <p className="text-gray-500 truncate">{v.currentWorkOrder.description}</p>
                </div>
              )}

              {/* Compliance icons */}
              <div className="flex items-center gap-2 text-xs">
                {['insuranceExpiry', 'inspectionExpiry', 'permitExpiry'].map(field => {
                  const label = field.replace('Expiry', '').replace(/([A-Z])/g, ' $1').trim();
                  const val = v[field];
                  const expired = isExpired(val);
                  const expiring = isExpiringSoon(val);
                  return (
                    <span key={field} title={`${label}: ${val ? formatDualDate(val) : 'N/A'}`}
                      className={`px-1.5 py-0.5 rounded ${expired ? 'bg-red-200 text-red-800' : expiring ? 'bg-yellow-200 text-yellow-800' : 'bg-green-100 text-green-700'}`}>
                      {expired ? '!' : expiring ? '~' : '\u2713'} {label.charAt(0).toUpperCase()}
                    </span>
                  );
                })}
              </div>

              {/* Lock reason & unlock */}
              {v.complianceLocked && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-xs text-red-700">
                    <Lock className="w-3.5 h-3.5" />
                    <span className="truncate">{v.lockReason}</span>
                  </div>
                  <button onClick={() => setUnlockModal(v)} className="w-full btn-secondary text-xs py-1 flex items-center justify-center gap-1">
                    <Unlock className="w-3.5 h-3.5" /> Unlock
                  </button>
                </div>
              )}

              {/* Location */}
              {v.lastKnownLocation && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{v.lastKnownLocation}</span>
                </div>
              )}
            </div>
          ))}
          {vehicles.length === 0 && <div className="col-span-full text-center py-10 text-gray-400">No vehicles found</div>}
        </div>
      )}

      {/* Unlock Modal */}
      {unlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setUnlockModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Unlock Vehicle
            </h3>
            <p className="text-sm text-gray-600">
              You are about to unlock <strong>{unlockModal.plateNumber}</strong> which was locked for: <span className="text-red-600">{unlockModal.lockReason}</span>
            </p>
            <p className="text-xs text-orange-600">Warning: This is an admin override. The vehicle may have expired documents. This action will be recorded in the audit trail.</p>
            <div>
              <label className="text-sm font-medium text-gray-700">Unlock Reason</label>
              <input value={unlockReason} onChange={e => setUnlockReason(e.target.value)} placeholder="Reason for unlocking..." className="input w-full mt-1" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setUnlockModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleUnlock} className="btn-primary bg-orange-600 hover:bg-orange-700">Unlock Vehicle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
