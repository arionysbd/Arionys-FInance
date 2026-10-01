'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getTransactions, approveTransaction, getLoans, approveLoan } from '@/lib/api';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { CheckCircle, XCircle, Loader2, ArrowUpRight, TrendingDown, Wallet, ArrowRightLeft, Banknote } from 'lucide-react';
import Link from 'next/link';

const TYPE_META = {
  revenue: { icon: ArrowUpRight, label: 'Revenue' },
  expense: { icon: TrendingDown, label: 'Expense' },
  investment: { icon: Wallet, label: 'Investment' },
  transfer: { icon: ArrowRightLeft, label: 'Transfer' },
  loan: { icon: Banknote, label: 'Loan Request' },
};

export default function PendingApprovalsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, transactionId: null, status: null, kind: 'transaction' });

  const fetchPending = async () => {
    try {
      const [txRes, loanRes] = await Promise.all([
        getTransactions({ status: 'pending', companyId: user.companyId }),
        getLoans({ status: 'pending_approval' }),
      ]);
      setTransactions(txRes.data);
      setLoans(loanRes.success ? loanRes.data : []);
    } catch (err) {
      console.error('Error fetching pending transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.companyId) {
      fetchPending();
    }
  }, [user]);

  const initiateAction = (transactionId, status, kind = 'transaction') => {
    setConfirmDialog({ isOpen: true, transactionId, status, kind });
  };

  const handleAction = async () => {
    const { transactionId, status, kind } = confirmDialog;
    setConfirmDialog({ isOpen: false, transactionId: null, status: null, kind: 'transaction' });
    
    setProcessingId(transactionId);
    try {
      if (kind === 'loan') {
        await approveLoan(transactionId, status);
      } else {
        await approveTransaction({
          transactionId,
          status,
          userId: user._id
        });
      }
      await fetchPending();
    } catch (err) {
      console.error(`Error ${status} ${kind}:`, err);
      alert(err.response?.data?.message || `Failed to ${status === 'approved' ? 'approve' : 'reject'} ${kind}. You may not have permission.`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="pending-layout">
          <div className="pending-header">
            <div>
              <div className="skeleton skeleton-title"></div>
              <div className="skeleton skeleton-subtitle"></div>
            </div>
            <div className="skeleton skeleton-badge"></div>
          </div>
          
          <div className="tx-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="tx-card">
                <div className="tx-card-top">
                  <div className="skeleton skeleton-pill"></div>
                  <div className="skeleton skeleton-amount"></div>
                </div>
                <div className="skeleton skeleton-line long"></div>
                <div className="skeleton skeleton-line"></div>
                <div className="tx-card-meta">
                  <div className="skeleton skeleton-chip"></div>
                  <div className="skeleton skeleton-chip"></div>
                </div>
                <div className="tx-card-actions">
                  <div className="skeleton skeleton-btn"></div>
                  <div className="skeleton skeleton-btn"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Loans and transactions share one approval queue, newest first
  const rows = [
    ...transactions.map(tx => ({
      kind: 'transaction',
      id: tx._id,
      type: tx.type,
      description: tx.description,
      account: tx.type === 'transfer'
        ? `From: ${tx.account?.bankName || 'N/A'} → To: ${tx.toAccount?.bankName || 'N/A'}`
        : tx.account?.bankName || 'N/A',
      amount: tx.amount,
      date: tx.date,
      creator: tx.createdBy?.name || tx.performedBy || 'System',
      isOwn: false,
    })),
    ...loans.map(loan => ({
      kind: 'loan',
      id: loan._id,
      type: 'loan',
      label: loan.origin === 'request' ? 'Loan Request' : 'New Loan',
      description: `Loan for ${loan.employeeName}${loan.notes ? ` — ${loan.notes}` : ''}`,
      account: loan.paidFromAccount?.bankName || 'Chosen at disbursement',
      amount: loan.amount,
      date: loan.createdAt,
      creator: loan.createdBy?.name || loan.employeeName,
      isOwn: String(loan.createdBy?._id || loan.createdBy) === String(user?._id),
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <DashboardLayout>
      <div className="pending-layout">
        {rows.length === 0 ? (
          <div className="premium-empty-state">
            <div className="empty-icon-container">
              <CheckCircle size={32} className="text-success" />
            </div>
            <h4>All caught up!</h4>
            <p>There are no pending transactions or loan requests waiting for your approval right now.</p>
          </div>
        ) : (
<<<<<<< Updated upstream
          <div className="tx-grid">
            {transactions.map(tx => {
              const meta = TYPE_META[tx.type] || TYPE_META.revenue;
              const TypeIcon = meta.icon;
              return (
              <div key={tx._id} className={`tx-card accent-${tx.type}`}>
                <div className="tx-card-top">
                  <div className={`type-pill-minimal type-${tx.type}`}>
                    <TypeIcon size={13} />
                    <span>{meta.label}</span>
                  </div>
                  <div className={`amount-cell amount-${tx.type}`}>
                    <span className="amount-currency">BDT</span> {tx.amount.toLocaleString()}
                  </div>
                </div>

                <div className="tx-card-body">
                  <h4 className="tx-main-desc">{tx.description}</h4>
                  <p className="tx-account">
                    {tx.type === 'transfer'
                      ? `From: ${tx.account?.bankName || 'N/A'} → To: ${tx.toAccount?.bankName || 'N/A'}`
                      : `Account: ${tx.account?.bankName || 'N/A'}`}
                  </p>
                </div>

                <div className="tx-card-meta">
                  <div className="meta-item">
                    <span className="meta-label">Date</span>
                    <span className="meta-value">{new Date(tx.date).toLocaleDateString()}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Submitted by</span>
                    <span className="creator-badge">{tx.createdBy?.name || tx.performedBy || 'System'}</span>
                  </div>
                </div>

                <div className="tx-card-actions">
                  <button
                    className="btn-action approve"
                    disabled={processingId === tx._id}
                    onClick={() => initiateAction(tx._id, 'approved')}
                  >
                    {processingId === tx._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Approve
                  </button>
                  <button
                    className="btn-action reject"
                    disabled={processingId === tx._id}
                    onClick={() => initiateAction(tx._id, 'rejected')}
                  >
                    {processingId === tx._id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    Reject
                  </button>
                </div>
              </div>
              );
            })}
=======
          <>
          <div className="queue-summary">
            <span className="queue-count">{rows.length}</span>
            <span>{rows.length === 1 ? 'item awaiting your review' : 'items awaiting your review'}</span>
          </div>

          <div className="table-card desktop-view">
            <div className="table-responsive">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Account Info</th>
                    <th>Amount (BDT)</th>
                    <th>Date & User</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const meta = TYPE_META[row.type] || TYPE_META.revenue;
                    const TypeIcon = meta.icon;
                    const busy = processingId === row.id;
                    return (
                      <tr key={`${row.kind}-${row.id}`} className="tx-row">
                        <td data-label="Type">
                          <div className={`type-pill-minimal type-${row.type}`}>
                            <TypeIcon size={13} />
                            <span>{row.label || meta.label}</span>
                          </div>
                        </td>
                        <td data-label="Description">
                          {row.kind === 'loan' ? (
                            <Link href={`/loans/${row.id}`} className="tx-main-desc tx-link">{row.description}</Link>
                          ) : (
                            <span className="tx-main-desc">{row.description}</span>
                          )}
                        </td>
                        <td data-label="Account Info">
                          <span className="tx-account">{row.account}</span>
                        </td>
                        <td data-label="Amount (BDT)">
                          <div className={`amount-cell amount-${row.type}`}>
                            {row.amount.toLocaleString()}
                          </div>
                        </td>
                        <td data-label="Date & User">
                          <div className="meta-stack">
                            <span className="meta-value">{new Date(row.date).toLocaleDateString()}</span>
                            <span className="creator-badge">{row.creator}</span>
                          </div>
                        </td>
                        <td className="action-cell">
                          {row.isOwn ? (
                            <span className="own-request-note">Your request — awaiting another approver</span>
                          ) : (
                            <>
                              <button
                                className="btn-action approve"
                                disabled={busy}
                                onClick={() => initiateAction(row.id, 'approved', row.kind)}
                                title="Approve"
                              >
                                {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Approve
                              </button>
                              <button
                                className="btn-action reject"
                                disabled={busy}
                                onClick={() => initiateAction(row.id, 'rejected', row.kind)}
                                title="Reject"
                              >
                                {busy ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
>>>>>>> Stashed changes
          </div>

          {/* Mobile: dedicated approval cards */}
          <div className="mobile-view approval-list">
            {rows.map(row => {
              const meta = TYPE_META[row.type] || TYPE_META.revenue;
              const TypeIcon = meta.icon;
              const busy = processingId === row.id;
              return (
                <article key={`m-${row.kind}-${row.id}`} className={`approval-card accent-${row.type}`}>
                  <header className="ac-top">
                    <div className={`type-pill-minimal type-${row.type}`}>
                      <TypeIcon size={13} />
                      <span>{row.label || meta.label}</span>
                    </div>
                    <div className={`ac-amount amount-${row.type}`}>
                      <span className="ac-currency">BDT</span>
                      {row.amount.toLocaleString()}
                    </div>
                  </header>

                  <div className="ac-body">
                    {row.kind === 'loan' ? (
                      <Link href={`/loans/${row.id}`} className="ac-title tx-link">{row.description}</Link>
                    ) : (
                      <h3 className="ac-title">{row.description}</h3>
                    )}
                    <p className="ac-account">{row.account}</p>
                  </div>

                  <dl className="ac-meta">
                    <div>
                      <dt>Date</dt>
                      <dd>{new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</dd>
                    </div>
                    <div>
                      <dt>Submitted by</dt>
                      <dd>{row.creator}</dd>
                    </div>
                  </dl>

                  <footer className="ac-actions">
                    {row.isOwn ? (
                      <span className="own-request-note">Your request — awaiting another approver</span>
                    ) : (
                      <>
                        <button
                          className="ac-btn ac-reject"
                          disabled={busy}
                          onClick={() => initiateAction(row.id, 'rejected', row.kind)}
                        >
                          {busy ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                          Reject
                        </button>
                        <button
                          className="ac-btn ac-approve"
                          disabled={busy}
                          onClick={() => initiateAction(row.id, 'approved', row.kind)}
                        >
                          {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          Approve
                        </button>
                      </>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
          </>
        )}
      </div>

      {confirmDialog.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale">
            <h3 className="modal-title">Confirm Action</h3>
            <p className="modal-message">
              Are you sure you want to <strong>{confirmDialog.status === 'approved' ? 'approve' : 'reject'}</strong> this {confirmDialog.kind === 'loan' ? 'loan request' : 'transaction'}?
            </p>
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setConfirmDialog({ isOpen: false, transactionId: null, status: null, kind: 'transaction' })}
              >
                Cancel
              </button>
              <button 
                className={`btn-confirm ${confirmDialog.status}`} 
                onClick={handleAction}
              >
                Yes, {confirmDialog.status === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Skeleton Loading */
        .skeleton {
          background: #e2e8f0;
          border-radius: 4px;
          animation: pulse 1.5s infinite ease-in-out;
        }
        .skeleton-title { width: 220px; height: 28px; margin-bottom: 0.5rem; max-width: 100%; }
        .skeleton-subtitle { width: 380px; height: 16px; max-width: 100%; }
        .skeleton-badge { width: 110px; height: 34px; border-radius: 999px; }
        .skeleton-pill { width: 90px; height: 24px; border-radius: 999px; }
        .skeleton-amount { width: 100px; height: 22px; }
        .skeleton-line { width: 100%; height: 16px; }
        .skeleton-line.long { width: 70%; height: 20px; }
        .skeleton-chip { width: 100px; height: 32px; border-radius: 6px; }
        .skeleton-btn { flex: 1; height: 40px; border-radius: 6px; }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        .pending-layout {
          max-width: var(--page-max-width);
          margin: 0 auto;
        }
        .pending-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          padding: 1.75rem 2rem;
          border-radius: 8px;
          border: 1px solid #e8edf3;
          box-shadow: 0 4px 20px -8px rgba(15, 23, 42, 0.08);
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 1.125rem;
        }
        .header-icon {
          flex-shrink: 0;
          width: 52px;
          height: 52px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          box-shadow: 0 8px 18px -6px rgba(15, 23, 42, 0.45);
        }
        .title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.375rem 0;
          letter-spacing: -0.02em;
        }
        .subtitle {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0;
          line-height: 1.4;
        }
        .stat-badge {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          color: #b45309;
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-weight: 800;
          font-size: 0.8125rem;
          border: 1px solid #fde68a;
          box-shadow: 0 2px 8px -2px rgba(217, 119, 6, 0.2);
          white-space: nowrap;
        }
<<<<<<< Updated upstream
        /* Card grid */
        .tx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.25rem;
        }
        .tx-card {
          position: relative;
          background: #fff;
          border: 1px solid #e8edf3;
          border-radius: 16px;
          padding: 1.5rem;
          padding-top: 1.625rem;
          display: flex;
          flex-direction: column;
          gap: 1.125rem;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
          transition: box-shadow 0.25s, transform 0.25s, border-color 0.25s;
=======
        /* Queue summary */
        .queue-summary { display: flex; align-items: center; gap: 0.625rem; margin-bottom: 1rem; font-size: 0.875rem; font-weight: 600; color: #64748b; }
        .queue-count { min-width: 26px; height: 26px; padding: 0 0.5rem; display: inline-grid; place-items: center; border-radius: 6px; background: #0f172a; color: #ffffff; font-size: 0.8125rem; font-weight: 800; }

        /* Mobile approval cards (hidden on desktop) */
        .mobile-view { display: none; }
        .approval-list { flex-direction: column; gap: 0.875rem; }
        .approval-card { position: relative; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06); overflow: hidden; }
        .approval-card::before { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background: #cbd5e1; }
        .approval-card.accent-expense::before { background: #ef4444; }
        .approval-card.accent-revenue::before { background: #10b981; }
        .approval-card.accent-investment::before { background: #6366f1; }
        .approval-card.accent-transfer::before { background: #a855f7; }
        .approval-card.accent-loan::before { background: #f59e0b; }
        .ac-top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 1rem 1.125rem 0; }
        .ac-amount { display: flex; align-items: baseline; gap: 0.25rem; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
        .ac-currency { font-size: 0.6875rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.04em; }
        .ac-body { padding: 0.75rem 1.125rem 1rem; }
        .approval-card :global(.ac-title) { display: block; margin: 0 0 0.25rem; font-size: 1rem; font-weight: 700; line-height: 1.4; color: #0f172a; word-break: break-word; }
        .ac-account { margin: 0; font-size: 0.8125rem; font-weight: 500; color: #64748b; }
        .ac-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0; padding: 0.875rem 1.125rem; background: #f8fafc; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
        .ac-meta dt { margin-bottom: 0.25rem; font-size: 0.6875rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        .ac-meta dd { margin: 0; font-size: 0.875rem; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ac-actions { display: flex; gap: 0.625rem; padding: 0.875rem 1.125rem 1rem; }
        .ac-btn { flex: 1; height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 6px; font-size: 0.875rem; font-weight: 700; font-family: inherit; cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s; }
        .ac-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ac-reject { background: #ffffff; color: #b91c1c; border: 1px solid #e2e8f0; }
        .ac-reject:hover:not(:disabled) { background: #fef2f2; border-color: #fecaca; }
        .ac-approve { background: #0f172a; color: #ffffff; border: 1px solid #0f172a; }
        .ac-approve:hover:not(:disabled) { background: #1e293b; }

        /* Table styling */
        .table-card {
          background: #fff;
          border: 1px solid #e8edf3;
          border-radius: 8px;
          box-shadow: 0 4px 20px -8px rgba(15, 23, 42, 0.05);
>>>>>>> Stashed changes
          overflow: hidden;
        }
        .tx-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
        }
        .tx-card.accent-revenue::before { background: linear-gradient(90deg, #34d399, #10b981); }
        .tx-card.accent-expense::before { background: linear-gradient(90deg, #fb7185, #ef4444); }
        .tx-card.accent-investment::before { background: linear-gradient(90deg, #818cf8, #6366f1); }
        .tx-card.accent-transfer::before { background: linear-gradient(90deg, #c084fc, #a855f7); }
        .tx-card:hover {
          box-shadow: 0 16px 30px -12px rgba(15, 23, 42, 0.18);
          transform: translateY(-3px);
          border-color: #dbe3ec;
        }
        .tx-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .amount-cell {
          font-weight: 800;
          font-size: 1.25rem;
          color: #0f172a;
          white-space: nowrap;
          letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
        }
        .amount-currency { font-size: 0.75rem; font-weight: 700; color: #94a3b8; }
        .amount-revenue { color: #059669; }
        .amount-expense { color: #dc2626; }
        .amount-investment { color: #4f46e5; }
        .amount-transfer { color: #9333ea; }
<<<<<<< Updated upstream
        .tx-card-body { display: flex; flex-direction: column; gap: 0.375rem; }
        .tx-main-desc {
          font-weight: 700;
          color: #0f172a;
          font-size: 1rem;
          margin: 0;
          word-break: break-word;
        }
        .tx-account { font-size: 0.8125rem; font-weight: 600; color: #64748b; margin: 0; word-break: break-word; }

        .tx-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          padding: 0.875rem 0;
          border-top: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
        }
        .meta-item { display: flex; flex-direction: column; gap: 0.375rem; }
        .meta-item + .meta-item {
          padding-left: 1.5rem;
          border-left: 1px solid #e2e8f0;
        }
        .meta-label {
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 800;
          color: #94a3b8;
        }
        .meta-value { font-size: 0.875rem; font-weight: 600; color: #475569; }
        .creator-badge {
          font-size: 0.875rem;
          font-weight: 700;
          color: #334155;
        }
        .tx-card-actions { display: flex; gap: 0.75rem; }
=======
        .amount-loan { color: #b45309; }
>>>>>>> Stashed changes

        .type-pill-minimal {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.3125rem 0.75rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .type-revenue { background: #dcfce7; color: #166534; }
        .type-expense { background: #fee2e2; color: #991b1b; }
        .type-investment { background: #e0e7ff; color: #3730a3; }
        .type-transfer { background: #f3e8ff; color: #6b21a8; }
        .type-loan { background: #fef3c7; color: #92400e; }
        :global(.tx-link) { text-decoration: none; }
        :global(.tx-link:hover) { color: #4f46e5; text-decoration: underline; }
        .own-request-note { font-size: 0.75rem; font-weight: 600; color: #94a3b8; font-style: italic; }
        
        .btn-action {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
<<<<<<< Updated upstream
          gap: 0.5rem;
          padding: 0.6875rem 0.875rem;
          border-radius: 10px;
          font-size: 0.8125rem;
=======
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
>>>>>>> Stashed changes
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-action:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-action.approve {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 4px 12px -3px rgba(16, 185, 129, 0.5);
        }
        .btn-action.approve:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 18px -4px rgba(16, 185, 129, 0.55); }
        .btn-action.reject {
          background: #fff;
          color: #dc2626;
          border: 1.5px solid #fecaca;
        }
        .btn-action.reject:hover:not(:disabled) { background: #fef2f2; border-color: #f87171; transform: translateY(-2px); }
        
        .premium-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 2rem;
          text-align: center;
          background: #ffffff;
          border-radius: 6px;
          border: 1px dashed #cbd5e1;
        }
        .empty-icon-container {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: #94a3b8;
        }
        .premium-empty-state h4 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 0.5rem 0; }
        .premium-empty-state p { font-size: 0.9375rem; color: #64748b; margin: 0; max-width: 400px; }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 6px;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .animate-scale {
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .modal-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 1rem 0;
        }
        .modal-message {
          color: #475569;
          font-size: 0.9375rem;
          line-height: 1.5;
          margin: 0 0 1.5rem 0;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        .btn-cancel {
          padding: 0.625rem 1rem;
          background: #f1f5f9;
          color: #475569;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-cancel:hover { background: #e2e8f0; }
        .btn-confirm {
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 4px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-confirm.approved { background: #10b981; }
        .btn-confirm.approved:hover { background: #059669; }
        .btn-confirm.rejected { background: #f87171; }
        .btn-confirm.rejected:hover { background: #dc2626; }

        @media (max-width: 640px) {
          .pending-header {
            flex-direction: column;
<<<<<<< Updated upstream
            align-items: flex-start;
            gap: 1rem;
            padding: 1.25rem;
=======
            align-items: center;
            text-align: center;
            gap: 1.5rem;
            padding: 2rem 1.5rem;
            border-radius: 8px;
>>>>>>> Stashed changes
          }
          .tx-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
<<<<<<< Updated upstream
=======
          .header-icon {
            width: 64px;
            height: 64px;
          }
          .title { font-size: 1.35rem; }
          .subtitle { max-width: 280px; }
          
          .desktop-view { display: none; }
          .mobile-view { display: flex; }
>>>>>>> Stashed changes
        }
      `}</style>
    </DashboardLayout>
  );
}
