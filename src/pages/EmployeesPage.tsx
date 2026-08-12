import { useEffect, useState } from 'react';
import { Plus, Edit, Truck } from 'lucide-react';
import { employeeApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

const ROLES = ['driver','helper','technical','store','cashier','hr','office','management'];
const DEPTS = ['Operations','Technical','Store','Finance','HR','Management','Admin'];
const CONTRACTS = ['permanent','contract','daily'];

const empty = { empNumber:'', firstName:'', lastName:'', role:'driver', department:'Operations',
  basicSalary:'', perDiemRate:'0', hireDate:'', contractType:'permanent',
  phone:'', email:'', nationalId:'', address:'', bankAccount:'' };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    employeeApi.list({ role: filterRole || undefined })
      .then(r => setEmployees(r.data.employees || []))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterRole]);

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setModal(true); };
  const openCreateDriver = () => {
    setEditing(null);
    setForm({ ...empty, role: 'driver', department: 'Operations' });
    setError(''); setModal(true);
  };
  const openEdit = (e: any) => {
    setEditing(e);
    setForm({ empNumber: e.empNumber, firstName: e.firstName, lastName: e.lastName,
      role: e.role, department: e.department, basicSalary: e.basicSalary,
      perDiemRate: e.perDiemRate||0, hireDate: e.hireDate?.slice(0,10)||'',
      contractType: e.contractType, phone: e.phone, email: e.email||'',
      nationalId: e.nationalId||'', address: e.address||'', bankAccount: e.bankAccount||'' });
    setError(''); setModal(true);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, basicSalary: Number(form.basicSalary), perDiemRate: Number(form.perDiemRate),
        hireDate: form.hireDate ? new Date(form.hireDate).toISOString() : undefined };
      if (editing) await employeeApi.update(editing.id, payload);
      else await employeeApi.create(payload);
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const inp = (k: string, label: string, type='text', opts?: string[]) => (
    <div key={k}>
      <label className="label">{label}</label>
      {opts ? (
        <select className="select" value={form[k]} onChange={e => setForm((f:any)=>({...f,[k]:e.target.value}))}>
          {opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} className="input" value={form[k]} onChange={e => setForm((f:any)=>({...f,[k]:e.target.value}))} />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <select className="select w-40" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={openCreateDriver} className="btn-secondary flex items-center gap-1"><Truck className="w-4 h-4"/>Add New Driver</button>
          <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4"/>Add Employee</button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th className="th">Emp #</th><th className="th">Name</th>
            <th className="th">Role</th><th className="th">Department</th>
            <th className="th">Phone</th><th className="th">Salary (ETB)</th>
            <th className="th">Status</th><th className="th">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={8} className="td text-center py-10 text-gray-400">No employees found</td></tr>
            ) : employees.map(e => (
              <tr key={e.id} className="tr">
                <td className="td font-mono text-xs text-gray-500">{e.empNumber}</td>
                <td className="td font-medium">{e.firstName} {e.lastName}</td>
                <td className="td"><StatusBadge status={e.role} /></td>
                <td className="td text-gray-500">{e.department}</td>
                <td className="td">{e.phone}</td>
                <td className="td">{e.basicSalary?.toLocaleString()}</td>
                <td className="td"><StatusBadge status={e.status} /></td>
                <td className="td">
                  <button onClick={()=>openEdit(e)} className="btn-ghost py-1 px-2"><Edit className="w-3.5 h-3.5"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Edit Employee' : 'Add Employee'} onClose={() => setModal(false)} size="max-w-2xl">
          <form onSubmit={save} className="grid grid-cols-2 gap-4">
            {error && <div className="col-span-2 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            {inp('empNumber','Employee Number *')}
            {inp('firstName','First Name *')}
            {inp('lastName','Last Name *')}
            {inp('role','Role *','text',ROLES)}
            {inp('department','Department *','text',DEPTS)}
            {inp('contractType','Contract Type *','text',CONTRACTS)}
            {inp('basicSalary','Basic Salary (ETB) *','number')}
            {inp('perDiemRate','Per Diem Rate (ETB)','number')}
            {inp('hireDate','Hire Date *','date')}
            {inp('phone','Phone *')}
            {inp('email','Email','email')}
            {inp('nationalId','National ID')}
            {inp('bankAccount','Bank Account')}
            <div className="col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={e => setForm((f:any)=>({...f,address:e.target.value}))} />
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving...':'Save Employee'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
