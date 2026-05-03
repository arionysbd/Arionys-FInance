'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Dashboard from '@/components/Dashboard/Dashboard';
import { getStats, getTransactions } from '@/lib/api';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalInvestment: 0, totalRevenue: 0, totalExpense: 0, netBalance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, txData] = await Promise.all([
          getStats(),
          getTransactions({ status: 'approved' }) // Only approved for recent items on dashboard
        ]);
        setStats(statsData.data);
        setTransactions(txData.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="loading-placeholder">
          <div className="spinner"></div>
          <p>Analyzing financial data...</p>
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
      <Dashboard stats={stats} recentTransactions={transactions} user={user} />
    </DashboardLayout>
  );
}
