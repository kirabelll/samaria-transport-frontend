import { useEffect, useState } from 'react';
import { Plus, Edit, Truck, Trash2, UserX } from 'lucide-react';
import { employeeApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

const ROLES = ['driver','helper','technical','store','cashier','hr','office','management'];
const DEPTS = ['Operations','Technical','Store','Finance','HR','Management','Admin'];
const CONTRACTS = ['permanent','contract','daily'];
const STATUSES = ['active','inactive','suspended'];

const empty = { empNumber:'', firstName:'', lastName:'', role:'driver', department:'Operations',
  basicSalary:'', perDiemRate:'0', hireDate:'', contractType:'permanent',
  phone:'', email:'', nationalId:'', address:'', bankAccount:'', status: 'active' };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    employeeApi.list({ role: filterRole || undefined, status: filterStatus || undefined })
      .then(r => setEmployees(r.data.employees || []))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterRole, filterStatus]);

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setModal(true); };
  const openCreateDriver = () => {
    setEditing(null);
    setForm({ ...empty, role: 'driver', department: 'Operations', status: 'active' });
    setError(''); setModal(true);
  };
  const openEdit = (e: any) => {
    setEditing(e);
    setForm({ empNumber: e.empNumber, firstName: e.firstName, lastName: e.lastName,
      role: e.role, department: e.department, basicSalary: e.basicSalary,
      perDiemRate: e.perDiemRate||0, hireDate: e.hireDate?.slice(0,10)||'',
      contractType: e.contractType, phone: e.phone, email: e.email||'',
      nationalId: e.nationalId||'', address: e.address||'', bankAccount: e.bankAccount||'',
      status: e.status || 'active' });
    setError(''); setModal(true);
  };

  const handleDeactivate = async (e: any) => {
    const label = e.role === 'driver' ? 'Driver' : 'Employee';
    const newStatus = e.status === 'inactive' ? 'active' : 'inactive';
    if (!window.confirm(`Are you sure you want to mark ${label.toLowerCase()} "${e.firstName} ${e.lastName}" as ${newStatus}?`)) return;
    try {
      await employeeApi.update(e.id, { status: newStatus });
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to update status`);
    }
  };

  const handleDeletePermanent = async (e: any) => {
    const label = e.role === 'driver' ? 'Driver' : 'Employee';
    const isInactive = e.status === 'inactive';
    const msg = isInactive
      ? `PERMANENT DELETE: Are you sure you want to permanently delete inactive ${label.toLowerCase()} "${e.firstName} ${e.lastName}" (${e.empNumber})?\n\nThis will remove the employee and all their associated records permanently. This action CANNOT be undone.`
      : `PERMANENT DELETE: Are you sure you want to permanently delete ${label.toLowerCase()} "${e.firstName} ${e.lastName}" (${e.empNumber})?\n\nThis will completely remove the record and all associated history. (Tip: You can set status to "inactive" instead if you want to keep records).`;

    if (!window.confirm(msg)) return;
    try {
      await employeeApi.delete(e.id);
      load();
    } catch (err: any) {
      if (err.response?.status === 404) {
        const shouldDeactivate = window.confirm(
          `The remote server (api.novahrsm.com) does not have the DELETE endpoint deployed yet.\n\nWould you like to set ${e.firstName}'s status to "inactive" instead?`
        );
        if (shouldDeactivate) {
          try {
            await employeeApi.update(e.id, { status: 'inactive' });
            load();
            return;
          } catch (updateErr: any) {
            alert(updateErr.response?.data?.error || 'Failed to update status');
            return;
          }
        }
        return;
      }
      alert(err.response?.data?.error || `Failed to permanently delete ${label.toLowerCase()}`);
    }
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
        <div className="flex gap-2">
          <select className="select w-40" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <select className="select w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
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
                  <div className="flex items-center gap-1">
                    <button onClick={()=>openEdit(e)} className="btn-ghost py-1 px-2" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
                    <button
                      onClick={()=>handleDeactivate(e)}
                      className={`p-1 rounded transition ${e.status === 'inactive' ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                      title={e.status === 'inactive' ? 'Reactivate' : 'Set Inactive'}
                    >
                      <UserX className="w-3.5 h-3.5"/>
                    </button>
                    <button
                      onClick={()=>handleDeletePermanent(e)}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
                      title={`Permanently Delete ${e.role === 'driver' ? 'Driver' : 'Employee'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
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
            {inp('status','Status *','text',STATUSES)}
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
