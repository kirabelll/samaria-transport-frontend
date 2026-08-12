import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { accidentApi, vehicleApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import DateInput from '../components/ui/DateInput';

const fmt = (n: number) => (n ?? 0).toLocaleString();

const emptyForm = {
  accidentDate: new Date().toISOString().split('T')[0],
  location: '',
  vehicleId: '',
  description: '',
  policeRefNumber: '',
  thirdPartyName: '',
  thirdPartyPhone: '',
  damageEstimate: '',
  responsibility: 'unknown',
};

const RESPONSIBILITY = ['our_driver', 'third_party', 'shared', 'unknown'];
const REPAIR_STATUSES = ['pending', 'in_progress', 'completed'];
const CLAIM_STATUSES = ['not_filed', 'filed', 'in_progress', 'approved', 'rejected', 'paid'];

export default function AccidentPage() {
  const [accidents, setAccidents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [detailForm, setDetailForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    accidentApi.list()
      .then(r => setAccidents(r.data.records || r.data.accidents || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    vehicleApi.list().then(r => setVehicles(r.data.vehicles || r.data || [])).catch(() => {});
  }, []);

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, damageEstimate: Number(form.damageEstimate) || 0 };
      await accidentApi.create(payload);
      setModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateDetail = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...detailForm,
        claimAmount: Number(detailForm.claimAmount) || 0,
        paidAmount: Number(detailForm.paidAmount) || 0,
      };
      await accidentApi.update(detailModal.id, payload);
      setDetailModal(null);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (acc: any) => {
    setDetailModal(acc);
    setDetailForm({
      repairStatus: acc.repairStatus || 'pending',
      claimRef: acc.claimRef || '',
      claimStatus: acc.claimStatus || 'not_filed',
      claimAmount: acc.claimAmount || '',
      paidAmount: acc.paidAmount || '',
    });
    setError('');
  };

  // Summary stats
  const totalAccidents = accidents.length;
  const pendingRepair = accidents.filter(a => (a.repairStatus || 'pending') !== 'completed').length;
  const pendingClaims = accidents.filter(a => a.claimStatus && !['paid', 'rejected', 'not_filed'].includes(a.claimStatus)).length;
  const totalDamage = accidents.reduce((s, a) => s + (Number(a.damageEstimate) || 0), 0);
  const totalPaid = accidents.reduce((s, a) => s + (Number(a.paidAmount) || 0), 0);

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 uppercase">Total Accidents</div>
          <div className="text-2xl font-bold text-gray-900">{totalAccidents}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 uppercase">Pending Repair</div>
          <div className="text-2xl font-bold text-orange-600">{pendingRepair}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 uppercase">Pending Claims</div>
          <div className="text-2xl font-bold text-yellow-600">{pendingClaims}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 uppercase">Total Damage Est.</div>
          <div className="text-2xl font-bold text-red-600">ETB {fmt(totalDamage)}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500 uppercase">Insurance Paid</div>
          <div className="text-2xl font-bold text-green-600">ETB {fmt(totalPaid)}</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Accident / Incident Records</h2>
        <button onClick={() => { setForm({ ...emptyForm }); setError(''); setModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />Report Accident
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="th">Accident #</th>
              <th className="th">Date</th>
              <th className="th">Vehicle</th>
              <th className="th">Location</th>
              <th className="th">Damage Est.</th>
              <th className="th">Repair Status</th>
              <th className="th">Claim Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : accidents.length === 0 ? (
              <tr><td colSpan={7} className="td text-center py-10 text-gray-400">No accidents recorded</td></tr>
            ) : accidents.map((acc: any) => (
              <tr key={acc.id} className="tr cursor-pointer hover:bg-gray-50" onClick={() => openDetail(acc)}>
                <td className="td font-mono text-sm font-medium">{acc.accidentNumber || acc.id?.slice(0, 8)}</td>
                <td className="td">{acc.accidentDate?.split('T')[0]}</td>
                <td className="td font-medium">{acc.vehicle?.plateNumber || acc.vehiclePlate || '-'}</td>
                <td className="td">{acc.location || '-'}</td>
                <td className="td">ETB {fmt(acc.damageEstimate)}</td>
                <td className="td"><StatusBadge status={acc.repairStatus || 'pending'} /></td>
                <td className="td"><StatusBadge status={acc.claimStatus || 'not_filed'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Accident Modal */}
      {modal && (
        <Modal title="Report Accident / Incident" onClose={() => setModal(false)} size="max-w-2xl">
          <form onSubmit={save} className="space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Accident Date *</label>
                <DateInput value={form.accidentDate} onChange={val => setForm((f: any) => ({ ...f, accidentDate: val }))} required />
              </div>
              <div>
                <label className="label">Vehicle *</label>
                <select className="select" value={form.vehicleId} onChange={e => setForm((f: any) => ({ ...f, vehicleId: e.target.value }))} required>
                  <option value="">Select vehicle</option>
                  {vehicles.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.plateNumber} {v.make ? `- ${v.make} ${v.model || ''}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Location *</label>
              <input className="input" value={form.location} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={3} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Police Ref Number</label>
                <input className="input" value={form.policeRefNumber} onChange={e => setForm((f: any) => ({ ...f, policeRefNumber: e.target.value }))} />
              </div>
              <div>
                <label className="label">Responsibility</label>
                <select className="select" value={form.responsibility} onChange={e => setForm((f: any) => ({ ...f, responsibility: e.target.value }))}>
                  {RESPONSIBILITY.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Third Party Name</label>
                <input className="input" value={form.thirdPartyName} onChange={e => setForm((f: any) => ({ ...f, thirdPartyName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Third Party Phone</label>
                <input className="input" value={form.thirdPartyPhone} onChange={e => setForm((f: any) => ({ ...f, thirdPartyPhone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Damage Estimate (ETB)</label>
              <input type="number" className="input" value={form.damageEstimate} onChange={e => setForm((f: any) => ({ ...f, damageEstimate: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Report Accident'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detail / Edit Modal */}
      {detailModal && (
        <Modal title={`Accident: ${detailModal.accidentNumber || detailModal.id?.slice(0, 8)}`} onClose={() => setDetailModal(null)} size="max-w-2xl">
          <form onSubmit={updateDetail} className="space-y-4">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

            {/* Read-only summary */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <div><span className="text-gray-500">Date:</span> <span className="font-medium">{detailModal.accidentDate?.split('T')[0]}</span></div>
              <div><span className="text-gray-500">Vehicle:</span> <span className="font-medium">{detailModal.vehicle?.plateNumber || detailModal.vehiclePlate || '-'}</span></div>
              <div><span className="text-gray-500">Location:</span> <span className="font-medium">{detailModal.location}</span></div>
              <div><span className="text-gray-500">Description:</span> <span className="font-medium">{detailModal.description || '-'}</span></div>
              <div><span className="text-gray-500">Police Ref:</span> <span className="font-medium">{detailModal.policeRefNumber || '-'}</span></div>
              <div><span className="text-gray-500">Third Party:</span> <span className="font-medium">{detailModal.thirdPartyName || '-'} {detailModal.thirdPartyPhone ? `(${detailModal.thirdPartyPhone})` : ''}</span></div>
              <div><span className="text-gray-500">Responsibility:</span> <span className="font-medium">{(detailModal.responsibility || 'unknown').replace(/_/g, ' ')}</span></div>
              <div><span className="text-gray-500">Damage Estimate:</span> <span className="font-medium">ETB {fmt(detailModal.damageEstimate)}</span></div>
            </div>

            {/* Editable fields */}
            <div className="border-t pt-3">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Repair Status</h4>
              <select className="select" value={detailForm.repairStatus} onChange={e => setDetailForm((f: any) => ({ ...f, repairStatus: e.target.value }))}>
                {REPAIR_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div className="border-t pt-3 space-y-3">
              <h4 className="font-semibold text-sm text-gray-700">Insurance Claim</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Claim Reference</label>
                  <input className="input" value={detailForm.claimRef} onChange={e => setDetailForm((f: any) => ({ ...f, claimRef: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Claim Status</label>
                  <select className="select" value={detailForm.claimStatus} onChange={e => setDetailForm((f: any) => ({ ...f, claimStatus: e.target.value }))}>
                    {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Claim Amount (ETB)</label>
                  <input type="number" className="input" value={detailForm.claimAmount} onChange={e => setDetailForm((f: any) => ({ ...f, claimAmount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Paid Amount (ETB)</label>
                  <input type="number" className="input" value={detailForm.paidAmount} onChange={e => setDetailForm((f: any) => ({ ...f, paidAmount: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setDetailModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Updating...' : 'Update'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
