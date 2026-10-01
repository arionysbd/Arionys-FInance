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
                <div className="input-field">
                  <label>Full Legal Name</label>
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

                <div className="input-field">
                  <label>Position in Company</label>
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

                <div className="input-field full-width">
                  <label>Professional Email</label>
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

                <div className="input-field full-width">
                  <label>Contact Number</label>
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

                <div className="input-field full-width highlight">
                  <label>Confirm Identity (Enter Password to Save Changes)</label>
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
                <div className="input-field full-width">
                  <label>Current Password</label>
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

                <div className="input-field">
                  <label>New Password</label>
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

                <div className="input-field">
                  <label>Confirm New Password</label>
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
        .settings-page { max-width: var(--form-max-width); margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
        .mt-2 { margin-top: 2rem; }
        
        .settings-content { width: 100%; }
        
        .settings-card { background: white; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2.5rem; }
        .card-header { margin-bottom: 2.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1.5rem; }
        .flex-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .card-header h3 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
        .card-header p { color: #64748b; font-size: 0.875rem; font-weight: 500; }

        .reset-btn-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f1f5f9;
          color: #0f172a;
          border: none;
          padding: 0.6rem 1rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .reset-btn-link:hover { background: #e2e8f0; }

        .professional-form { display: flex; flex-direction: column; gap: 2.5rem; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .input-field { display: flex; flex-direction: column; gap: 0.75rem; }
        .input-field.full-width { grid-column: span 2; }
        
        .input-field label { font-size: 0.75rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; padding-left: 2px; }
        .input-control { display: flex; align-items: center; gap: 1rem; }
        .input-control .icon { color: #94a3b8; flex-shrink: 0; }
        .input-control input {
          flex: 1;
          padding: 1rem 1.25rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #0f172a;
          transition: all 0.2s;
        }
        .input-control input:focus { background: white; border-color: #0f172a; box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05); outline: none; }

        .notification-bar { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; border-radius: 4px; font-weight: 700; font-size: 0.875rem; }
        .notification-bar.success { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
        .notification-bar.error { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }

        .form-footer { display: flex; justify-content: flex-end; border-top: 1px solid #f1f5f9; padding-top: 2rem; }
        .prime-save-btn {
          background: #0f172a;
          color: white;
          border: none;
          padding: 1rem 2.5rem;
          border-radius: 4px;
          font-weight: 800;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .prime-save-btn:hover:not(:disabled) { background: #1e293b; transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .prime-save-btn.secondary { background: #334155; }
        .prime-save-btn.secondary:hover { background: #1e293b; }
        .prime-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-loader { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .settings-page { max-width: 100%; }
          .form-grid { grid-template-columns: 1fr; }
          .input-field.full-width { grid-column: span 1; }
          .prime-save-btn { width: 100%; justify-content: center; }
          .flex-header { flex-direction: column; gap: 1rem; }
          .reset-btn-link { width: 100%; justify-content: center; }
        }
        
        .highlight {
          padding: 1.5rem;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: var(--radius);
          margin-top: 0.5rem;
        }
        .highlight label { color: #0f172a; font-weight: 900; }
        .highlight .input-control input { background: white; border-color: #cbd5e1; }

        .visibility-toggle {
          background: transparent;
          border: none;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-left: -3rem;
          z-index: 10;
        }
        .visibility-toggle:hover { color: #0f172a; }
      `}</style>
    </DashboardLayout>
  );
}
