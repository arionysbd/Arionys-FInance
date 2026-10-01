'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { getLoans } from '@/lib/api';
import { 
    ArrowLeft, User, Mail, Phone, Briefcase, Building2, Hash, Calendar, 
    Calculator, Edit, AlertCircle, Banknote, ShieldCheck, Loader2, Save, X
} from 'lucide-react';
import Link from 'next/link';

export default function EmployeeDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    
    const [employee, setEmployee] = useState(null);
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && user && id) {
            fetchEmployeeData();
        }
    }, [authLoading, user, id]);

    const fetchEmployeeData = async () => {
        try {
            setLoading(true);
            const [empRes, loanRes] = await Promise.all([
                axios.get(`/api/employees/${id}`),
                getLoans({ employeeId: id })
            ]);
            
            if (empRes.data.success) {
                setEmployee(empRes.data.data);
                setEditForm({
                    fullName: empRes.data.data.fullName || '',
                    phone: empRes.data.data.phone || '',
                    department: empRes.data.data.department || '',
                    designation: empRes.data.data.designation || '',
                    employeeId: empRes.data.data.employeeId || '',
                    salary: empRes.data.data.salary || 0,
                    loanLimit: empRes.data.data.loanLimit || 0,
                    joiningDate: empRes.data.data.joiningDate ? empRes.data.data.joiningDate.split('T')[0] : '',
                    notes: empRes.data.data.notes || ''
                });
            }
            if (loanRes.success) {
                setLoans(loanRes.data);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load employee details.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await axios.patch(`/api/employees/${id}`, editForm);
            if (res.data.success) {
                setEmployee(res.data.data);
                setIsEditing(false);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Update failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(amount || 0);
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const totalOutstanding = loans.reduce((acc, loan) => acc + (loan.outstandingAmount || 0), 0);
    const activeLoans = loans.filter(l => ['active', 'partially_repaid'].includes(l.status)).length;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !employee) {
        return (
            <DashboardLayout>
                <div className="alert alert-danger m-6">{error || 'Employee not found.'}</div>
                <Link href="/business-administration" className="btn btn-secondary m-6" style={{ width: 'fit-content', display: 'inline-flex' }}>
                    <ArrowLeft size={16} /> Back to Administration
                </Link>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="employee-details-container animate-fade-in">
                {/* Header */}
                <div className="nav-header">
                    <Link href="/business-administration" className="back-link">
                        <ArrowLeft size={18} />
                        <span>Business Administration</span>
                    </Link>
                </div>

                <div className="profile-header card">
                    <div className="profile-info">
                        <div className="avatar-large">{getInitials(employee.fullName)}</div>
                        <div className="profile-text">
                            <div className="name-row">
                                <h1>{employee.fullName}</h1>
                                <span className={`status-badge ${employee.status}`}>
                                    {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                                </span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-item"><Mail size={14}/> {employee.email}</span>
                                {employee.phone && <span className="meta-item"><Phone size={14}/> {employee.phone}</span>}
                                {employee.employeeId && <span className="meta-item"><Hash size={14}/> {employee.employeeId}</span>}
                            </div>
                        </div>
                    </div>
                    {['owner', 'admin', 'ceo', 'cfo'].includes(user?.role?.toLowerCase()) && (
                        <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                            <Edit size={16} /> Edit Profile
                        </button>
                    )}
                </div>

                <div className="details-grid">
                    {/* Left Column: Work & Financials */}
                    <div className="left-col">
                        <div className="card info-card">
                            <h3 className="card-title">Employment Details</h3>
                            <div className="info-list">
                                <div className="info-row">
                                    <div className="info-label"><Building2 size={16}/> Department</div>
                                    <div className="info-value">{employee.department || 'Not Assigned'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Briefcase size={16}/> Designation</div>
                                    <div className="info-value">{employee.designation || 'Not Assigned'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Calendar size={16}/> Joining Date</div>
                                    <div className="info-value">
                                        {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card info-card mt-6">
                            <h3 className="card-title">Financial Profile</h3>
                            <div className="info-list">
                                <div className="info-row">
                                    <div className="info-label"><Calculator size={16}/> Monthly Salary</div>
                                    <div className="info-value font-bold">{formatCurrency(employee.salary)}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><ShieldCheck size={16}/> Max Loan Limit</div>
                                    <div className="info-value font-bold">{formatCurrency(employee.loanLimit)}</div>
                                </div>
                            </div>
                        </div>
                        
                        {employee.notes && (
                            <div className="card info-card mt-6">
                                <h3 className="card-title">Internal Notes</h3>
                                <p className="notes-text">{employee.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Loans Overview */}
                    <div className="right-col">
                        <div className="card">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="card-title" style={{marginBottom: 0}}>Loans & Advances</h3>
                                <Link href="/loans" className="btn btn-secondary text-sm">Go to Loans</Link>
                            </div>

                            <div className="loan-stats">
                                <div className="stat-box">
                                    <div className="stat-label">Total Outstanding</div>
                                    <div className="stat-value text-danger">{formatCurrency(totalOutstanding)}</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-label">Active Loans</div>
                                    <div className="stat-value text-primary">{activeLoans}</div>
                                </div>
                            </div>

                            <div className="loan-history">
                                <h4>Loan History</h4>
                                {loans.length === 0 ? (
                                    <div className="empty-loans">
                                        <Banknote size={32} className="text-slate-300 mb-2"/>
                                        <p>No loans found for this employee.</p>
                                    </div>
                                ) : (
                                    <div className="loan-list">
                                        {loans.map(loan => (
                                            <Link href={`/loans/${loan._id}`} key={loan._id} className="loan-item">
                                                <div className="loan-item-left">
                                                    <div className="loan-amount">{formatCurrency(loan.amount)}</div>
                                                    <div className="loan-date">Started {new Date(loan.startDate).toLocaleDateString()}</div>
                                                </div>
                                                <div className="loan-item-right">
                                                    <div className={`loan-status badge-${loan.status}`}>
                                                        {loan.status.replace('_', ' ')}
                                                    </div>
                                                    <div className="loan-out">Out: {formatCurrency(loan.outstandingAmount)}</div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Modal */}
                {isEditing && (
                    <div className="modal-overlay" onClick={() => setIsEditing(false)}>
                        <div className="modal-card animate-pop-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                            <div className="modal-header">
                                <h3>Edit Employee Profile</h3>
                                <button className="modal-close" onClick={() => setIsEditing(false)}><X size={18}/></button>
                            </div>
                            <form onSubmit={handleUpdate} className="modal-form" style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
                                <div className="ec-grid">
                                    <div className="modal-field ec-full">
                                        <label>Full Name</label>
                                        <input type="text" name="fullName" className="native-input" value={editForm.fullName} onChange={handleInputChange} required />
                                    </div>
                                    <div className="modal-field">
                                        <label>Phone</label>
                                        <input type="text" name="phone" className="native-input" value={editForm.phone} onChange={handleInputChange} />
                                    </div>
                                    <div className="modal-field">
                                        <label>Employee ID</label>
                                        <input type="text" name="employeeId" className="native-input" value={editForm.employeeId} onChange={handleInputChange} />
                                    </div>
                                    <div className="modal-field">
                                        <label>Department</label>
                                        <input type="text" name="department" className="native-input" value={editForm.department} onChange={handleInputChange} />
                                    </div>
                                    <div className="modal-field">
                                        <label>Designation</label>
                                        <input type="text" name="designation" className="native-input" value={editForm.designation} onChange={handleInputChange} />
                                    </div>
                                    <div className="modal-field">
                                        <label>Monthly Salary</label>
                                        <input type="number" name="salary" min="0" className="native-input" value={editForm.salary} onChange={handleInputChange} />
                                    </div>
                                    <div className="modal-field">
                                        <label>Max Loan Limit</label>
                                        <input type="number" name="loanLimit" min="0" className="native-input" value={editForm.loanLimit} onChange={handleInputChange} />
                                    </div>
                                    <div className="modal-field ec-full">
                                        <label>Joining Date</label>
                                        <input type="date" name="joiningDate" className="native-input" value={editForm.joiningDate} onChange={handleInputChange} />
                                    </div>
                                    <div className="modal-field ec-full">
                                        <label>Internal Notes</label>
                                        <textarea name="notes" className="native-input" rows="3" value={editForm.notes} onChange={handleInputChange} />
                                    </div>
                                </div>
                                <div className="modal-actions" style={{ marginTop: '2rem' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <><Save size={16}/> Save Changes</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <style jsx>{`
                    .employee-details-container { padding-bottom: 2rem; }
                    .nav-header { margin-bottom: 1.5rem; }
                    .back-link { display: inline-flex; align-items: center; gap: 0.5rem; color: #64748b; font-weight: 600; text-decoration: none; font-size: 0.875rem; transition: color 0.2s; }
                    .back-link:hover { color: #0f172a; }

                    .profile-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; padding: 2rem; border-radius: 12px; }
                    .profile-info { display: flex; align-items: center; gap: 1.5rem; }
                    .avatar-large { width: 72px; height: 72px; background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; font-weight: 800; color: white; box-shadow: 0 4px 15px -3px rgba(15, 23, 42, 0.15); }
                    .name-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
                    .name-row h1 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
                    .status-badge { padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
                    .status-badge.active { background: #dcfce7; color: #166534; }
                    .status-badge.inactive { background: #f1f5f9; color: #64748b; }
                    .status-badge.terminated { background: #fee2e2; color: #991b1b; }
                    
                    .meta-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
                    .meta-item { display: flex; align-items: center; gap: 0.375rem; font-size: 0.875rem; color: #64748b; font-weight: 500; }

                    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
                    @media (max-width: 900px) { .details-grid { grid-template-columns: 1fr; } .profile-header { flex-direction: column; gap: 1.5rem; align-items: stretch; } .profile-header .btn { width: 100%; justify-content: center; } }
                    
                    .card-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 1.25rem; }
                    .info-card { padding: 1.5rem; }
                    .info-list { display: flex; flex-direction: column; gap: 1rem; }
                    .info-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; border-bottom: 1px dashed #e2e8f0; }
                    .info-row:last-child { border-bottom: none; padding-bottom: 0; }
                    .info-label { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-size: 0.875rem; font-weight: 600; }
                    .info-value { font-size: 0.9rem; color: #0f172a; font-weight: 500; }
                    
                    .notes-text { font-size: 0.875rem; color: #475569; line-height: 1.6; white-space: pre-wrap; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; }

                    .loan-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
                    .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 8px; }
                    .stat-label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; }
                    .stat-value { font-size: 1.5rem; font-weight: 800; }
                    .text-danger { color: #e11d48; }
                    .text-primary { color: #4f46e5; }

                    .loan-history h4 { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem; }
                    .empty-loans { text-align: center; padding: 3rem 1rem; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1; color: #64748b; font-size: 0.875rem; }
                    
                    .loan-list { display: flex; flex-direction: column; gap: 0.75rem; }
                    .loan-item { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; transition: all 0.2s; }
                    .loan-item:hover { border-color: #cbd5e1; background: #f8fafc; transform: translateY(-1px); }
                    .loan-amount { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
                    .loan-date { font-size: 0.75rem; color: #64748b; font-weight: 500; }
                    .loan-status { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 0.125rem 0.5rem; border-radius: 4px; margin-bottom: 0.25rem; display: inline-block; }
                    .badge-active, .badge-approved, .badge-partially_repaid { background: #dcfce7; color: #166534; }
                    .badge-pending_approval { background: #fef3c7; color: #b45309; }
                    .badge-completed { background: #f1f5f9; color: #475569; }
                    .badge-overdue { background: #fee2e2; color: #991b1b; }
                    .loan-out { font-size: 0.75rem; font-weight: 700; color: #e11d48; text-align: right; }
                    
                    /* Form Grid */
                    .ec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                    .ec-full { grid-column: 1 / -1; }
                    @media (max-width: 600px) { .ec-grid { grid-template-columns: 1fr; } }
                    
                    .modal-field { display: flex; flex-direction: column; gap: 0.375rem; }
                    .modal-field label { font-size: 0.8125rem; font-weight: 700; color: #334155; }
                    .native-input { padding: 0.625rem 1rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem; font-family: inherit; font-weight: 500; color: #0f172a; outline: none; transition: border-color 0.2s; }
                    .native-input:focus { border-color: #0f172a; }
                    
                    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
