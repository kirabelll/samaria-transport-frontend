import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/auth';

export default function SetupPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authApi.setup(form.email, form.password, form.name);
      setAuth(res.data.token, res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Setup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Initial Setup</h1>
          <p className="text-sm text-gray-500 mt-1">Create your admin account to get started</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" placeholder="Your full name"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" className="input" placeholder="admin@company.et"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Password (min 6 characters)</label>
            <input type="password" className="input" placeholder="••••••••"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? 'Setting up...' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
