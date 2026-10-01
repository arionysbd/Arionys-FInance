'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { getEmployee, updateEmployee, deleteEmployee } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { User, Mail, Phone, Building, Briefcase, Calendar, Edit2, UserX, Loader2, Save, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  
  const [formData, setFormData] = useState({});

  const canManage = ['owner', 'admin', 'ceo', 'cfo'].includes(user?.role?.toLowerCase());
  const canTerminate = ['owner', 'admin', 'ceo'].includes(user?.role?.toLowerCase());

  useEffect(() => {
    if (authLoading) return;
    fetchEmployee();
  }, [id, user, authLoading]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const res = await getEmployee(id);
      if (res.success) {
        setEmployee(res.data);
        setFormData({
            fullName: res.data.fullName,
            phone: res.data.phone || '',
            department: res.data.department || '',
            designation: res.data.designation || '',
            employeeId: res.data.employeeId || '',
            joiningDate: res.data.joiningDate ? new Date(res.data.joiningDate).toISOString().split('T')[0] : '',
            notes: res.data.notes || '',
        });
      }
    } catch (err) {
      setError('Failed to load employee details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const res = await updateEmployee(id, formData);
      if (res.success) {
        setEmployee(res.data);
        setIsEditing(false);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTerminate = async () => {
    if (!window.confirm(`Are you sure you want to terminate ${employee.fullName}? This will mark them as inactive.`)) return;
    
    setIsTerminating(true);
    try {
        const res = await deleteEmployee(id);
        if (res.success) {
            router.push('/employees');
        } else {
            setError(res.message);
            setIsTerminating(false);
        }
    } catch (err) {
        setError(err.response?.data?.message || err.message);
        setIsTerminating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="spinner text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="card text-center p-8">
            <UserX size={48} className="mx-auto text-muted mb-4" />
            <h3>Employee Not Found</h3>
            <p className="text-muted mb-6">The employee you are looking for does not exist or you don't have permission.</p>
            <Link href="/employees" className="btn btn-primary">Back to Employees</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
            <Link href="/employees" className="back-link">
                <ArrowLeft size={16} /> Back to Employees
            </Link>
        </div>

        {error && <div className="alert alert-danger mb-6">{error}</div>}

        <div className="profile-layout">
            <div className="profile-sidebar">
                <div className="card text-center p-6">
                    <div className="avatar-large mx-auto mb-4">
                        {employee.fullName.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-1">{employee.fullName}</h2>
                    <p className="text-muted-foreground text-sm font-medium mb-4">{employee.designation || 'Employee'} {employee.department ? ` • ${employee.department}` : ''}</p>
                    
                    <div className="status-indicator mb-6">
                        {employee.status === 'active' ? (
                            <span className="badge badge-approved w-full justify-center">Active Employee</span>
                        ) : employee.status === 'terminated' ? (
                            <span className="badge badge-expense w-full justify-center">Terminated</span>
                        ) : (
                            <span className="badge badge-pending w-full justify-center">Inactive</span>
                        )}
                    </div>

                    <div className="divider mb-6"></div>

                    <div className="info-list text-left">
                        <div className="info-item">
                            <Mail size={16} className="text-muted-foreground" />
                            <span className="text-sm">{employee.email}</span>
                        </div>
                        {employee.phone && (
                            <div className="info-item">
                                <Phone size={16} className="text-muted-foreground" />
                                <span className="text-sm">{employee.phone}</span>
                            </div>
                        )}
                        {employee.employeeId && (
                            <div className="info-item">
                                <User size={16} className="text-muted-foreground" />
                                <span className="text-sm">ID: {employee.employeeId}</span>
                            </div>
                        )}
                        {employee.joiningDate && (
                            <div className="info-item">
                                <Calendar size={16} className="text-muted-foreground" />
                                <span className="text-sm">Joined: {new Date(employee.joiningDate).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>

                    {canTerminate && employee.status === 'active' && (
                        <div className="mt-8">
                            <button onClick={handleTerminate} disabled={isTerminating} className="btn btn-outline-danger w-full">
                                {isTerminating ? <Loader2 size={16} className="spinner" /> : <><UserX size={16}/> Terminate Employee</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="profile-content">
                <div className="card h-full">
                    <div className="card-header flex justify-between items-center mb-6 border-b pb-4">
                        <h3 className="text-lg font-bold">Profile Details</h3>
                        {canManage && employee.status === 'active' && !isEditing && (
                            <button onClick={() => setIsEditing(true)} className="btn btn-secondary btn-sm">
                                <Edit2 size={14} /> Edit Profile
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="edit-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input type="text" name="fullName" className="input-field" value={formData.fullName} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input type="text" name="phone" className="input-field" value={formData.phone} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Department</label>
                                    <input type="text" name="department" className="input-field" value={formData.department} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Designation</label>
                                    <input type="text" name="designation" className="input-field" value={formData.designation} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Employee ID</label>
                                    <input type="text" name="employeeId" className="input-field" value={formData.employeeId} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Joining Date</label>
                                    <input type="date" name="joiningDate" className="input-field" value={formData.joiningDate} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea name="notes" className="input-field" rows="4" value={formData.notes} onChange={handleInputChange} placeholder="Add any private notes about this employee..."></textarea>
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                                <button onClick={() => setIsEditing(false)} className="btn btn-secondary">
                                    <X size={16} /> Cancel
                                </button>
                                <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
                                    {isSaving ? <Loader2 size={16} className="spinner" /> : <><Save size={16} /> Save Changes</>}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="view-details">
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Full Name</span>
                                    <span className="detail-value">{employee.fullName}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Email</span>
                                    <span className="detail-value">{employee.email}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Phone</span>
                                    <span className="detail-value">{employee.phone || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Employee ID</span>
                                    <span className="detail-value">{employee.employeeId || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Department</span>
                                    <span className="detail-value">{employee.department || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Designation</span>
                                    <span className="detail-value">{employee.designation || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Joining Date</span>
                                    <span className="detail-value">{employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Added By</span>
                                    <span className="detail-value">{employee.createdBy?.name || 'Unknown'}</span>
                                </div>
                            </div>
                            
                            {employee.notes && (
                                <div className="mt-8 pt-6 border-t">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Private Notes</h4>
                                    <div className="bg-slate-50 p-4 rounded-lg border text-sm text-slate-700 whitespace-pre-wrap">
                                        {employee.notes}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        <style jsx>{`
            .back-link { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #64748b; transition: color 0.2s; text-decoration: none; }
            .back-link:hover { color: #0f172a; }
            
            .profile-layout { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; }
            @media (max-width: 1024px) {
                .profile-layout { grid-template-columns: 1fr; }
            }
            
            .avatar-large { width: 96px; height: 96px; border-radius: 50%; background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 800; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.2); }
            
            .divider { height: 1px; background: #f1f5f9; width: 100%; }
            
            .info-list { display: flex; flex-direction: column; gap: 1rem; }
            .info-item { display: flex; align-items: center; gap: 0.75rem; color: #334155; font-weight: 500; }
            
            .btn-outline-danger { background: transparent; border: 1px solid #fecaca; color: #ef4444; }
            .btn-outline-danger:hover { background: #fef2f2; border-color: #fca5a5; }
            
            .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
            @media (max-width: 640px) {
                .detail-grid { grid-template-columns: 1fr; }
            }
            
            .detail-item { display: flex; flex-direction: column; gap: 0.25rem; }
            .detail-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
            .detail-value { font-size: 0.95rem; font-weight: 600; color: #1e293b; }
            
            .form-group { margin-bottom: 1.25rem; }
            .form-group label { display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }
            .form-row { display: flex; gap: 1rem; }
            .form-row .form-group { flex: 1; }
            @media (max-width: 640px) {
                .form-row { flex-direction: column; gap: 0; }
            }
            
            :global(.spinner) { animation: spin 1s linear infinite; }
            @keyframes spin { 100% { transform: rotate(360deg); } }

            /* Utility classes to avoid writing too much custom CSS */
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .justify-end { justify-content: flex-end; }
            .items-center { align-items: center; }
            .gap-3 { gap: 0.75rem; }
            .h-full { height: 100%; }
            .w-full { width: 100%; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .mt-6 { margin-top: 1.5rem; }
            .mt-8 { margin-top: 2rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .p-4 { padding: 1rem; }
            .p-6 { padding: 1.5rem; }
            .p-8 { padding: 2rem; }
            .pt-4 { padding-top: 1rem; }
            .pt-6 { padding-top: 1.5rem; }
            .pb-4 { padding-bottom: 1rem; }
            .border-t { border-top: 1px solid #f1f5f9; }
            .border-b { border-bottom: 1px solid #f1f5f9; }
            .text-xl { font-size: 1.25rem; }
            .text-lg { font-size: 1.125rem; }
            .text-sm { font-size: 0.875rem; }
            .font-bold { font-weight: 700; }
            .font-medium { font-weight: 500; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .whitespace-pre-wrap { white-space: pre-wrap; }
            .bg-slate-50 { background-color: #f8fafc; }
            .text-slate-500 { color: #64748b; }
            .text-slate-700 { color: #334155; }
            .text-primary { color: #4f46e5; }
            .rounded-lg { border-radius: 8px; }
            .border { border: 1px solid #e2e8f0; }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
