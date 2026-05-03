'use client';
import { useState, useEffect } from 'react';
import { 
  Home, 
  ArrowRightLeft, 
  Bell, 
  Shield, 
  LogOut, 
  ChevronRight,
  Settings as SettingsIcon,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTransactions } from '@/lib/api';

export default function DashboardLayout({ children }) {
  const { user, logout, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      if (user && ['admin', 'ceo', 'cfo'].includes(user.role?.toLowerCase())) {
        try {
          const data = await getTransactions({ status: 'pending' });
          setPendingCount(data.data.length);
        } catch (err) {
          console.error('Error fetching pending count:', err);
        }
      }
    };
    fetchPending();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} />, href: '/dashboard', roles: ['admin', 'ceo', 'cfo', 'accountant'] },
    { id: 'transactions', label: 'Transactions', icon: <ArrowRightLeft size={20} />, href: '/transactions', roles: ['admin', 'ceo', 'cfo', 'accountant'] },
    { id: 'pending', label: 'Pending', icon: <Bell size={20} />, href: '/pending', roles: ['admin', 'ceo', 'cfo'], showBadge: true },
    { id: 'users', label: 'Management', icon: <Shield size={20} />, href: '/users', roles: ['admin', 'ceo'] },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={20} />, href: '/settings', roles: ['admin', 'ceo', 'cfo', 'accountant'] },
  ];

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Financial Overview';
    if (pathname === '/transactions') return 'Transaction History';
    if (pathname === '/pending') return 'Approval Queue';
    if (pathname === '/users') return 'System Management';
    return 'Settings';
  };

  const getBreadcrumb = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/transactions') return 'Transactions';
    if (pathname === '/pending') return 'Pending';
    if (pathname === '/users') return 'System';
    return 'Pages';
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar glass">
        <div className="logo-area">
          <div className="logo-icon">
            <img src="https://files.edgestore.dev/58ak0uq249vmf7cf/publicFiles/_public/303ae74c-97f0-41f5-be5a-45a951af0d72.png" alt="Arionys Finance" />
          </div>
        </div>

        <nav className="side-nav">
          {navItems.map((item) => {
            if (item.roles && !item.roles.includes(user.role?.toLowerCase())) return null;
            
            return (
              <Link 
                key={item.id}
                href={item.href}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                <div className="nav-icon-wrapper">
                  {item.icon}
                  {item.showBadge && pendingCount > 0 && <span className="notification-badge">{pendingCount}</span>}
                </div>
                {item.label}
              </Link>
            );
          })}
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

      {/* Mobile Header */}
      <header className="mobile-header glass">
        <div className="logo-area">
          <div className="logo-icon">
            <img src="https://files.edgestore.dev/58ak0uq249vmf7cf/publicFiles/_public/303ae74c-97f0-41f5-be5a-45a951af0d72.png" alt="Arionys Finance" />
          </div>
        </div>
        <div className="mobile-header-right">
          <span className="mobile-user-name">{user.name}</span>
          <button onClick={logout} className="mobile-logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav glass">
        {navItems.map((item) => {
          if (item.roles && !item.roles.includes(user.role?.toLowerCase())) return null;
          
          return (
            <Link 
              key={item.id}
              href={item.href}
              className={`mob-nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              <div className="nav-icon-wrapper">
                {item.icon}
                {item.showBadge && pendingCount > 0 && <span className="notification-badge">{pendingCount}</span>}
              </div>
              <span>{item.id === 'dashboard' ? 'Home' : item.id === 'users' ? 'System' : item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="breadcrumb">
            <span>Pages</span>
            <ChevronRight size={14} />
            <span className="current">{getBreadcrumb()}</span>
          </div>
          <div className="header-flex">
            <h1>{getPageTitle()}</h1>
            <div className="current-user-badge">
              <span className={`role-tag role-${user.role?.toLowerCase()}`}>{user.role}</span>
            </div>
          </div>
        </header>

        <div className="content-area animate-fade-in">
          {children}
        </div>
      </main>

      <style jsx>{`
        .layout { display: flex; min-height: 100vh; background: #ffffff; }
        
        .sidebar {
          width: 260px;
          height: 100vh;
          position: fixed;
          padding: 0.5rem 1.25rem 2rem;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-right: 1px solid #f1f5f9;
          z-index: 100;
        }

        .logo-area { 
          display: flex; 
          flex-direction: column;
          align-items: flex-start; 
          justify-content: center; 
          margin-bottom: 0.75rem; 
          padding: 0 0 0.5rem 2.5rem; 
          width: 100%; 
          border-bottom: 1px solid #f1f5f9;
        }
        .logo-icon { width: 140px; display: flex; align-items: center; justify-content: center; }
        .logo-icon img { width: 100%; height: auto; object-fit: contain; }

        .side-nav { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; margin-top: 1rem; }
        :global(.nav-item) {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          border-radius: 10px;
          color: #64748b;
          font-weight: 600;
          font-size: 0.9375rem;
          transition: all 0.2s;
          text-decoration: none;
        }
        :global(.nav-item:hover) { background: #f8fafc; color: #0f172a; }
        :global(.nav-item.active) { background: #0f172a; color: #ffffff; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); }

        .nav-icon-wrapper { position: relative; display: flex; align-items: center; justify-content: center; }
        .notification-badge {
          position: absolute;
          top: -6px;
          right: -8px;
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.125rem 0.375rem;
          border-radius: 999px;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
        }
        :global(.nav-item.active) .notification-badge { border-color: #0f172a; }

        .sidebar-footer { border-top: 1px solid #f1f5f9; padding-top: 1.5rem; margin-top: auto; }
        .user-info { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; padding: 0 0.5rem; }
        .avatar { width: 36px; height: 36px; border-radius: 10px; background: #f1f5f9; color: #0f172a; display: flex; align-items: center; justify-content: center; }
        .details .name { font-size: 0.875rem; font-weight: 700; color: #0f172a; margin: 0; }
        .details .role { font-size: 0.75rem; color: #64748b; margin: 0; text-transform: capitalize; }
        .logout-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 0.75rem; border-radius: 10px; background: #fef2f2; color: #ef4444; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .logout-btn:hover { background: #fee2e2; }

        .mobile-header { display: none; }
        .mobile-nav { display: none; }

        .main-content { flex: 1; margin-left: 260px; padding: 2rem 3rem; min-height: 100vh; background: #fcfcfc; }
        .top-header { margin-bottom: 2.5rem; }
        .breadcrumb { display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
        .breadcrumb .current { color: #0f172a; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; }
        .header-flex h1 { font-size: 1.875rem; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
        .role-tag { padding: 0.4rem 0.875rem; border-radius: 8px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.025em; }
        .role-admin { background: #0f172a; color: white; }
        .role-ceo { background: #0f172a; color: white; }
        .role-cfo { background: #0f172a; color: white; }
        .role-accountant { background: #f1f5f9; color: #475569; }

        .loading-screen { height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: #ffffff; }
        .spinner { width: 40px; height: 40px; border: 3px solid #f1f5f9; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .sidebar { display: none; }
          .main-content { margin-left: 0; padding: 6rem 1.5rem 7rem; }
          .mobile-header { position: fixed; top: 0; left: 0; right: 0; height: 70px; display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem 0 1.25rem; z-index: 1000; border-bottom: 1px solid #f1f5f9; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); }
          .mobile-header .logo-area { padding: 0; border: none; margin: 0; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; }
          .mobile-header .logo-icon { width: 110px; transform: translateY(-1px); display: flex; align-items: center; justify-content: flex-start; }
          .mobile-header-right { display: flex; align-items: center; gap: 0.75rem; }
          .mobile-user-name { font-size: 0.8125rem; font-weight: 800; color: #0f172a; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .mobile-logout { background: transparent; border: none; color: #64748b; display: flex; align-items: center; justify-content: center; padding: 0.25rem; }
          .mobile-nav { position: fixed; bottom: 0; left: 0; right: 0; height: 75px; display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; z-index: 1000; border-top: 1px solid #f1f5f9; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); }
          :global(.mob-nav-item) { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; color: #94a3b8; font-weight: 700; font-size: 0.65rem; text-transform: uppercase; text-decoration: none; min-width: 60px; }
          :global(.mob-nav-item.active) { color: #0f172a; }
          .mobile-logout { background: transparent; border: none; color: #64748b; }
          .header-flex h1 { font-size: 1.5rem; }
        }
      `}</style>
    </div>
  );
}
