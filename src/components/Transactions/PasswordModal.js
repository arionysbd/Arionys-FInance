'use client';
import { useState } from 'react';
import { X, Lock, ShieldCheck } from 'lucide-react';

export default function PasswordModal({ isOpen, onClose, onConfirm, founders, title = "Confirm Password" }) {
  const [selectedFounder, setSelectedFounder] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFounder || !password) {
      setError('Please select a founder and enter password');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await onConfirm(selectedFounder, password);
      setPassword('');
      setSelectedFounder('');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content glass card">
        <div className="modal-header">
          <div className="title-area">
            <ShieldCheck className="shield-icon" />
            <h3>{title}</h3>
          </div>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        
        <p className="modal-description">
          Every financial transaction requires verification from a co-founder.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Co-Founder</label>
            <select 
              className="input-field"
              value={selectedFounder}
              onChange={(e) => setSelectedFounder(e.target.value)}
              disabled={loading}
            >
              <option value="">Select Founder</option>
              {founders.map(f => (
                <option key={f.founderId} value={f.founderId}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-input">
              <Lock className="lock-icon" size={16} />
              <input 
                type="password" 
                className="input-field" 
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Authorize Transaction'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          width: 100%;
          max-width: 450px;
          padding: 2rem;
          border: 1px solid var(--border);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .title-area { display: flex; align-items: center; gap: 0.75rem; }
        .shield-icon { color: var(--primary); }
        .close-btn { background: none; border: none; color: var(--muted-foreground); cursor: pointer; }
        .modal-description { color: var(--muted-foreground); font-size: 0.875rem; margin-bottom: 1.5rem; }
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: var(--muted-foreground); }
        .password-input { position: relative; }
        .lock-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted-foreground); }
        .password-input input { padding-left: 2.5rem; }
        .error-msg { color: var(--destructive); font-size: 0.875rem; margin-bottom: 1rem; text-align: center; }
        .modal-footer { display: flex; gap: 1rem; margin-top: 2rem; }
        .modal-footer button { flex: 1; }
      `}</style>
    </div>
  );
}
