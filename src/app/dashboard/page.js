'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Dashboard from '@/components/Dashboard/Dashboard';
import { getStats, getTransactions } from '@/lib/api';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ totalInvestment: 0, totalRevenue: 0, totalExpense: 0, netBalance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish

    const fetchData = async () => {
      try {
        const params = { companyId: user.companyId };
        const [statsData, txData] = await Promise.all([
          getStats(params),
          getTransactions({ status: 'approved', ...params }) // Only approved for recent items on dashboard
        ]);
        setStats(statsData.data);
        setTransactions(txData.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.companyId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="dashboard-skeleton">
          <div className="skeleton-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton-card shim"></div>
            ))}
          </div>
          <div className="skeleton-main shim"></div>
          <div className="skeleton-table">
            <div className="skeleton-header shim"></div>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-row shim"></div>
            ))}
          </div>
        </div>
        <style jsx>{`
          .dashboard-skeleton { max-width: var(--page-max-width); margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; padding: 1rem; }
          .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
          .skeleton-card { height: 140px; border-radius: 4px; }
          .skeleton-main { height: 300px; border-radius: 4px; }
          .skeleton-table { display: flex; flex-direction: column; gap: 0.75rem; }
          .skeleton-header { height: 40px; border-radius: 4px; }
          .skeleton-row { height: 60px; border-radius: 4px; }
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
      <Dashboard stats={stats} recentTransactions={transactions} user={user} />
    </DashboardLayout>
  );
}
