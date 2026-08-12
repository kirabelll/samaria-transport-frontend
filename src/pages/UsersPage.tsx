import { useEffect, useState } from 'react';
import { Plus, Key } from 'lucide-react';
import { authApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDualDate } from '../utils/ethCalendar';

const ROLES = ['owner', 'dispatcher', 'driver', 'technical_manager', 'store_manager', 'cashier', 'hr', 'customer', 'admin'];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [pwModal, setPwModal] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'dispatcher' });
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    authApi.listUsers().then(r => setUsers(r.data.users || [])).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      await authApi.createUser(form);
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed to create user'); }
    finally { setSaving(false); }
  };

  const changePassword = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { setError('Passwords do not match'); return; }
    setSaving(true); setError('');
    try {
      await authApi.updateUser(pwModal.id, { newPassword: pwForm.newPassword });
      setPwModal(null);
    } catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (user: any) => {
    try {
      await authApi.updateUser(user.id, { isActive: !user.isActive });
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => { setForm({ name: '', email: '', password: '', role: 'dispatcher' }); setError(''); setModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />New User
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th className="th">Name</th><th className="th">Email</th><th className="th">Role</th>
            <th className="th">Status</th><th className="th">Created</th><th className="th">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="td text-center py-10 text-gray-400">No users</td></tr>
            ) : users.map((user: any) => (
              <tr key={user.id} className="tr">
                <td className="td font-medium">{user.name}</td>
                <td className="td text-gray-500">{user.email}</td>
                <td className="td"><StatusBadge status={user.role} /></td>
                <td className="td">
                  <span className={`badge ${user.isActive ? 'badge-green' : 'badge-red'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="td text-gray-500 text-sm">{formatDualDate(user.createdAt)}</td>
                <td className="td">
                  <div className="flex gap-1">
                    <button onClick={() => { setPwModal(user); setPwForm({ newPassword: '', confirmPassword: '' }); setError(''); }} className="btn-secondary py-1 px-2 text-xs">
                      <Key className="w-3 h-3" />Password
                    </button>
                    <button onClick={() => toggleActive(user)} className={`py-1 px-2 text-xs ${user.isActive ? 'btn-danger' : 'btn-success'}`}>
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Create User" onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div><label className="label">Full Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
            <div>
              <label className="label">Role *</label>
              <select className="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div><label className="label">Password *</label><input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create User'}</button>
            </div>
          </form>
        </Modal>
      )}

      {pwModal && (
        <Modal title={`Change Password: ${pwModal.name}`} onClose={() => setPwModal(null)}>
          <form onSubmit={changePassword} className="space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div><label className="label">New Password *</label><input type="password" className="input" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={6} /></div>
            <div><label className="label">Confirm Password *</label><input type="password" className="input" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setPwModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Changing...' : 'Change Password'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
