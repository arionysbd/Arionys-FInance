'use client';
import { useState, useEffect, useRef } from 'react';
import { Shield, User as UserIcon, Mail, ShieldCheck, Briefcase, Calculator, UserCog, ChevronDown, Check, CheckCircle, XCircle, Trash2, UserPlus, X, Building2, Hash, Calendar, Crown, Pencil, Phone, Globe, MapPin, Factory, Save, ArrowRight, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';

export default function CompanyMembers() {
  const [users, setUsers] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  
  const [openUserSelect, setOpenUserSelect] = useState(null);
  const selectRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openInviteSelect, setOpenInviteSelect] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'accountant' });
  const [creating, setCreating] = useState(false);

  const [showEditCompany, setShowEditCompany] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', website: '', industry: '', address: '' });
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyError, setCompanyError] = useState('');
  const [companySuccess, setCompanySuccess] = useState('');

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
      const { data } = await axios.get(`/api/members?companyId=${currentUser?.companyId}`);
      setUsers(data.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompany = async () => {
    try {
      const { data } = await axios.get('/api/company');
      if (data.success) setCompany(data.data);
    } catch (err) {
      console.error('Error fetching company:', err);
    }
  };

  useEffect(() => {
    if (currentUser?.companyId) {
      fetchUsers();
      fetchCompany();
    }
  }, [currentUser]);

  const openEditCompany = () => {
    setEditForm({
      name:     company?.name     || '',
      email:    company?.email    || '',
      phone:    company?.phone    || '',
      website:  company?.website  || '',
      industry: company?.industry || '',
      address:  company?.address  || '',
    });
    setCompanyError('');
    setCompanySuccess('');
    setShowEditCompany(true);
  };

  const saveCompany = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) { setCompanyError('Company name is required.'); return; }
    setSavingCompany(true);
    setCompanyError('');
    setCompanySuccess('');
    try {
      const { data } = await axios.patch('/api/company', editForm);
      if (data.success) {
        setCompany(data.data);
        setCompanySuccess('Company details updated successfully.');
        setTimeout(() => setShowEditCompany(false), 1200);
      }
    } catch (err) {
      setCompanyError(err.response?.data?.message || 'Failed to update company.');
    } finally {
      setSavingCompany(false);
    }
  };

  const updateRole = async () => {
    if (!pendingRoleChange) return;
    const { userId, role } = pendingRoleChange;
    try {
      await axios.patch('/api/members', {
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
      await axios.patch('/api/members', {
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
      await axios.delete('/api/members', {
        data: { userId, adminId: currentUser._id }
      });
      setUsers(users.filter(u => u._id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // Power hierarchy — must match the server-side ROLE_POWER map
  const ROLE_POWER = { owner: 6, admin: 5, ceo: 4, cfo: 3, csuit: 2, accountant: 1 };
  const getPower = (role) => ROLE_POWER[role?.toLowerCase()] ?? 0;
  const myPower = getPower(currentUser?.role);

  // Returns true if current user can manage (change role / toggle status / delete) the target
  const canManage = (targetRole) => myPower > getPower(targetRole);

  // Returns role options that are strictly below the current user's power level
  const assignableRoles = (baseOptions) => baseOptions.filter(o => getPower(o.value) < myPower);

  const roleOptions = [
    { value: 'admin',      label: 'Administrator',           icon: <ShieldCheck size={14} />, desc: 'Full system control & user oversight.', accesses: ['Full system control & configuration', 'Manage all users & permissions', 'View & edit all company data'] },
    { value: 'ceo',        label: 'Chief Executive Officer',  icon: <Briefcase size={14} />,   desc: 'Strategic oversight & executive approvals.', accesses: ['Strategic oversight & executive approvals', 'View all financial data', 'Manage board members & staff'] },
    { value: 'cfo',        label: 'Chief Financial Officer',  icon: <Calculator size={14} />,  desc: 'Fiscal monitoring & transaction verification.', accesses: ['Fiscal monitoring & reporting', 'Verify & approve transactions', 'Manage accounting staff'] },
    { value: 'csuit',      label: 'Board Member',             icon: <Briefcase size={14} />,   desc: 'Analytical view of organizational health.', accesses: ['View high-level organizational health', 'Read-only access to financial reports', 'Participate in board votes'] },
    { value: 'accountant', label: 'Accounts Manager',         icon: <Calculator size={14} />,  desc: 'Transactional data entry & ledger management.', accesses: ['Transactional data entry', 'Ledger management', 'Prepare draft financial reports'] },
  ];

  const getRoleInfo = (role) => roleOptions.find(o => o.value === role?.toLowerCase()) || { label: role, icon: <ShieldCheck size={14} />, desc: '', accesses: [] };

  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  const createUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      await axios.post('/api/members/invite', {
        email: createForm.email,
        role: createForm.role,
      });
      setInviteSuccess(`Invitation sent to ${createForm.email}. They'll receive a link to create their account.`);
      setCreateForm({ name: '', email: '', role: 'accountant' });
      setTimeout(() => { setShowCreateModal(false); setInviteSuccess(''); }, 3000);
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to send invitation.');
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

  // Business Administration is restricted to administrator accounts
  if (!isManager) {
    return (
      <DashboardLayout>
        <div className="access-denied">
          <AlertCircle size={40} />
          <h3>Access Restricted</h3>
          <p>Business Administration is only available to administrator accounts.</p>
        </div>
        <style jsx>{`
          .access-denied { max-width: 420px; margin: 4rem auto; padding: 2.5rem 2rem; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; color: #94a3b8; }
          .access-denied h3 { margin: 1rem 0 0.5rem; font-size: 1.125rem; font-weight: 800; color: #0f172a; }
          .access-denied p { margin: 0; font-size: 0.875rem; color: #64748b; }
        `}</style>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="users-container animate-fade-in" ref={selectRef}>
        <div className="users-header">
          <div className="title-area">
            <div className="icon-slate"><Building2 size={28} /></div>
            <div>
              <h2>Business Administration</h2>
              <p>Company profile and business access management</p>
            </div>
          </div>
          {['owner', 'admin'].includes(currentUser?.role) && (
            <div className="page-actions">
              <button className="btn-create-user" onClick={() => setShowCreateModal(true)}>
                <UserPlus size={16} />
                <span className="btn-text">Invite Member</span>
              </button>
            </div>
          )}
        </div>

        {/* Company Details Card */}
        {company && (
          <div className="company-card">
            <div className="company-card-header">
              <div className="company-logo-circle">
                <Building2 size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 className="company-name">{company.name}</h3>
                <span className="company-label">Registered Organisation</span>
              </div>
              {['admin', 'owner'].includes(currentUser?.role?.toLowerCase()) && (
                <button className="btn-edit-company" onClick={openEditCompany} title="Edit company details">
                  <Pencil size={15} />
                  <span>Edit Details</span>
                </button>
              )}
            </div>
            <div className="company-meta-grid">
              <div className="company-meta-item">
                <Hash size={14} className="meta-icon" />
                <div>
                  <span className="meta-label">Company ID</span>
                  <span className="meta-value mono">{String(company._id).slice(-8).toUpperCase()}</span>
                </div>
              </div>
              <div className="company-meta-item">
                <Crown size={14} className="meta-icon" />
                <div>
                  <span className="meta-label">Owner</span>
                  <span className="meta-value">{users.find(u => u._id === String(company.ownerId) || String(u._id) === String(company.ownerId))?.name || 'Owner'}</span>
                </div>
              </div>

              <div className="company-meta-item">
                <Shield size={14} className="meta-icon" />
                <div>
                  <span className="meta-label">Total Members</span>
                  <span className="meta-value">{users.length} active</span>
                </div>
              </div>
              {company.email && (
                <div className="company-meta-item">
                  <Mail size={14} className="meta-icon" />
                  <div>
                    <span className="meta-label">Email</span>
                    <span className="meta-value">{company.email}</span>
                  </div>
                </div>
              )}
              {company.phone && (
                <div className="company-meta-item">
                  <Phone size={14} className="meta-icon" />
                  <div>
                    <span className="meta-label">Phone</span>
                    <span className="meta-value">{company.phone}</span>
                  </div>
                </div>
              )}
              {company.website && (
                <div className="company-meta-item">
                  <Globe size={14} className="meta-icon" />
                  <div>
                    <span className="meta-label">Website</span>
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="meta-value meta-link">{company.website}</a>
                  </div>
                </div>
              )}
              {company.industry && (
                <div className="company-meta-item">
                  <Factory size={14} className="meta-icon" />
                  <div>
                    <span className="meta-label">Industry</span>
                    <span className="meta-value">{company.industry}</span>
                  </div>
                </div>
              )}
              {company.address && (
                <div className="company-meta-item" style={{ gridColumn: 'span 2' }}>
                  <MapPin size={14} className="meta-icon" />
                  <div>
                    <span className="meta-label">Address</span>
                    <span className="meta-value">{company.address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
                              className={`role-trigger ${openUserSelect === u._id ? 'active' : ''} ${!canManage(u.role) ? 'disabled' : ''}`}
                              onClick={() => canManage(u.role) && setOpenUserSelect(openUserSelect === u._id ? null : u._id)}
                            >
                              <div className="role-current">
                                {getRoleInfo(u.role).icon}
                                <span>{getRoleInfo(u.role).label}</span>
                              </div>
                              {canManage(u.role) && <ChevronDown size={14} className={`arrow ${openUserSelect === u._id ? 'rotate' : ''}`} />}
                            </div>
                            {openUserSelect === u._id && (
                              <div className="role-dropdown animate-pop-in">
                                {assignableRoles(roleOptions).map((option) => (
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
                        </td>
                        <td>
                          <div 
                            className={`status-toggle ${u.isActive ? 'active' : ''} ${!canManage(u.role) ? 'disabled' : ''}`}
                            onClick={() => canManage(u.role) && updateStatus(u._id, !u.isActive)}
                          >
                            <div className="toggle-knob"></div>
                            <span className="status-label">{u.isActive ? 'Active' : 'Revoked'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="action-row">
                            {canManage(u.role) && (
                              <button className="icon-btn-delete" onClick={() => deleteUser(u._id, u.name)} title="Delete Account">
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

<<<<<<< Updated upstream
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
                            className={`role-trigger ${openUserSelect === u._id ? 'active' : ''} ${!canManage(u.role) ? 'disabled' : ''}`}
                            onClick={() => canManage(u.role) && setOpenUserSelect(openUserSelect === u._id ? null : u._id)}
                          >
                            <div className="role-current">
                              {getRoleInfo(u.role).icon}
                              <span>{getRoleInfo(u.role).label}</span>
                            </div>
                            {canManage(u.role) && <ChevronDown size={14} className={`arrow ${openUserSelect === u._id ? 'rotate' : ''}`} />}
                          </div>
                          {openUserSelect === u._id && (
                            <div className="role-dropdown animate-pop-in">
                              {assignableRoles(roleOptions).map((option) => (
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
                        {canManage(u.role) && !u.isActive ? (
                          <div className="m-approval-grid">
                            <button className="m-btn-approve" onClick={() => updateStatus(u._id, true)}>Approve Access</button>
                            <button className="m-btn-reject" onClick={() => deleteUser(u._id, u.name)}>Reject</button>
                          </div>
                        ) : (
                          <div className="m-status-row">
                            <div 
                              className={`status-toggle ${u.isActive ? 'active' : ''} ${!canManage(u.role) ? 'disabled' : ''}`}
                              onClick={() => canManage(u.role) && updateStatus(u._id, !u.isActive)}
                            >
                              <div className="toggle-knob"></div>
                              <span className="status-label">{u.isActive ? 'Active' : 'Revoked'}</span>
                            </div>
                            {canManage(u.role) && (
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
=======
            <div className="card form-card">
              <h3 className="card-title">Localization & Legal</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Country</label>
                  <div className="input-with-icon">
                    <Flag size={16} className="field-icon" />
                    <input type="text" name="country" value={formData.country} onChange={handleInputChange} readOnly={!isManager} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Currency</label>
                  <div className="input-with-icon">
                    <Coins size={16} className="field-icon" />
                    <select name="currency" value={formData.currency} onChange={handleInputChange} disabled={!isManager}>
                      <option value="BDT">BDT - Bangladeshi Taka</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>
                </div>
                <div className="form-field">
                  <label>Registration Number</label>
                  <div className="input-with-icon">
                    <ShieldCheck size={16} className="field-icon" />
                    <input type="text" name="registrationNo" value={formData.registrationNo} onChange={handleInputChange} readOnly={!isManager} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Tax ID (TIN/VAT)</label>
                  <div className="input-with-icon">
                    <ShieldCheck size={16} className="field-icon" />
                    <input type="text" name="taxNo" value={formData.taxNo} onChange={handleInputChange} readOnly={!isManager} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Departments & Designations */}
          <div className="lists-col">
            <div className="card list-card">
              <h3 className="card-title">Departments</h3>
              <p className="card-desc">Configure departments used during employee registration.</p>
              
              {isManager && (
                <div className="add-item-row">
                  <input 
                    type="text" 
                    placeholder="E.g., Engineering, HR..." 
                    value={newDepartment} 
                    onChange={e => setNewDepartment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddDepartment()}
                  />
                  <button onClick={handleAddDepartment} className="btn-add"><Plus size={16}/></button>
                </div>
              )}
              
              {departments.length === 0 ? (
                <span className="empty-text">No departments added.</span>
              ) : (
                <ul className="item-list">
                  {departments.map((dept, i) => (
                    <li key={dept} className="list-row">
                      <span className="list-index">{i + 1}</span>
                      <span className="list-name">{dept}</span>
                      {isManager && (
                        <button type="button" className="list-remove" onClick={() => handleRemoveDepartment(dept)} title={`Remove ${dept}`}>
                          <X size={14}/>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card list-card">
              <h3 className="card-title">Designations</h3>
              <p className="card-desc">Configure job titles and designations for employees.</p>
              
              {isManager && (
                <div className="add-item-row">
                  <input 
                    type="text" 
                    placeholder="E.g., Software Engineer, Manager..." 
                    value={newDesignation} 
                    onChange={e => setNewDesignation(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddDesignation()}
                  />
                  <button onClick={handleAddDesignation} className="btn-add"><Plus size={16}/></button>
                </div>
              )}
              
              {designations.length === 0 ? (
                <span className="empty-text">No designations added.</span>
              ) : (
                <ul className="item-list">
                  {designations.map((desig, i) => (
                    <li key={desig} className="list-row">
                      <span className="list-index">{i + 1}</span>
                      <span className="list-name">{desig}</span>
                      {isManager && (
                        <button type="button" className="list-remove" onClick={() => handleRemoveDesignation(desig)} title={`Remove ${desig}`}>
                          <X size={14}/>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
>>>>>>> Stashed changes
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
                
                <div className="access-list-container">
                  <p className="access-title">Granted Access & Permissions</p>
                  <ul className="access-list">
                    {getRoleInfo(pendingRoleChange.role).accesses?.map((access, idx) => (
                      <li key={idx}>
                        <Check size={14} className="access-check" />
                        <span>{access}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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
                  <h3>Invite New Member</h3>
                  <p>Send an invitation link to join your organization.</p>
                </div>
                <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                  <X size={18} />
                </button>
              </div>

              {inviteSuccess ? (
                <div className="invite-success-state">
                  <div className="success-icon-wrap">
                    <CheckCircle size={32} />
                  </div>
                  <h4>Invitation Sent!</h4>
                  <p>{inviteSuccess}</p>
                </div>
              ) : (
                <form onSubmit={createUser} className="modal-form">
                  {inviteError && (
                    <div className="form-error">
                      <AlertCircle size={14} />
                      <span>{inviteError}</span>
                    </div>
                  )}

                  <div className="modal-field">
                    <label>Email Address</label>
                    <div className="modal-input-wrap">
                      <Mail size={16} />
                      <input
                        type="email"
                        placeholder="colleague@company.com"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="modal-field">
                    <label>Assign Authority</label>
                    <div className="modal-custom-select-wrapper">
                      <div 
                        className={`modal-select-trigger ${openInviteSelect ? 'active' : ''}`}
                        onClick={() => setOpenInviteSelect(!openInviteSelect)}
                      >
                        <div className="m-trigger-content">
                          {getRoleInfo(createForm.role).icon}
                          <span>{getRoleInfo(createForm.role).label}</span>
                        </div>
                        <ChevronDown size={14} className={`m-arrow ${openInviteSelect ? 'rotate' : ''}`} />
                      </div>
                      
                      {openInviteSelect && (
                        <div className="modal-role-dropdown animate-pop-in">
                          {roleOptions.filter(o => canManage(o.value)).map((opt) => (
                            <div 
                              key={opt.value} 
                              className={`m-role-option ${createForm.role === opt.value ? 'selected' : ''}`}
                              onClick={() => {
                                setCreateForm({ ...createForm, role: opt.value });
                                setOpenInviteSelect(false);
                              }}
                            >
                              <div className="m-opt-icon">{opt.icon}</div>
                              <div className="m-opt-text">
                                <span className="m-opt-label">{opt.label}</span>
                                <span className="m-opt-desc">{opt.desc}</span>
                              </div>
                              {createForm.role === opt.value && <Check size={14} className="m-check" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button type="submit" className="btn-send-invite" disabled={creating}>
                    {creating ? (
                      <><span className="spinner-small" />Sending Invitation...</>
                    ) : (
                      <>Send Invitation <ArrowRight size={15} /></>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Edit Company Modal */}
        {showEditCompany && (
          <div className="modal-overlay" onClick={() => setShowEditCompany(false)}>
            <div className="modal-card ec-modal animate-pop-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Edit Company Details</h3>
                  <p>Only administrators can change company information.</p>
                </div>
                <button className="modal-close" onClick={() => setShowEditCompany(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={saveCompany} className="ec-form">
                <div className="ec-grid">
                  <div className="modal-field ec-full">
                    <label>Company Name *</label>
                    <div className="modal-input-wrap">
                      <Building2 size={16} />
                      <input
                        type="text"
                        placeholder="Arionys Ltd."
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-field">
                    <label>Email</label>
                    <div className="modal-input-wrap">
                      <Mail size={16} />
                      <input
                        type="email"
                        placeholder="contact@company.com"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-field">
                    <label>Phone</label>
                    <div className="modal-input-wrap">
                      <Phone size={16} />
                      <input
                        type="tel"
                        placeholder="+880 1700 000000"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-field">
                    <label>Website</label>
                    <div className="modal-input-wrap">
                      <Globe size={16} />
                      <input
                        type="url"
                        placeholder="https://arionys.com"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-field">
                    <label>Industry</label>
                    <div className="modal-input-wrap">
                      <Factory size={16} />
                      <input
                        type="text"
                        placeholder="Finance & Investment"
                        value={editForm.industry}
                        onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-field ec-full">
                    <label>Address</label>
                    <div className="modal-input-wrap">
                      <MapPin size={16} />
                      <input
                        type="text"
                        placeholder="123 Business Avenue, Dhaka, Bangladesh"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {companyError && <p className="ec-error">{companyError}</p>}
                {companySuccess && <p className="ec-success">{companySuccess}</p>}

                <div className="modal-footer">
                  <button type="button" className="btn-cancel" onClick={() => setShowEditCompany(false)}>Cancel</button>
                  <button type="submit" className="btn-confirm" disabled={savingCompany}>
                    <Save size={15} />
                    {savingCompany ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <style jsx>{`
<<<<<<< Updated upstream
          .users-container { max-width: 1200px; margin: 0 auto; }
          .users-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.75rem; }
          .btn-create-user { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #0f172a; color: #ffffff; border: none; border-radius: 6px; font-size: 0.8125rem; font-weight: 800; cursor: pointer; transition: all 0.2s; }
          .btn-create-user:hover { background: #1e293b; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); }
          @media (max-width: 768px) {
            .btn-text { display: none; }
            .btn-create-user { padding: 0.75rem; border-radius: 6px; }
            .users-header { align-items: center; }
          }
          .title-area { display: flex; align-items: flex-start; gap: 1rem; }
          .title-area h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
          .title-area p { color: #64748b; font-size: 0.875rem; }
          .icon-slate { color: #0f172a; }

          /* Company Card */
          .btn-edit-company {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.5rem 0.875rem;
            background: white;
            color: #0f172a;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .btn-edit-company:hover { background: #0f172a; color: white; border-color: #0f172a; }

          /* Edit Company Modal */
          .modal-card.ec-modal { max-width: 720px; width: 90vw; }
          .ec-form { padding: 1.5rem 1.75rem; }
          .ec-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            margin-bottom: 1.25rem;
          }
          @media (max-width: 720px) { .ec-grid { grid-template-columns: 1fr; } }
          .ec-full { grid-column: span 2; }
          @media (max-width: 720px) { .ec-full { grid-column: span 1; } }
          .ec-error { margin: 0 0 1rem; padding: 0.75rem 1rem; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; font-size: 0.8125rem; font-weight: 700; color: #ef4444; }
          .ec-success { margin: 0 0 1rem; padding: 0.75rem 1rem; background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 6px; font-size: 0.8125rem; font-weight: 700; color: #10b981; }
          .meta-link { color: #4f46e5; text-decoration: underline; }

          /* Company Card */
          .company-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5rem 2rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          }
          .company-card-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1.25rem;
            border-bottom: 1px solid #f1f5f9;
          }
          .company-logo-circle {
            width: 48px;
            height: 48px;
            background: #0f172a;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
          }
          .company-name { font-size: 1.25rem; font-weight: 900; color: #0f172a; margin: 0 0 0.2rem; }
          .company-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
          .company-meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
          }
          @media (max-width: 900px) { .company-meta-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 500px) { .company-meta-grid { grid-template-columns: 1fr; } }
          .company-meta-item {
            display: flex;
            align-items: flex-start;
            gap: 0.625rem;
            padding: 0.875rem 1rem;
            background: #f8fafc;
            border-radius: 6px;
            border: 1px solid #f1f5f9;
          }
          .meta-icon { color: #64748b; margin-top: 2px; flex-shrink: 0; }
          .meta-label { display: block; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 0.2rem; }
          .meta-value { display: block; font-size: 0.875rem; font-weight: 800; color: #0f172a; }
          .meta-value.mono { font-family: monospace; font-size: 0.875rem; letter-spacing: 0.05em; }

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
          
          .custom-select-wrapper { position: relative; width: 230px; }
          .role-trigger { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
          .role-trigger:hover:not(.disabled) { border-color: #cbd5e1; }
          .role-trigger.active { border-color: #0f172a; background: white; box-shadow: 0 0 0 3px rgba(15,23,42,0.05); }
          .role-trigger.disabled { opacity: 0.6; cursor: not-allowed; }
          .role-current { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; font-weight: 700; color: #0f172a; white-space: nowrap; }
          .arrow { color: #94a3b8; transition: transform 0.2s; }
          .arrow.rotate { transform: rotate(180deg); }
          .role-dropdown { position: absolute; top: calc(100% + 8px); left: 0; width: 250px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); z-index: 1000; padding: 0.5rem; }
          .role-option { padding: 0.75rem 1rem; border-radius: 6px; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: all 0.15s; margin-bottom: 2px; }
          .role-option:hover { background: #f8fafc; }
          .role-option.selected { background: #f1f5f9; }
          .option-icon { color: #475569; display: flex; align-items: center; }
          .role-option:hover .option-icon, .role-option.selected .option-icon { color: #0f172a; }
          .option-text { display: flex; flex-direction: column; flex: 1; }
          .option-label { font-size: 0.85rem; font-weight: 700; color: #0f172a; }
          .check-icon { color: #0f172a; }
=======
          .admin-container { padding-bottom: 2rem; }
          .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
          .title-area { display: flex; align-items: center; gap: 1rem; }
          .title-area h2 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
          .title-area p { color: #64748b; font-size: 0.875rem; margin: 0.25rem 0 0 0; font-weight: 500; }
          .icon-slate { width: 48px; height: 48px; background: linear-gradient(135deg, #e2e8f0, #cbd5e1); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #475569; }

          .message-banner { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.875rem; }
          .message-banner.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
          .message-banner.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

          .admin-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; align-items: start; }
          .form-col, .lists-col { display: flex; flex-direction: column; gap: 1.5rem; min-width: 0; }
          @media (max-width: 900px) { .admin-grid { grid-template-columns: 1fr; } }
          
          .card { background: #fff; border-radius: 6px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
          .card-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 1.5rem; }
          .form-card { padding: 1.75rem; }
          
          .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem 1.5rem; }
          .form-field { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
          .full-width { grid-column: 1 / -1; }
          @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
          
          .form-field label { font-size: 0.8125rem; font-weight: 700; color: #334155; }
          .input-with-icon { position: relative; }
          .input-with-icon :global(.field-icon) { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; z-index: 1; }
          .input-with-icon:focus-within :global(.field-icon) { color: #4f46e5; }
          .input-with-icon input, .input-with-icon select { width: 100%; padding: 0.6875rem 1rem 0.6875rem 2.625rem; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.875rem; font-family: inherit; font-weight: 500; color: #0f172a; outline: none; transition: all 0.2s; background: #fff; }
          .input-with-icon select {
            appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 2.5rem;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
            background-repeat: no-repeat; background-position: right 0.875rem center; background-size: 16px;
          }
          .input-with-icon select:disabled { background-color: #f8fafc; color: #64748b; cursor: not-allowed; }
          .input-with-icon input:focus, .input-with-icon select:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
          .input-with-icon input[readonly] { background: #f8fafc; color: #64748b; cursor: not-allowed; }

          .list-card { padding: 1.75rem; }
          .card-desc { font-size: 0.8125rem; color: #64748b; margin-top: -1rem; margin-bottom: 1.5rem; }
          
          .add-item-row { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
          .add-item-row input { flex: 1; padding: 0.625rem 1rem; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.875rem; outline: none; }
          .add-item-row input:focus { border-color: #4f46e5; }
          .btn-add { background: #4f46e5; color: white; border: none; border-radius: 4px; width: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; }
          .btn-add:hover { background: #4338ca; }

          .empty-text { font-size: 0.875rem; color: #94a3b8; font-style: italic; }
          .item-list { list-style: none; margin: 0; padding: 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
          .list-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.875rem; border-bottom: 1px solid #f1f5f9; font-size: 0.875rem; font-weight: 600; color: #0f172a; transition: background 0.15s; }
          .list-row:last-child { border-bottom: none; }
          .list-row:hover { background: #f8fafc; }
          .list-index { flex-shrink: 0; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 4px; background: #eef2ff; color: #4f46e5; font-size: 0.6875rem; font-weight: 800; }
          .list-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .list-remove { flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px; border: none; border-radius: 4px; background: transparent; color: #94a3b8; cursor: pointer; transition: all 0.15s; }
          .list-remove:hover { background: #fef2f2; color: #dc2626; }
>>>>>>> Stashed changes

          .modal-form { padding: 1.5rem 1.75rem 2rem; }
          .modal-field { margin-bottom: 1.25rem; }
          .modal-field label { display: block; font-size: 0.75rem; font-weight: 800; color: #334155; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
          .modal-input-wrap { display: flex; align-items: center; gap: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; background: #f8fafc; transition: all 0.2s; }
          .modal-input-wrap:focus-within { border-color: #6366f1; background: #ffffff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
          .modal-input-wrap svg { color: #94a3b8; flex-shrink: 0; }
          .modal-input-wrap input { border: none; outline: none; background: transparent; flex: 1; font-size: 0.9rem; color: #0f172a; font-weight: 500; }
          .modal-input-wrap input::placeholder { color: #cbd5e1; font-weight: 400; }
          .modal-custom-select-wrapper { position: relative; }
          .modal-select-trigger { display: flex; align-items: center; justify-content: space-between; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem 1rem; background: #f8fafc; cursor: pointer; transition: all 0.2s; }
          .modal-select-trigger:hover, .modal-select-trigger.active { border-color: #6366f1; background: #ffffff; }
          .m-trigger-content { display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; font-weight: 600; color: #0f172a; }
          .m-trigger-content svg { color: #6366f1; }
          .m-arrow { color: #94a3b8; transition: transform 0.2s; }
          .m-arrow.rotate { transform: rotate(180deg); }
          .modal-role-dropdown { position: absolute; top: calc(100% + 8px); left: 0; width: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); z-index: 100; padding: 0.5rem; max-height: 250px; overflow-y: auto; }
          .m-role-option { padding: 0.75rem 1rem; border-radius: 6px; display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; transition: all 0.2s; margin-bottom: 2px; }
          .m-role-option:hover { background: #f8fafc; }
          .m-role-option.selected { background: #eef2ff; }
          .m-opt-icon { color: #6366f1; margin-top: 2px; }
          .m-opt-text { display: flex; flex-direction: column; flex: 1; gap: 2px; }
          .m-opt-label { font-size: 0.85rem; font-weight: 700; color: #0f172a; }
          .m-opt-desc { font-size: 0.75rem; color: #64748b; line-height: 1.4; }
          .m-check { color: #6366f1; }
          .btn-send-invite { width: 100%; padding: 0.9rem; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; border: none; border-radius: 8px; font-weight: 800; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(15,23,42,0.15); margin-top: 1.5rem; }
          .btn-send-invite:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(15,23,42,0.25); }
          .btn-send-invite:disabled { opacity: 0.7; cursor: not-allowed; }
          .spinner-small { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
          
          .invite-success-state { padding: 3rem 2rem; text-align: center; }
          .success-icon-wrap { width: 64px; height: 64px; background: #ecfdf5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; }
          .invite-success-state h4 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 0.5rem; }
          .invite-success-state p { font-size: 0.9rem; color: #64748b; line-height: 1.5; }
          .form-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; font-size: 0.8125rem; font-weight: 600; color: #ef4444; margin-bottom: 1.25rem; } 
          
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
          .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
          .modal-card { background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; width: 100%; max-width: 440px; box-shadow: 0 30px 100px -20px rgba(0, 0, 0, 0.25), 0 10px 40px -10px rgba(0, 0, 0, 0.1); }
          .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.5rem 1.75rem; border-bottom: 1px solid #f1f5f9; }
          .modal-header h3 { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem; }
          .modal-header p { font-size: 0.8125rem; color: #64748b; margin: 0; }
          .modal-close { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.15s; }
          .modal-close:hover { color: #0f172a; background: #f1f5f9; }
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
          .access-list-container { margin: 1.5rem 0 0.5rem; background: #f8fafc; padding: 1.25rem; border-radius: 8px; border: 1px solid #e2e8f0; }
          .access-title { font-size: 0.65rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 1rem; text-align: left; }
          .access-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
          .access-list li { display: flex; align-items: flex-start; gap: 0.625rem; font-size: 0.85rem; color: #334155; line-height: 1.4; font-weight: 600; }
          .access-check { color: #10b981; flex-shrink: 0; margin-top: 1px; }
          .modal-footer { padding: 1.5rem 1.75rem; background: #f8fafc; border-top: 1px solid #f1f5f9; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
          .btn-cancel { padding: 0.875rem; border: 1.5px solid #e2e8f0; background: white; border-radius: 6px; font-weight: 800; font-size: 0.875rem; color: #64748b; cursor: pointer; transition: all 0.2s; }
          .btn-cancel:hover { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }
          .btn-confirm { padding: 0.875rem; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: 800; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1); }
          .btn-confirm:hover { background: #1e293b; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2); }
          .btn-confirm:active { transform: translateY(0); }
          .modal-custom-select-wrapper { position: relative; width: 100%; }
          .modal-select-trigger {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            min-height: 44px;
          }
          .modal-select-trigger:hover { border-color: #cbd5e1; }
          .modal-select-trigger.active { background: white; border-color: #0f172a; box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05); }
          .m-trigger-content { display: flex; align-items: center; gap: 0.75rem; font-size: 0.875rem; font-weight: 700; color: #0f172a; }
          .m-trigger-content :global(svg) { color: #64748b; }
          .m-arrow { color: #64748b; transition: transform 0.3s; }
          .m-arrow.rotate { transform: rotate(180deg); }

          .modal-role-dropdown {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 0.5rem;
            z-index: 3000;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          }
          .m-role-option {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s;
          }
          .m-role-option:hover { background: #f8fafc; }
          .m-role-option.selected { background: #f1f5f9; }
          .m-opt-icon { color: #64748b; }
          .m-opt-text { display: flex; flex-direction: column; flex: 1; }
          .m-opt-label { font-size: 0.8125rem; font-weight: 700; color: #0f172a; }
          .m-opt-desc { font-size: 0.65rem; color: #94a3b8; font-weight: 500; }
          .m-check { color: #0f172a; }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
