import { useEffect, useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { hrApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ month: new Date().toISOString().slice(0, 7), employeeId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const load = () => {
    setLoading(true);
    hrApi.listPayrolls({ month: filterMonth })
      .then(r => setPayrolls(r.data.payrolls || []))
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterMonth]);

  useEffect(() => {
    if (modal && employees.length === 0) {
      import('../services/api').then(({ employeeApi }) => {
        employeeApi.list().then(r => setEmployees(r.data.employees || []));
      });
    }
  }, [modal]);

  const generatePayroll = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      await hrApi.generatePayroll(form);
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed to generate payroll'); }
    finally { setSaving(false); }
  };

  const approvePayroll = async (id: string) => {
    try { await hrApi.approvePayroll(id); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const markPaid = async (id: string) => {
    const ref = prompt('Payment reference:');
    if (!ref) return;
    try { await hrApi.markPayrollPaid(id, { paymentReference: ref }); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const total = payrolls.reduce((s: number, p: any) => s + (p.netSalary || 0), 0);
  const pending = payrolls.filter((p: any) => p.status === 'pending').length;
  const approved = payrolls.filter((p: any) => p.status === 'approved').length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">{payrolls.length}</div>
          <div className="text-sm text-gray-500">Total Records</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{pending}</div>
          <div className="text-sm text-gray-500">Pending Approval</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">ETB {total.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Net ({filterMonth})</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <input type="month" className="input w-40" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
        <button onClick={() => { setForm({ month: filterMonth, employeeId: '' }); setError(''); setModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />Generate Payroll
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th className="th">Employee</th><th className="th">Month</th>
            <th className="th">Basic</th><th className="th">Allowances</th>
            <th className="th">Deductions</th><th className="th">Net</th>
            <th className="th">Status</th><th className="th">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : payrolls.length === 0 ? (
              <tr><td colSpan={8} className="td text-center py-10 text-gray-400">No payroll records for {filterMonth}</td></tr>
            ) : payrolls.map((p: any) => (
              <tr key={p.id} className="tr">
                <td className="td font-medium">{p.employee?.firstName} {p.employee?.lastName}</td>
                <td className="td text-gray-500">{p.month}</td>
                <td className="td">ETB {p.basicSalary?.toLocaleString()}</td>
                <td className="td text-green-700">+ETB {p.totalAllowances?.toLocaleString()}</td>
                <td className="td text-red-600">-ETB {p.totalDeductions?.toLocaleString()}</td>
                <td className="td font-bold">ETB {p.netSalary?.toLocaleString()}</td>
                <td className="td"><StatusBadge status={p.status} /></td>
                <td className="td">
                  <div className="flex gap-1">
                    {p.status === 'pending' && (
                      <button onClick={() => approvePayroll(p.id)} className="btn-success py-1 px-2 text-xs">Approve</button>
                    )}
                    {p.status === 'approved' && (
                      <button onClick={() => markPaid(p.id)} className="btn-primary py-1 px-2 text-xs">Mark Paid</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Generate Payroll" onClose={() => setModal(false)}>
          <form onSubmit={generatePayroll} className="space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div>
              <label className="label">Month *</label>
              <input type="month" className="input" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Employee (leave blank for all)</label>
              <select className="select" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}>
                <option value="">All Employees</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            <p className="text-sm text-gray-500">This will automatically calculate basic salary, per diem allowances, overtime, and deductions based on attendance records.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Generating...' : 'Generate'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
