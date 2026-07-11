'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getTransactions, approveTransaction } from '@/lib/api';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

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
          
          <div className="card">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th><div className="skeleton skeleton-th"></div></th>
                    <th><div className="skeleton skeleton-th"></div></th>
                    <th><div className="skeleton skeleton-th"></div></th>
                    <th><div className="skeleton skeleton-th"></div></th>
                    <th><div className="skeleton skeleton-th"></div></th>
                    <th><div className="skeleton skeleton-th right"></div></th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="tx-row">
                      <td><div className="skeleton skeleton-td short"></div></td>
                      <td><div className="skeleton skeleton-td"></div></td>
                      <td><div className="skeleton skeleton-td long"></div></td>
                      <td><div className="skeleton skeleton-td"></div></td>
                      <td><div className="skeleton skeleton-td"></div></td>
                      <td className="action-buttons">
                        <div className="skeleton skeleton-btn"></div>
                        <div className="skeleton skeleton-btn"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="pending-layout">
        <div className="pending-header">
          <div>
            <h2 className="title">Pending Approvals</h2>
            <p className="subtitle">Review and authorize financial records waiting for confirmation.</p>
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
          <div className="card">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Submitted By</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx._id} className="tx-row">
                      <td className="date-cell">{new Date(tx.date).toLocaleDateString()}</td>
                      <td>
                        <div className={`type-pill-minimal type-${tx.type}`}>
                          <span>{tx.type}</span>
                        </div>
                      </td>
                      <td>
                        <div className="tx-desc-cell">
                          <span className="tx-main-desc">{tx.description}</span>
                          <span className="tx-account">
                            {tx.type === 'transfer' 
                              ? `From: ${tx.account?.bankName || 'N/A'} → To: ${tx.toAccount?.bankName || 'N/A'}`
                              : `Account: ${tx.account?.bankName || 'N/A'}`}
                          </span>
                        </div>
                      </td>
                      <td className="amount-cell">
                        BDT {tx.amount.toLocaleString()}
                      </td>
                      <td>
                        <div className="creator-badge">
                          <span>{tx.createdBy?.name || tx.performedBy || 'System'}</span>
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="action-buttons">
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
                      </td>
                    </tr>
                  ))}
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
        .skeleton-title { width: 220px; height: 28px; margin-bottom: 0.5rem; }
        .skeleton-subtitle { width: 380px; height: 16px; max-width: 100%; }
        .skeleton-badge { width: 110px; height: 34px; border-radius: 999px; }
        .skeleton-th { width: 80px; height: 14px; }
        .skeleton-th.right { margin-left: auto; }
        .skeleton-td { height: 18px; width: 90px; }
        .skeleton-td.short { width: 60px; }
        .skeleton-td.long { width: 200px; max-width: 100%; }
        .skeleton-btn { width: 85px; height: 32px; border-radius: 6px; }
        
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
          margin-bottom: 2rem;
          background: #fff;
          padding: 1.5rem 2rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.5rem 0;
        }
        .subtitle {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0;
        }
        .stat-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fffbeb;
          color: #d97706;
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.875rem;
          border: 1px solid #fef3c7;
        }
        .table-responsive {
          overflow-x: auto;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
        }
        .table th {
          text-align: left;
          padding: 1rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .tx-row:last-child td { border-bottom: none; }
        .date-cell { font-size: 0.875rem; font-weight: 600; color: #475569; }
        .amount-cell { font-weight: 800; font-size: 1rem; color: #0f172a; }
        .tx-desc-cell { display: flex; flex-direction: column; gap: 0.25rem; }
        .tx-main-desc { font-weight: 700; color: #0f172a; font-size: 0.9375rem; max-width: 300px; word-break: break-word; }
        .tx-account { font-size: 0.75rem; font-weight: 600; color: #64748b; }
        
        .creator-badge {
          display: inline-flex;
          background: #f1f5f9;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
        }
        
        .type-pill-minimal {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
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
        
        .action-buttons {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }
        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-action.approve { background: #10b981; color: white; }
        .btn-action.approve:hover:not(:disabled) { background: #059669; transform: translateY(-1px); }
        .btn-action.reject { background: #f87171; color: white; }
        .btn-action.reject:hover:not(:disabled) { background: #dc2626; transform: translateY(-1px); }
        
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
      `}</style>
    </DashboardLayout>
  );
}
