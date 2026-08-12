import { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle, Lock, Unlock, RefreshCw, Save } from 'lucide-react';
import { complianceApi } from '../services/api';
import StatCard from '../components/ui/StatCard';
import { formatDualDate } from '../utils/ethCalendar';
import DateInput from '../components/ui/DateInput';

export default function CompliancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState<'alerts' | 'locked'>('alerts');
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [unlockModal, setUnlockModal] = useState<any>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [editModal, setEditModal] = useState<any>(null);
  const [editDates, setEditDates] = useState({ insuranceExpiry: '', inspectionExpiry: '', permitExpiry: '' });

  const load = () => {
    setLoading(true);
    complianceApi.alerts().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleScanAll = async () => {
    setScanning(true);
    try {
      const r = await complianceApi.complianceScanAll();
      setScanResults(r.data);
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Scan failed'); }
    setScanning(false);
  };

  const handleUnlock = async () => {
    if (!unlockModal) return;
    try {
      await complianceApi.unlockVehicle(unlockModal.vehicleId, unlockReason);
      setUnlockModal(null);
      setUnlockReason('');
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Unlock failed'); }
  };

  const handleUpdateDates = async () => {
    if (!editModal) return;
    try {
      const data: any = {};
      if (editDates.insuranceExpiry) data.insuranceExpiry = editDates.insuranceExpiry;
      if (editDates.inspectionExpiry) data.inspectionExpiry = editDates.inspectionExpiry;
      if (editDates.permitExpiry) data.permitExpiry = editDates.permitExpiry;
      await complianceApi.updateVehicle(editModal.vehicleId, data);
      setEditModal(null);
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Update failed'); }
  };

  const filtered = data?.alerts?.filter((a: any) => filter === 'all' || a.severity === filter) || [];
  const lockedAlerts = data?.alerts?.filter((a: any) => a.severity === 'critical' && a.type?.includes('expir')) || [];

  const sevColors: any = { critical: 'bg-red-100 text-red-800 border-red-200', urgent: 'bg-orange-100 text-orange-800 border-orange-200', warning: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  const sevIcons: any = { critical: AlertCircle, urgent: AlertTriangle, warning: ShieldAlert };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><ShieldAlert className="w-5 h-5" />Compliance & Expiry Alerts</h2>
        <div className="flex gap-2">
          <button onClick={handleScanAll} disabled={scanning} className="btn-primary flex items-center gap-1 text-sm">
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Run Compliance Scan'}
          </button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Critical" value={data.summary?.critical || 0} icon={AlertCircle} color="red" />
          <StatCard title="Urgent" value={data.summary?.urgent || 0} icon={AlertTriangle} color="orange" />
          <StatCard title="Warning" value={data.summary?.warning || 0} icon={ShieldAlert} color="yellow" />
          <StatCard title="Total Alerts" value={data.summary?.total || 0} icon={CheckCircle} color="blue" />
        </div>
      )}

      {/* Scan Results Banner */}
      {scanResults && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">Scan Results:</span>{' '}
            <span className="text-red-600">{scanResults.locked} locked</span> |{' '}
            <span className="text-green-600">{scanResults.unlocked} unlocked</span> |{' '}
            <span className="text-gray-600">{scanResults.alreadyLocked} already locked</span> |{' '}
            <span className="text-green-600">{scanResults.compliant} compliant</span>
          </div>
          <button onClick={() => setScanResults(null)} className="text-gray-400 hover:text-gray-600 text-sm">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[{ key: 'alerts', label: 'All Alerts' }, { key: 'locked', label: 'Locked Vehicles' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label} {t.key === 'locked' ? `(${lockedAlerts.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
        <>
          <div className="flex gap-2">
            {['all', 'critical', 'urgent', 'warning'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-sm rounded-lg capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f} {f !== 'all' && data?.summary?.[f] ? `(${data.summary[f]})` : ''}
              </button>
            ))}
          </div>

          {loading ? <div className="text-center py-20 text-gray-400">Loading...</div> : (
            <div className="space-y-2">
              {filtered.length === 0 ? <div className="text-center py-10 text-gray-400">No alerts</div> :
              filtered.map((alert: any, idx: number) => {
                const Icon = sevIcons[alert.severity] || ShieldAlert;
                return (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${sevColors[alert.severity]}`}>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {alert.plateNumber && <span className="font-semibold">{alert.plateNumber}</span>}
                        <span className="text-sm capitalize">{alert.type?.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-sm opacity-80">{alert.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {alert.expiryDate && <span className="text-xs whitespace-nowrap">{formatDualDate(alert.expiryDate)}</span>}
                      {alert.vehicleId && (
                        <button onClick={() => {
                          setEditModal(alert);
                          setEditDates({
                            insuranceExpiry: '', inspectionExpiry: '', permitExpiry: '',
                          });
                        }} className="text-xs px-2 py-1 bg-white rounded border hover:bg-gray-50">
                          Renew
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'locked' && (
        <div className="space-y-2">
          {lockedAlerts.length === 0 ? <div className="text-center py-10 text-gray-400">No locked vehicles</div> :
          lockedAlerts.map((alert: any, idx: number) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-red-50 border-red-200">
              <Lock className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{alert.plateNumber}</span>
                  <span className="text-sm text-red-600 capitalize">{alert.type?.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm text-red-500">{alert.message}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  setEditModal(alert);
                  setEditDates({ insuranceExpiry: '', inspectionExpiry: '', permitExpiry: '' });
                }} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                  <Save className="w-3.5 h-3.5" /> Renew
                </button>
                <button onClick={() => { setUnlockModal(alert); setUnlockReason(''); }} className="btn-primary bg-orange-600 hover:bg-orange-700 text-xs py-1 px-2 flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5" /> Unlock
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unlock Modal */}
      {unlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setUnlockModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" /> Admin Override: Unlock Vehicle
            </h3>
            <p className="text-sm text-gray-600">
              Unlocking <strong>{unlockModal.plateNumber}</strong> - {unlockModal.message}
            </p>
            <p className="text-xs text-orange-600">This action will be recorded in the audit trail.</p>
            <div>
              <label className="text-sm font-medium text-gray-700">Reason for Unlock</label>
              <input value={unlockReason} onChange={e => setUnlockReason(e.target.value)} placeholder="e.g. Documents being renewed, temporary authorization..." className="input w-full mt-1" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setUnlockModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleUnlock} className="btn-primary bg-orange-600 hover:bg-orange-700">Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Dates Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Renew Compliance Dates - {editModal.plateNumber}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Insurance Expiry</label>
                <DateInput value={editDates.insuranceExpiry} onChange={val => setEditDates(d => ({ ...d, insuranceExpiry: val }))} className="input w-full mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Inspection Expiry</label>
                <DateInput value={editDates.inspectionExpiry} onChange={val => setEditDates(d => ({ ...d, inspectionExpiry: val }))} className="input w-full mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Permit Expiry</label>
                <DateInput value={editDates.permitExpiry} onChange={val => setEditDates(d => ({ ...d, permitExpiry: val }))} className="input w-full mt-1" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleUpdateDates} className="btn-primary">Update Dates</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
