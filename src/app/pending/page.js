'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

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
      setPendingTx(pendingTx.filter(tx => tx._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="muted-text">Loading queue...</div>;

  return (
    <div className="pending-container animate-fade-in">
      <div className="card">
        <div className="header">
          <div className="title-info">
            <Clock className="text-warning" size={20} />
            <h3>Pending Approval ({pendingTx.length})</h3>
          </div>
        </div>

        <div className="tx-list">
          {pendingTx.map((tx) => (
            <div key={tx._id} className="tx-item card">
              <div className="tx-main">
                <div className="tx-details">
                  <div className="tx-type-badge">
                    <span className={`badge badge-${tx.type}`}>{tx.type}</span>
                  </div>
                  <div className="tx-text">
                    <p className="description">{tx.description}</p>
                    <p className="meta">
                      Submitted by <strong>{tx.createdBy?.name || 'Unknown'}</strong> on {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="tx-amount">
                  ${tx.amount.toLocaleString()}
                </div>
              </div>
              
              <div className="tx-actions">
                <button 
                  className="btn btn-secondary reject-btn"
                  onClick={() => handleAction(tx._id, 'rejected')}
                  disabled={processing === tx._id}
                >
                  <XCircle size={16} /> Reject
                </button>
                <button 
                  className="btn btn-primary approve-btn"
                  onClick={() => handleAction(tx._id, 'approved')}
                  disabled={processing === tx._id}
                >
                  <CheckCircle size={16} /> {processing === tx._id ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          ))}

          {pendingTx.length === 0 && (
            <div className="empty-state">
              <div className="check-icon"><CheckCircle size={48} /></div>
              <h4>All Clear!</h4>
              <p>No transactions awaiting approval.</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .pending-container { max-width: 1000px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .title-info { display: flex; align-items: center; gap: 0.75rem; }
        .title-info h3 { font-size: 1.25rem; font-weight: 700; margin: 0; }
        
        .tx-list { display: flex; flex-direction: column; gap: 1rem; }
        .tx-item { display: flex; flex-direction: column; gap: 1.25rem; padding: 1.25rem; border-color: #f1f5f9; }
        .tx-main { display: flex; justify-content: space-between; align-items: center; }
        .tx-details { display: flex; gap: 1.25rem; align-items: center; }
        .tx-text .description { font-weight: 600; font-size: 1rem; color: #1e293b; margin-bottom: 0.25rem; }
        .tx-text .meta { font-size: 0.75rem; color: var(--muted-foreground); }
        .tx-amount { font-size: 1.25rem; font-weight: 700; color: #1e293b; }
        
        .tx-actions { display: flex; gap: 0.75rem; border-top: 1px solid #f1f5f9; padding-top: 1.25rem; }
        .tx-actions button { flex: 1; font-size: 0.875rem; }
        .approve-btn { background: #10b981; color: white; }
        .approve-btn:hover { background: #059669; }
        .reject-btn:hover { background: #fee2e2; color: #dc2626; border-color: #fecaca; }
        
        .empty-state { text-align: center; padding: 4rem 2rem; color: var(--muted-foreground); }
        .check-icon { color: #d1fae5; margin-bottom: 1rem; }
        .empty-state h4 { color: #1e293b; margin-bottom: 0.5rem; }
      `}</style>
    </div>
  );
}
