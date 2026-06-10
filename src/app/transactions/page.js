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
        <div className="tx-skeleton">
          <div className="skeleton-bar shim"></div>
          <div className="skeleton-form shim"></div>
          <div className="skeleton-history">
            <div className="skeleton-h-header shim"></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton-h-row shim"></div>
            ))}
          </div>
        </div>
        <style jsx>{`
          .tx-skeleton { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; padding: 1rem 5vw 1rem 1rem; }
          .skeleton-bar { height: 80px; border-radius: 6px; }
          .skeleton-form { height: 350px; border-radius: 6px; }
          .skeleton-history { display: flex; flex-direction: column; gap: 0.75rem; }
          .skeleton-h-header { height: 50px; border-radius: 6px; }
          .skeleton-h-row { height: 70px; border-radius: 6px; }
          .shim {
            background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="tx-layout">
        <div className="tx-quick-stats-bar animate-slide-up">
          <div className="tx-stat-item">
            <span className="tx-stat-label">Net Balance</span>
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
        .tx-layout { max-width: 1200px; margin: 0 auto; padding-right: 5vw; }
        .tx-quick-stats-bar { 
          display: flex; 
          width: 100%;
          align-items: center; 
          background: #ffffff; 
          padding: clamp(1rem, 4vw, 1.5rem) clamp(1.25rem, 5vw, 2rem); 
          border-radius: 6px; 
          border: 1px solid #e2e8f0;
          margin-bottom: clamp(1.5rem, 6vw, 2rem);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .tx-stat-item { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
        .tx-stat-label { font-size: clamp(0.6rem, 2.5vw, 0.7rem); font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
        .tx-stat-value { font-size: clamp(1rem, 5vw, 1.25rem); font-weight: 900; color: #0f172a; }
        .tx-stat-divider { width: 1px; height: 40px; background: #f1f5f9; margin: 0 2rem; }
        .tx-form-container { margin-bottom: 2rem; }
        
        @media (max-width: 768px) {
          .tx-layout { padding-right: 0; }
          .tx-quick-stats-bar { flex-direction: row; gap: 0; align-items: center; padding: 1rem 1.25rem; }
          .tx-stat-divider { display: block; height: 30px; margin: 0 1rem; }
          .tx-stat-value { font-size: 1.1rem; }
        }
      `}</style>
    </DashboardLayout>
  );
}
