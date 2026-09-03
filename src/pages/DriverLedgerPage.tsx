import { useEffect, useState } from 'react';
import { BookOpen, RefreshCw, Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { driverLedgerApi } from '../services/api';
import { formatDualDate } from '../utils/ethCalendar';
import Modal from '../components/ui/Modal';

export default function DriverLedgerPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'debit', category: 'advance', amount: '', description: '' });

  const loadDrivers = () => {
    setLoading(true);
    driverLedgerApi.list().then(r => setDrivers(r.data.drivers || [])).catch(console.error).finally(() => setLoading(false));
  };

  const loadLedger = (driverId: string) => {
    driverLedgerApi.get(driverId).then(r => {
      setSelected(r.data);
      setEntries(r.data.entries || []);
    }).catch(console.error);
  };

  useEffect(() => { loadDrivers(); }, []);

  const syncLedger = async (driverId: string) => {
    try {
      await driverLedgerApi.sync(driverId);
      loadLedger(driverId); loadDrivers();
      alert('Ledger synced from trips, advances & payroll');
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const clearLedger = async (driverId: string, driverName?: string) => {
    if (!window.confirm(`Are you sure you want to clear/delete all ledger entries for ${driverName || 'this driver'}?`)) return;
    try {
      await driverLedgerApi.clearLedger(driverId);
      if (selected && (selected.driver?.id === driverId || selected.entries?.[0]?.driverId === driverId)) {
        loadLedger(driverId);
      }
      loadDrivers();
    } catch (e: any) {
      if (e.response?.status === 404) {
        alert('The remote server (api.novahrsm.com) does not have the DELETE route deployed yet. Please deploy the updated backend or point frontend/.env to your local backend.');
        return;
      }
      alert(e.response?.data?.error || 'Failed to clear ledger');
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this ledger entry?')) return;
    try {
      await driverLedgerApi.deleteEntry(entryId);
      const driverId = selected?.driver?.id || selected?.entries?.[0]?.driverId;
      if (driverId) loadLedger(driverId);
      loadDrivers();
    } catch (e: any) {
      if (e.response?.status === 404) {
        alert('The remote server (api.novahrsm.com) does not have the DELETE route deployed yet. Please deploy the updated backend or point frontend/.env to your local backend.');
        return;
      }
      alert(e.response?.data?.error || 'Failed to delete ledger entry');
    }
  };

  const addEntry = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      await driverLedgerApi.addEntry(selected.driver.id || selected.entries?.[0]?.driverId, form);
      setAddModal(false);
      loadLedger(selected.driver.id || selected.entries?.[0]?.driverId);
      loadDrivers();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><BookOpen className="w-5 h-5" />Driver Financial Ledger</h2>

      {!selected ? (
        <div className="table-container">
          <table className="table">
            <thead><tr><th className="th">Emp #</th><th className="th">Driver</th><th className="th">Credits</th><th className="th">Debits</th><th className="th">Balance</th><th className="th">Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="td text-center py-10 text-gray-400">Loading...</td></tr>
              : drivers.length === 0 ? <tr><td colSpan={6} className="td text-center py-10 text-gray-400">No drivers</td></tr>
              : drivers.map(d => (
                <tr key={d.id} className="tr cursor-pointer hover:bg-blue-50" onClick={() => loadLedger(d.id)}>
                  <td className="td text-sm">{d.empNumber}</td>
                  <td className="td font-medium">{d.firstName} {d.lastName}</td>
                  <td className="td text-green-700">ETB {d.totalCredits?.toLocaleString()}</td>
                  <td className="td text-red-600">ETB {d.totalDebits?.toLocaleString()}</td>
                  <td className={`td font-bold ${d.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>ETB {d.balance?.toLocaleString()}</td>
                  <td className="td">
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); syncLedger(d.id); }} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded" title="Sync Ledger"><RefreshCw className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); clearLedger(d.id, `${d.firstName} ${d.lastName}`); }} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded" title="Clear Ledger Entries"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <button onClick={() => setSelected(null)} className="text-blue-600 text-sm hover:underline mb-1">&larr; Back to all drivers</button>
              <h3 className="text-lg font-bold">{selected.driver?.firstName} {selected.driver?.lastName} <span className="text-sm text-gray-400">({selected.driver?.empNumber})</span></h3>
            </div>
            <div className="flex gap-2">
              <button onClick={() => clearLedger(selected.driver?.id || selected.entries?.[0]?.driverId, `${selected.driver?.firstName} ${selected.driver?.lastName}`)} className="btn-outline text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30 flex items-center gap-1 py-1.5 px-3 text-sm rounded-lg transition" title="Clear all ledger entries">
                <Trash2 className="w-4 h-4" />Clear Ledger
              </button>
              <button onClick={() => syncLedger(selected.driver?.id)} className="btn-secondary py-1.5 px-3 text-sm"><RefreshCw className="w-4 h-4" />Sync</button>
              <button onClick={() => { setForm({ type: 'debit', category: 'advance', amount: '', description: '' }); setAddModal(true); }} className="btn-primary py-1.5 px-3 text-sm"><Plus className="w-4 h-4" />Add Entry</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center"><p className="text-xs text-gray-500">Total Credits</p><p className="text-xl font-bold text-green-700">ETB {selected.totalCredits?.toLocaleString()}</p></div>
            <div className="card text-center"><p className="text-xs text-gray-500">Total Debits</p><p className="text-xl font-bold text-red-600">ETB {selected.totalDebits?.toLocaleString()}</p></div>
            <div className="card text-center"><p className="text-xs text-gray-500">Balance</p><p className={`text-xl font-bold ${selected.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>ETB {selected.balance?.toLocaleString()}</p></div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead><tr><th className="th">Date</th><th className="th">Type</th><th className="th">Category</th><th className="th">Description</th><th className="th">Amount</th><th className="th">Balance</th><th className="th">Actions</th></tr></thead>
              <tbody>
                {entries.length === 0 ? <tr><td colSpan={7} className="td text-center py-10 text-gray-400">No entries - click Sync to import</td></tr>
                : entries.map(e => (
                  <tr key={e.id} className="tr">
                    <td className="td text-sm">{formatDualDate(e.date)}</td>
                    <td className="td">{e.type === 'credit' ? <span className="flex items-center gap-1 text-green-700"><ArrowDown className="w-3 h-3" />Credit</span> : <span className="flex items-center gap-1 text-red-600"><ArrowUp className="w-3 h-3" />Debit</span>}</td>
                    <td className="td capitalize text-gray-500">{e.category?.replace(/_/g, ' ')}</td>
                    <td className="td text-sm">{e.description}</td>
                    <td className={`td font-semibold ${e.type === 'credit' ? 'text-green-700' : 'text-red-600'}`}>{e.type === 'credit' ? '+' : '-'} ETB {e.amount?.toLocaleString()}</td>
                    <td className={`td ${e.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>ETB {e.balance?.toLocaleString()}</td>
                    <td className="td">
                      <button onClick={() => deleteEntry(e.id)} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition" title="Delete entry">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {addModal && (
        <Modal title="Add Ledger Entry" onClose={() => setAddModal(false)}>
          <form onSubmit={addEntry} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type *</label>
                <select className="select" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} required>
                  <option value="credit">Credit (+)</option>
                  <option value="debit">Debit (-)</option>
                </select>
              </div>
              <div>
                <label className="label">Category *</label>
                <select className="select" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} required>
                  {form.type === 'credit'
                    ? ['salary','per_diem','incentive','other'].map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)
                    : ['advance','shortage','fine','loan','other'].map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)
                  }
                </select>
              </div>
            </div>
            <div><label className="label">Amount (ETB) *</label><input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} required /></div>
            <div><label className="label">Description *</label><input className="input" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required /></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setAddModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Entry'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
