'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Dashboard from '@/components/Dashboard/Dashboard';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { getMyTransactions } from '@/lib/api';

// Same layout as the Office Dashboard, filled only with the signed-in user's own transactions
export default function PersonalDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    getMyTransactions()
      .then(res => {
        if (!res.success) return;
        const { summary, transactions: mine } = res.data;
        const byType = summary.approvedByType || {};
        setStats({
          totalTransactions: summary.total,
          totalRevenue: byType.revenue || 0,
          totalExpense: byType.expense || 0,
          totalInvestment: byType.investment || 0,
          pendingAmount: summary.pendingAmount,
          pendingCount: summary.pending,
        });
        setTransactions(mine);
      })
      .catch(err => console.error('Error fetching personal dashboard:', err))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  if (loading || !stats) {
    return (
      <DashboardLayout>
        <div className="dashboard-skeleton">
          <div className="skeleton-grid">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-card shim"></div>)}
          </div>
          <div className="skeleton-main shim"></div>
        </div>
        <style jsx>{`
          .dashboard-skeleton { max-width: var(--page-max-width); margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; padding: 1rem; }
          .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
          .skeleton-card { height: 140px; border-radius: 4px; }
          .skeleton-main { height: 300px; border-radius: 4px; }
          .shim {
            background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Dashboard variant="personal" stats={stats} recentTransactions={transactions} user={user} />
    </DashboardLayout>
  );
}
