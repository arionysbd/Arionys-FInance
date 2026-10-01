'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import Link from 'next/link';
import { Mail, Lock, User, UserPlus, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = form, 2 = OTP
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const { login } = useAuth();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setSendingOtp(true);
    setError('');
    try {
      const { data } = await axios.post('/api/auth/send-otp', { email, name });
      if (data.success) {
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setSendingOtp(true);
    setError('');
    try {
      await axios.post('/api/auth/send-otp', { email, name });
      setError(''); // clear any previous error
      alert('New verification code sent!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post('/api/auth/register', { name, email, companyName, password, otp });
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
          <div className="logo-icon">
            <img src="https://files.edgestore.dev/58ak0uq249vmf7cf/publicFiles/_public/303ae74c-97f0-41f5-be5a-45a951af0d72.png" alt="Arionys" />
          </div>
          {step === 1 && (
            <>
              <h1>Create Account</h1>
              <p>Register to get started with Arionys Finance.</p>
            </>
          )}
          {step === 2 && (
            <>
              <h1>Verify Your Email</h1>
              <p>We sent a 6-digit code to <strong>{email}</strong></p>
            </>
          )}
        </div>

        {/* Step 1: Registration Form */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
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
              <label>Company Name</label>
              <div className="input-with-icon">
                <ShieldCheck size={18} />
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
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
                  minLength={6}
                />
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button type="submit" className="btn btn-primary full-width" disabled={sendingOtp}>
              {sendingOtp ? 'Sending Code...' : <><Mail size={18} /> Send Verification Code</>}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <form onSubmit={handleVerifyAndRegister}>
            <div className="otp-section">
              <div className="otp-icon-frame">
                <ShieldCheck size={28} />
              </div>

              <div className="form-group">
                <label>Verification Code</label>
                <input
                  type="text"
                  className="otp-input"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(val);
                  }}
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button type="submit" className="btn btn-primary full-width" disabled={loading || otp.length !== 6}>
              {loading ? 'Creating Account...' : <><UserPlus size={18} /> Create Account</>}
            </button>

            <div className="otp-actions">
              <button type="button" className="text-btn" onClick={() => { setStep(1); setOtp(''); setError(''); }}>
                <ArrowLeft size={14} /> Back
              </button>
              <button type="button" className="text-btn" onClick={handleResendOtp} disabled={sendingOtp}>
                {sendingOtp ? 'Sending...' : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

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
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .logo-icon {
          width: 140px;
          height: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          margin: 0 auto 1.5rem;
        }
        .logo-icon img { width: 100%; height: auto; object-fit: contain; }
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

        /* OTP Step Styles */
        .otp-section {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .otp-icon-frame {
          width: 56px;
          height: 56px;
          background: #f0fdf4;
          border: 1px solid #dcfce7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          color: #10b981;
        }
        .otp-input {
          width: 100%;
          padding: 1rem;
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: 12px;
          text-align: center;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          color: #0f172a;
          font-family: monospace;
          transition: all 0.2s;
        }
        .otp-input:focus {
          background: white;
          border-color: #0f172a;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05);
          outline: none;
        }
        .otp-input::placeholder {
          color: #cbd5e1;
          letter-spacing: 12px;
        }

        .otp-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
        }
        .text-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.5rem 0;
          transition: color 0.15s;
        }
        .text-btn:hover { color: #0f172a; }
        .text-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
