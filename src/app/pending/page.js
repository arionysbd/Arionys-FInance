'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Check, X, User as UserIcon, Calendar, ArrowUpRight, TrendingDown, Wallet } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function PendingTransactions() {
  const [pendingTx, setPendingTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const { user } = useAuth();

  const fetchPending = async () => {
    try {
      const { data } = await axios.get('/api/transactions?status=pending');
      setPendingTx(data.data);
    } catch (err) {
      console.error('Error fetching pending:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id, status) => {
    setProcessing(id);
    try {
      await axios.post('/api/transactions/approve', {
        transactionId: id,
        status,
        userId: user._id
      });
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  const getTxIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'revenue': return <ArrowUpRight size={14} className="text-tx-revenue" />;
      case 'expense': return <TrendingDown size={14} className="text-tx-expense" />;
      default: return <Wallet size={14} className="text-tx-investment" />;
    }
  };

  if (loading) return (
    <div className="loading-state">
      <div className="spinner"></div>
      <p>Synchronizing Queue...</p>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="pending-container animate-fade-in">


        <div className="queue-card">
          {pendingTx.length > 0 ? (
            <div className="desktop-only">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Originator</th>
                    <th>Transaction Details</th>
                    <th>Classification</th>
                    <th>Amount (BDT)</th>
                    <th>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTx.map((tx) => (
                    <tr key={tx._id} className={processing === tx._id ? 'processing-row' : ''}>
                      <td>
                        <div className="origin-cell">
                          <div className="mini-avatar">
                            {tx.createdBy?.name?.charAt(0) || 'U'}
                          </div>
                          <div className="info">
                            <span className="author">{tx.createdBy?.name || 'Unknown'}</span>
                            <span className="date">
                              <Calendar size={10} /> {new Date(tx.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="tx-desc">{tx.description}</p>
                        <span className="performed-by">Actor: {tx.performedBy}</span>
                      </td>
                      <td>
                        <div className={`type-pill-minimal type-${tx.type}`}>
                          {getTxIcon(tx.type)}
                          <span>{tx.type}</span>
                        </div>
                      </td>
                      <td>
                        <span className="tx-amount-value">
                          {tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div className="action-cluster">
                          <button 
                            className="action-btn reject"
                            onClick={() => handleAction(tx._id, 'rejected')}
                            disabled={processing === tx._id}
                            title="Reject Transaction"
                          >
                            <X size={16} />
                          </button>
                          <button 
                            className="action-btn approve"
                            onClick={() => handleAction(tx._id, 'approved')}
                            disabled={processing === tx._id}
                            title="Verify Transaction"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state-zen">
              <div className="zen-icon-frame">
                <CheckCircle size={40} strokeWidth={1.5} />
              </div>
              <h4>Queue Synchronized</h4>
              <p>All transactions have been processed and verified.</p>
            </div>
          )}

          {/* Mobile View */}
          <div className="mobile-only">
            <div className="mobile-queue-list">
              {pendingTx.map((tx) => (
                <div key={tx._id} className={`mobile-tx-card ${processing === tx._id ? 'dim' : ''}`}>
                  <div className="card-top">
                    <span className="m-date">{new Date(tx.date).toLocaleDateString()}</span>
                    <div className={`type-pill-minimal type-${tx.type}`}>
                      {tx.type}
                    </div>
                  </div>
                  <h4 className="m-desc"><span className="m-label-dim">Description:</span> {tx.description}</h4>
                  <div className="m-originator">
                    <span>Initiated by: {tx.createdBy?.name || 'Unknown'}</span>
                  </div>
                  <div className="m-financials">
                    <span className="m-currency">BDT</span>
                    <span className="m-amount">{tx.amount.toLocaleString()}</span>
                  </div>
                  <div className="m-actions">
                    <button 
                      className="m-btn m-reject"
                      onClick={() => handleAction(tx._id, 'rejected')}
                      disabled={processing === tx._id}
                    >
                      Reject
                    </button>
                    <button 
                      className="m-btn m-approve"
                      onClick={() => handleAction(tx._id, 'approved')}
                      disabled={processing === tx._id}
                    >
                      {processing === tx._id ? '...' : 'Approve'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .pending-container { max-width: 1100px; margin: 0 auto; }
        
        .queue-header { margin-bottom: 2.5rem; padding: 0 0.5rem; }
        .title-area { display: flex; align-items: flex-start; gap: 1rem; }
        .title-area h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
        .title-area p { color: #64748b; font-size: 0.875rem; }
        .icon-slate { color: #0f172a; }

        .queue-card { 
          background: #ffffff; 
          border-radius: 6px; 
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }

        .queue-table { width: 100%; border-collapse: collapse; text-align: left; }
        .queue-table th { 
          padding: 1rem 1.5rem; 
          background: #f8fafc; 
          font-size: 0.65rem; 
          font-weight: 800; 
          text-transform: uppercase; 
          color: #64748b; 
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
        }
        .queue-table td { 
          padding: 1.25rem 1.5rem; 
          border-bottom: 1px solid #f8fafc; 
          vertical-align: middle;
        }
        .queue-table tr:hover { background: #fafafa; }
        .processing-row { opacity: 0.5; pointer-events: none; }

        .origin-cell { display: flex; align-items: center; gap: 0.75rem; }
        .mini-avatar { 
          width: 32px; 
          height: 32px; 
          background: #0f172a; 
          color: white; 
          border-radius: 6px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 800; 
          font-size: 0.8125rem;
        }
        .origin-cell .author { display: block; font-size: 0.875rem; font-weight: 700; color: #0f172a; }
        .origin-cell .date { font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 0.3rem; }

        .tx-desc { font-size: 0.9375rem; font-weight: 600; color: #0f172a; margin-bottom: 0.125rem; }
        .performed-by { font-size: 0.75rem; color: #64748b; }

        .type-pill-minimal { 
          display: flex; 
          align-items: center; 
          gap: 0.4rem; 
          padding: 0.25rem 0.6rem; 
          border-radius: 6px; 
          font-size: 0.7rem; 
          font-weight: 800; 
          text-transform: uppercase;
          width: fit-content;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #0f172a;
        }
        .type-revenue { background: #f0fdf4; border-color: #dcfce7; color: #15803d; }
        .type-expense { background: #fef2f2; border-color: #fee2e2; color: #b91c1c; }

        .tx-amount-value { font-size: 1rem; font-weight: 800; color: #0f172a; }

        .action-cluster { display: flex; gap: 0.5rem; }
        .action-btn { 
          width: 36px; 
          height: 36px; 
          border-radius: 6px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }
        .action-btn.approve:hover { background: #0f172a; border-color: #0f172a; color: white; }
        .action-btn.reject:hover { border-color: #ef4444; color: #ef4444; }

        .empty-state-zen { text-align: center; padding: 6rem 2rem; }
        .zen-icon-frame { 
          width: 64px; 
          height: 64px; 
          background: #f8fafc; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          margin: 0 auto 1.5rem; 
          color: #10b981; 
          border: 1px solid #dcfce7;
        }
        .empty-state-zen h4 { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
        .empty-state-zen p { color: #64748b; font-size: 0.875rem; }

        /* Mobile */
        .mobile-tx-card { padding: 1.25rem; border-bottom: 1px solid #e2e8f0; }
        .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .m-date { font-size: 0.75rem; color: #64748b; font-weight: 600; }
        .m-desc { font-size: 1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
        .m-label-dim { color: #94a3b8; font-weight: 600; font-size: 0.875rem; margin-right: 0.25rem; }
        .m-actor { font-size: 0.8125rem; color: #64748b; margin-bottom: 0.5rem; }
        .m-originator { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
        .m-mini-avatar { width: 20px; height: 20px; background: #f1f5f9; color: #0f172a; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800; border: 1px solid #e2e8f0; }
        .m-financials { margin-bottom: 1.25rem; }
        .m-currency { font-size: 0.75rem; font-weight: 700; color: #64748b; margin-right: 0.25rem; }
        .m-amount { font-size: 1.25rem; font-weight: 900; color: #0f172a; }
        .m-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 0.75rem; }
        .m-btn { padding: 0.75rem; border-radius: 6px; font-size: 0.8125rem; font-weight: 800; border: none; cursor: pointer; }
        .m-approve { background: #0f172a; color: white; }
        .m-reject { background: #f8fafc; color: #ef4444; border: 1px solid #e2e8f0; }

        .loading-state { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: #64748b; }
        .spinner { width: 24px; height: 24px; border: 2px solid #f8fafc; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </DashboardLayout>
  );
}
