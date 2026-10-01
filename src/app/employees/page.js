'use client';
import { useState, useEffect, useRef } from 'react';
import { Shield, User as UserIcon, Mail, ShieldCheck, Briefcase, Calculator, UserCog, ChevronDown, Check, CheckCircle, XCircle, Trash2, UserPlus, X, Building2, Hash, Calendar, Crown, Pencil, Phone, Globe, MapPin, Factory, Save, ArrowRight, AlertCircle, MoreVertical, Eye } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import CustomSelect from '@/components/UI/CustomSelect';
import AccessPicker from '@/components/UI/AccessPicker';
import { PERMISSIONS, DEFAULT_PERMISSIONS, hasPermission, isOwner, canSeeAccess } from '@/lib/permissions';
import Link from 'next/link';

export default function CompanyMembers() {
  const [users, setUsers] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  
  const [openUserSelect, setOpenUserSelect] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const selectRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  // Page-access editor: { member, permissions } while open
  const [accessEditor, setAccessEditor] = useState(null);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessError, setAccessError] = useState('');
  
  // Add Employee Form State
  const today = () => new Date().toISOString().split('T')[0];
  const emptyEmployeeForm = () => ({
    fullName: '',
    email: '',
    phone: '',
    employeeId: '',
    designation: '',
    joiningDate: today(),
    salary: '',
    loanLimit: '',
  });
  const [formData, setFormData] = useState(emptyEmployeeForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employeeError, setEmployeeError] = useState('');

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

  useEffect(() => {
    if (!openActionMenu) return;
    const closeActionMenu = (event) => {
      if (!event.target.closest('.action-menu')) setOpenActionMenu(null);
    };
    document.addEventListener('mousedown', closeActionMenu);
    return () => document.removeEventListener('mousedown', closeActionMenu);
  }, [openActionMenu]);

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
      if (data.success) {
        setCompany(data.data);
      }
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

  const openAccess = (member) => {
    setAccessError('');
    setAccessEditor({ member, permissions: member.permissions || [] });
    setOpenActionMenu(null);
  };

  const saveAccess = async () => {
    if (!accessEditor) return;
    const { member, permissions } = accessEditor;
    setSavingAccess(true);
    setAccessError('');
    try {
      const payload = member.isUser
        ? { userId: member._id, permissions }
        : { employeeId: member.employeeDocId, permissions };
      const { data } = await axios.patch('/api/members', payload);
      const saved = data.data?.permissions || permissions;
      setUsers(users.map(u => u._id === member._id ? { ...u, permissions: saved } : u));
      setAccessEditor(null);
    } catch (err) {
      setAccessError(err.response?.data?.message || 'Could not update access');
    } finally {
      setSavingAccess(false);
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

  const deleteUser = async (userId, employeeDocId, userName) => {
    if (!window.confirm(`Reject & permanently delete "${userName}"?\n\nThis action cannot be undone.`)) return;
    try {
      if (userId) {
        await axios.delete('/api/members', {
          data: { userId, adminId: currentUser._id }
        });
      } else if (employeeDocId) {
        // If it's a pending invite, maybe we want an endpoint to delete the employee.
        // For now, if no user ID, it's just an employee without a user. We should delete the employee.
        // Since we are merging, we should call /api/members DELETE with employeeDocId. Wait, /api/members doesn't handle employee deletion yet.
        // Let's pass employeeId if userId is null.
        await axios.delete('/api/members', {
          data: { employeeId: employeeDocId, adminId: currentUser._id }
        });
      }
      setUsers(users.filter(u => u._id !== userId && u._id !== employeeDocId));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // Anyone with the Employees page can manage other members, but never their own account
  // (the owner is not listed here at all). The API enforces the same rules.
  const canManageEmployees = hasPermission(currentUser, 'manage_employees');
  const canManage = (member) => canManageEmployees && Boolean(member) && member._id !== currentUser?._id;
  // Page access is only visible to the company admin and employee managers
  const showAccess = canSeeAccess(currentUser);

  // Page access can only be changed from the company admin account; others can view it
  const canEditAccess = isOwner(currentUser);

  const accessSummary = (keys = []) =>
    PERMISSIONS.filter(p => keys.includes(p.key)).map(p => p.label).join(', ') || 'No pages';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setEmployeeError('');
    setIsSubmitting(true);
    try {
      const res = await axios.post('/api/employees', formData);
      if (res.data.success) {
        setShowCreateModal(false);
        setFormData(emptyEmployeeForm());
        fetchUsers();
      } else {
        setEmployeeError(res.data.message);
      }
    } catch (err) {
      setEmployeeError(err.response?.data?.message || err.message);
    } finally {
      setIsSubmitting(false);
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
            <div className="icon-slate"><Building2 size={28} /></div>
            <div>
              <h2>Employees & Directory</h2>
              <p>Manage your company's workforce and user access</p>
            </div>
          </div>
          <span className="m-count">{users.length} {users.length === 1 ? 'member' : 'members'}</span>
          {canManageEmployees && (
            <div className="page-actions">
              <button className="btn-create-user" onClick={() => setShowCreateModal(true)}>
                <UserPlus size={16} />
                <span className="btn-text">Add Employee</span>
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
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone No</th>
                      <th>Designation</th>
                      {showAccess && <th>Access</th>}
                      <th>Limit</th>
                      <th>Status</th>
                      <th className="th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="user-row">
                        <td>
                          <span className="user-name">{u.fullName || u.name}</span>
                        </td>
                        <td><span className="cell-text">{u.email}</span></td>
                        <td><span className="cell-text">{u.phone || '—'}</span></td>
                        <td><span className="cell-text">{u.designation || '—'}</span></td>
                        {showAccess && (
                        <td>
                          <button
                            type="button"
                            className="access-cell"
                            onClick={() => openAccess(u)}
                                                        title={accessSummary(u.permissions)}
                          >
                            <span className="access-count">{u.permissions?.length || 0}</span>
                            <span>{(u.permissions?.length || 0) === 1 ? 'page' : 'pages'}</span>
                            {canEditAccess && canManage(u) && <Pencil size={12} className="access-edit" />}
                            </button>
                        </td>
                        )}
                        <td>
                          <span className="cell-text cell-strong">{u.loanLimit > 0 ? u.loanLimit.toLocaleString() : '—'}</span>
                        </td>
                        <td>
                          {u.isUser ? (
                            <div 
                              className={`status-toggle ${u.isActive ? 'active' : ''} ${!canManage(u) ? 'disabled' : ''}`}
                              onClick={() => canManage(u) && updateStatus(u._id, !u.isActive)}
                            >
                              <div className="toggle-knob"></div>
                              <span className="status-label">{u.isActive ? 'Active' : 'Revoked'}</span>
                            </div>
                          ) : (
                            <span className="status-label pending-label">Invite Sent</span>
                          )}
                        </td>
                        <td>
                          {(u.employeeDocId || canManage(u) || showAccess) && (
                            <div className="action-menu">
                              <button
                                type="button"
                                className={`action-menu-trigger ${openActionMenu === u._id ? 'open' : ''}`}
                                onClick={() => setOpenActionMenu(openActionMenu === u._id ? null : u._id)}
                                title="Actions"
                                aria-haspopup="menu"
                                aria-expanded={openActionMenu === u._id}
                              >
                                <MoreVertical size={16} />
                              </button>
                              {openActionMenu === u._id && (
                                <div className="action-menu-list animate-pop-in" role="menu">
                                  {u.employeeDocId && (
                                    <Link href={`/employees/${u.employeeDocId}`} className="action-menu-item" role="menuitem">
                                      <Eye size={14} />
                                      <span>View Profile</span>
                                    </Link>
                                  )}
                                  {showAccess && (
                                    <button type="button" className="action-menu-item" role="menuitem" onClick={() => openAccess(u)}>
                                      <ShieldCheck size={14} />
                                      <span>{canEditAccess ? 'Manage Access' : 'View Access'}</span>
                                    </button>
                                  )}
                                  {canManage(u) && (
                                    <button
                                      type="button"
                                      className="action-menu-item danger"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenActionMenu(null);
                                        deleteUser(u.isUser ? u._id : null, u.employeeDocId, u.fullName || u.name);
                                      }}
                                    >
                                      <Trash2 size={14} />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-only">
                <div className="m-list">
                  {users.map((u) => {
                    const displayName = u.fullName || u.name;
                    const isSelf = u._id === currentUser._id;
                    const showMenu = u.employeeDocId || canManage(u) || showAccess;
                    return (
                      <article key={u._id} className="m-card">
                        <header className="m-head">
                          <div className="m-avatar">
                            {u.profilePhoto
                              ? <img src={u.profilePhoto} alt={displayName} />
                              : <span>{displayName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>}
                          </div>
                          <div className="m-identity">
                            <span className="m-name">
                              {displayName}
                              {isSelf && <span className="self-badge">YOU</span>}
                            </span>
                            <span className="m-email">{u.email}</span>
                          </div>
                          {showMenu && (
                            <div className="action-menu">
                              <button
                                type="button"
                                className={`action-menu-trigger ${openActionMenu === u._id ? 'open' : ''}`}
                                onClick={() => setOpenActionMenu(openActionMenu === u._id ? null : u._id)}
                                title="Actions"
                                aria-haspopup="menu"
                                aria-expanded={openActionMenu === u._id}
                              >
                                <MoreVertical size={16} />
                              </button>
                              {openActionMenu === u._id && (
                                <div className="action-menu-list animate-pop-in" role="menu">
                                  {u.employeeDocId && (
                                    <Link href={`/employees/${u.employeeDocId}`} className="action-menu-item" role="menuitem">
                                      <Eye size={14} />
                                      <span>View Profile</span>
                                    </Link>
                                  )}
                                  {showAccess && (
                                    <button type="button" className="action-menu-item" role="menuitem" onClick={() => openAccess(u)}>
                                      <ShieldCheck size={14} />
                                      <span>{canEditAccess ? 'Manage Access' : 'View Access'}</span>
                                    </button>
                                  )}
                                  {canManage(u) && (
                                    <button
                                      type="button"
                                      className="action-menu-item danger"
                                      role="menuitem"
                                      onClick={() => {
                                        setOpenActionMenu(null);
                                        deleteUser(u.isUser ? u._id : null, u.employeeDocId, displayName);
                                      }}
                                    >
                                      <Trash2 size={14} />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </header>

                        <dl className="m-details">
                          <div>
                            <dt>Phone</dt>
                            <dd>{u.phone || '—'}</dd>
                          </div>
                          <div>
                            <dt>Employee ID</dt>
                            <dd>{u.empIdString || '—'}</dd>
                          </div>
                          <div>
                            <dt>Designation</dt>
                            <dd>{u.designation || '—'}</dd>
                          </div>
                          <div>
                            <dt>Loan Limit</dt>
                            <dd>{u.loanLimit > 0 ? u.loanLimit.toLocaleString() : '—'}</dd>
                          </div>
                        </dl>

                        <footer className="m-foot">
                          {u.isUser ? (
                            <>
                              {showAccess && (
                              <div className="m-foot-row">
                                <span className="m-foot-label">Pages</span>
                                <button
                                  type="button"
                                  className="access-cell"
                                  onClick={() => openAccess(u)}
                                                                    title={accessSummary(u.permissions)}
                                >
                                  <span className="access-count">{u.permissions?.length || 0}</span>
                                  <span>{(u.permissions?.length || 0) === 1 ? 'page' : 'pages'}</span>
                                  {canEditAccess && canManage(u) && <Pencil size={12} className="access-edit" />}
                            </button>
                              </div>
                              )}

                              {canManage(u) && !u.isActive ? (
                                <div className="m-approval-grid">
                                  <button className="m-btn-reject" onClick={() => deleteUser(u._id, u.employeeDocId, displayName)}>Reject</button>
                                  <button className="m-btn-approve" onClick={() => updateStatus(u._id, true)}>Approve Access</button>
                                </div>
                              ) : (
                                <div className="m-foot-row">
                                  <span className="m-foot-label">Account</span>
                                  <div
                                    className={`status-toggle ${u.isActive ? 'active' : ''} ${!canManage(u) ? 'disabled' : ''}`}
                                    onClick={() => canManage(u) && updateStatus(u._id, !u.isActive)}
                                  >
                                    <div className="toggle-knob"></div>
                                    <span className="status-label">{u.isActive ? 'Active' : 'Revoked'}</span>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {showAccess && (
                              <div className="m-foot-row">
                                <span className="m-foot-label">Pages</span>
                                <button
                                  type="button"
                                  className="access-cell"
                                  onClick={() => openAccess(u)}
                                                                    title={accessSummary(u.permissions)}
                                >
                                  <span className="access-count">{u.permissions?.length || 0}</span>
                                  <span>{(u.permissions?.length || 0) === 1 ? 'page' : 'pages'}</span>
                                  {canEditAccess && canManage(u) && <Pencil size={12} className="access-edit" />}
                            </button>
                              </div>
                              )}
                              <div className="m-foot-row">
                                <span className="m-foot-label">Status</span>
                                <span className="m-invite-badge">Invite pending</span>
                              </div>
                            </>
                          )}
                        </footer>
                      </article>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {accessEditor && (
          <div className="modal-overlay" onClick={() => !savingAccess && setAccessEditor(null)}>
            <div className="modal-card access-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Page Access</h3>
                  <p>
                    {canEditAccess && canManage(accessEditor.member)
                      ? <>Choose which pages <strong>{accessEditor.member.fullName || accessEditor.member.name}</strong> can open. Everything else is hidden.</>
                      : <>Pages <strong>{accessEditor.member.fullName || accessEditor.member.name}</strong> can open. Only the company admin account can change this.</>}
                  </p>
                </div>
                <button className="modal-close" onClick={() => setAccessEditor(null)} disabled={savingAccess}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                {accessError && (
                  <div className="form-error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={14} />
                    <span>{accessError}</span>
                  </div>
                )}
                <AccessPicker
                  value={accessEditor.permissions}
                  onChange={(keys) => setAccessEditor(prev => ({ ...prev, permissions: keys }))}
                  disabled={!(canEditAccess && canManage(accessEditor.member))}
                />
              </div>
              <div className="modal-footer">
                {canEditAccess && canManage(accessEditor.member) ? (
                  <>
                    <button className="btn-cancel" onClick={() => setAccessEditor(null)} disabled={savingAccess}>Cancel</button>
                    <button className="btn-confirm" onClick={saveAccess} disabled={savingAccess}>
                      {savingAccess ? 'Saving...' : 'Save Access'}
                    </button>
                  </>
                ) : (
                  <button className="btn-cancel" onClick={() => setAccessEditor(null)}>Close</button>
                )}
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-card animate-pop-in" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3>Add New Employee</h3>
                  <p>Register a new employee and send an invitation link to set up their account.</p>
                </div>
                <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="modal-form" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {employeeError && (
                  <div className="form-error" style={{ marginBottom: '1.25rem' }}>
                    <AlertCircle size={14} />
                    <span>{employeeError}</span>
                  </div>
                )}

                <div className="ec-grid" style={{ gap: '1rem', marginBottom: '0' }}>
                  <div className="modal-field ec-full">
                    <label>Full Name *</label>
                    <div className="modal-input-wrap">
                      <UserIcon size={16} />
                      <input type="text" name="fullName" placeholder="John Doe" required value={formData.fullName} onChange={handleInputChange} />
                    </div>
                  </div>
                  
                  <div className="modal-field ec-full">
                    <label>Email Address *</label>
                    <div className="modal-input-wrap">
                      <Mail size={16} />
                      <input type="email" name="email" placeholder="john@company.com" required value={formData.email} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="modal-field">
                    <label>Phone No *</label>
                    <div className="modal-input-wrap">
                      <Phone size={16} />
                      <input type="tel" name="phone" placeholder="+8801XXXXXXXXX" required value={formData.phone} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="modal-field">
                    <label>Employee ID</label>
                    <div className="modal-input-wrap">
                      <Hash size={16} />
                      <input type="text" name="employeeId" placeholder="EMP-001" value={formData.employeeId} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="modal-field">
                    <label>Monthly Salary</label>
                    <div className="modal-input-wrap">
                      <Calculator size={16} />
                      <input type="number" min="0" name="salary" placeholder="50000" value={formData.salary} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="modal-field">
                    <label>Max Loan Limit</label>
                    <div className="modal-input-wrap">
                      <Calculator size={16} />
                      <input type="number" min="0" name="loanLimit" placeholder="100000" value={formData.loanLimit} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="modal-field">
                    <label>Designation *</label>
                    <div className="modal-input-wrap">
                      <Briefcase size={16} />
                      <input type="text" name="designation" placeholder="e.g. Software Engineer" required value={formData.designation} onChange={handleInputChange} />
                    </div>
                  </div>

                  <div className="modal-field">
                    <label>Joining Date</label>
                    <div className="modal-input-wrap">
                      <Calendar size={16} />
                      <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} style={{ padding: '0 1rem' }} />
                    </div>
                  </div>
                </div>

                <div className="access-note">
                  <ShieldCheck size={16} />
                  <p>
                    New employees start with basic access:{' '}
                    <strong>{PERMISSIONS.filter(p => DEFAULT_PERMISSIONS.includes(p.key)).map(p => p.label).join(', ')}</strong>.
                    {canEditAccess ? ' You can add more from Manage Access after they are added.' : ' The company admin can add more later.'}
                  </p>
                </div>

                <div className="modal-footer" style={{ marginTop: '2rem' }}>
                  <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn-confirm" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


        <style jsx>{`
          .users-container { max-width: var(--page-max-width); margin: 0 auto; }
          .access-cell { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.3125rem 0.625rem; border: 1px solid #e2e8f0; border-radius: 6px; background: #ffffff; font-family: inherit; font-size: 0.8125rem; font-weight: 600; color: #334155; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
          .access-cell:hover:not(:disabled) { border-color: #a5b4fc; background: #f5f7ff; }
          .access-cell:disabled { cursor: default; opacity: 0.75; }
          .access-count { min-width: 20px; height: 20px; padding: 0 0.3rem; display: inline-grid; place-items: center; border-radius: 4px; background: #eef2ff; color: #4338ca; font-size: 0.75rem; font-weight: 800; }
          .access-cell :global(.access-edit) { color: #94a3b8; }
          .access-modal { max-width: 960px; display: flex; flex-direction: column; overflow: hidden; }
          .access-modal .modal-body { flex: 1; min-height: 0; overflow-y: auto; padding: 1.25rem 1.5rem; }
          .access-modal .modal-header p strong { color: #0f172a; font-weight: 700; }
          .access-note { display: flex; align-items: flex-start; gap: 0.625rem; margin-top: 1.5rem; padding: 0.75rem 1rem; border: 1px solid #e0e7ff; border-radius: 6px; background: #f5f7ff; color: #4338ca; }
          .access-note p { margin: 0; font-size: 0.8125rem; line-height: 1.5; color: #475569; }
          .access-note strong { color: #0f172a; font-weight: 600; }
          .field-help { margin: -0.125rem 0 0.875rem; font-size: 0.8125rem; color: #64748b; }
          .form-hint { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.625rem 0.875rem; border: 1px solid #fde68a; border-radius: 6px; background: #fffbeb; color: #92400e; font-size: 0.8125rem; font-weight: 600; }
          .form-hint :global(a) { color: #4f46e5; text-decoration: underline; }
          .cell-text { font-size: 0.8125rem; font-weight: 600; color: #334155; word-break: break-word; }
          .cell-strong { color: #0f172a; font-weight: 700; }
          .cell-sub { display: block; margin-top: 0.125rem; font-size: 0.75rem; font-weight: 600; color: #64748b; }
          .th-actions { text-align: right; }
          .action-menu { position: relative; display: flex; justify-content: flex-end; }
          .action-menu-trigger { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid #e2e8f0; border-radius: 4px; background: #ffffff; color: #475569; cursor: pointer; transition: all 0.15s; }
          .action-menu-trigger:hover, .action-menu-trigger.open { background: #f1f5f9; color: #0f172a; }
          .action-menu-list { position: absolute; top: calc(100% + 4px); right: 0; z-index: 50; min-width: 160px; padding: 0.25rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.25); }
          .action-menu-list :global(.action-menu-item) { display: flex; align-items: center; gap: 0.625rem; width: 100%; padding: 0.5rem 0.75rem; border: none; border-radius: 4px; background: transparent; font-size: 0.8125rem; font-weight: 600; color: #334155; text-decoration: none; text-align: left; cursor: pointer; }
          .action-menu-list :global(.action-menu-item:hover) { background: #f1f5f9; color: #0f172a; }
          .action-menu-list :global(.action-menu-item.danger) { color: #dc2626; }
          .action-menu-list :global(.action-menu-item.danger:hover) { background: #fef2f2; color: #b91c1c; }
          .users-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.75rem; }
          .btn-create-user { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; background: #0f172a; color: #ffffff; border: none; border-radius: 4px; font-size: 0.8125rem; font-weight: 800; cursor: pointer; transition: all 0.2s; }
          .btn-create-user:hover { background: #1e293b; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); }
          .m-count { display: none; }
          @media (max-width: 768px) {
            .users-header { align-items: center; gap: 1rem; margin-bottom: 1rem; }
            .users-header .title-area { display: none; }
            .btn-create-user { white-space: nowrap; }
            /* Show the Active/Revoked label on the left of the switch so it stays inside the card */
            .m-foot-row .status-toggle .status-label { left: auto; right: calc(100% + 0.625rem); }
            .m-count { display: block; font-size: 0.875rem; font-weight: 600; color: #64748b; }
            .btn-create-user { padding: 0.625rem 1rem; }
            .table-card { background: transparent; border: none; box-shadow: none; }

            .m-list { display: flex; flex-direction: column; gap: 0.875rem; }
            .m-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05); }
            .m-head { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1rem 0.875rem; }
            .m-avatar { flex-shrink: 0; width: 42px; height: 42px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; background: #e0e7ff; color: #4338ca; font-size: 0.8125rem; font-weight: 800; }
            .m-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .m-identity { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.125rem; }
            .m-identity .m-name { display: flex; align-items: center; gap: 0.375rem; font-size: 0.9375rem; font-weight: 700; color: #0f172a; }
            .m-identity .m-email { font-size: 0.8125rem; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .m-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1rem; margin: 0; padding: 0.875rem 1rem; background: #f8fafc; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
            .m-details dt { margin-bottom: 0.125rem; font-size: 0.6875rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
            .m-details dd { margin: 0; font-size: 0.8125rem; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .m-foot { display: flex; flex-direction: column; gap: 0.75rem; padding: 0.875rem 1rem 1rem; }
            .m-foot-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
            .m-foot-label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
            .m-role-select { width: auto; flex: 0 1 230px; min-width: 0; }
            .m-invite-badge { padding: 0.25rem 0.625rem; border-radius: 4px; background: #fef3c7; color: #92400e; font-size: 0.75rem; font-weight: 700; }
            .m-approval-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 0.5rem; }
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
            border-radius: 4px;
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
          .ec-error { margin: 0 0 1rem; padding: 0.75rem 1rem; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 4px; font-size: 0.8125rem; font-weight: 700; color: #ef4444; }
          .ec-success { margin: 0 0 1rem; padding: 0.75rem 1rem; background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 4px; font-size: 0.8125rem; font-weight: 700; color: #10b981; }
          .meta-link { color: #4f46e5; text-decoration: underline; }

          /* Company Card */
          .company-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
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
            border-radius: 6px;
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
            border-radius: 4px;
            border: 1px solid #f1f5f9;
          }
          .meta-icon { color: #64748b; margin-top: 2px; flex-shrink: 0; }
          .meta-label { display: block; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 0.2rem; }
          .meta-value { display: block; font-size: 0.875rem; font-weight: 800; color: #0f172a; }
          .meta-value.mono { font-family: monospace; font-size: 0.875rem; letter-spacing: 0.05em; }

          .table-card { background: #ffffff; border-radius: 4px; border: 1px solid #e2e8f0; overflow: visible; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
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
          .role-trigger { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
          .role-trigger:hover:not(.disabled) { border-color: #cbd5e1; }
          .role-trigger.active { border-color: #0f172a; background: white; box-shadow: 0 0 0 3px rgba(15,23,42,0.05); }
          .role-trigger.disabled { opacity: 0.6; cursor: not-allowed; }
          .role-current { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; font-weight: 700; color: #0f172a; white-space: nowrap; }
          .arrow { color: #94a3b8; transition: transform 0.2s; }
          .arrow.rotate { transform: rotate(180deg); }
          .role-dropdown { position: absolute; top: calc(100% + 8px); left: 0; width: 250px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); z-index: 1000; padding: 0.5rem; }
          .role-option { padding: 0.75rem 1rem; border-radius: 4px; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: all 0.15s; margin-bottom: 2px; }
          .role-option:hover { background: #f8fafc; }
          .role-option.selected { background: #f1f5f9; }
          .option-icon { color: #475569; display: flex; align-items: center; }
          .role-option:hover .option-icon, .role-option.selected .option-icon { color: #0f172a; }
          .option-text { display: flex; flex-direction: column; flex: 1; }
          .option-label { font-size: 0.85rem; font-weight: 700; color: #0f172a; }
          .check-icon { color: #0f172a; }

          .modal-form { padding: 1.5rem; }
          .modal-field { margin-bottom: 1.25rem; }
          .modal-field label { display: block; font-size: 0.8125rem; font-weight: 600; color: #334155; margin-bottom: 0.375rem; }
          .modal-input-wrap { display: flex; align-items: center; gap: 0.625rem; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.625rem 0.875rem; background: #ffffff; transition: all 0.2s; }
          .modal-input-wrap:focus-within { border-color: #6366f1; background: #ffffff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
          .modal-input-wrap svg { color: #94a3b8; flex-shrink: 0; }
          .modal-input-wrap input { border: none; outline: none; background: transparent; flex: 1; font-size: 0.9rem; color: #0f172a; font-weight: 500; }
          .modal-input-wrap input::placeholder { color: #cbd5e1; font-weight: 400; }
          .modal-custom-select-wrapper { position: relative; }
          .modal-select-trigger { display: flex; align-items: center; justify-content: space-between; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem 1rem; background: #f8fafc; cursor: pointer; transition: all 0.2s; }
          .modal-select-trigger:hover, .modal-select-trigger.active { border-color: #6366f1; background: #ffffff; }
          .m-trigger-content { display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; font-weight: 600; color: #0f172a; }
          .m-trigger-content svg { color: #6366f1; }
          .m-arrow { color: #94a3b8; transition: transform 0.2s; }
          .m-arrow.rotate { transform: rotate(180deg); }
          .modal-role-dropdown { position: absolute; top: calc(100% + 8px); left: 0; width: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); z-index: 100; padding: 0.5rem; max-height: 250px; overflow-y: auto; }
          .m-role-option { padding: 0.75rem 1rem; border-radius: 4px; display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; transition: all 0.2s; margin-bottom: 2px; }
          .m-role-option:hover { background: #f8fafc; }
          .m-role-option.selected { background: #eef2ff; }
          .m-opt-icon { color: #6366f1; margin-top: 2px; }
          .m-opt-text { display: flex; flex-direction: column; flex: 1; gap: 2px; }
          .m-opt-label { font-size: 0.85rem; font-weight: 700; color: #0f172a; }
          .m-opt-desc { font-size: 0.75rem; color: #64748b; line-height: 1.4; }
          .m-check { color: #6366f1; }
          .btn-send-invite { width: 100%; padding: 0.9rem; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; border: none; border-radius: 6px; font-weight: 800; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(15,23,42,0.15); margin-top: 1.5rem; }
          .btn-send-invite:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(15,23,42,0.25); }
          .btn-send-invite:disabled { opacity: 0.7; cursor: not-allowed; }
          .spinner-small { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
          
          .invite-success-state { padding: 3rem 2rem; text-align: center; }
          .success-icon-wrap { width: 64px; height: 64px; background: #ecfdf5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; }
          .invite-success-state h4 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 0.5rem; }
          .invite-success-state p { font-size: 0.9rem; color: #64748b; line-height: 1.5; }
          .form-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; color: #ef4444; margin-bottom: 1.25rem; } 
          
          .status-toggle { 
            width: 40px; 
            height: 20px; 
            background: #cbd5e1; 
            border-radius: 6px; 
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
          .icon-btn-delete { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: 1px solid #fee2e2; background: #fef2f2; color: #ef4444; cursor: pointer; transition: all 0.2s; }
          .icon-btn-delete:hover { background: #ef4444; color: white; border-color: #ef4444; }
          .m-approval-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 0.5rem; width: 100%; }
          .m-btn-approve { padding: 0.75rem; background: #0f172a; color: white; border: none; border-radius: 4px; font-weight: 800; font-size: 0.8125rem; }
          .m-btn-reject { padding: 0.75rem; background: #fef2f2; color: #ef4444; border: 1.5px solid #fee2e2; border-radius: 4px; font-weight: 800; font-size: 0.8125rem; }
          .m-status-row { display: flex; justify-content: space-between; width: 100%; align-items: center; }
          .m-delete-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 4px; background: #fef2f2; color: #ef4444; border: none; }
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
          .modal-card { max-width: 440px; }
          .animate-pop-in { animation: popIn 0.2s ease-out; }
          @keyframes popIn { from { opacity: 0; transform: scale(0.95) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          
          .alert-modal { max-width: 440px; border: 1px solid #0f172a10; }
          .modal-body { padding: 1.75rem; }
          .role-change-preview { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-left: 4px solid #0f172a;
            border-radius: 4px; 
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
            border-radius: 4px; 
            font-size: 0.8125rem; 
            font-weight: 800; 
            box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
          }
          .access-list-container { margin: 1.5rem 0 0.5rem; background: #f8fafc; padding: 1.25rem; border-radius: 6px; border: 1px solid #e2e8f0; }
          .access-title { font-size: 0.65rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 1rem; text-align: left; }
          .access-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
          .access-list li { display: flex; align-items: flex-start; gap: 0.625rem; font-size: 0.85rem; color: #334155; line-height: 1.4; font-weight: 600; }
          .access-check { color: #10b981; flex-shrink: 0; margin-top: 1px; }
          .btn-cancel { padding: 0.875rem; border: 1.5px solid #e2e8f0; background: white; border-radius: 4px; font-weight: 800; font-size: 0.875rem; color: #64748b; cursor: pointer; transition: all 0.2s; }
          .btn-cancel:hover { background: #f1f5f9; color: #0f172a; border-color: #cbd5e1; }
          .btn-confirm { padding: 0.875rem; background: #0f172a; color: white; border: none; border-radius: 4px; font-weight: 800; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1); }
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
            border-radius: 4px;
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
            border-radius: 6px;
            padding: 0.5rem;
            z-index: 3000;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          }
          .m-role-option {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border-radius: 4px;
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
