import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { brokerApi, tripApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

const fmt = (n: number) => (n ?? 0).toLocaleString();

const emptyBroker = { name:'', phone:'', email:'', commissionType:'percentage', defaultRate:'' };
const emptyComm = { brokerId:'', tripId:'', commissionType:'percentage', rate:'', amount:'', notes:'' };

export default function BrokerPage() {
  const [tab, setTab] = useState<'brokers'|'commissions'>('brokers');

  // ── Brokers state ──
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loadingB, setLoadingB] = useState(true);
  const [modalB, setModalB] = useState(false);
  const [editingB, setEditingB] = useState<any>(null);
  const [formB, setFormB] = useState<any>(emptyBroker);
  const [savingB, setSavingB] = useState(false);
  const [errorB, setErrorB] = useState('');

  // ── Commissions state ──
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loadingC, setLoadingC] = useState(true);
  const [modalC, setModalC] = useState(false);
  const [formC, setFormC] = useState<any>(emptyComm);
  const [savingC, setSavingC] = useState(false);
  const [errorC, setErrorC] = useState('');
  const [trips, setTrips] = useState<any[]>([]);

  // ── Loaders ──
  const loadBrokers = () => {
    setLoadingB(true);
    brokerApi.list()
      .then(r => setBrokers(r.data.brokers || r.data || []))
      .catch(console.error).finally(() => setLoadingB(false));
  };

  const loadCommissions = () => {
    setLoadingC(true);
    brokerApi.listCommissions()
      .then(r => setCommissions(r.data.commissions || r.data || []))
      .catch(console.error).finally(() => setLoadingC(false));
  };

  const loadTrips = () => {
    tripApi.list().then(r => setTrips(r.data.trips || r.data || [])).catch(console.error);
  };

  useEffect(() => { loadBrokers(); loadCommissions(); loadTrips(); }, []);

  // ── Broker save ──
  const saveBroker = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSavingB(true); setErrorB('');
    try {
      const payload = { ...formB, defaultRate: Number(formB.defaultRate) };
      if (editingB) await brokerApi.update(editingB.id, payload);
      else await brokerApi.create(payload);
      setModalB(false); loadBrokers();
    } catch (e: any) { setErrorB(e.response?.data?.error || 'Save failed'); }
    finally { setSavingB(false); }
  };

  // ── Commission save ──
  const saveCommission = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSavingC(true); setErrorC('');
    try {
      const payload = { ...formC, rate: Number(formC.rate), amount: Number(formC.amount) };
      await brokerApi.createCommission(payload);
      setModalC(false); loadCommissions();
    } catch (e: any) { setErrorC(e.response?.data?.error || 'Save failed'); }
    finally { setSavingC(false); }
  };

  const approveComm = async (id: string) => {
    try { await brokerApi.approveCommission(id); loadCommissions(); }
    catch (e: any) { alert(e.response?.data?.error || 'Approve failed'); }
  };

  const payComm = async (id: string) => {
    try { await brokerApi.payCommission(id); loadCommissions(); loadBrokers(); }
    catch (e: any) { alert(e.response?.data?.error || 'Pay failed'); }
  };

  // ── Commission summary ──
  const totalUnpaid = commissions.filter(c => c.status !== 'paid').reduce((s, c) => s + (c.amount || 0), 0);
  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {(['brokers','commissions'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'brokers' ? 'Brokers' : 'Commissions'}
          </button>
        ))}
      </div>

      {/* ════════════ TAB 1: BROKERS ════════════ */}
      {tab === 'brokers' && (
        <>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Brokers</h2>
            <button onClick={() => { setEditingB(null); setFormB(emptyBroker); setErrorB(''); setModalB(true); }} className="btn-primary">
              <Plus className="w-4 h-4"/>Add Broker
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Name</th>
                <th className="th">Phone</th>
                <th className="th">Commission Type</th>
                <th className="th">Default Rate</th>
                <th className="th">Total Earned</th>
                <th className="th">Total Paid</th>
                <th className="th">Balance</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr></thead>
              <tbody>
                {loadingB ? (
                  <tr><td colSpan={9} className="td text-center py-10 text-gray-400">Loading...</td></tr>
                ) : brokers.length === 0 ? (
                  <tr><td colSpan={9} className="td text-center py-10 text-gray-400">No brokers</td></tr>
                ) : brokers.map((b: any) => (
                  <tr key={b.id} className="tr">
                    <td className="td font-medium">{b.name}</td>
                    <td className="td">{b.phone || '-'}</td>
                    <td className="td">{b.commissionType || '-'}</td>
                    <td className="td">{b.commissionType === 'percentage' ? `${b.defaultRate}%` : `ETB ${fmt(b.defaultRate)}`}</td>
                    <td className="td">ETB {fmt(b.totalEarned)}</td>
                    <td className="td">ETB {fmt(b.totalPaid)}</td>
                    <td className="td font-semibold">{(b.totalEarned - b.totalPaid) > 0 ? <span className="text-red-600">ETB {fmt((b.totalEarned||0) - (b.totalPaid||0))}</span> : <span className="text-green-700">ETB {fmt((b.totalEarned||0) - (b.totalPaid||0))}</span>}</td>
                    <td className="td"><StatusBadge status={b.status || 'active'} /></td>
                    <td className="td">
                      <button onClick={() => { setEditingB(b); setFormB({ name: b.name, phone: b.phone||'', email: b.email||'', commissionType: b.commissionType||'percentage', defaultRate: b.defaultRate||'' }); setErrorB(''); setModalB(true); }}
                        className="btn-secondary py-1 px-2 text-xs">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {modalB && (
            <Modal title={editingB ? 'Edit Broker' : 'Add Broker'} onClose={() => setModalB(false)}>
              <form onSubmit={saveBroker} className="space-y-3">
                {errorB && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{errorB}</div>}
                <div><label className="label">Name *</label><input className="input" value={formB.name} onChange={e => setFormB((f:any) => ({...f, name: e.target.value}))} required /></div>
                <div><label className="label">Phone</label><input className="input" value={formB.phone} onChange={e => setFormB((f:any) => ({...f, phone: e.target.value}))} /></div>
                <div><label className="label">Email</label><input type="email" className="input" value={formB.email} onChange={e => setFormB((f:any) => ({...f, email: e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Commission Type</label>
                    <select className="select" value={formB.commissionType} onChange={e => setFormB((f:any) => ({...f, commissionType: e.target.value}))}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div><label className="label">Default Rate {formB.commissionType === 'percentage' ? '(%)' : '(ETB)'}</label><input type="number" step="any" className="input" value={formB.defaultRate} onChange={e => setFormB((f:any) => ({...f, defaultRate: e.target.value}))} /></div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModalB(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={savingB} className="btn-primary">{savingB ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </Modal>
          )}
        </>
      )}

      {/* ════════════ TAB 2: COMMISSIONS ════════════ */}
      {tab === 'commissions' && (
        <>
          {/* Summary cards */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[180px] p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-xs text-yellow-700 uppercase font-semibold">Total Unpaid</div>
              <div className="text-xl font-bold text-yellow-800 mt-1">ETB {fmt(totalUnpaid)}</div>
            </div>
            <div className="flex-1 min-w-[180px] p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-xs text-green-700 uppercase font-semibold">Total Paid</div>
              <div className="text-xl font-bold text-green-800 mt-1">ETB {fmt(totalPaid)}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">Commissions</h2>
            <button onClick={() => { setFormC(emptyComm); setErrorC(''); setModalC(true); }} className="btn-primary">
              <Plus className="w-4 h-4"/>Add Commission
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Broker</th>
                <th className="th">Trip / Order</th>
                <th className="th">Commission Type</th>
                <th className="th">Rate</th>
                <th className="th">Amount</th>
                <th className="th">Trip Revenue</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr></thead>
              <tbody>
                {loadingC ? (
                  <tr><td colSpan={8} className="td text-center py-10 text-gray-400">Loading...</td></tr>
                ) : commissions.length === 0 ? (
                  <tr><td colSpan={8} className="td text-center py-10 text-gray-400">No commissions</td></tr>
                ) : commissions.map((c: any) => (
                  <tr key={c.id} className="tr">
                    <td className="td font-medium">{c.broker?.name || c.brokerName || '-'}</td>
                    <td className="td">{c.trip?.tripNumber || c.tripId || '-'}</td>
                    <td className="td">{c.commissionType || '-'}</td>
                    <td className="td">{c.commissionType === 'percentage' ? `${c.rate}%` : `ETB ${fmt(c.rate)}`}</td>
                    <td className="td font-semibold">ETB {fmt(c.amount)}</td>
                    <td className="td">ETB {fmt(c.tripRevenue)}</td>
                    <td className="td"><StatusBadge status={c.status || 'pending'} /></td>
                    <td className="td">
                      <div className="flex gap-1">
                        {c.status === 'pending' && (
                          <button onClick={() => approveComm(c.id)} className="btn-primary py-1 px-2 text-xs">Approve</button>
                        )}
                        {(c.status === 'approved' || c.status === 'pending') && c.status !== 'paid' && (
                          <button onClick={() => payComm(c.id)} className="btn-success py-1 px-2 text-xs">Pay</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {modalC && (
            <Modal title="Add Commission" onClose={() => setModalC(false)}>
              <form onSubmit={saveCommission} className="space-y-3">
                {errorC && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{errorC}</div>}
                <div>
                  <label className="label">Broker *</label>
                  <select className="select" value={formC.brokerId} onChange={e => setFormC((f:any) => ({...f, brokerId: e.target.value}))} required>
                    <option value="">Select broker...</option>
                    {brokers.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Trip (optional)</label>
                  <select className="select" value={formC.tripId} onChange={e => setFormC((f:any) => ({...f, tripId: e.target.value}))}>
                    <option value="">No trip</option>
                    {trips.map((t: any) => <option key={t.id} value={t.id}>{t.tripNumber || t.id}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Commission Type</label>
                    <select className="select" value={formC.commissionType} onChange={e => setFormC((f:any) => ({...f, commissionType: e.target.value}))}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </select>
                  </div>
                  <div><label className="label">Rate {formC.commissionType === 'percentage' ? '(%)' : '(ETB)'}</label><input type="number" step="any" className="input" value={formC.rate} onChange={e => setFormC((f:any) => ({...f, rate: e.target.value}))} /></div>
                </div>
                <div><label className="label">Amount (ETB)</label><input type="number" step="any" className="input" value={formC.amount} onChange={e => setFormC((f:any) => ({...f, amount: e.target.value}))} /></div>
                <div><label className="label">Notes</label><input className="input" value={formC.notes} onChange={e => setFormC((f:any) => ({...f, notes: e.target.value}))} /></div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModalC(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={savingC} className="btn-primary">{savingC ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
