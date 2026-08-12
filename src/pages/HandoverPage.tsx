import { useEffect, useState } from 'react';
import { ArrowRightLeft, Check, X, Eye } from 'lucide-react';
import { handoverApi, vehicleApi, employeeApi } from '../services/api';
import { formatDualDate } from '../utils/ethCalendar';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

const DEFAULT_CHECKLIST = [
  'Spare Tire', 'Jack', 'Wheel Spanner', 'Fire Extinguisher', 'First Aid Kit',
  'Compressor Hose', 'Hydraulic Accessories', 'Tool Box', 'Documents',
  'Battery', 'Mirrors', 'GPS Device', 'Triangle Warning Sign'
];

export default function HandoverPage() {
  const [handovers, setHandovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ vehicleId: '', fromDriverId: '', toDriverId: '', supervisorId: '', location: '', kmReading: '', fuelLevel: 'full', notes: '' });
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST.map(n => ({ itemName: n, quantity: 1, status: 'good', remarks: '' })));

  const load = () => {
    setLoading(true);
    handoverApi.list().then(r => setHandovers(r.data.handovers || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setShowCreate(true);
    setChecklist(DEFAULT_CHECKLIST.map(n => ({ itemName: n, quantity: 1, status: 'good', remarks: '' })));
    setForm({ vehicleId: '', fromDriverId: '', toDriverId: '', supervisorId: '', location: '', kmReading: '', fuelLevel: 'full', notes: '' });
    if (vehicles.length === 0) {
      vehicleApi.list().then(r => setVehicles(r.data.vehicles || []));
      employeeApi.list().then(r => setEmployees(r.data.employees || []));
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      await handoverApi.create({ ...form, kmReading: form.kmReading ? Number(form.kmReading) : undefined, checklistItems: checklist });
      setShowCreate(false); load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const accept = async (id: string) => {
    try { await handoverApi.accept(id); load(); } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };
  const reject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try { await handoverApi.reject(id, reason); load(); } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Vehicle Handovers</h2>
        <button onClick={openCreate} className="btn-primary py-2 px-4 text-sm"><ArrowRightLeft className="w-4 h-4" />New Handover</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th className="th">Date</th><th className="th">Vehicle</th><th className="th">From Driver</th><th className="th">To Driver</th><th className="th">KM</th><th className="th">Fuel</th><th className="th">Status</th><th className="th">Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            : handovers.length === 0 ? <tr><td colSpan={8} className="td text-center py-10 text-gray-400">No handovers</td></tr>
            : handovers.map(h => (
              <tr key={h.id} className="tr">
                <td className="td text-sm">{formatDualDate(h.handoverDate)}</td>
                <td className="td font-medium">{h.vehicle?.plateNumber}</td>
                <td className="td">{h.fromDriver?.firstName} {h.fromDriver?.lastName}</td>
                <td className="td">{h.toDriver?.firstName} {h.toDriver?.lastName}</td>
                <td className="td">{h.kmReading?.toLocaleString() || '-'}</td>
                <td className="td capitalize">{h.fuelLevel || '-'}</td>
                <td className="td"><StatusBadge status={h.status} /></td>
                <td className="td">
                  <div className="flex gap-1">
                    <button onClick={() => setDetailModal(h)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="w-4 h-4" /></button>
                    {h.status === 'pending' && <>
                      <button onClick={() => accept(h.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Accept"><Check className="w-4 h-4" /></button>
                      <button onClick={() => reject(h.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject"><X className="w-4 h-4" /></button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title="New Vehicle Handover" onClose={() => setShowCreate(false)}>
          <form onSubmit={submit} className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Vehicle *</label>
                <select className="select" value={form.vehicleId} onChange={e => setForm(f => ({...f, vehicleId: e.target.value}))} required>
                  <option value="">Select</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber} - {v.make}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Fuel Level</label>
                <select className="select" value={form.fuelLevel} onChange={e => setForm(f => ({...f, fuelLevel: e.target.value}))}>
                  {['full','3/4','1/2','1/4','empty'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">From Driver *</label>
                <select className="select" value={form.fromDriverId} onChange={e => setForm(f => ({...f, fromDriverId: e.target.value}))} required>
                  <option value="">Select</option>
                  {employees.filter(e => e.role === 'driver').map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="label">To Driver *</label>
                <select className="select" value={form.toDriverId} onChange={e => setForm(f => ({...f, toDriverId: e.target.value}))} required>
                  <option value="">Select</option>
                  {employees.filter(e => e.role === 'driver').map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">KM Reading</label><input type="number" className="input" value={form.kmReading} onChange={e => setForm(f => ({...f, kmReading: e.target.value}))} /></div>
              <div><label className="label">Location</label><input className="input" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} /></div>
              <div>
                <label className="label">Supervisor</label>
                <select className="select" value={form.supervisorId} onChange={e => setForm(f => ({...f, supervisorId: e.target.value}))}>
                  <option value="">None</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                </select>
              </div>
            </div>

            <h4 className="font-semibold text-sm text-gray-700 pt-2">Checklist Items</h4>
            <div className="border rounded divide-y max-h-52 overflow-y-auto">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <span className="flex-1">{item.itemName}</span>
                  <select className="select py-1 text-xs w-32" value={item.status} onChange={e => { const c = [...checklist]; c[idx] = {...c[idx], status: e.target.value}; setChecklist(c); }}>
                    <option value="good">Good</option>
                    <option value="damaged">Damaged</option>
                    <option value="missing">Missing</option>
                    <option value="needs_replacement">Needs Replace</option>
                  </select>
                  <input className="input py-1 text-xs w-28" placeholder="Remarks" value={item.remarks} onChange={e => { const c = [...checklist]; c[idx] = {...c[idx], remarks: e.target.value}; setChecklist(c); }} />
                </div>
              ))}
            </div>

            <div><label className="label">Notes</label><textarea className="input" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Create Handover'}</button>
            </div>
          </form>
        </Modal>
      )}

      {detailModal && (
        <Modal title={`Handover - ${detailModal.vehicle?.plateNumber}`} onClose={() => setDetailModal(null)}>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Date:</span> {formatDualDate(detailModal.handoverDate)}</div>
              <div><span className="text-gray-500">Status:</span> <StatusBadge status={detailModal.status} /></div>
              <div><span className="text-gray-500">From:</span> {detailModal.fromDriver?.firstName} {detailModal.fromDriver?.lastName}</div>
              <div><span className="text-gray-500">To:</span> {detailModal.toDriver?.firstName} {detailModal.toDriver?.lastName}</div>
              <div><span className="text-gray-500">KM:</span> {detailModal.kmReading?.toLocaleString() || '-'}</div>
              <div><span className="text-gray-500">Fuel:</span> {detailModal.fuelLevel || '-'}</div>
              {detailModal.location && <div><span className="text-gray-500">Location:</span> {detailModal.location}</div>}
              {detailModal.rejectionReason && <div className="col-span-2 text-red-600"><span className="text-gray-500">Rejection:</span> {detailModal.rejectionReason}</div>}
            </div>
            {detailModal.checklistItems?.length > 0 && (
              <>
                <h4 className="font-semibold text-sm pt-2">Checklist</h4>
                <div className="border rounded divide-y text-sm">
                  {detailModal.checklistItems.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-1.5">
                      <span>{item.itemName}</span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                        {item.remarks && <span className="text-gray-400 text-xs">{item.remarks}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
