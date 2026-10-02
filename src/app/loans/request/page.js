'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { getMyLoanRequests, requestLoan, refreshPendingCount } from '@/lib/api';
import { HandCoins, Loader2, CheckCircle2, AlertCircle, ArrowRight, Inbox } from 'lucide-react';

const STATUS_META = {
  pending_approval: { label: 'Pending', className: 'st-pending' },
  approved: { label: 'Approved', className: 'st-approved' },
  active: { label: 'Active', className: 'st-active' },
  partially_repaid: { label: 'Active', className: 'st-active' },
  overdue: { label: 'Overdue', className: 'st-rejected' },
  completed: { label: 'Completed', className: 'st-muted' },
  rejected: { label: 'Rejected', className: 'st-rejected' },
  cancelled: { label: 'Cancelled', className: 'st-muted' },
};

const today = () => new Date().toISOString().split('T')[0];
const emptyForm = () => ({ amount: '', startDate: today(), endDate: '', notes: '' });

const formatMoney = (amount, currency = 'BDT') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function RequestLoanPage() {
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadRequests = useCallback(() => (
    getMyLoanRequests()
      .then(res => {
        if (res.success) {
          setProfile(res.data.employee);
          setRequests(res.data.loans);
        }
      })
      .catch(err => console.error('Error loading loan requests:', err))
      .finally(() => setLoadingList(false))
  ), []);

  useEffect(() => {
    if (!authLoading && user) loadRequests();
  }, [authLoading, user, loadRequests]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const res = await requestLoan(form);
      if (res.success) {
        setSuccess('Your loan request was submitted and is waiting for approval.');
        setForm(emptyForm());
        refreshPendingCount();
        loadRequests();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending_approval').length;
  // Money currently owed on loans that have been paid out
  const outstanding = requests
    .filter(r => ['active', 'partially_repaid', 'overdue'].includes(r.status))
    .reduce((sum, r) => sum + (r.outstandingAmount || 0), 0);

  return (
    <DashboardLayout>
      <div className="request-page animate-fade-in">
        <div className="page-intro">
          <div className="intro-icon"><HandCoins size={22} /></div>
          <div>
            <h2>Request a Loan</h2>
            <p>Submit a loan request for yourself. An approver will review it before any money is paid out.</p>
          </div>
        </div>

        <div className="request-grid">
          {/* Request form */}
          <form className="card request-card" onSubmit={handleSubmit}>
            <h3 className="section-title">New Request</h3>

            <div className="requester">
              <span className="requester-label">Requesting as</span>
              <span className="requester-name">{profile?.fullName || user?.name}</span>
              <span className="requester-email">{profile?.email || user?.email}</span>
              <div className="limit-strip">
                <div>
                  <span className="limit-label">Loan limit</span>
                  <span className="limit-value">{profile?.loanLimit > 0 ? formatMoney(profile.loanLimit) : 'Not set'}</span>
                </div>
                <div>
                  <span className="limit-label">Outstanding</span>
                  <span className="limit-value">{formatMoney(outstanding)}</span>
                </div>
                <div>
                  <span className="limit-label">Available</span>
                  <span className={`limit-value ${profile?.loanLimit > 0 ? 'accent' : ''}`}>
                    {profile?.loanLimit > 0 ? formatMoney(Math.max(profile.loanLimit - outstanding, 0)) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {error && <div className="notice notice-error"><AlertCircle size={16} /> <span>{error}</span></div>}
            {success && <div className="notice notice-success"><CheckCircle2 size={16} /> <span>{success}</span></div>}

            <div className="field">
              <label htmlFor="amount">Loan Amount *</label>
              <input id="amount" type="number" step="0.01" min="1" name="amount" className="input-field" placeholder="e.g. 20000" required value={form.amount} onChange={handleChange} />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="startDate">Start Date *</label>
                <input id="startDate" type="date" name="startDate" className="input-field" required value={form.startDate} onChange={handleChange} />
              </div>
              <div className="field">
                <label htmlFor="endDate">Repay By *</label>
                <input id="endDate" type="date" name="endDate" className="input-field" required min={form.startDate} value={form.endDate} onChange={handleChange} />
              </div>
            </div>

            <div className="field">
              <label htmlFor="notes">Reason *</label>
              <textarea id="notes" name="notes" rows="4" className="input-field" placeholder="Why do you need this loan?" required value={form.notes} onChange={handleChange} />
            </div>

            <button type="submit" className="btn btn-primary submit-btn" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={18} className="spin" /> : <HandCoins size={18} />}
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>

          {/* Own requests */}
          <section className="card history-card">
            <div className="history-head">
              <h3 className="section-title">My Requests</h3>
              {pendingCount > 0 && <span className="pending-pill">{pendingCount} pending</span>}
            </div>

            {loadingList ? (
              <div className="history-empty"><Loader2 size={22} className="spin" /></div>
            ) : requests.length === 0 ? (
              <div className="history-empty">
                <Inbox size={28} />
                <p>You have not requested any loans yet.</p>
              </div>
            ) : (
              <ul className="history-list">
                {requests.map(loan => {
                  const meta = STATUS_META[loan.status] || { label: loan.status, className: 'st-muted' };
                  return (
                    <li key={loan._id}>
                      <Link href={`/loans/${loan._id}`} className="history-item">
                        <div className="hi-main">
                          <span className="hi-amount">{formatMoney(loan.amount, loan.currency)}</span>
                          <span className="hi-meta">
                            {formatDate(loan.createdAt)} · Repay by {formatDate(loan.endDate)}
                          </span>
                          {loan.notes && <span className="hi-notes">{loan.notes}</span>}
                        </div>
                        <div className="hi-side">
                          <span className={`status-pill ${meta.className}`}>{meta.label}</span>
                          <ArrowRight size={14} className="hi-arrow" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <style jsx>{`
        .request-page { max-width: var(--page-max-width); margin: 0 auto; }

        .page-intro { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .intro-icon { flex-shrink: 0; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 8px; background: #eef2ff; color: #4f46e5; }
        .page-intro h2 { margin: 0 0 0.125rem; font-size: 1.25rem; font-weight: 800; color: #0f172a; }
        .page-intro p { margin: 0; font-size: 0.875rem; color: #64748b; }

        .request-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1.5rem; align-items: start; }

        .request-card, .history-card { padding: 1.5rem; }
        .section-title { margin: 0 0 1.25rem; font-size: 1rem; font-weight: 800; color: #0f172a; }

        .requester { display: flex; flex-direction: column; gap: 0.125rem; margin-bottom: 1.25rem; padding: 0.875rem 1rem; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; }
        .requester-label { font-size: 0.6875rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        .requester-name { font-size: 0.9375rem; font-weight: 700; color: #0f172a; }
        .requester-email { font-size: 0.8125rem; color: #64748b; }
        .limit-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; }
        .limit-strip > div { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
        .limit-label { font-size: 0.6875rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        .limit-value { font-size: 0.9375rem; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .limit-value.accent { color: #4338ca; }

        .notice { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 1.25rem; padding: 0.75rem 1rem; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; }
        .notice-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
        .notice-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }

        .field { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 1.125rem; min-width: 0; }
        .field label { font-size: 0.8125rem; font-weight: 600; color: #334155; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .field textarea { resize: vertical; line-height: 1.5; }

        .submit-btn { width: 100%; justify-content: center; margin-top: 0.25rem; }

        .history-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
        .history-head .section-title { margin: 0; }
        .pending-pill { padding: 0.125rem 0.5rem; border-radius: 4px; background: #fef3c7; color: #92400e; font-size: 0.75rem; font-weight: 700; }

        .history-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2.5rem 1rem; border: 1px dashed #cbd5e1; border-radius: 6px; background: #f8fafc; color: #94a3b8; text-align: center; }
        .history-empty p { margin: 0; font-size: 0.875rem; color: #64748b; }

        .history-list { list-style: none; margin: 0; padding: 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
        .history-list li + li { border-top: 1px solid #f1f5f9; }
        .history-list :global(.history-item) { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.875rem 1rem; color: inherit; text-decoration: none; transition: background 0.15s; }
        .history-list :global(.history-item:hover) { background: #f8fafc; }
        .hi-main { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
        .hi-amount { font-size: 0.9375rem; font-weight: 800; color: #0f172a; }
        .hi-meta { font-size: 0.75rem; color: #64748b; }
        .hi-notes { font-size: 0.8125rem; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hi-side { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
        .hi-side :global(.hi-arrow) { color: #cbd5e1; }

        .status-pill { padding: 0.125rem 0.5rem; border-radius: 4px; font-size: 0.6875rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
        .st-pending { background: #fef3c7; color: #92400e; }
        .st-approved { background: #e0e7ff; color: #3730a3; }
        .st-active { background: #dcfce7; color: #166534; }
        .st-rejected { background: #fee2e2; color: #991b1b; }
        .st-muted { background: #f1f5f9; color: #64748b; }

        .request-page :global(.spin) { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 960px) {
          .request-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .field-row { grid-template-columns: 1fr; gap: 0; }
          .request-card, .history-card { padding: 1.25rem; }
        }
      `}</style>
    </DashboardLayout>
  );
}
