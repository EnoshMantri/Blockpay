import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import { ShieldCheck, LogIn, UserPlus, Mail, Wallet, User } from 'lucide-react';

export default function LoginPage() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [loginMode, setLoginMode] = useState('email'); // 'email' | 'wallet'
  const [form, setForm] = useState({
    email: '',
    username: '',
    walletAddress: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Build payload depending on mode
    const payload = { password: form.password };
    if (loginMode === 'email' || tab === 'register') {
      if (form.email) payload.email = form.email;
    }
    if (loginMode === 'wallet' || tab === 'register') {
      if (form.walletAddress) payload.walletAddress = form.walletAddress;
    }
    if (tab === 'register' && form.username) {
      payload.username = form.username;
    }

    try {
      if (tab === 'register') {
        await api.post('/auth/register', payload);
        toast('Account created successfully! Please log in.', 'success');
        setTab('login');
        set('password', '');
      } else {
        const { token } = await api.post('/auth/login', payload);
        login(token);
        toast('Logged in successfully', 'success');
        navigate('/');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] pt-12 animate-slide-up">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-[0_0_30px_rgba(0,212,170,0.3)]">
          <span className="text-void font-bold text-2xl font-mono">B</span>
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-wide">BlockPay Settlement</h1>
          <p className="text-text-muted text-sm font-mono mt-1">Authorized Access Only</p>
        </div>
      </div>

      <div className="card w-full max-w-sm p-8 shadow-2xl border-accent/10">
        {/* Login / Register tabs */}
        <div className="flex bg-elevated rounded-lg p-1 mb-6">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2
              ${tab === 'login' ? 'bg-surface text-text-primary shadow' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <LogIn size={15} /> Login
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2
              ${tab === 'register' ? 'bg-surface text-text-primary shadow' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <UserPlus size={15} /> Register
          </button>
        </div>

        {/* Login mode switcher (only on login tab) */}
        {tab === 'login' && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setLoginMode('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${loginMode === 'email' ? 'bg-accent/10 border-accent/30 text-accent' : 'border-border text-text-muted hover:text-text-secondary'}`}
            >
              <Mail size={12} /> Email
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('wallet')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${loginMode === 'wallet' ? 'bg-accent/10 border-accent/30 text-accent' : 'border-border text-text-muted hover:text-text-secondary'}`}
            >
              <Wallet size={12} /> Wallet Address
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          {(tab === 'register' || loginMode === 'email') && (
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input pl-9 text-sm"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required={tab === 'register' || loginMode === 'email'}
                />
              </div>
            </div>
          )}

          {/* Username (register only) */}
          {tab === 'register' && (
            <div>
              <label className="label">Display Name <span className="text-text-muted font-normal">(optional)</span></label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input pl-9 text-sm"
                  type="text"
                  placeholder="Your name"
                  value={form.username}
                  onChange={e => set('username', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Wallet Address (login: wallet mode, register: optional) */}
          {(loginMode === 'wallet' || tab === 'register') && (
            <div>
              <label className="label">
                Wallet Address {tab === 'register' && <span className="text-text-muted font-normal">(optional)</span>}
              </label>
              <div className="relative">
                <Wallet size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="input pl-9 font-mono text-sm"
                  placeholder="0x..."
                  value={form.walletAddress}
                  onChange={e => set('walletAddress', e.target.value)}
                  required={loginMode === 'wallet' && tab === 'login'}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
              minLength={tab === 'register' ? 6 : 1}
            />
            {tab === 'register' && (
              <p className="text-[11px] text-text-muted mt-1">Min. 6 characters</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
          >
            {loading
              ? 'Processing…'
              : tab === 'login'
                ? <><LogIn size={15} /> Sign In</>
                : <><UserPlus size={15} /> Create Account</>
            }
          </button>
        </form>

        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-accent/5 border border-accent/10 text-xs text-text-secondary">
          <ShieldCheck size={16} className="text-accent shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {tab === 'register'
              ? 'Register with your email to send and track remittance settlements. Wallet address is optional.'
              : 'Authentication is required to execute settlements and manage the on-chain compliance registry.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
