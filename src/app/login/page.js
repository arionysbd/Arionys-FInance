'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import Link from 'next/link';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (useMagicLink) {
        await axios.post('/api/auth/magic-link', { email });
        setSuccess('Check your email for the magic link!');
      } else {
        const { data } = await axios.post('/api/auth/login', { email, password });
        login(data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card card glass animate-fade-in">
        <div className="auth-header">
          <div className="logo-icon">
            <img src="https://files.edgestore.dev/58ak0uq249vmf7cf/publicFiles/_public/303ae74c-97f0-41f5-be5a-45a951af0d72.png" alt="Arionys" />
          </div>
          <h1>{useMagicLink ? 'Magic Link' : 'Welcome Back'}</h1>
          <p>{useMagicLink ? 'Sign in with a secure link' : 'Login to Arionys Finance'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-group-container">
              <div className="group-icon">
                <Mail size={18} />
              </div>
              <input 
                type="email" 
                className="group-input" 
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {!useMagicLink && (
            <div className="form-group">
              <label>Password</label>
              <div className="input-group-container">
                <div className="group-icon">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="group-input" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  className="group-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}

          <button type="submit" className="btn btn-primary full-width" disabled={loading}>
            {loading ? 'Processing...' : (
              useMagicLink ? 'Send Magic Link' : <><LogIn size={18} /> Login</>
            )}
          </button>
        </form>

        <div className="auth-switch">
          <button 
            className="text-btn"
            onClick={() => {
              setUseMagicLink(!useMagicLink);
              setError('');
              setSuccess('');
            }}
          >
            {useMagicLink ? 'Use password instead' : 'Sign in with Magic Link'}
          </button>
        </div>

        <p className="auth-footer">
          Don't have an account? <Link href="/signup">Create Account</Link>
        </p>
      </div>


      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--background);
          background-image:
            radial-gradient(at 10% 0%, rgba(99, 102, 241, 0.12) 0, transparent 50%),
            radial-gradient(at 90% 100%, rgba(139, 92, 246, 0.1) 0, transparent 50%),
            radial-gradient(at 50% 50%, rgba(59, 130, 246, 0.08) 0, transparent 50%);
          padding: 1.5rem;
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          padding: 2.5rem;
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: var(--shadow-lg);
          border-radius: 8px;
        }
        @media (max-width: 480px) {
          .auth-card { padding: 1.5rem; }
          .auth-header h1 { font-size: 1.25rem; }
        }
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .logo-icon {
          width: 140px;
          margin: 0 auto 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-icon img { width: 100%; height: auto; object-fit: contain; }
        .auth-header h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
        .auth-header p { color: var(--muted-foreground); font-size: 0.875rem; }
        
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; }
        
        .input-group-container {
          display: flex;
          align-items: center;
          width: 100%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          height: 46px;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .input-group-container:focus-within {
          border-color: #0f172a;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.05);
        }
        
        .group-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 0.75rem 0 1rem;
          color: #94a3b8;
          pointer-events: none;
        }
        
        .group-input {
          flex: 1;
          border: none;
          background: transparent;
          height: 100%;
          outline: none;
          font-size: 0.9375rem;
          color: #0f172a;
          padding: 0;
          width: 100%;
        }
        
        .group-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 1rem;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }
        .group-toggle:hover { color: #0f172a; }
        
        .full-width { width: 100%; margin-top: 1rem; }
        .error-msg { color: var(--destructive); background: #fef2f2; padding: 0.75rem; border-radius: var(--radius); font-size: 0.8125rem; margin-bottom: 1rem; text-align: center; border: 1px solid rgba(239, 68, 68, 0.1); }
        .success-msg { color: #10b981; background: #f0fdf4; padding: 0.75rem; border-radius: var(--radius); font-size: 0.8125rem; margin-bottom: 1rem; text-align: center; border: 1px solid rgba(16, 185, 129, 0.1); }
        
        .auth-switch { margin-top: 1.5rem; text-align: center; }
        .text-btn { background: transparent; border: none; color: var(--primary); font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        .text-btn:hover { opacity: 0.8; }
        
        .auth-footer { margin-top: 2rem; text-align: center; font-size: 0.875rem; color: var(--muted-foreground); }
        .auth-footer :global(a) { color: var(--primary); font-weight: 600; text-decoration: none; }
        .auth-footer :global(a):hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
