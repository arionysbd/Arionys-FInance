'use client';
import { useState, useEffect } from 'react';
import {
  Home,
  ArrowRightLeft,
  SlidersHorizontal,
  ShieldCheck,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  User as UserIcon,
  PieChart,
  ClipboardList,
  Banknote,
  Menu,
  X,
  Bell,
  Clock,
  History,
  Landmark
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchPending = async () => {
      if (user && ['owner', 'admin', 'ceo', 'cfo'].includes(user.role?.toLowerCase())) {
        try {
          const params = { status: 'pending', companyId: user.companyId };
          const data = await getTransactions(params);
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

  if (user.isActive === false) {
    return (
      <div className="pending-approval-screen">
        <div className="pending-card">
          <Shield size={48} className="pending-icon" />
          <h2>Account Pending Approval</h2>
          <p>
            Your account has been created successfully but is currently waiting for administrator approval. You will gain full access once an admin verifies your identity.
          </p>
          <div className="next-step-box">
            <strong>Next Step:</strong> Please contact your system administrator. Once they approve your account, click below to log out and then log back in to refresh your status.
          </div>
          <button onClick={logout} className="btn btn-outline" style={{width: '100%'}}>Log Out & Return Later</button>
        </div>
        <style jsx>{`
          .pending-approval-screen { 
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: var(--secondary); 
            padding: 20px;
          }
          .pending-card {
            background: var(--card);
            padding: 3rem 2rem;
            border-radius: var(--radius);
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            max-width: 450px;
            text-align: center;
            border: 1px solid var(--border);
          }
          .pending-icon {
            margin: 0 auto 1.5rem auto;
            color: var(--primary);
          }
          h2 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: var(--foreground);
          }
          p {
            color: var(--muted-foreground);
            margin-bottom: 2rem;
            line-height: 1.6;
          }
          .next-step-box {
            background: var(--secondary);
            border: 1px solid var(--border);
            padding: 1rem;
            border-radius: var(--radius);
            margin-bottom: 1.5rem;
            font-size: 0.875rem;
            color: var(--muted-foreground);
            text-align: left;
          }
        `}</style>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard',    label: 'Dashboard',          icon: <Home size={22} />,  href: '/dashboard',           roles: ['owner', 'admin', 'ceo', 'cfo', 'csuit', 'accountant'] },
    { id: 'create-tx',   label: 'Create Transaction',  icon: <ArrowRightLeft size={22} />,       href: '/transactions/create', roles: ['owner', 'admin', 'ceo', 'cfo', 'csuit', 'accountant'] },
    { id: 'pending',     label: 'Pending Approvals',   icon: <Clock size={22} />,   href: '/pending',             roles: ['owner', 'admin', 'ceo', 'cfo'], showBadge: true },
    { id: 'transactions',label: 'Transaction History',  icon: <History size={22} />,   href: '/transactions',        roles: ['owner', 'admin', 'ceo', 'cfo', 'csuit', 'accountant'] },
    { id: 'accounts',    label: 'Accounts',             icon: <Landmark size={22} />,  href: '/accounts',            roles: ['owner', 'admin', 'ceo', 'cfo', 'csuit', 'accountant'] },
    { id: 'loans',       label: 'Loans',                icon: <Banknote size={22} />, href: '/loans',     roles: ['owner', 'admin', 'ceo', 'cfo', 'accountant'] },
    { id: 'reports',     label: 'Financial Reports',    icon: <PieChart size={22} />, href: '/reports',   roles: ['owner', 'admin', 'ceo', 'cfo', 'csuit'] },
    { id: 'business-administration', label: 'Business Settings', icon: <SlidersHorizontal size={22} />, href: '/business-administration', roles: ['owner', 'admin'] },
    { id: 'employees',   label: 'Employees Directory',  icon: <UserIcon size={22} />, href: '/employees', roles: ['owner', 'admin', 'ceo', 'cfo'] },
    { id: 'audit-log',   label: 'Audit Log',            icon: <ClipboardList size={22} />, href: '/audit-log', roles: ['owner', 'admin'] },
    { id: 'settings',    label: 'Profile Settings',     icon: < Settings size={22} />,href: '/settings',            roles: ['owner', 'admin', 'ceo', 'cfo', 'csuit', 'accountant'] },
  ];

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Financial Overview';
    if (pathname === '/accounts') return 'Account Management';
    if (pathname === '/transactions') return 'Transaction History';
    if (pathname === '/transactions/create') return 'Create Transaction';
    if (pathname === '/pending') return 'Pending Approvals';
    if (pathname === '/business-administration') return 'Business Administration';
    if (pathname.startsWith('/employees')) return 'Employees Directory';
    if (pathname === '/reports') return 'Financial Reports';
    if (pathname === '/audit-log') return 'Audit Log';
    if (pathname === '/loans') return 'Employee Loans';
    if (pathname.startsWith('/loans/')) return 'Loan Details';

    return 'Settings';
  };

  const getBreadcrumb = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/accounts') return 'Accounts';
    if (pathname === '/transactions') return 'Transactions';
    if (pathname === '/transactions/create') return 'Transactions / Create';
    if (pathname === '/pending') return 'Pending Approvals';
    if (pathname === '/business-administration') return 'Business Administration';
    if (pathname.startsWith('/employees')) return 'Employees';
    if (pathname === '/reports') return 'Reports';
    if (pathname === '/audit-log') return 'Audit Log';
    if (pathname === '/loans') return 'Loans';
    if (pathname.startsWith('/loans/')) return 'Loans / Details';

    return 'Pages';
  };

  return (
    <div className="layout">

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar glass ${isMobileMenuOpen ? 'open' : ''}`}>
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
                onClick={() => setIsMobileMenuOpen(false)}
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
          {['owner', 'admin', 'ceo', 'cfo'].includes(user.role?.toLowerCase()) && (
            <Link href="/pending" className="notification-bell">
              <Bell size={20} />
              {pendingCount > 0 && <span className="bell-badge">{pendingCount}</span>}
            </Link>
          )}
          <span className="mobile-user-name">{user.name}</span>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="mobile-menu-btn">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

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
            <div className="header-actions">
              {['owner', 'admin', 'ceo', 'cfo'].includes(user.role?.toLowerCase()) && (
                <Link href="/pending" className="notification-bell desktop-bell">
                  <Bell size={20} />
                  {pendingCount > 0 && <span className="bell-badge">{pendingCount}</span>}
                </Link>
              )}
              <div className="current-user-badge">
                <span className={`role-tag role-${user.role?.toLowerCase()}`}>
                <span className="desktop-role">
                  {user.role?.toLowerCase() === 'owner' ? 'Company Owner' :
                   user.role?.toLowerCase() === 'admin' ? 'Administrator' :
                   user.role?.toLowerCase() === 'ceo' ? 'Chief Executive Officer' :
                   user.role?.toLowerCase() === 'cfo' ? 'Chief Financial Officer' :
                   user.role?.toLowerCase() === 'csuit' ? 'Executive Board' :
                   user.role?.toLowerCase() === 'accountant' ? 'Accounts Manager' : 
                   user.role}
                </span>
                <span className="mobile-role">
                  {user.role?.toLowerCase() === 'owner' ? 'OWNR' :
                   user.role?.toLowerCase() === 'admin' ? 'ADMIN' :
                   user.role?.toLowerCase() === 'ceo' ? 'CEO' :
                   user.role?.toLowerCase() === 'cfo' ? 'CFO' :
                   user.role?.toLowerCase() === 'csuit' ? 'EXEC' :
                   user.role?.toLowerCase() === 'accountant' ? 'ACC' : 
                   user.role?.toUpperCase()}
                </span>
              </span>
            </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>

      <style jsx>{`
        .layout { display: flex; min-height: 100vh; background: transparent; }
        
        .sidebar {
          width: 260px;
          height: 100vh;
          position: fixed;
          padding: 0.5rem 1.25rem 2rem;
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-right: 1px solid rgba(255, 255, 255, 0.5);
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
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .logo-icon { width: 140px; display: flex; align-items: center; justify-content: center; }
        .logo-icon img { width: 100%; height: auto; object-fit: contain; }

        .side-nav { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; margin-top: 1rem; }
        :global(.nav-item) {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          border-radius: 8px;
          color: #64748b;
          font-weight: 600;
          font-size: 0.9375rem;
          transition: all 0.2s;
          text-decoration: none;
        }
        :global(.nav-item:hover) { background: rgba(255,255,255,0.8); color: var(--foreground); box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        :global(.nav-item.active) { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39); }

        .nav-icon-wrapper { position: relative; display: flex; align-items: center; justify-content: center; }
        :global(.nav-img-icon) { width: 22px; height: 22px; object-fit: contain; display: block; }
        .notification-badge {
          position: absolute;
          top: -6px;
          right: -8px;
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.125rem 0.375rem;
          border-radius: 6px;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
        }
        :global(.nav-item.active) .notification-badge { border-color: #0f172a; }

        .sidebar-footer { border-top: 1px solid #f1f5f9; padding-top: 1.5rem; margin-top: auto; }
        .user-info { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; padding: 0 0.5rem; }
        .avatar { width: 36px; height: 36px; border-radius: 6px; background: #f1f5f9; color: #0f172a; display: flex; align-items: center; justify-content: center; }
        .details .name { font-size: 0.875rem; font-weight: 700; color: #0f172a; margin: 0; }
        .details .role { font-size: 0.75rem; color: #64748b; margin: 0; text-transform: capitalize; }
        .logout-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 0.75rem; border-radius: 6px; background: #fef2f2; color: #ef4444; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .logout-btn:hover { background: #fee2e2; }

        .mobile-header { display: none; }
        .mobile-nav { display: none; }

        .main-content { flex: 1; margin-left: 260px; padding: 2rem 3rem; min-height: 100vh; background: #fcfcfc; max-width: 100vw; overflow-x: hidden; }
        .top-header { margin-bottom: 2.5rem; }
        .breadcrumb { display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
        .breadcrumb .current { color: #0f172a; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; }
        .header-flex h1 { font-size: 1.875rem; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
        .role-tag { padding: 0.4rem 0.875rem; border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.025em; margin-right: 0.5rem; }
        .role-owner { background: #4f46e5; color: white; }
        .role-admin { background: #0f172a; color: white; }
        .role-ceo { background: #0f172a; color: white; }
        .role-cfo { background: #0f172a; color: white; }
        .role-accountant { background: #f1f5f9; color: #475569; }
        .mobile-role { display: none; }
        
        .header-actions { display: flex; align-items: center; gap: 1rem; }
        .notification-bell { position: relative; color: #64748b; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: #f8fafc; transition: all 0.2s; text-decoration: none; border: 1px solid #e2e8f0; }
        .notification-bell:hover { color: #0f172a; background: white; border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .bell-badge { position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; font-size: 0.65rem; font-weight: 800; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; border: 2px solid white; padding: 0 4px; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2); }

        .loading-screen { height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: #ffffff; }
        .spinner { width: 40px; height: 40px; border: 3px solid #f1f5f9; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .mobile-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            z-index: 90;
          }
          .main-content { margin-left: 0; padding: 6rem 5vw 3rem; }
          .mobile-header { position: fixed; top: 0; left: 0; right: 0; height: 70px; display: flex; align-items: center; justify-content: space-between; padding: 0 5vw 0 4vw; z-index: 1000; border-bottom: 1px solid #f1f5f9; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); }
          .mobile-header .logo-area { padding: 0; border: none; margin: 0; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; }
          .mobile-header .logo-icon { width: 110px; transform: translateY(-1px); display: flex; align-items: center; justify-content: flex-start; }
          .mobile-header-right { display: flex; align-items: center; gap: 0.75rem; }
          .mobile-user-name { font-size: 0.8125rem; font-weight: 800; color: #0f172a; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .mobile-menu-btn { background: transparent; border: none; color: #0f172a; display: flex; align-items: center; justify-content: center; padding: 0.25rem; cursor: pointer; }
          .desktop-bell { display: none; }
          .notification-bell { background: transparent; border: none; }
          .header-flex h1 { font-size: clamp(1.25rem, 5vw, 1.5rem); }
          .desktop-role { display: none; }
          .mobile-role { display: inline; }
        }
      `}</style>
    </div>
  );
}
