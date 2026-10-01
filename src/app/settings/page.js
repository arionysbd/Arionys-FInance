'use client';
import { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Briefcase,
  Key,
  Lock,
  RefreshCw,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  
  // Profile Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    password: ''
  });
  
  // Password Form State
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  const [status, setStatus] = useState({ type: '', message: '' });
  const [passStatus, setPassStatus] = useState({ type: '', message: '' });

  // Visibility States
  const [showIdentityPass, setShowIdentityPass] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        position: user.position || ''
      }));
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const { data } = await axios.put('/api/users/profile', {
        userId: user._id,
        ...formData
      });

      if (data.success) {
        updateUser(data.user);
        setFormData(prev => ({ ...prev, password: '' }));
        setStatus({ type: 'success', message: 'Profile updated successfully!' });
        setTimeout(() => setStatus({ type: '', message: '' }), 5000);
      }
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to update profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setPassStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }

    setPassLoading(true);
    setPassStatus({ type: '', message: '' });

    try {
      const { data } = await axios.put('/api/users/profile/password', {
        userId: user._id,
        currentPassword: passwords.current,
        newPassword: passwords.new
      });

      if (data.success) {
        setPassStatus({ type: 'success', message: 'Password updated successfully!' });
        setPasswords({ current: '', new: '', confirm: '' });
        setTimeout(() => setPassStatus({ type: '', message: '' }), 5000);
      }
    } catch (err) {
      setPassStatus({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to update password' 
      });
    } finally {
      setPassLoading(false);
    }
  };

  const handleResetRequest = async () => {
    if (!confirm('Send a password reset link to your email?')) return;
    
    setResetLoading(true);
    try {
      const { data } = await axios.post('/api/users/profile/reset-request', {
        userId: user._id
      });
      if (data.success) {
        alert('Reset email sent to ' + user.email);
      }
    } catch (err) {
      alert('Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="settings-page animate-fade-in">
        
        <div className="settings-content">
          {/* Personal Info Card */}
          <div className="settings-card shadow-premium">
            <div className="card-header">
              <h3>Personal Information</h3>
              <p>Update your public profile and professional details.</p>
            </div>
            
            <form onSubmit={handleProfileSubmit} className="professional-form">
              <div className="form-grid">
                <div className="form-field">
                  <label>Full name</label>
                  <div className="input-control">
                    <UserIcon size={18} className="icon" />
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Nadim Shahriar"
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Position</label>
                  <div className="input-control">
                    <Briefcase size={18} className="icon" />
                    <input 
                      type="text" 
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                      placeholder="e.g. Senior Financial Manager"
                    />
                  </div>
                </div>

                <div className="form-field full-width">
                  <label>Email address</label>
                  <div className="input-control">
                    <Mail size={18} className="icon" />
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="work@arionys.com"
                      required
                    />
                  </div>
                </div>

                <div className="form-field full-width">
                  <label>Phone number</label>
                  <div className="input-control">
                    <Phone size={18} className="icon" />
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+880 1XXX XXXXXX"
                    />
                  </div>
                </div>

                <div className="form-field full-width highlight">
                  <label>Current password</label>
                  <p className="field-hint">Required to save changes to your profile.</p>
                  <div className="input-control">
                    <Lock size={18} className="icon" />
                    <input 
                      type={showIdentityPass ? "text" : "password"} 
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Enter your current password"
                      required
                    />
                    <button 
                      type="button" 
                      className="visibility-toggle" 
                      onClick={() => setShowIdentityPass(!showIdentityPass)}
                      title={showIdentityPass ? "Hide password" : "Show password"}
                    >
                      {showIdentityPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {status.message && (
                <div className={`notification-bar ${status.type}`}>
                  {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <span>{status.message}</span>
                </div>
              )}

              <div className="form-footer">
                <button type="submit" className="prime-save-btn" disabled={loading}>
                  {loading ? <div className="btn-loader"></div> : <><Save size={18} /><span>Update Profile</span></>}
                </button>
              </div>
            </form>
          </div>

          {/* Security Card */}
          <div className="settings-card shadow-premium mt-2">
            <div className="card-header">
              <div className="flex-header">
                <div className="text">
                  <h3>Security & Authentication</h3>
                  <p>Manage your password and account security settings.</p>
                </div>
                <button 
                  type="button" 
                  onClick={handleResetRequest} 
                  className="reset-btn-link"
                  disabled={resetLoading}
                >
                  {resetLoading ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
                  Reset via Email
                </button>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="professional-form">
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Current password</label>
                  <div className="input-control">
                    <Key size={18} className="icon" />
                    <input 
                      type={showCurrentPass ? "text" : "password"} 
                      value={passwords.current}
                      onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                      placeholder="Enter current password"
                      required
                    />
                    <button 
                      type="button" 
                      className="visibility-toggle" 
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      title={showCurrentPass ? "Hide password" : "Show password"}
                    >
                      {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <label>New password</label>
                  <div className="input-control">
                    <Lock size={18} className="icon" />
                    <input 
                      type={showNewPass ? "text" : "password"} 
                      value={passwords.new}
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                      placeholder="Min. 8 characters"
                      required
                    />
                    <button 
                      type="button" 
                      className="visibility-toggle" 
                      onClick={() => setShowNewPass(!showNewPass)}
                      title={showNewPass ? "Hide password" : "Show password"}
                    >
                      {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <label>Confirm new password</label>
                  <div className="input-control">
                    <Lock size={18} className="icon" />
                    <input 
                      type={showConfirmPass ? "text" : "password"} 
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                      placeholder="Repeat new password"
                      required
                    />
                    <button 
                      type="button" 
                      className="visibility-toggle" 
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      title={showConfirmPass ? "Hide password" : "Show password"}
                    >
                      {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {passStatus.message && (
                <div className={`notification-bar ${passStatus.type}`}>
                  {passStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <span>{passStatus.message}</span>
                </div>
              )}

              <div className="form-footer">
                <button type="submit" className="prime-save-btn secondary" disabled={passLoading}>
                  {passLoading ? <div className="btn-loader"></div> : <><RefreshCw size={18} /><span>Change Password</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-page { max-width: var(--form-max-width); margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
        .mt-2 { margin-top: 1.5rem; }
        .settings-content { width: 100%; }
        .settings-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.75rem 2rem; }
        .card-header { margin-bottom: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid #f1f5f9; }
        .flex-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        .card-header h3 { margin: 0 0 0.25rem; font-size: 1.0625rem; font-weight: 800; color: #0f172a; }
        .card-header p { margin: 0; color: #64748b; font-size: 0.8125rem; }
        .reset-btn-link { flex-shrink: 0; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.875rem; background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 6px; font-family: inherit; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: background 0.15s, border-color 0.15s; white-space: nowrap; }
        .reset-btn-link:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
        .reset-btn-link :global(.spin) { animation: spin 0.8s linear infinite; }

        .professional-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem 1.5rem; }
        .form-field { display: flex; flex-direction: column; gap: 0.375rem; min-width: 0; }
        .form-field.full-width { grid-column: 1 / -1; }
        .form-field label { font-size: 0.8125rem; font-weight: 600; color: #334155; }
        .field-hint { margin: -0.125rem 0 0.25rem; font-size: 0.75rem; color: #64748b; }

        /* Icon and show/hide button sit inside the input */
        .input-control { position: relative; display: flex; align-items: center; min-width: 0; }
        .input-control :global(.icon) { position: absolute; left: 0.875rem; color: #94a3b8; pointer-events: none; }
        .input-control:focus-within :global(.icon) { color: #4f46e5; }
        .input-control input {
          width: 100%;
          min-width: 0;
          padding: 0.6875rem 0.875rem 0.6875rem 2.625rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 500;
          color: #0f172a;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-control input:has(+ .visibility-toggle) { padding-right: 2.75rem; }
        .input-control input::placeholder { color: #94a3b8; }
        .input-control input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
        .visibility-toggle { position: absolute; right: 0.375rem; width: 32px; height: 32px; display: grid; place-items: center; padding: 0; border: none; border-radius: 4px; background: transparent; color: #94a3b8; cursor: pointer; }
        .visibility-toggle:hover { color: #0f172a; background: #f1f5f9; }

        .highlight { padding: 1rem 1.125rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }

        .notification-bar { display: flex; align-items: center; gap: 0.625rem; padding: 0.75rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.8125rem; }
        .notification-bar.success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .notification-bar.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

        .form-footer { display: flex; justify-content: flex-end; padding-top: 1.25rem; border-top: 1px solid #f1f5f9; }
        .prime-save-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.6875rem 1.5rem; background: #0f172a; color: #ffffff; border: none; border-radius: 6px; font-family: inherit; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: background 0.15s; }
        .prime-save-btn:hover:not(:disabled) { background: #1e293b; }
        .prime-save-btn.secondary { background: #4f46e5; }
        .prime-save-btn.secondary:hover:not(:disabled) { background: #4338ca; }
        .prime-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-loader { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #ffffff; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .settings-page { max-width: 100%; }
          .settings-card { padding: 1.25rem; }
          .form-grid { grid-template-columns: 1fr; gap: 1rem; }
          .flex-header { flex-direction: column; }
          .reset-btn-link { width: 100%; justify-content: center; }
          .form-footer { padding-top: 1rem; }
          .prime-save-btn { width: 100%; }
        }
      `}</style>
    </DashboardLayout>
  );
}
