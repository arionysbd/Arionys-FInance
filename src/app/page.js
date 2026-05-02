'use client';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Clock, 
  Users, 
  LogOut, 
  ChevronRight,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Dashboard from '@/components/Dashboard/Dashboard';
import TransactionForm from '@/components/Transactions/TransactionForm';
import TransactionHistory from '@/components/Transactions/TransactionHistory';
import PendingTransactions from '@/app/pending/page'; // We'll make this a component-friendly export
import UserManagement from '@/app/users/page';
import { getStats, getTransactions } from '@/lib/api';

export default function Home() {
  const { user, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({ totalInvestment: 0, totalRevenue: 0, totalExpense: 0, netBalance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsData, txData] = await Promise.all([
        getStats(),
        getTransactions({ status: 'approved' })
      ]);
      setStats(statsData.data);
      setTransactions(txData.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar glass">
        <div className="logo-area">
          <div className="logo-icon">A</div>
          <h2>Arionys <span>Finance</span></h2>
        </div>

        <nav className="side-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <Receipt size={20} />
            Transactions
          </button>

          {(user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'moderator') && (
            <button 
              className={`nav-item ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <Clock size={20} />
              Pending
            </button>
          )}

          {user.role?.toLowerCase() === 'admin' && (
            <button 
              className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={20} />
              Users
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">
              <UserIcon size={18} />
            </div>
            <div className="details">
              <p className="name">{user.name}</p>
              <p className="role">{user.role}</p>
            </div>
          </div>
          <button onClick={logout} className="logout-btn" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="breadcrumb">
            <span>Pages</span>
            <ChevronRight size={14} />
            <span className="current">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
          </div>
          <div className="header-flex">
            <h1>
              {activeTab === 'dashboard' && 'Financial Overview'}
              {activeTab === 'transactions' && 'Transaction History'}
              {activeTab === 'pending' && 'Approval Queue'}
              {activeTab === 'users' && 'Team Management'}
            </h1>
            <div className="current-user-badge">
              <span className={`role-tag role-${user.role?.toLowerCase()}`}>{user.role}</span>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Fetching records...</p>
          </div>
        ) : (
          <div className="content-area animate-fade-in">
            {activeTab === 'dashboard' && (
              <Dashboard stats={stats} recentTransactions={transactions} />
            )}
            
            {activeTab === 'transactions' && (
              <div className="tx-layout">
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
            )}

            {activeTab === 'pending' && <PendingTransactions />}
            {activeTab === 'users' && <UserManagement />}
          </div>
        )}
      </main>

      <style jsx>{`
        .layout { display: flex; min-height: 100vh; background: #f8fafc; }
        
        .sidebar {
          width: 280px;
          height: 100vh;
          position: fixed;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          z-index: 100;
        }
        
        .logo-area { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2.5rem; padding: 0 0.5rem; }
        .logo-icon { width: 36px; height: 36px; background: var(--primary); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.25rem; }
        .logo-area h2 { font-size: 1.125rem; font-weight: 700; letter-spacing: -0.025em; }
        .logo-area h2 span { color: var(--primary); }
        
        .side-nav { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
        .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 0.5rem; border: none; background: transparent; color: var(--muted-foreground); cursor: pointer; transition: all 0.2s; font-weight: 500; text-align: left; }
        .nav-item:hover { background: var(--secondary); color: var(--foreground); }
        .nav-item.active { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
        
        .sidebar-footer { padding-top: 1.5rem; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .user-info { display: flex; align-items: center; gap: 0.75rem; }
        .avatar { width: 36px; height: 36px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--muted-foreground); border: 1px solid var(--border); }
        .details .name { font-size: 0.875rem; font-weight: 600; line-height: 1.2; }
        .details .role { font-size: 0.75rem; color: var(--muted-foreground); text-transform: capitalize; }
        .logout-btn { background: transparent; border: none; color: var(--muted-foreground); cursor: pointer; transition: color 0.2s; }
        .logout-btn:hover { color: var(--destructive); }
        
        .main-content { flex: 1; margin-left: 280px; padding: 2.5rem 3.5rem; }
        @media (max-width: 1024px) { .main-content { padding: 2rem; } }
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .main-content { margin-left: 0; }
        }
        
        .top-header { margin-bottom: 3rem; }
        .breadcrumb { display: flex; align-items: center; gap: 0.5rem; color: var(--muted-foreground); font-size: 0.75rem; margin-bottom: 0.75rem; }
        .breadcrumb .current { color: var(--foreground); font-weight: 500; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; }
        .top-header h1 { font-size: 1.875rem; font-weight: 800; letter-spacing: -0.025em; color: #1e293b; }
        
        .role-tag { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em; }
        .role-admin { background: #fee2e2; color: #991b1b; }
        .role-moderator { background: #fef3c7; color: #92400e; }
        .role-accountant { background: #dcfce7; color: #166534; }

        .tx-layout { display: flex; flex-direction: column; gap: 2rem; }
        
        .loading-screen { height: 100vh; display: flex; items-center; justify-content: center; background: #f8fafc; }
        .loading-state { height: 40vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: var(--muted-foreground); }
        .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
