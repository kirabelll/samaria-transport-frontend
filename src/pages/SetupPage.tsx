import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/auth';
import ThemeSwitch from '../components/ui/ThemeSwitch';

export default function SetupPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.setup(form.email, form.password, form.name);
      setAuth(res.data.token, res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Initial setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative selection:bg-primary/20 selection:text-primary">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <Truck className="w-4 h-4" />
          </div>
          <span className="font-bold font-heading text-sm sm:text-base tracking-tight">
            Wonde ERP
          </span>
        </div>
        <ThemeSwitch />
      </div>

      {/* Setup Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-modal p-6 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Initial Workspace Setup
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Create the master system administrator account
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs sm:text-sm text-destructive font-medium animate-fadeIn">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="label flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Full Name
              </label>
              <input
                type="text"
                className="input"
                placeholder="System Administrator"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="label flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Email Address
              </label>
              <input
                type="email"
                className="input"
                placeholder="admin@wonde.et"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="label flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                Master Password (min 6 characters)
              </label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 mt-2 group text-sm font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Setting up workspace...
                </>
              ) : (
                <>
                  Create Admin Account
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-border">
            <p className="text-xs text-muted-foreground">
              Already initialized?{' '}
              <Link
                to="/login"
                className="text-primary hover:underline font-semibold transition-colors"
              >
                Sign in to existing account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Wonde Transport ERP. All rights reserved.
      </div>
    </div>
  );
}
