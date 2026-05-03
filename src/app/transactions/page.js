'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import TransactionForm from '@/components/Transactions/TransactionForm';
import TransactionHistory from '@/components/Transactions/TransactionHistory';
import { getStats, getTransactions } from '@/lib/api';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalInvestment: 0, totalRevenue: 0, totalExpense: 0, netBalance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsData, txData] = await Promise.all([
        getStats(),
        getTransactions({ status: 'approved,rejected' })
      ]);
      setStats(statsData.data);
      setTransactions(txData.data);
    } catch (err) {
      console.error('Error fetching transactions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="loading-placeholder">
          <div className="spinner"></div>
          <p>Syncing transaction records...</p>
        </div>
        <style jsx>{`
          .loading-placeholder { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: #64748b; }
          .spinner { width: 24px; height: 24px; border: 2px solid #f8fafc; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.6s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="tx-layout">
        <div className="tx-quick-stats-bar animate-slide-up">
          <div className="tx-stat-item">
            <span className="tx-stat-label">Total Approved Value</span>
            <span className="tx-stat-value">BDT {stats.netBalance.toLocaleString()}</span>
          </div>
          <div className="tx-stat-divider"></div>
          <div className="tx-stat-item">
            <span className="tx-stat-label">Total Records</span>
            <span className="tx-stat-value">{transactions.length}</span>
          </div>
        </div>

        <div className="tx-form-container">
          <TransactionForm onTransactionAdded={fetchData} />
        </div>
        <div className="tx-history-container">
          <TransactionHistory 
            transactions={transactions} 
            onUpdate={fetchData} 
          />
        </div>
      </div>

      <style jsx>{`
        .tx-layout { max-width: 1200px; margin: 0 auto; }
        .tx-quick-stats-bar { 
          display: flex; 
          align-items: center; 
          background: #ffffff; 
          padding: 1.5rem 2rem; 
          border-radius: 6px; 
          border: 1px solid #e2e8f0;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .tx-stat-item { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
        .tx-stat-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
        .tx-stat-value { font-size: 1.25rem; font-weight: 900; color: #0f172a; }
        .tx-stat-divider { width: 1px; height: 40px; background: #f1f5f9; margin: 0 2rem; }
        .tx-form-container { margin-bottom: 2rem; }
        
        @media (max-width: 768px) {
          .tx-quick-stats-bar { flex-direction: column; gap: 1.5rem; align-items: flex-start; padding: 1.5rem; }
          .tx-stat-divider { display: none; }
          .tx-stat-value { font-size: 1.1rem; }
        }
      `}</style>
    </DashboardLayout>
  );
}
