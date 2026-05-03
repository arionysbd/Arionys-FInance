'use client';
import { useState, useEffect, useRef } from 'react';
import { Shield, User as UserIcon, Mail, ShieldCheck, Briefcase, Calculator, Eye, UserCog, MoreVertical, ChevronDown, Check, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  
  // Custom Select State
  const [openUserSelect, setOpenUserSelect] = useState(null); // stores userId
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setOpenUserSelect(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/users');
      setUsers(data.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateRole = async (userId, newRole) => {
    try {
      await axios.patch('/api/users', {
        userId,
        role: newRole,
        adminId: currentUser._id
      });
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
      setOpenUserSelect(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const updateStatus = async (userId, isActive) => {
    try {
      await axios.patch('/api/users', {
        userId,
        isActive,
        adminId: currentUser._id
      });
      setUsers(users.map(u => u._id === userId ? { ...u, isActive } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Reject & permanently delete "${userName}"?\n\nThis action cannot be undone.`)) return;
    try {
      await axios.delete('/api/users', {
        data: { userId, adminId: currentUser._id }
      });
      setUsers(users.filter(u => u._id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Administrator', icon: <ShieldCheck size={14} />, desc: 'Full system control & user oversight.' },
    { value: 'ceo', label: 'Chief Executive Officer', icon: <Briefcase size={14} />, desc: 'Strategic oversight & executive approvals.' },
    { value: 'cfo', label: 'Chief Financial Officer', icon: <Calculator size={14} />, desc: 'Fiscal monitoring & transaction verification.' },
    { value: 'csuit', label: 'Executive Board', icon: <Briefcase size={14} />, desc: 'Analytical view of organizational health.' },
    { value: 'audit', label: 'Audit Officer', icon: <Shield size={14} />, desc: 'Independent record review & verification.' },
    { value: 'accountant', label: 'Accounts Manager', icon: <Calculator size={14} />, desc: 'Transactional data entry & ledger management.' }
  ];

  const getRoleInfo = (role) => roleOptions.find(o => o.value === role?.toLowerCase()) || roleOptions[0];

  if (loading || !currentUser) return (
    <DashboardLayout>
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading System Directory...</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="users-container animate-fade-in" ref={selectRef}>


      <div className="table-card">
        {/* Desktop View */}
        <div className="desktop-only">
          <table className="users-table">
            <thead>
              <tr>
                <th>Identity</th>
                <th>Access Level</th>
                <th>Permissions Summary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className={u._id === currentUser._id ? 'current-user-row' : ''}>
                  <td>
                    <div className="identity-cell">
                      <div className="info">
                        <span className="name">
                          {u.name} {u._id === currentUser._id && <span className="self-badge">YOU</span>}
                        </span>
                        <span className="email">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {/* Custom Role Dropdown */}
                    <div className="role-dropdown-container">
                      <div 
                        className={`role-trigger ${openUserSelect === u._id ? 'active' : ''} ${u._id === currentUser._id ? 'disabled' : ''}`}
                        onClick={() => u._id !== currentUser._id && setOpenUserSelect(openUserSelect === u._id ? null : u._id)}
                      >
                        <div className="trigger-inner">
                          {getRoleInfo(u.role).icon}
                          <span>{getRoleInfo(u.role).label}</span>
                        </div>
                        {u._id !== currentUser._id && <ChevronDown size={14} className={`arrow ${openUserSelect === u._id ? 'rotate' : ''}`} />}
                      </div>

                      {openUserSelect === u._id && (
                        <div className="role-options-panel animate-pop-in">
                          {roleOptions.map((opt) => (
                            <div 
                              key={opt.value}
                              className={`role-option-item ${u.role === opt.value ? 'selected' : ''}`}
                              onClick={() => updateRole(u._id, opt.value)}
                            >
                              <div className="item-main">
                                <div className="icon-wrap">{opt.icon}</div>
                                <div className="text-wrap">
                                  <span className="l-label">{opt.label}</span>
                                  <span className="l-desc">{opt.desc}</span>
                                </div>
                              </div>
                              {u.role === opt.value && <Check size={14} className="check-icon" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <p className="permission-note-stable">
                      {getRoleInfo(u.role).desc}
                    </p>
                  </td>
                  <td className="actions-cell">
                    {u._id !== currentUser._id && !u.isActive && (
                      <div className="approval-actions">
                        <button
                          className="action-pill approve-pill"
                          onClick={() => updateStatus(u._id, true)}
                          title="Approve Account"
                        >
                          <CheckCircle size={13} />
                          Approve
                        </button>
                        <button
                          className="action-pill reject-pill"
                          onClick={() => deleteUser(u._id, u.name)}
                          title="Reject & Delete"
                        >
                          <XCircle size={13} />
                          Reject
                        </button>
                      </div>
                    )}
                    {u.isActive && u._id !== currentUser._id && currentUser.role === 'admin' && (
                      <button
                        className="icon-btn-delete"
                        onClick={() => deleteUser(u._id, u.name)}
                        title="Delete Account"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="mobile-only">
          <div className="user-mobile-list">
            {users.map((u) => (
              <div key={u._id} className="mobile-user-card">
                <div className="m-card-header">
                  <div className="m-info">
                    <span className="m-name">{u.name}</span>
                    <span className="m-email">{u.email}</span>
                  </div>
                  {u._id === currentUser._id && <span className="self-badge">YOU</span>}
                </div>
                
                <div className="m-role-section">
                  <div className="role-dropdown-container">
                    <div 
                      className={`role-trigger ${openUserSelect === u._id ? 'active' : ''} ${u._id === currentUser._id ? 'disabled' : ''}`}
                      onClick={() => u._id !== currentUser._id && setOpenUserSelect(openUserSelect === u._id ? null : u._id)}
                    >
                      <div className="trigger-inner">
                        {getRoleInfo(u.role).icon}
                        <span>{getRoleInfo(u.role).label}</span>
                      </div>
                      {u._id !== currentUser._id && <ChevronDown size={14} className={`arrow ${openUserSelect === u._id ? 'rotate' : ''}`} />}
                    </div>

                    {openUserSelect === u._id && (
                      <div className="role-options-panel animate-pop-in">
                        {roleOptions.map((opt) => (
                          <div 
                            key={opt.value}
                            className={`role-option-item ${u.role === opt.value ? 'selected' : ''}`}
                            onClick={() => updateRole(u._id, opt.value)}
                          >
                            <div className="item-main">
                              <div className="icon-wrap">{opt.icon}</div>
                              <div className="text-wrap">
                                <span className="l-label">{opt.label}</span>
                              </div>
                            </div>
                            {u.role === opt.value && <Check size={14} className="check-icon" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {u._id !== currentUser._id && !u.isActive && (
                    <div className="m-approval-actions">
                      <button className="m-action-pill m-approve-pill" onClick={() => updateStatus(u._id, true)}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button className="m-action-pill m-reject-pill" onClick={() => deleteUser(u._id, u.name)}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .users-container { max-width: 1200px; margin: 0 auto; }
        
        .system-header { margin-bottom: 2.5rem; padding: 0 0.5rem; }
        .title-area { display: flex; align-items: flex-start; gap: 1rem; }
        .title-area h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
        .title-area p { color: #64748b; font-size: 0.875rem; }
        .icon-slate { color: #0f172a; }

        .table-card { 
          background: #ffffff; 
          border-radius: var(--radius); 
          border: 1px solid var(--border);
          overflow: visible; 
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
        }

        .users-table { width: 100%; border-collapse: collapse; text-align: left; }
        .users-table th { 
          padding: 1rem 1.5rem; 
          background: #f8fafc; 
          font-size: 0.65rem; 
          font-weight: 800; 
          text-transform: uppercase; 
          color: #64748b; 
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border);
        }
        .users-table td { 
          padding: 1.25rem 1.5rem; 
          border-bottom: 1px solid #f8fafc; 
          vertical-align: middle;
          position: relative; /* Context for absolute menus */
        }
        .users-table tr:hover { background: #fafafa; }
        .current-user-row { background: #fdfdfd; }

        .identity-cell { display: flex; align-items: center; gap: 1rem; }
        .avatar-frame { 
          width: 40px; 
          height: 40px; 
          background: #0f172a; 
          color: #ffffff; 
          border-radius: 6px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: 800; 
          font-size: 1.125rem;
        }
        
        .info { display: flex; flex-direction: column; }
        .info .name { font-size: 0.9375rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.5rem; }
        .info .email { font-size: 0.8125rem; color: #64748b; }
        
        .self-badge { 
          background: #0f172a; 
          color: #ffffff; 
          font-size: 0.625rem; 
          font-weight: 800; 
          padding: 0.125rem 0.4rem; 
          border-radius: 6px; 
          letter-spacing: 0.05em;
        }

        /* Role Dropdown Styling */
        .role-dropdown-container { position: relative; width: 220px; }
        
        .role-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 0.875rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .role-trigger:not(.disabled):hover { border-color: #cbd5e1; }
        .role-trigger.active { border-color: #0f172a; background: white; box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05); }
        .role-trigger.disabled { opacity: 0.7; cursor: not-allowed; }

        .trigger-inner { display: flex; align-items: center; gap: 0.625rem; font-size: 0.8125rem; font-weight: 700; color: #0f172a; }
        .arrow { color: #64748b; transition: transform 0.2s; }
        .arrow.rotate { transform: rotate(180deg); }

        .role-options-panel {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 280px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0.5rem;
          z-index: 1000;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .role-option-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .role-option-item:hover { background: #f8fafc; }
        .role-option-item.selected { background: #f1f5f9; }

        .item-main { display: flex; align-items: flex-start; gap: 0.875rem; }
        .icon-wrap { color: #64748b; margin-top: 2px; }
        .text-wrap { display: flex; flex-direction: column; }
        .l-label { font-size: 0.8125rem; font-weight: 700; color: #0f172a; }
        .l-desc { font-size: 0.6875rem; color: #64748b; line-height: 1.3; margin-top: 1px; }
        .check-icon { color: #0f172a; }

        .permission-note-stable { font-size: 0.8125rem; color: #64748b; max-width: 240px; line-height: 1.4; }

        .actions-cell { display: flex; gap: 0.5rem; }
        .icon-btn-action { 
          width: 32px; 
          height: 32px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          border: 1px solid #e2e8f0; 
          background: #ffffff; 
          border-radius: 6px; 
          color: #64748b; 
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-btn-action:hover { border-color: #0f172a; color: #0f172a; }

        /* Mobile View Styling */
        .mobile-user-card { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .m-card-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
        .m-avatar { 
          width: 44px; height: 44px; background: #0f172a; color: white; border-radius: 6px; 
          display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.25rem;
        }
        .m-info { display: flex; flex-direction: column; flex: 1; }
        .m-name { font-size: 1rem; font-weight: 800; color: #0f172a; }
        .m-email { font-size: 0.8125rem; color: #64748b; }
        .m-role-section .role-dropdown-container { width: 100%; }
        .m-role-section .role-options-panel { width: 100%; position: fixed; bottom: 0; left: 0; border-radius: var(--radius) var(--radius) 0 0; }

        .loading-state { height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: #64748b; }
        .spinner { width: 24px; height: 24px; border: 2px solid #f8fafc; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Approval action pills */
        .approval-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .action-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 11px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .approve-pill {
          background: #ecfdf5;
          color: #059669;
          border-color: #6ee7b7;
        }
        .approve-pill:hover {
          background: #10b981;
          color: white;
          border-color: #10b981;
          box-shadow: 0 2px 8px rgba(16,185,129,0.3);
        }
        .reject-pill {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fca5a5;
        }
        .reject-pill:hover {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
          box-shadow: 0 2px 8px rgba(239,68,68,0.3);
        }
        .icon-btn-delete {
          width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: var(--radius);
          border: 1.5px solid #fca5a5;
          background: #fef2f2;
          color: #dc2626;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .icon-btn-delete:hover {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
          box-shadow: 0 2px 8px rgba(239,68,68,0.25);
        }
        /* Mobile approval actions */
        .m-approval-actions {
          display: flex;
          gap: 8px;
          margin-top: 1rem;
        }
        .m-action-pill {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .m-approve-pill {
          background: #ecfdf5;
          color: #059669;
          border-color: #6ee7b7;
        }
        .m-approve-pill:hover { background: #10b981; color: white; border-color: #10b981; }
        .m-reject-pill {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fca5a5;
        }
        .m-reject-pill:hover { background: #ef4444; color: white; border-color: #ef4444; }

        .animate-pop-in {
          animation: popIn 0.2s ease-out;
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
    </DashboardLayout>
  );
}
