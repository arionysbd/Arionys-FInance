'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import {
  Building2, User, Mail, Lock, Phone, Briefcase,
  Eye, EyeOff, CheckCircle, AlertCircle, Shield,
  ArrowRight, Clock, ShieldCheck
} from 'lucide-react';

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const { login } = useAuth();

  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | valid | invalid | expired | used | success
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '', phone: '', position: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) return;
    axios.get(`/api/invite/${token}`)
      .then(({ data }) => {
        setInvite(data.data);
        setStatus('valid');
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Invalid invitation.';
        const code = err.response?.status;
        if (code === 410) setStatus('expired');
        else if (code === 409) setStatus('used');
        else setStatus('invalid');
        setErrorMsg(msg);
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) { setFormError('Full name is required.'); return; }
    if (form.password.length < 8) { setFormError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirmPassword) { setFormError('Passwords do not match.'); return; }

    setSubmitting(true);
    try {
      const { data } = await axios.post(`/api/invite/${token}`, {
        name: form.name,
        password: form.password,
        phone: form.phone,
        position: form.position,
      });

      if (data.success) {
        // Log the user in via AuthContext
        login(data.data);
        setStatus('success');
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabelMap = {
    admin: 'Administrator', ceo: 'Chief Executive Officer',
    cfo: 'Chief Financial Officer', csuit: 'Board Member', accountant: 'Accounts Manager',
  };
  const roleColors = {
    admin: '#6366f1', ceo: '#0ea5e9', cfo: '#10b981', csuit: '#f59e0b', accountant: '#8b5cf6',
  };

  const passwordStrength = (p) => {
    if (p.length === 0) return null;
    if (p.length < 6) return { label: 'Weak', color: '#ef4444', width: '25%' };
    if (p.length < 8) return { label: 'Fair', color: '#f59e0b', width: '50%' };
    if (p.length < 12 || !/\d/.test(p)) return { label: 'Good', color: '#10b981', width: '75%' };
    return { label: 'Strong', color: '#6366f1', width: '100%' };
  };
  const strength = passwordStrength(form.password);

  return (
    <div className="invite-root">
      <div className="invite-bg-glow" />
      <div className="invite-center">

        {/* Header bar */}
        <div className="invite-brand">
          <img
            src="https://files.edgestore.dev/58ak0uq249vmf7cf/publicFiles/_public/303ae74c-97f0-41f5-be5a-45a951af0d72.png"
            alt="Arionys"
            className="brand-logo"
          />
          <span className="brand-name">Arionys Finance</span>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div className="invite-card">
            <div className="state-icon spin"><Shield size={32} /></div>
            <h2>Validating invitation…</h2>
            <p className="state-sub">Please wait while we verify your link.</p>
          </div>
        )}

        {/* Error states */}
        {(status === 'invalid' || status === 'expired' || status === 'used') && (
          <div className="invite-card">
            <div className="state-icon error-icon"><AlertCircle size={32} /></div>
            <h2>{status === 'expired' ? 'Invitation Expired' : status === 'used' ? 'Already Used' : 'Invalid Link'}</h2>
            <p className="state-sub">{errorMsg}</p>
            {status === 'expired' && (
              <p className="state-hint">Ask your administrator to send a new invitation.</p>
            )}
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="invite-card">
            <div className="state-icon success-icon"><CheckCircle size={32} /></div>
            <h2>Account Created!</h2>
            <p className="state-sub">Welcome aboard. Redirecting you to the dashboard…</p>
          </div>
        )}

        {/* Registration form */}
        {status === 'valid' && invite && (
          <div className="invite-card form-card">
            {/* Role banner */}
            <div className="role-banner" style={{ borderColor: roleColors[invite.role] || '#6366f1' }}>
              <div className="role-dot" style={{ background: roleColors[invite.role] || '#6366f1' }} />
              <div>
                <span className="role-company">{invite.companyName}</span>
                <span className="role-title">{invite.roleLabel}</span>
              </div>
              <div className="expire-badge">
                <Clock size={11} />
                <span>Expires {new Date(invite.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </div>
            </div>

            <div className="form-header">
              <h1>Create Your Account</h1>
              <p>
                You've been invited to join <strong>{invite.companyName}</strong> as{' '}
                <strong style={{ color: roleColors[invite.role] }}>{invite.roleLabel}</strong>.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="reg-form">
              {/* Pre-filled email (read-only) */}
              <div className="field-group">
                <label>Email Address</label>
                <div className="input-wrap locked">
                  <Mail size={16} className="input-icon" />
                  <input type="email" value={invite.email} readOnly />
                  <span className="locked-badge">Pre-assigned</span>
                </div>
              </div>

              {/* Full name */}
              <div className="field-group">
                <label>Full Name <span className="req">*</span></label>
                <div className="input-wrap">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Two-column: phone + position */}
              <div className="two-col">
                <div className="field-group">
                  <label>Phone <span className="opt">(optional)</span></label>
                  <div className="input-wrap">
                    <Phone size={16} className="input-icon" />
                    <input
                      type="tel"
                      placeholder="+880 1700 000000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field-group">
                  <label>Job Title <span className="opt">(optional)</span></label>
                  <div className="input-wrap">
                    <Briefcase size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="e.g. Senior Analyst"
                      value={form.position}
                      onChange={(e) => setForm({ ...form, position: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="field-group">
                <label>Password <span className="req">*</span></label>
                <div className="input-wrap">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {strength && (
                  <div className="strength-bar-wrap">
                    <div className="strength-bar">
                      <div className="strength-fill" style={{ width: strength.width, background: strength.color }} />
                    </div>
                    <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="field-group">
                <label>Confirm Password <span className="req">*</span></label>
                <div className="input-wrap">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="match-warn">Passwords do not match</p>
                )}
                {form.confirmPassword && form.password === form.confirmPassword && form.password.length >= 8 && (
                  <p className="match-ok"><CheckCircle size={12} /> Passwords match</p>
                )}
              </div>

              {formError && (
                <div className="form-error">
                  <AlertCircle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <button type="submit" className="btn-create" disabled={submitting}>
                {submitting ? (
                  <><span className="spinner" />Creating Account…</>
                ) : (
                  <><ShieldCheck size={16} />Create Account &amp; Join {invite.companyName} <ArrowRight size={15} /></>
                )}
              </button>

              <p className="secure-note">
                <Shield size={11} /> Your account will be secured with end-to-end encryption.
              </p>
            </form>
          </div>
        )}

      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f1f5f9; }
      `}</style>

      <style jsx>{`
        .invite-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          background-image: 
            radial-gradient(at 0% 0%, hsla(253,16%,7%,0.03) 0, transparent 50%), 
            radial-gradient(at 50% 0%, hsla(225,39%,30%,0.03) 0, transparent 50%), 
            radial-gradient(at 100% 0%, hsla(339,49%,30%,0.03) 0, transparent 50%);
          padding: 2rem 1rem;
          position: relative;
          overflow: hidden;
        }
        .invite-bg-glow {
          position: absolute;
          top: -150px;
          right: -150px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .invite-center {
          width: 100%;
          max-width: 540px;
          position: relative;
          z-index: 1;
        }
        .invite-brand {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          justify-content: center;
          margin-bottom: 2.5rem;
        }
        .brand-logo { width: 36px; height: 36px; border-radius: 10px; object-fit: cover; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .brand-name { font-size: 1.125rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }

        /* Card */
        .invite-card {
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02);
          text-align: center;
          padding: 3rem 2rem;
        }
        .form-card { text-align: left; padding: 0; }

        /* State screens */
        .state-icon {
          width: 72px; height: 72px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%;
          margin: 0 auto 1.5rem;
          background: #f1f5f9;
          color: #94a3b8;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-icon { background: #fef2f2; color: #ef4444; }
        .success-icon { background: #ecfdf5; color: #10b981; }
        .invite-card h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; letter-spacing: -0.02em; }
        .state-sub { font-size: 0.95rem; color: #64748b; line-height: 1.6; margin-bottom: 0.5rem; }
        .state-hint { font-size: 0.85rem; color: #94a3b8; }

        /* Role banner */
        .role-banner {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 1.25rem 2rem;
          background: linear-gradient(to right, #f8fafc, #ffffff);
          border-bottom: 1px solid #f1f5f9;
          border-left: 4px solid #6366f1;
        }
        .role-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        .role-company { display: block; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 2px; }
        .role-title { display: block; font-size: 1rem; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
        .expire-badge {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          background: #f1f5f9;
          padding: 0.4rem 0.75rem;
          border-radius: 20px;
          flex-shrink: 0;
        }

        /* Form header */
        .form-header { padding: 2rem 2.5rem 0; }
        .form-header h1 { font-size: 1.75rem; font-weight: 900; color: #0f172a; margin-bottom: 0.5rem; letter-spacing: -0.03em; }
        .form-header p { font-size: 0.95rem; color: #64748b; line-height: 1.6; }

        /* Form body */
        .reg-form { padding: 1.75rem 2.5rem 2.5rem; }
        .field-group { margin-bottom: 1.25rem; }
        .field-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          color: #334155;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .req { color: #ef4444; }
        .opt { font-weight: 600; color: #94a3b8; text-transform: none; letter-spacing: 0; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 440px) { .two-col { grid-template-columns: 1fr; } }

        /* Inputs */
        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-left: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
          transition: all 0.2s ease;
          overflow: hidden;
        }
        .input-wrap:focus-within {
          border-color: #6366f1;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.1);
        }
        .input-wrap.locked { background: #f1f5f9; border-color: #e2e8f0; opacity: 0.8; }
        .input-icon { color: #94a3b8; flex-shrink: 0; display: block; }
        .input-wrap input {
          flex: 1;
          border: none;
          outline: none;
          padding: 0.85rem 0.75rem 0.85rem 0;
          font-size: 0.9rem;
          font-weight: 500;
          color: #0f172a;
          background: transparent;
          min-width: 0;
        }
        .input-wrap input::placeholder { color: #94a3b8; font-weight: 400; }
        .input-wrap input[readonly] { color: #64748b; cursor: not-allowed; }
        .locked-badge {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          background: #e2e8f0;
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
          margin-right: 0.5rem;
          flex-shrink: 0;
        }
        .eye-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 0 0.75rem;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          transition: color 0.2s;
        }
        .eye-btn:hover { color: #475569; }

        /* Password strength */
        .strength-bar-wrap { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.6rem; }
        .strength-bar { flex: 1; height: 4px; background: #f1f5f9; border-radius: 2px; overflow: hidden; }
        .strength-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease, background 0.3s ease; }
        .strength-label { font-size: 0.7rem; font-weight: 800; white-space: nowrap; }

        /* Match indicators */
        .match-warn { margin-top: 0.4rem; font-size: 0.75rem; font-weight: 700; color: #ef4444; }
        .match-ok { margin-top: 0.4rem; font-size: 0.75rem; font-weight: 700; color: #10b981; display: flex; align-items: center; gap: 0.3rem; }

        /* Form error */
        .form-error {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.85rem 1rem;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #ef4444;
          margin-bottom: 1.25rem;
        }

        /* Submit button */
        .btn-create {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 1.25rem;
          box-shadow: 0 4px 12px rgba(15,23,42,0.15);
        }
        .btn-create:hover:not(:disabled) { 
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(15,23,42,0.25); 
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        }
        .btn-create:active:not(:disabled) {
          transform: translateY(1px);
        }
        .btn-create:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .secure-note {
          text-align: center;
          font-size: 0.75rem;
          font-weight: 500;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
        }
      `}</style>
    </div>
  );
}
