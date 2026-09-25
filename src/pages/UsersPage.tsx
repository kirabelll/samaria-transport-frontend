import { useEffect, useState } from 'react';
import { Plus, Key, Copy, Check, Wallet } from 'lucide-react';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    authApi.listUsers().then(r => setUsers(r.data.users || [])).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
          <p className="text-xs text-gray-500">Manage system users, roles, and linked cashier identifiers</p>
        </div>
        <button onClick={() => { setForm({ name: '', email: '', password: '', role: 'dispatcher' }); setError(''); setModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />New User
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th className="th">Name & Email</th>
            <th className="th">Role</th>
            <th className="th">Cashier / ID Info</th>
            <th className="th">Status</th>
            <th className="th">Created</th>
            <th className="th">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="td text-center py-10 text-gray-400">No users</td></tr>
            ) : users.map((user: any) => {
              const cashier = user.cashierRecord;
              const hasCashier = Boolean(cashier || user.cashierId || user.role === 'cashier');
              const cashierId = cashier?.id || user.cashierId || user.id;
              const cashierCode = cashier?.code || user.cashierCode;
              const balance = cashier?.currentBalance ?? user.cashierBalance;

              return (
                <tr key={user.id} className="tr">
                  <td className="td">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="td"><StatusBadge status={user.role} /></td>
                  <td className="td">
                    {hasCashier ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Wallet className="w-3 h-3 text-blue-600" />
                            {cashierCode ? cashierCode : 'Cashier Linked'}
                          </span>
                          {balance != null && (
                            <span className="text-[11px] font-medium text-emerald-700">
                              ETB {Number(balance).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 w-fit">
                          <span className="truncate max-w-[150px]" title={cashierId}>ID: {cashierId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(cashierId, `csh-${user.id}`)}
                            className="text-gray-400 hover:text-blue-600 p-0.5"
                            title="Copy Cashier ID"
                          >
                            {copiedId === `csh-${user.id}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-gray-400">
                        <span className="truncate max-w-[120px]" title={user.id}>UID: {user.id.slice(0, 8)}...</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(user.id, `usr-${user.id}`)}
                          className="text-gray-400 hover:text-blue-600 p-0.5"
                          title="Copy User ID"
                        >
                          {copiedId === `usr-${user.id}` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </td>
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
              );
            })}
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
            {form.role === 'cashier' && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                ℹ️ A Cashier ID & cash drawer account will automatically be created and linked to this user upon creation.
              </div>
            )}
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
