'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getTransactions, approveTransaction } from '@/lib/api';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { CheckCircle, XCircle, Clock, Loader2, ShieldCheck, ArrowUpRight, TrendingDown, Wallet, ArrowRightLeft } from 'lucide-react';

const TYPE_META = {
  revenue: { icon: ArrowUpRight, label: 'Revenue' },
  expense: { icon: TrendingDown, label: 'Expense' },
  investment: { icon: Wallet, label: 'Investment' },
  transfer: { icon: ArrowRightLeft, label: 'Transfer' },
};

export default function PendingApprovalsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, transactionId: null, status: null });

  const fetchPending = async () => {
    try {
      const { data } = await getTransactions({ status: 'pending', companyId: user.companyId });
      setTransactions(data);
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

  const initiateAction = (transactionId, status) => {
    setConfirmDialog({ isOpen: true, transactionId, status });
  };

  const handleAction = async () => {
    const { transactionId, status } = confirmDialog;
    setConfirmDialog({ isOpen: false, transactionId: null, status: null });
    
    setProcessingId(transactionId);
    try {
      await approveTransaction({
        transactionId,
        status,
        userId: user._id
      });
      await fetchPending();
    } catch (err) {
      console.error(`Error ${status} transaction:`, err);
      alert(`Failed to ${status} transaction. You may not have permission.`);
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
          
          <div className="table-card" style={{ padding: '2rem' }}>
            <div className="skeleton skeleton-line long" style={{ marginBottom: '1.5rem' }}></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <div className="skeleton skeleton-pill"></div>
                <div className="skeleton skeleton-line" style={{ flex: 1 }}></div>
                <div className="skeleton skeleton-amount"></div>
                <div className="skeleton skeleton-btn" style={{ width: '80px', flex: 'none' }}></div>
                <div className="skeleton skeleton-btn" style={{ width: '80px', flex: 'none' }}></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="pending-layout">
        <div className="pending-header">
          <div className="header-left">
            <div className="header-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="title">Pending Approvals</h2>
              <p className="subtitle">Review and authorize financial records waiting for confirmation.</p>
            </div>
          </div>
          <div className="stat-badge">
            <Clock size={16} />
            <span>{transactions.length} Pending</span>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="premium-empty-state">
            <div className="empty-icon-container">
              <CheckCircle size={32} className="text-success" />
            </div>
            <h4>All caught up!</h4>
            <p>There are no pending transactions waiting for your approval right now.</p>
          </div>
        ) : (
          <div className="table-card">
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
                  {transactions.map(tx => {
                    const meta = TYPE_META[tx.type] || TYPE_META.revenue;
                    const TypeIcon = meta.icon;
                    return (
                      <tr key={tx._id} className="tx-row">
                        <td data-label="Type">
                          <div className={`type-pill-minimal type-${tx.type}`}>
                            <TypeIcon size={13} />
                            <span>{meta.label}</span>
                          </div>
                        </td>
                        <td data-label="Description">
                          <span className="tx-main-desc">{tx.description}</span>
                        </td>
                        <td data-label="Account Info">
                          <span className="tx-account">
                            {tx.type === 'transfer'
                              ? `From: ${tx.account?.bankName || 'N/A'} → To: ${tx.toAccount?.bankName || 'N/A'}`
                              : tx.account?.bankName || 'N/A'}
                          </span>
                        </td>
                        <td data-label="Amount (BDT)">
                          <div className={`amount-cell amount-${tx.type}`}>
                            {tx.amount.toLocaleString()}
                          </div>
                        </td>
                        <td data-label="Date & User">
                          <div className="meta-stack">
                            <span className="meta-value">{new Date(tx.date).toLocaleDateString()}</span>
                            <span className="creator-badge">{tx.createdBy?.name || tx.performedBy || 'System'}</span>
                          </div>
                        </td>
                        <td className="action-cell">
                            <button
                              className="btn-action approve"
                              disabled={processingId === tx._id}
                              onClick={() => initiateAction(tx._id, 'approved')}
                              title="Approve"
                            >
                              {processingId === tx._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                              Approve
                            </button>
                            <button
                              className="btn-action reject"
                              disabled={processingId === tx._id}
                              onClick={() => initiateAction(tx._id, 'rejected')}
                              title="Reject"
                            >
                              {processingId === tx._id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                              Reject
                            </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {confirmDialog.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale">
            <h3 className="modal-title">Confirm Action</h3>
            <p className="modal-message">
              Are you sure you want to <strong>{confirmDialog.status === 'approved' ? 'approve' : 'reject'}</strong> this transaction?
            </p>
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setConfirmDialog({ isOpen: false, transactionId: null, status: null })}
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
          border-radius: 6px;
          animation: pulse 1.5s infinite ease-in-out;
        }
        .skeleton-title { width: 220px; height: 28px; margin-bottom: 0.5rem; max-width: 100%; }
        .skeleton-subtitle { width: 380px; height: 16px; max-width: 100%; }
        .skeleton-badge { width: 110px; height: 34px; border-radius: 999px; }
        .skeleton-pill { width: 90px; height: 24px; border-radius: 999px; }
        .skeleton-amount { width: 100px; height: 22px; }
        .skeleton-line { width: 100%; height: 16px; }
        .skeleton-line.long { width: 70%; height: 20px; }
        .skeleton-chip { width: 100px; height: 32px; border-radius: 8px; }
        .skeleton-btn { flex: 1; height: 40px; border-radius: 8px; }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        .pending-layout {
          max-width: 1200px;
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
          border-radius: 16px;
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
          border-radius: 14px;
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
        /* Table styling */
        .table-card {
          background: #fff;
          border: 1px solid #e8edf3;
          border-radius: 16px;
          box-shadow: 0 4px 20px -8px rgba(15, 23, 42, 0.05);
          overflow: hidden;
        }
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }
        .tx-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }
        .tx-table th {
          background: #f8fafc;
          padding: 1rem 1.5rem;
          font-size: 0.75rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        .tx-table th.text-right { text-align: right; }
        .tx-table td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .tx-row:hover { background: #f8fafc; }
        .tx-row:last-child td { border-bottom: none; }
        
        .tx-main-desc { font-weight: 700; color: #0f172a; font-size: 0.9375rem; display: block; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tx-account { font-size: 0.8125rem; font-weight: 600; color: #64748b; display: block; }
        .meta-stack { display: flex; flex-direction: column; gap: 0.25rem; }
        .meta-value { font-size: 0.8125rem; font-weight: 600; color: #475569; }
        .creator-badge { font-size: 0.75rem; font-weight: 700; color: #94a3b8; }
        .action-cell { display: flex; justify-content: flex-end; gap: 0.5rem; }
        
        .amount-cell {
          font-weight: 800;
          font-size: 1.0625rem;
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
        
        .btn-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-action:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-action.approve {
          background: #dcfce7;
          color: #059669;
        }
        .btn-action.approve:hover:not(:disabled) { background: #bbf7d0; color: #047857; }
        .btn-action.reject {
          background: #fee2e2;
          color: #dc2626;
        }
        .btn-action.reject:hover:not(:disabled) { background: #fecaca; color: #b91c1c; }
        
        .premium-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 2rem;
          text-align: center;
          background: #ffffff;
          border-radius: 8px;
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
          border-radius: 12px;
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
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-cancel:hover { background: #e2e8f0; }
        .btn-confirm {
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 6px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-confirm.approved { background: #10b981; }
        .btn-confirm.approved:hover { background: #059669; }
        .btn-confirm.rejected { background: #f87171; }
        .btn-confirm.rejected:hover { background: #dc2626; }

        @media (max-width: 768px) {
          .pending-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 1.5rem;
            padding: 2rem 1.5rem;
            border-radius: 20px;
          }
          .header-left {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }
          .header-icon {
            width: 64px;
            height: 64px;
          }
          .title { font-size: 1.35rem; }
          .subtitle { max-width: 280px; }
          
          /* Table to Card View */
          .tx-table, .tx-table tbody, .tx-table tr, .tx-table td {
            display: block;
            width: 100%;
          }
          .tx-table thead { display: none; }
          .tx-row {
            background: #fff;
            border: 1px solid #e8edf3;
            border-radius: 12px;
            margin-bottom: 1rem;
            padding: 1rem;
            box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.05);
          }
          .tx-table td {
            padding: 0.5rem 0;
            border: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .tx-table td::before {
            content: attr(data-label);
            font-weight: 700;
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            padding-right: 1rem;
          }
          .tx-main-desc { max-width: 150px; text-align: right; }
          .meta-stack { align-items: flex-end; }
          .action-cell { 
            justify-content: stretch; 
            margin-top: 0.5rem; 
            padding-top: 1rem; 
            border-top: 1px solid #f1f5f9; 
            width: 100%;
          }
          .action-cell .btn-action { flex: 1; }
        }
      `}</style>
    </DashboardLayout>
  );
}
