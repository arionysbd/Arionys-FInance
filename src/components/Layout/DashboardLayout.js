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
  HandCoins,
  LayoutDashboard,
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
import { getPendingCount } from '@/lib/api';
import { hasPermission, canAccessPath, getHomePath, isOwner } from '@/lib/permissions';

export default function DashboardLayout({ children }) {
  const { user, logout, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const canApprove = hasPermission(user, 'pending_approvals');
  const pathAllowed = !user || canAccessPath(user, pathname);

  // Send users away from pages they were not given access to
  useEffect(() => {
    if (!authLoading && user && user.isActive !== false && !pathAllowed) {
      router.replace(getHomePath(user));
    }
  }, [authLoading, user, pathAllowed, router]);

  useEffect(() => {
    if (!user || !hasPermission(user, 'pending_approvals')) return;
    let cancelled = false;
    const load = (force) => getPendingCount({ force })
      .then(count => { if (!cancelled) setPendingCount(count); })
      .catch(() => {});
    load(false);
    // Refresh when approvals change anywhere in the app
    const onChange = () => load(true);
    window.addEventListener('pending-changed', onChange);
    return () => { cancelled = true; window.removeEventListener('pending-changed', onChange); };
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

  const navSections = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard',    label: 'Office Dashboard',   icon: <Home size={20} />,           href: '/dashboard', permission: 'dashboard' },
        { id: 'my-dashboard', label: 'Personal Dashboard', icon: <LayoutDashboard size={20} />, href: '/my-dashboard', permission: 'personal_dashboard' },
      ],
    },
    {
      title: 'Transactions',
      items: [
        { id: 'create-tx',    label: 'Create Transaction', icon: <ArrowRightLeft size={20} />, href: '/transactions/create', permission: 'create_transaction' },
        { id: 'pending',      label: 'Pending Approvals',  icon: <Clock size={20} />,          href: '/pending', permission: 'pending_approvals', showBadge: true },
        { id: 'transactions', label: 'Transaction History', icon: <History size={20} />,       href: '/transactions', permission: 'transactions' },
      ],
    },
    {
      title: 'Finance',
      items: [
        { id: 'accounts',     label: 'Accounts',           icon: <Landmark size={20} />,       href: '/accounts', permission: 'accounts' },
        { id: 'loans',        label: 'Loans',              icon: <Banknote size={20} />,       href: '/loans', permission: 'loans' },
        { id: 'loan-request', label: 'Request Loan',       icon: <HandCoins size={20} />,      href: '/loans/request', permission: 'loan_request' },
        { id: 'reports',      label: 'Financial Reports',  icon: <PieChart size={20} />,       href: '/reports', permission: 'reports' },
      ],
    },
    {
      title: 'Organization',
      items: [
        { id: 'employees',    label: 'Employees',          icon: <UserIcon size={20} />,       href: '/employees', permission: 'employees' },
        { id: 'business-administration', label: 'Business Admin', icon: <SlidersHorizontal size={20} />, href: '/business-administration', permission: 'business_admin' },
        { id: 'audit-log',    label: 'Audit Log',          icon: <ClipboardList size={20} />,  href: '/audit-log', permission: 'audit_log' },
      ],
    },
    {
      title: 'Account',
      items: [
        { id: 'settings',     label: 'Profile Settings',   icon: <Settings size={20} />,       href: '/settings' },
      ],
    },
  ];

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Financial Overview';
    if (pathname === '/my-dashboard') return 'Personal Dashboard';
    if (pathname === '/accounts') return 'Account Management';
    if (pathname === '/transactions') return 'Transaction History';
    if (pathname === '/transactions/create') return 'Create Transaction';
    if (pathname === '/pending') return 'Pending Approvals';
    if (pathname === '/business-administration') return 'Business Administration';
    if (pathname.startsWith('/employees')) return 'Employees Directory';
    if (pathname === '/reports') return 'Financial Reports';
    if (pathname === '/audit-log') return 'Audit Log';
    if (pathname === '/loans') return 'Employee Loans';
    if (pathname === '/loans/request') return 'Request a Loan';
    if (pathname.startsWith('/loans/')) return 'Loan Details';

    return 'Settings';
  };

  const getBreadcrumb = () => {
    if (pathname === '/dashboard') return 'Office Dashboard';
    if (pathname === '/my-dashboard') return 'My Dashboard';
    if (pathname === '/accounts') return 'Accounts';
    if (pathname === '/transactions') return 'Transactions';
    if (pathname === '/transactions/create') return 'Transactions / Create';
    if (pathname === '/pending') return 'Pending Approvals';
    if (pathname === '/business-administration') return 'Business Administration';
    if (pathname.startsWith('/employees')) return 'Employees';
    if (pathname === '/reports') return 'Reports';
    if (pathname === '/audit-log') return 'Audit Log';
    if (pathname === '/loans') return 'Loans';
    if (pathname === '/loans/request') return 'Loans / Request';
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
          {navSections.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.permission || hasPermission(user, item.permission)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="nav-section">
                <p className="nav-section-title">{section.title}</p>
                {visibleItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    title={item.label}
                  >
                    <div className="nav-icon-wrapper">
                      {item.icon}
                      {item.showBadge && pendingCount > 0 && <span className="notification-badge">{pendingCount}</span>}
                    </div>
                    <span className="nav-label">{item.label}</span>
                  </Link>
                ))}
              </div>
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
          {canApprove && (
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
            <span>{user.companyName || 'Company'}</span>
            <ChevronRight size={14} />
            <span className="current">{getBreadcrumb()}</span>
          </div>
          <div className="header-flex">
            <h1>{getPageTitle()}</h1>
            <div className="header-actions">
              {canApprove && (
                <Link href="/pending" className="notification-bell desktop-bell">
                  <Bell size={20} />
                  {pendingCount > 0 && <span className="bell-badge">{pendingCount}</span>}
                </Link>
              )}
              {isOwner(user) && (
                <div className="current-user-badge">
                  <span className="role-tag role-owner">
                    <span className="desktop-role">Company Owner</span>
                    <span className="mobile-role">OWNER</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-area">
          {pathAllowed ? children : (
            <div className="no-access">
              <Shield size={36} />
              <h3>No access to this page</h3>
              <p>You have not been given access to this page. Redirecting you…</p>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .layout { display: flex; min-height: 100vh; background: transparent; }
        
        .sidebar {
          width: 288px;
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

        .side-nav { display: flex; flex-direction: column; gap: 1.25rem; flex: 1; margin-top: 1rem; overflow-y: auto; }
        .nav-section { display: flex; flex-direction: column; gap: 0.25rem; }
        .nav-section-title {
          margin: 0 0 0.25rem;
          padding: 0 1rem;
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
        }
        .nav-label { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        :global(.nav-item) {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.7rem 1rem;
          border-radius: 6px;
          color: #64748b;
          font-weight: 600;
          font-size: 0.9375rem;
          transition: all 0.2s;
          text-decoration: none;
        }
        :global(.nav-item:hover) { background: rgba(255,255,255,0.8); color: var(--foreground); box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        :global(.nav-item.active) { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39); }

        .nav-icon-wrapper { position: relative; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
        :global(.nav-item:hover) .nav-icon-wrapper { transform: scale(1.1); }
        :global(.nav-item.active) .nav-icon-wrapper { transform: scale(1); }
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
          border-radius: 4px;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
        }
        :global(.nav-item.active) .notification-badge { border-color: #0f172a; }

        .sidebar-footer { border-top: 1px solid #f1f5f9; padding-top: 1.5rem; margin-top: auto; }
        .user-info { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; padding: 0 0.5rem; }
        .avatar { width: 36px; height: 36px; border-radius: 4px; background: #f1f5f9; color: #0f172a; display: flex; align-items: center; justify-content: center; }
        .details .name { font-size: 0.875rem; font-weight: 700; color: #0f172a; margin: 0; }
        .details .role { font-size: 0.75rem; color: #64748b; margin: 0; text-transform: capitalize; }
        .logout-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 0.75rem; border-radius: 4px; background: #fef2f2; color: #ef4444; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .logout-btn:hover { background: #fee2e2; }

        .mobile-header { display: none; }
        .mobile-nav { display: none; }

        .main-content { flex: 1; margin-left: 288px; padding: 2rem 3rem; min-height: 100vh; background: #fcfcfc; max-width: 100vw; overflow-x: hidden; }
        .top-header { margin-bottom: 2.5rem; }
        .breadcrumb { display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
        .breadcrumb .current { color: #0f172a; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; }
        .header-flex h1 { font-size: 1.875rem; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
.no-access { max-width: 420px; margin: 4rem auto; padding: 2.5rem 2rem; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; color: #94a3b8; }
        .no-access h3 { margin: 1rem 0 0.5rem; font-size: 1.125rem; font-weight: 800; color: #0f172a; }
        .no-access p { margin: 0; font-size: 0.875rem; color: #64748b; }
        .role-tag { padding: 0.35rem 0.875rem; border-radius: 8px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-right: 0.5rem; border: 1px solid transparent; }
        .role-owner { background: #eef2ff; color: #4338ca; border-color: #c7d2fe; }
        .role-admin { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
        .role-ceo { background: #f0fdf4; color: #166534; border-color: #bbf7d0; }
        .role-cfo { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .role-accountant { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
        .mobile-role { display: none; }
        
        .header-actions { display: flex; align-items: center; gap: 1rem; }
        :global(.notification-bell) { position: relative; color: #64748b; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: #f8fafc; transition: all 0.2s; text-decoration: none; border: 1px solid #e2e8f0; }
        :global(.notification-bell:hover) { color: #0f172a; background: white; border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        :global(.bell-badge) { position: absolute; top: -4px; right: -4px; background: #ef4444; color: white; font-size: 0.65rem; font-weight: 800; min-width: 18px; height: 18px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 2px solid white; padding: 0 4px; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2); }

        .loading-screen { height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: #ffffff; }
        .spinner { width: 40px; height: 40px; border: 3px solid #f1f5f9; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1024px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            /* Solid panel on mobile so page content does not show through the menu */
            background: #ffffff;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            border-right: 1px solid #e2e8f0;
            padding-top: calc(70px + 0.5rem);
            overflow-y: auto;
          }
          .sidebar.open {
            transform: translateX(0);
            box-shadow: 8px 0 30px -10px rgba(15, 23, 42, 0.3);
          }
          .sidebar .logo-area { display: none; }
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
          .mobile-header { 
            position: fixed; top: 0; left: 0; right: 0; height: 70px; 
            display: flex; align-items: center; justify-content: space-between; 
            padding: 0 5vw 0 4vw; z-index: 9999; 
            background: #ffffff;
            border-bottom: 1px solid #e2e8f0;
          }
          .mobile-header .logo-area { padding: 0; border: none; margin: 0; display: flex; flex-direction: row; align-items: center; justify-content: flex-start; }
          .mobile-header .logo-icon { width: 110px; transform: translateY(-1px); display: flex; align-items: center; justify-content: flex-start; }
          .mobile-header-right { display: flex; align-items: center; gap: 0.75rem; }
          .mobile-user-name { font-size: 0.8125rem; font-weight: 800; color: #0f172a; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .mobile-menu-btn { background: transparent; border: none; color: #0f172a; display: flex; align-items: center; justify-content: center; padding: 0.25rem; cursor: pointer; }
          :global(.desktop-bell) { display: none !important; }
          :global(.notification-bell) { background: transparent; border: none; }
          .header-flex h1 { font-size: clamp(1.25rem, 5vw, 1.5rem); }
          .desktop-role { display: none; }
          .mobile-role { display: inline; }
        }
      `}</style>
    </div>
  );
}
