import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/auth';
import ThemeSwitch from '../components/ui/ThemeSwitch';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(form.email, form.password);
      setAuth(res.data.token, res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative selection:bg-primary/20 selection:text-primary">
      {/* Top Bar with Theme Switch */}
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

      {/* Center Auth Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-modal p-6 sm:p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Enter your credentials to access your transport workspace
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
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Email address
              </label>
              <input
                type="email"
                className="input"
                placeholder="admin@wonde.et"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="label flex items-center gap-1.5 mb-0">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 mt-2 group text-sm font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-border">
            <p className="text-xs text-muted-foreground">
              First time setting up?{' '}
              <Link
                to="/setup"
                className="text-primary hover:underline font-semibold transition-colors"
              >
                Set up initial admin
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="p-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Wonde Transport ERP. All rights reserved.
      </div>
    </div>
  );
}
