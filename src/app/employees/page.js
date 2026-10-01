'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { getEmployees, addEmployee } from '@/lib/api';
import { Users, Plus, Search, UserCheck, UserX, Loader2, Building, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

export default function EmployeesPage() {
  const { user, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    employeeId: '',
    department: '',
    designation: '',
    joiningDate: '',
    role: 'viewer',
  });

  const canManage = ['owner', 'admin', 'ceo', 'cfo'].includes(user?.role?.toLowerCase());

  useEffect(() => {
    if (authLoading) return;
    fetchEmployees();
  }, [user, authLoading, search]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await getEmployees({ search });
      if (res.success) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await addEmployee(formData);
      if (res.success) {
        setShowModal(false);
        setFormData({
            fullName: '', email: '', phone: '', employeeId: '',
            department: '', designation: '', joiningDate: '', role: 'viewer'
        });
        fetchEmployees();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="page-header">
            <div>
                <h2>Employees</h2>
                <p className="text-muted">Manage company staff and access</p>
            </div>
            {canManage && (
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> Add Employee
                </button>
            )}
        </div>

        <div className="card controls-card">
            <div className="search-box">
                <Search size={18} className="search-icon" />
                <input 
                    type="text" 
                    placeholder="Search by name, email, ID, or department..." 
                    className="input-field"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        {loading ? (
            <div className="loading-state">
                <Loader2 size={32} className="spinner" />
                <p>Loading employees...</p>
            </div>
        ) : (
            <div className="employees-grid">
                {employees.map(emp => (
                    <div key={emp._id} className={`card employee-card ${emp.status === 'terminated' ? 'terminated' : ''}`}>
                        <div className="emp-header">
                            <div className="emp-avatar">
                                {emp.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="emp-status-badge">
                                {emp.status === 'active' ? (
                                    <span className="badge badge-approved"><UserCheck size={12}/> Active</span>
                                ) : emp.status === 'terminated' ? (
                                    <span className="badge badge-expense"><UserX size={12}/> Terminated</span>
                                ) : (
                                    <span className="badge badge-pending">Inactive</span>
                                )}
                            </div>
                        </div>
                        <div className="emp-info">
                            <h3 className="emp-name">{emp.fullName}</h3>
                            <p className="emp-role">{emp.designation || 'No Designation'} {emp.department ? ` • ${emp.department}` : ''}</p>
                        </div>
                        <div className="emp-contact">
                            <div className="contact-item"><Mail size={14} /> {emp.email}</div>
                            {emp.phone && <div className="contact-item"><Phone size={14} /> {emp.phone}</div>}
                            {emp.employeeId && <div className="contact-item"><Building size={14} /> ID: {emp.employeeId}</div>}
                        </div>
                        <div className="emp-actions">
                             <Link href={`/employees/${emp._id}`} className="btn btn-secondary btn-sm">
                                View Profile
                            </Link>
                        </div>
                    </div>
                ))}
                {employees.length === 0 && (
                    <div className="empty-state">
                        <Users size={48} className="empty-icon" />
                        <h3>No employees found</h3>
                        <p className="text-muted">Get started by adding your first employee.</p>
                        {canManage && (
                             <button className="btn btn-primary" style={{marginTop: '1rem'}} onClick={() => setShowModal(true)}>
                                <Plus size={18} /> Add Employee
                            </button>
                        )}
                    </div>
                )}
            </div>
        )}

        {showModal && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="modal-header">
                        <h3>Add New Employee</h3>
                        <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
                    </div>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <form onSubmit={handleSubmit} className="modal-form">
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input type="text" name="fullName" className="input-field" required value={formData.fullName} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label>Email Address *</label>
                            <input type="email" name="email" className="input-field" required value={formData.email} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label>System Access Role</label>
                            <select name="role" className="input-field" value={formData.role} onChange={handleInputChange}>
                                <option value="viewer">Standard Employee (Viewer)</option>
                                <option value="accountant">Accounts Manager</option>
                                <option value="csuit">Board Member</option>
                                <option value="cfo">Chief Financial Officer (CFO)</option>
                                <option value="ceo">Chief Executive Officer (CEO)</option>
                                <option value="admin">Administrator</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">An invitation will be sent to their email to set up their account with this access level.</p>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Phone</label>
                                <input type="text" name="phone" className="input-field" value={formData.phone} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>Employee ID</label>
                                <input type="text" name="employeeId" className="input-field" value={formData.employeeId} onChange={handleInputChange} />
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
                        <div className="form-group">
                            <label>Joining Date</label>
                            <input type="date" name="joiningDate" className="input-field" value={formData.joiningDate} onChange={handleInputChange} />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 size={18} className="spinner" /> : 'Save Employee'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        <style jsx>{`
            .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
            .page-header h2 { font-size: 1.5rem; color: #0f172a; margin-bottom: 0.25rem; }
            
            .controls-card { padding: 1rem; margin-bottom: 2rem; display: flex; gap: 1rem; align-items: center; }
            .search-box { position: relative; flex: 1; max-width: 400px; }
            :global(.search-icon) { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
            .search-box .input-field { padding-left: 2.5rem; }

            .employees-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
            .employee-card { display: flex; flex-direction: column; padding: 1.5rem; transition: transform 0.2s, box-shadow 0.2s; }
            .employee-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
            .employee-card.terminated { opacity: 0.7; filter: grayscale(0.5); }
            
            .emp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
            .emp-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 700; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.15); }
            .emp-status-badge .badge { display: inline-flex; align-items: center; gap: 4px; }
            
            .emp-info { margin-bottom: 1.25rem; }
            .emp-name { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
            .emp-role { font-size: 0.85rem; color: #64748b; font-weight: 500; }
            
            .emp-contact { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; margin-bottom: 1rem; }
            .contact-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #475569; }
            .contact-item :global(svg) { color: #94a3b8; }
            
            .emp-actions { margin-top: auto; display: flex; justify-content: flex-end; }
            .btn-sm { padding: 0.4rem 0.875rem; font-size: 0.85rem; width: 100%; text-decoration: none; text-align: center;}

            .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; text-align: center; grid-column: 1 / -1; }
            :global(.empty-icon) { color: #cbd5e1; margin-bottom: 1rem; }
            .empty-state h3 { font-size: 1.25rem; color: #1e293b; margin-bottom: 0.5rem; }

            .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
            .modal-content { background: white; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.2); }
            .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid #f1f5f9; }
            .modal-header h3 { font-size: 1.25rem; color: #0f172a; margin: 0; }
            .close-btn { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; width: 32px; height: 32px; border-radius: 50%; transition: background 0.2s; }
            .close-btn:hover { background: #f1f5f9; color: #0f172a; }
            
            .modal-form { padding: 1.5rem; }
            .form-group { margin-bottom: 1.25rem; }
            .form-group label { display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }
            .form-row { display: flex; gap: 1rem; }
            .form-row .form-group { flex: 1; }
            
            .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #f1f5f9; }
            
            .alert { padding: 1rem; border-radius: 8px; margin: 1rem 1.5rem 0; font-size: 0.875rem; font-weight: 500; }
            .alert-danger { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }

            :global(.spinner) { animation: spin 1s linear infinite; }
            @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
