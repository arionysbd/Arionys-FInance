'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

function InviteConfirmContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | ready | success | error
  const [userData, setUserData] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No invitation token provided.');
      return;
    }

    const verify = async () => {
      try {
        const { data } = await axios.get(`/api/users/invite/confirm?token=${token}`);
        if (data.success) {
          setUserData(data.data);
          setStatus('ready');
        } else {
          setStatus('error');
          setErrorMsg(data.message);
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.response?.data?.message || 'Invalid or expired invitation link.');
      }
    };

    verify();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.post('/api/users/invite/confirm', { token, password });
      if (data.success) {
        setStatus('success');
      } else {
        setErrorMsg(data.message);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="invite-screen">
      <div className="invite-card">
        <div className="card-logo">
          <img src="https://files.edgestore.dev/58ak0uq249vmf7cf/publicFiles/_public/303ae74c-97f0-41f5-be5a-45a951af0d72.png" alt="Arionys Finance" />
        </div>

        {status === 'loading' && (
          <div className="state-block">
            <div className="spinner"></div>
            <p>Verifying your invitation...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="state-block">
            <div className="icon-frame error">
              <XCircle size={32} />
            </div>
            <h2>Invitation Invalid</h2>
            <p>{errorMsg}</p>
            <button onClick={() => router.push('/login')} className="btn-primary">
              Go to Login
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="state-block">
            <div className="icon-frame success">
              <CheckCircle size={32} />
            </div>
            <h2>Account Activated</h2>
            <p>Your account has been set up successfully. You can now log in with your credentials.</p>
            <button onClick={() => router.push('/login')} className="btn-primary">
              Log In Now
            </button>
          </div>
        )}

        {status === 'ready' && userData && (
          <div className="form-block">
            <h2>Welcome, {userData.name}</h2>
            <p className="subtitle">
              Set your password to activate your <strong>{userData.email}</strong> account.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Password</label>
                <div className="input-wrap">
                  <Lock size={16} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    minLength={6}
                  />
                  <button type="button" className="toggle-pw" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrap">
                  <Lock size={16} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                  />
                </div>
              </div>

              {errorMsg && <p className="error-text">{errorMsg}</p>}

              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Activating...' : 'Activate Account'}
              </button>
            </form>
          </div>
        )}
      </div>

      <style jsx>{`
        .invite-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          padding: 20px;
        }
        .invite-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          width: 100%;
          max-width: 420px;
          padding: 2.5rem 2rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        }
        .card-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
        }
        .card-logo img {
          width: 160px;
          height: auto;
        }

        .state-block {
          text-align: center;
        }
        .state-block h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }
        .state-block p {
          color: #64748b;
          font-size: 0.875rem;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }
        .icon-frame {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
        }
        .icon-frame.success {
          background: #f0fdf4;
          color: #10b981;
          border: 1px solid #dcfce7;
        }
        .icon-frame.error {
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f1f5f9;
          border-top-color: #0f172a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .form-block h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.25rem;
        }
        .subtitle {
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 1.75rem;
          line-height: 1.5;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
        }
        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-wrap :global(svg) {
          position: absolute;
          left: 14px;
          color: #94a3b8;
          pointer-events: none;
        }
        .input-wrap input {
          width: 100%;
          padding: 0.75rem 2.75rem 0.75rem 2.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 0.9375rem;
          color: #0f172a;
          transition: all 0.2s;
        }
        .input-wrap input:focus {
          background: white;
          border-color: #0f172a;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05);
          outline: none;
        }
        .toggle-pw {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          padding: 0;
        }

        .error-text {
          color: #ef4444;
          font-size: 0.8125rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .btn-primary {
          width: 100%;
          padding: 0.875rem;
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.9375rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover:not(:disabled) {
          background: #1e293b;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default function InviteConfirmPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #f1f5f9', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <InviteConfirmContent />
    </Suspense>
  );
}
