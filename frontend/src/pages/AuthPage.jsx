import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './AuthPage.css';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, signup } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        await signup(form.name, form.email, form.password);
      }
      addToast(mode === 'login' ? 'Welcome back!' : 'Account created!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="#7c6bff" />
              <rect x="7" y="10" width="18" height="3" rx="1.5" fill="white" />
              <rect x="7" y="16" width="12" height="3" rx="1.5" fill="rgba(255,255,255,0.6)" />
              <rect x="7" y="22" width="15" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
              <circle cx="24" cy="23.5" r="5" fill="#22c55e" />
              <path d="M21.5 23.5l1.5 1.5 2.5-2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>TaskFlow</span>
          </div>

          <h1 className="auth-title">
            {mode === 'login' ? 'Welcome back' : 'Get started'}
          </h1>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account — it\'s free'}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input name="name" value={form.name} onChange={handleChange}
                  placeholder="Your full name" required autoFocus />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="you@example.com" required autoFocus={mode === 'login'} />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'} required />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : null}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); }}>Sign up</button></>
            ) : (
              <>Already have an account? <button onClick={() => { setMode('login'); setError(''); }}>Sign in</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
