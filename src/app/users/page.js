'use client';
import { useState, useEffect, useRef } from 'react';
import { Shield, User as UserIcon, Mail, ShieldCheck, Briefcase, Calculator, UserCog, ChevronDown, Check, CheckCircle, XCircle, Trash2, UserPlus, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  
  const [openUserSelect, setOpenUserSelect] = useState(null);
  const selectRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'accountant' });
  const [creating, setCreating] = useState(false);

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

  const updateRole = async () => {
    if (!pendingRoleChange) return;
    const { userId, role } = pendingRoleChange;
    try {
      await axios.patch('/api/users', {
        userId,
        role: role,
        adminId: currentUser._id
      });
      setUsers(users.map(u => u._id === userId ? { ...u, role } : u));
      setPendingRoleChange(null);
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
    { value: 'accountant', label: 'Accounts Manager', icon: <Calculator size={14} />, desc: 'Transactional data entry & ledger management.' }
  ];

  const getRoleInfo = (role) => roleOptions.find(o => o.value === role?.toLowerCase()) || roleOptions[0];

  const createUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post('/api/users/invite', {
        ...createForm,
        adminId: currentUser._id
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', role: 'accountant' });
      fetchUsers();
      alert('Invitation sent! The user will receive a confirmation email.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const UserSkeleton = () => (
    <div className="skeleton-users">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-col user-info">
            <div className="skeleton-avatar shim"></div>
            <div className="skeleton-text-stack">
              <div className="skeleton-line shim w-60"></div>
              <div className="skeleton-line shim w-40"></div>
            </div>
          </div>
          <div className="skeleton-col"><div className="skeleton-pill shim"></div></div>
          <div className="skeleton-col"><div className="skeleton-line shim w-40"></div></div>
          <div className="skeleton-col"><div className="skeleton-actions shim"></div></div>
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="users-container animate-fade-in" ref={selectRef}>
        <div className="users-header">
          <div className="title-area">
            <div className="icon-slate"><Shield size={28} /></div>
            <div>
              <h2>User Management</h2>
              <p>System access control & authority directory</p>
            </div>
          </div>
          {currentUser?.role === 'admin' && (
            <div className="page-actions">
              <button className="btn-create-user" onClick={() => setShowCreateModal(true)}>
                <UserPlus size={16} />
                <span>Create User</span>
              </button>
            </div>
          )}
        </div>

        <div className="table-card">
          {loading || !currentUser ? (
            <UserSkeleton />
          ) : (
            <>
              <div className="desktop-only">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Access</th>
                      <th>Operations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="user-row">
                        <td>
                          <div className="user-cell">
                            <div className="user-info">
                              <span className="user-name">{u.name}</span>
                              <span className="user-email">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="custom-select-wrapper">
                            <div 
                              className={`role-trigger ${openUserSelect === u._id ? 'active' : ''} ${u.role === 'admin' ? 'disabled' : ''}`}
                              onClick={() => u.role !== 'admin' && setOpenUserSelect(openUserSelect === u._id ? null : u._id)}
                            >
                              <div className="role-current">
                                {getRoleInfo(u.role).icon}
                                <span>{getRoleInfo(u.role).label}</span>
                              </div>
                              {u.role !== 'admin' && <ChevronDown size={14} className={`arrow ${openUserSelect === u._id ? 'rotate' : ''}`} />}
                            </div>
                            {openUserSelect === u._id && (
                              <div className="role-dropdown animate-pop-in">
                                {roleOptions.filter(opt => opt.value !== 'admin').map((option) => (
                                  <div 
                                    key={option.value}
                                    className={`role-option ${u.role === option.value ? 'selected' : ''}`}
                                    onClick={() => {
                                      setPendingRoleChange({ userId: u._id, role: option.value, userName: u.name });
                                      setOpenUserSelect(null);
                                    }}
                                  >
                                    <div className="option-icon">{option.icon}</div>
                                    <div className="option-text">
                                      <span className="option-label">{option.label}</span>
                                      <span className="option-desc">{option.desc}</span>
                                    </div>
                                    {u.role === option.value && <Check size={14} className="check-icon" />}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div 
                            className={`status-toggle ${u.isActive ? 'active' : ''} ${u.role === 'admin' ? 'disabled' : ''}`}
                            onClick={() => u.role !== 'admin' && updateStatus(u._id, !u.isActive)}
                          >
                            <div className="toggle-knob"></div>
                            <span className="status-label">{u.isActive ? 'Active' : 'Revoked'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="action-row">
                            {u.role !== 'admin' && (
                              <button className="icon-btn-delete" onClick={() => deleteUser(u._id, u.name)} title="Reject & Delete Account">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-only">
                <div className="mobile-user-list">
                  {users.map((u) => (
                    <div key={u._id} className="mobile-user-card">
                      <div className="m-card-header">
                        <div className="m-info">
                          <span className="m-name">{u.name} {u._id === currentUser._id && <span className="self-badge">YOU</span>}</span>
                          <span className="m-email">{u.email}</span>
                        </div>
                      </div>
                      <div className="m-role-section">
                        <div className="custom-select-wrapper">
                          <div 
                            className={`role-trigger ${openUserSelect === u._id ? 'active' : ''} ${(u._id === currentUser._id || u.role === 'admin') ? 'disabled' : ''}`}
                            onClick={() => (u._id !== currentUser._id && u.role !== 'admin') && setOpenUserSelect(openUserSelect === u._id ? null : u._id)}
                          >
                            <div className="role-current">
                              {getRoleInfo(u.role).icon}
                              <span>{getRoleInfo(u.role).label}</span>
                            </div>
                            {(u._id !== currentUser._id && u.role !== 'admin') && <ChevronDown size={14} className={`arrow ${openUserSelect === u._id ? 'rotate' : ''}`} />}
                          </div>
                          {openUserSelect === u._id && (
                            <div className="role-dropdown animate-pop-in">
                              {roleOptions.filter(opt => opt.value !== 'admin').map((option) => (
                                <div 
                                  key={option.value}
                                  className={`role-option ${u.role === option.value ? 'selected' : ''}`}
                                  onClick={() => {
                                    setPendingRoleChange({ userId: u._id, role: option.value, userName: u.name });
                                    setOpenUserSelect(null);
                                  }}
                                >
                                  <div className="option-icon">{option.icon}</div>
                                  <div className="option-text">
                                    <span className="option-label">{option.label}</span>
                                  </div>
                                  {u.role === option.value && <Check size={14} className="check-icon" />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="m-actions-footer">
                        {u._id !== currentUser._id && !u.isActive && u.role !== 'admin' ? (
                          <div className="m-approval-grid">
                            <button className="m-btn-approve" onClick={() => updateStatus(u._id, true)}>Approve Access</button>
                            <button className="m-btn-reject" onClick={() => deleteUser(u._id, u.name)}>Reject</button>
                          </div>
                        ) : (
                          <div className="m-status-row">
                            <div 
                              className={`status-toggle ${u.isActive ? 'active' : ''} ${(u._id === currentUser._id || u.role === 'admin') ? 'disabled' : ''}`}
                              onClick={() => (u._id !== currentUser._id && u.role !== 'admin') && updateStatus(u._id, !u.isActive)}
                            >
                              <div className="toggle-knob"></div>
                              <span className="status-label">{u.isActive ? 'Active' : 'Revoked'}</span>
                            </div>
                            {u._id !== currentUser._id && u.role !== 'admin' && (
                              <button className="m-delete-btn" onClick={() => deleteUser(u._id, u.name)}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {pendingRoleChange && (
          <div className="modal-overlay" onClick={() => setPendingRoleChange(null)}>
            <div className="modal-card animate-pop-in alert-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Confirm Role Change</h3>
                  <p>Are you sure you want to change authority levels?</p>
                </div>
                <button className="modal-close" onClick={() => setPendingRoleChange(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="role-change-preview">
                  <div className="user-preview">
                    <span className="label">Target User:</span>
                    <span className="value">{pendingRoleChange.userName}</span>
                  </div>
                  <div className="role-preview">
                    <span className="label">New Authority:</span>
                    <div className="role-pill">
                      {getRoleInfo(pendingRoleChange.role).icon}
                      <span>{getRoleInfo(pendingRoleChange.role).label}</span>
                    </div>
                  </div>
                </div>
                <p className="warning-text">
                  This user will immediately gain or lose permissions associated with the <strong>{getRoleInfo(pendingRoleChange.role).label}</strong> role.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setPendingRoleChange(null)}>Cancel</button>
                <button className="btn-confirm" onClick={updateRole}>Confirm Authority</button>
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-card animate-pop-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Invite New User</h3>
                  <p>A confirmation email will be sent to the user.</p>
                </div>
                <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={createUser} className="modal-form">
                <div className="modal-field">
                  <label>Full Name</label>
                  <div className="modal-input-wrap">
                    <UserIcon size={16} />
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-field">
                  <label>Email Address</label>
                  <div className="modal-input-wrap">
                    <Mail size={16} />
                    <input
                      type="email"
                      placeholder="user@arionys.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-field">
                  <label>Assign Role</label>
                  <div className="modal-input-wrap">
                    <Shield size={16} />
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    >
                      {roleOptions.filter(o => o.value !== 'admin').map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-send-invite" disabled={creating}>
                  {creating ? 'Sending...' : 'Send Invitation'}
                </button>
              </form>
            </div>
          </div>
        )}

        <style jsx>{`
          .users-container { max-width: 1200px; margin: 0 auto; }
          .users-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
          .btn-create-user { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #0f172a; color: #ffffff; border: none; border-radius: 6px; font-size: 0.8125rem; font-weight: 800; cursor: pointer; transition: all 0.2s; }
          .btn-create-user:hover { background: #1e293b; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); }
          .title-area { display: flex; align-items: flex-start; gap: 1rem; }
          .title-area h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
          .title-area p { color: #64748b; font-size: 0.875rem; }
          .icon-slate { color: #0f172a; }
          .table-card { background: #ffffff; border-radius: 6px; border: 1px solid #e2e8f0; overflow: visible; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
          .users-table { width: 100%; border-collapse: collapse; text-align: left; }
          .users-table th { padding: 1rem 1.5rem; background: #f8fafc; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
          .users-table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
          .users-table tr:hover { background: #fafafa; }
          .user-cell { display: flex; align-items: center; }
          .user-info { display: flex; flex-direction: column; }
          .user-name { font-size: 0.9375rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.5rem; }
          .user-email { font-size: 0.8125rem; color: #64748b; }
          .self-badge { background: #0f172a; color: white; font-size: 0.6rem; padding: 1px 4px; border-radius: 4px; margin-left: 4px; }
          .custom-select-wrapper { position: relative; width: 200px; }
          .role-trigger { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
          .role-trigger:hover:not(.disabled) { border-color: #cbd5e1; }
          .role-trigger.active { border-color: #0f172a; background: white; }
          .role-trigger.disabled { opacity: 0.6; cursor: not-allowed; }
          .role-current { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; font-weight: 700; color: #0f172a; }
          .arrow { color: #94a3b8; transition: transform 0.2s; }
          .arrow.rotate { transform: rotate(180deg); }
          .role-dropdown { 
            position: absolute; 
            top: calc(100% + 8px); 
            left: 0; 
            width: 280px; 
            background: white; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            box-shadow: 0 15px 35px -5px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.05); 
            z-index: 100; 
            padding: 0.5rem; 
          }
          .role-option { 
            padding: 0.875rem 1rem; 
            border-radius: 6px; 
            display: flex; 
            align-items: flex-start; 
            gap: 1rem; 
            cursor: pointer; 
            transition: all 0.2s; 
            border: 1px solid transparent;
            margin-bottom: 2px;
          }
          .role-option:hover { background: #f8fafc; border-color: #f1f5f9; }
          .role-option.selected { background: #f1f5f9; border-color: #e2e8f0; }
          .option-icon { color: #475569; margin-top: 2px; }
          .role-option:hover .option-icon { color: #0f172a; }
          .option-text { display: flex; flex-direction: column; flex: 1; gap: 2px; }
          .option-label { font-size: 0.8125rem; font-weight: 800; color: #0f172a; }
          .option-desc { font-size: 0.725rem; color: #64748b; line-height: 1.4; }
          .status-toggle { 
            width: 40px; 
            height: 20px; 
            background: #cbd5e1; 
            border-radius: 10px; 
            position: relative; 
            cursor: pointer; 
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          }
          .status-toggle.active { background: #10b981; }
          .toggle-knob { 
            width: 14px; 
            height: 14px; 
            background: white; 
            border-radius: 50%; 
            position: absolute; 
            top: 3px;
            left: 3px; 
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
          }
          .status-toggle.active .toggle-knob { left: calc(100% - 17px); }
          .status-label { 
            position: absolute;
            left: 50px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 0.65rem; 
            font-weight: 800; 
            text-transform: uppercase; 
            color: #64748b; 
            white-space: nowrap;
            letter-spacing: 0.05em;
          }
          .status-toggle.active .status-label { color: #059669; }
          .status-toggle.disabled { opacity: 0.5; cursor: not-allowed; }
          .icon-btn-delete { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #fee2e2; background: #fef2f2; color: #ef4444; cursor: pointer; transition: all 0.2s; }
          .icon-btn-delete:hover { background: #ef4444; color: white; border-color: #ef4444; }
          .m-approval-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 0.5rem; width: 100%; }
          .m-btn-approve { padding: 0.75rem; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: 800; font-size: 0.8125rem; }
          .m-btn-reject { padding: 0.75rem; background: #fef2f2; color: #ef4444; border: 1.5px solid #fee2e2; border-radius: 6px; font-weight: 800; font-size: 0.8125rem; }
          .m-status-row { display: flex; justify-content: space-between; width: 100%; align-items: center; }
          .m-delete-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: #fef2f2; color: #ef4444; border: none; }
          .animate-fade-in { animation: fadeIn 0.4s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .shim { background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          .mobile-user-card { padding: 1.25rem; border-bottom: 1px solid #e2e8f0; }
          .m-card-header { display: flex; align-items: center; margin-bottom: 1rem; }
          .m-info { display: flex; flex-direction: column; }
          .m-name { font-size: 0.9375rem; font-weight: 800; color: #0f172a; }
          .m-email { font-size: 0.75rem; color: #64748b; }
          .m-role-section { margin-bottom: 1.25rem; }
          .m-actions-footer { display: flex; justify-content: space-between; align-items: center; }
          .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: transparent; display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
          .modal-card { background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; width: 100%; max-width: 440px; box-shadow: 0 30px 100px -20px rgba(0, 0, 0, 0.25), 0 10px 40px -10px rgba(0, 0, 0, 0.1); }
          .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.5rem 1.75rem; border-bottom: 1px solid #f1f5f9; }
          .modal-header h3 { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem; }
          .modal-header p { font-size: 0.8125rem; color: #64748b; margin: 0; }
          .modal-close { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.15s; }
          .modal-close:hover { color: #0f172a; background: #f1f5f9; }
          .modal-form { padding: 1.5rem 1.75rem; display: flex; flex-direction: column; gap: 1.25rem; }
          .modal-field label { display: block; margin-bottom: 0.5rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
          .modal-input-wrap { position: relative; display: flex; align-items: center; }
          .modal-input-wrap :global(svg) { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }
          .modal-input-wrap input, .modal-input-wrap select { width: 100%; padding: 0.75rem 1rem 0.75rem 2.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.875rem; color: #0f172a; transition: all 0.2s; font-weight: 600; }
          .modal-input-wrap input:focus, .modal-input-wrap select:focus { background: white; border-color: #0f172a; box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05); outline: none; }
          .btn-send-invite { width: 100%; padding: 0.875rem; background: #0f172a; color: white; border: none; border-radius: 6px; font-size: 0.875rem; font-weight: 800; cursor: pointer; transition: all 0.2s; margin-top: 0.5rem; }
          .btn-send-invite:hover:not(:disabled) { background: #1e293b; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); }
          .btn-send-invite:disabled { opacity: 0.6; cursor: not-allowed; }
          .animate-pop-in { animation: popIn 0.2s ease-out; }
          @keyframes popIn { from { opacity: 0; transform: scale(0.95) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          
          .alert-modal { max-width: 440px; border: 1px solid #0f172a10; }
          .modal-body { padding: 1.75rem; }
          .role-change-preview { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-left: 4px solid #0f172a;
            border-radius: 6px; 
            padding: 1.5rem; 
            margin-bottom: 1.5rem; 
            display: flex; 
            flex-direction: column; 
            gap: 1rem; 
          }
          .user-preview, .role-preview { display: flex; justify-content: space-between; align-items: center; }
          .user-preview .label, .role-preview .label { font-size: 0.65rem; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
          .user-preview .value { font-size: 1rem; font-weight: 800; color: #0f172a; }
          .role-pill { 
            display: flex; 
            align-items: center; 
            gap: 0.625rem; 
            background: #0f172a; 
            color: white; 
            padding: 0.5rem 1rem; 
            border-radius: 6px; 
            font-size: 0.8125rem; 
            font-weight: 800; 
            box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
          }
          .warning-text { font-size: 0.875rem; color: #64748b; line-height: 1.6; text-align: center; margin: 0 auto; max-width: 90%; }
          .warning-text strong { color: #0f172a; border-bottom: 2px solid #e2e8f0; }
          .modal-footer { padding: 1.5rem 1.75rem; background: #f8fafc; border-top: 1px solid #f1f5f9; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
          .btn-cancel { padding: 0.875rem; border: 1.5px solid #e2e8f0; background: white; border-radius: 6px; font-weight: 800; font-size: 0.875rem; color: #64748b; cursor: pointer; transition: all 0.2s; }
          .btn-cancel:hover { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }
          .btn-confirm { padding: 0.875rem; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: 800; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1); }
          .btn-confirm:hover { background: #1e293b; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2); }
          .btn-confirm:active { transform: translateY(0); }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
