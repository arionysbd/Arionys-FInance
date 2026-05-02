'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import Link from 'next/link';
import { Mail, Lock, User, UserPlus } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post('/api/auth/register', { name, email, password });
      login(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card card glass animate-fade-in">
        <div className="auth-header">
          <div className="logo-icon">A</div>
          <h1>Create Account</h1>
          <p>The first account will be the <strong>Admin</strong>.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <div className="input-with-icon">
              <User size={18} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input 
                type="email" 
                className="input-field" 
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="btn btn-primary full-width" disabled={loading}>
            {loading ? 'Creating Account...' : <><UserPlus size={18} /> Get Started</>}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Login Instead</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 1.5rem;
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          padding: 2.5rem;
          border: 1px solid var(--border);
        }
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .logo-icon {
          width: 48px;
          height: 48px;
          background: var(--primary);
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.5rem;
          margin: 0 auto 1.5rem;
        }
        .auth-header h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
        .auth-header p { color: var(--muted-foreground); font-size: 0.875rem; }
        
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; }
        .input-with-icon { position: relative; }
        .input-with-icon :global(svg) { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted-foreground); }
        .input-with-icon input { padding-left: 2.75rem; }
        
        .full-width { width: 100%; margin-top: 1rem; }
        .error-msg { color: var(--destructive); background: #fef2f2; padding: 0.75rem; border-radius: var(--radius); font-size: 0.8125rem; margin-bottom: 1rem; text-align: center; border: 1px solid rgba(239, 68, 68, 0.1); }
        
        .auth-footer { margin-top: 2rem; text-align: center; font-size: 0.875rem; color: var(--muted-foreground); }
        .auth-footer :global(a) { color: var(--primary); font-weight: 600; text-decoration: none; }
        .auth-footer :global(a):hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
