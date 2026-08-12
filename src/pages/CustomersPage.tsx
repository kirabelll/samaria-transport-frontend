import { useEffect, useState } from 'react';
import { Plus, Edit, CreditCard, AlertTriangle } from 'lucide-react';
import { customerApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

const empty = { companyName:'', contactName:'', phone:'', email:'', address:'',
  paymentType:'cash', creditLimit:'0', creditDays:'0', taxNumber:'' };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [creditModal, setCreditModal] = useState<any>(null);
  const [creditData, setCreditData] = useState<any>(null);
  const [creditLoading, setCreditLoading] = useState(false);

  const load = () => {
    setLoading(true);
    customerApi.list().then(r => setCustomers(r.data.customers || []))
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setModal(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ companyName: c.companyName, contactName: c.contactName, phone: c.phone,
      email: c.email||'', address: c.address||'', paymentType: c.paymentType,
      creditLimit: c.creditLimit||0, creditDays: c.creditDays||0, taxNumber: c.taxNumber||'' });
    setError(''); setModal(true);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, creditLimit: Number(form.creditLimit), creditDays: Number(form.creditDays) };
      if (editing) await customerApi.update(editing.id, payload);
      else await customerApi.create(payload);
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const inp = (k: string, lbl: string, type='text') => (
    <div key={k}>
      <label className="label">{lbl}</label>
      <input type={type} className="input" value={form[k]}
        onChange={e => setForm((f:any)=>({...f,[k]:e.target.value}))} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4"/>Add Customer</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th className="th">Company</th><th className="th">Contact</th>
            <th className="th">Phone</th><th className="th">Email</th>
            <th className="th">Payment</th><th className="th">Credit Limit</th>
            <th className="th">Status</th><th className="th">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={8} className="td text-center py-10 text-gray-400">No customers found</td></tr>
            ) : customers.map(c => (
              <tr key={c.id} className="tr">
                <td className="td font-semibold">{c.companyName}</td>
                <td className="td">{c.contactName}</td>
                <td className="td">{c.phone}</td>
                <td className="td text-gray-500">{c.email||'-'}</td>
                <td className="td"><StatusBadge status={c.paymentType} /></td>
                <td className="td">{c.creditLimit > 0 ? `ETB ${c.creditLimit.toLocaleString()}` : '-'}</td>
                <td className="td"><StatusBadge status={c.status} /></td>
                <td className="td">
                  <div className="flex gap-1">
                    {c.paymentType === 'credit' && c.creditLimit > 0 && (
                      <button onClick={() => { setCreditModal(c); setCreditLoading(true);
                        customerApi.creditStatus(c.id).then(r => setCreditData(r.data)).catch(console.error).finally(() => setCreditLoading(false));
                      }} className="btn-ghost py-1 px-2 text-blue-600" title="Credit Status"><CreditCard className="w-3.5 h-3.5"/></button>
                    )}
                    <button onClick={()=>openEdit(c)} className="btn-ghost py-1 px-2"><Edit className="w-3.5 h-3.5"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Edit Customer' : 'Add Customer'} onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            {inp('companyName','Company Name *')}
            {inp('contactName','Contact Person *')}
            {inp('phone','Phone *')}
            {inp('email','Email','email')}
            {inp('taxNumber','Tax Number')}
            <div>
              <label className="label">Payment Type</label>
              <select className="select" value={form.paymentType} onChange={e=>setForm((f:any)=>({...f,paymentType:e.target.value}))}>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
                <option value="monthly">Monthly Billing</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {inp('creditLimit','Credit Limit (ETB)','number')}
              {inp('creditDays','Credit Days','number')}
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={e=>setForm((f:any)=>({...f,address:e.target.value}))} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving...':'Save Customer'}</button>
            </div>
          </form>
        </Modal>
      )}

      {creditModal && (
        <Modal title={`Credit Status: ${creditModal.companyName}`} onClose={() => { setCreditModal(null); setCreditData(null); }}>
          {creditLoading ? <div className="text-center py-6 text-gray-400">Loading...</div> : creditData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="card bg-blue-50 border-blue-200">
                  <p className="text-xs text-gray-500">Credit Limit</p>
                  <p className="text-lg font-bold text-blue-700">ETB {creditData.creditLimit?.toLocaleString()}</p>
                </div>
                <div className="card bg-green-50 border-green-200">
                  <p className="text-xs text-gray-500">Available</p>
                  <p className="text-lg font-bold text-green-700">ETB {creditData.available?.toLocaleString()}</p>
                </div>
                <div className="card bg-amber-50 border-amber-200">
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="text-lg font-bold text-amber-700">ETB {creditData.totalOutstanding?.toLocaleString()}</p>
                </div>
                <div className="card bg-gray-50">
                  <p className="text-xs text-gray-500">Utilization</p>
                  <p className="text-lg font-bold">{creditData.utilizationPct}%</p>
                </div>
              </div>
              {/* Utilization bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Credit Utilization</span>
                  <span>{creditData.utilizationPct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className={`h-3 rounded-full ${creditData.utilizationPct > 80 ? 'bg-red-500' : creditData.utilizationPct > 50 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, creditData.utilizationPct)}%` }} />
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div><span className="text-gray-500">Open Invoices:</span> <strong>{creditData.invoicesCount}</strong></div>
                <div><span className="text-gray-500">Credit Days:</span> <strong>{creditData.creditDays}</strong></div>
                {creditData.overdueCount > 0 && (
                  <div className="flex items-center gap-1 text-red-600"><AlertTriangle className="w-3.5 h-3.5"/><strong>{creditData.overdueCount} overdue</strong></div>
                )}
              </div>
            </div>
          ) : <div className="text-center py-6 text-gray-400">No credit data</div>}
        </Modal>
      )}
    </div>
  );
}
