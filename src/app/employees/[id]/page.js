'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { getLoans } from '@/lib/api';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { 
    ArrowLeft, User, Mail, Phone, Briefcase, Building2, Hash, Calendar, 
    Calculator, Edit, AlertCircle, Banknote, ShieldCheck, Loader2, Save, X, Camera, Trash2,
    KeyRound, Activity, Clock, UserPlus, FileText, Wallet
} from 'lucide-react';
import Link from 'next/link';

const formatDate = (value) => value
    ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

// Human-readable time since joining, e.g. "2 yrs 3 mos"
const formatTenure = (joiningDate) => {
    if (!joiningDate) return null;
    const start = new Date(joiningDate);
    const now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) months -= 1;
    if (months < 0) return 'Not started yet';
    if (months === 0) return 'Less than a month';
    const years = Math.floor(months / 12);
    const rest = months % 12;
    return [years && `${years} yr${years > 1 ? 's' : ''}`, rest && `${rest} mo${rest > 1 ? 's' : ''}`].filter(Boolean).join(' ');
};

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
    const [editError, setEditError] = useState('');

    const photoInputRef = useRef(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState('');

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
                setEditForm(toEditForm(empRes.data.data));
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

    const toEditForm = (emp) => ({
        fullName: emp.fullName || '',
        phone: emp.phone || '',
        department: emp.department || '',
        designation: emp.designation || '',
        employeeId: emp.employeeId || '',
        salary: emp.salary || 0,
        loanLimit: emp.loanLimit || 0,
        joiningDate: emp.joiningDate ? String(emp.joiningDate).split('T')[0] : '',
        notes: emp.notes || ''
    });

    const startEditing = () => {
        setEditForm(toEditForm(employee));
        setEditError('');
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setEditForm(toEditForm(employee));
        setEditError('');
        setIsEditing(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setEditError('');
        setIsSubmitting(true);
        try {
            const res = await axios.patch(`/api/employees/${id}`, editForm);
            if (res.data.success) {
                setEmployee(prev => ({ ...prev, ...res.data.data, createdBy: prev.createdBy, account: prev.account }));
                setIsEditing(false);
            }
        } catch (err) {
            setEditError(err.response?.data?.message || 'Update failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Resize to a small square JPEG so the photo stays light when stored on the employee record
    const resizeImage = (file, size = 256) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the selected file.'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('The selected file is not a valid image.'));
            img.onload = () => {
                const side = Math.min(img.width, img.height);
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });

    const savePhoto = async (profilePhoto) => {
        setPhotoError('');
        setIsUploadingPhoto(true);
        try {
            const res = await axios.patch(`/api/employees/${id}`, { profilePhoto });
            if (res.data.success) setEmployee(prev => ({ ...prev, profilePhoto: res.data.data.profilePhoto }));
        } catch (err) {
            setPhotoError(err.response?.data?.message || 'Failed to update photo.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handlePhotoSelect = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setPhotoError('Please choose an image file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setPhotoError('Image must be smaller than 5 MB.');
            return;
        }
        try {
            const dataUrl = await resizeImage(file);
            await savePhoto(dataUrl);
        } catch (err) {
            setPhotoError(err.message);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(amount || 0);
    };

    const canEdit = hasPermission(user, 'employees');

    // Renders an input in place of a detail value while the profile is in edit mode
    const editInput = (name, props = {}) => (
        <input
            name={name}
            className="inline-input"
            value={editForm[name] ?? ''}
            onChange={handleInputChange}
            {...props}
        />
    );

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
                <Link href="/employees" className="btn btn-secondary m-6" style={{ width: 'fit-content', display: 'inline-flex' }}>
                    <ArrowLeft size={16} /> Back to Employees
                </Link>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="employee-details-container animate-fade-in">
                {/* Header */}
                <div className="nav-header">
                    <Link href="/employees" className="back-link">
                        <ArrowLeft size={18} />
                        <span>Employees Directory</span>
                    </Link>
                </div>

                <div className="profile-header card">
                    <div className="profile-info">
                        <div className="avatar-block">
                            <div className="avatar-large">
                                {employee.profilePhoto ? (
                                    <img src={employee.profilePhoto} alt={employee.fullName} className="avatar-img" />
                                ) : (
                                    <User size={34} strokeWidth={1.75} />
                                )}
                                {isUploadingPhoto && (
                                    <div className="avatar-overlay"><Loader2 size={20} className="animate-spin" /></div>
                                )}
                            </div>
                            {canEdit && (
                                <div className="avatar-actions">
                                    <button type="button" className="avatar-btn" onClick={() => photoInputRef.current?.click()} disabled={isUploadingPhoto}>
                                        <Camera size={13} />
                                        <span>{employee.profilePhoto ? 'Change' : 'Upload'}</span>
                                    </button>
                                    {employee.profilePhoto && (
                                        <button type="button" className="avatar-btn danger" onClick={() => savePhoto('')} disabled={isUploadingPhoto} title="Remove photo">
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                    <input ref={photoInputRef} type="file" accept="image/png, image/jpeg, image/webp" hidden onChange={handlePhotoSelect} />
                                </div>
                            )}
                        </div>
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
                            {photoError && <p className="photo-error"><AlertCircle size={13} /> {photoError}</p>}
                        </div>
                    </div>
                    {canEdit && (
                        isEditing ? (
                            <div className="edit-actions">
                                <button type="button" className="btn btn-secondary" onClick={cancelEditing} disabled={isSubmitting}>
                                    <X size={16} /> Cancel
                                </button>
                                <button type="submit" form="employee-edit-form" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save Changes
                                </button>
                            </div>
                        ) : (
                            <button className="btn btn-primary" onClick={startEditing}>
                                <Edit size={16} /> Edit Profile
                            </button>
                        )
                    )}
                </div>

                <div className="details-grid">
                    {/* Left Column: Work & Financials */}
                    <form id="employee-edit-form" className={`left-col ${isEditing ? 'editing' : ''}`} onSubmit={handleUpdate}>
                        {editError && (
                            <div className="edit-error"><AlertCircle size={14} /> {editError}</div>
                        )}
                        <div className="card info-card">
                            <h3 className="card-title">Personal & Contact</h3>
                            <div className="info-list">
                                <div className="info-row">
                                    <div className="info-label"><User size={16}/> Full Name</div>
                                    {isEditing ? editInput('fullName', { required: true }) : <div className="info-value">{employee.fullName}</div>}
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Mail size={16}/> Email</div>
                                    <div className="info-value">{employee.email}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Phone size={16}/> Phone No</div>
                                    {isEditing ? editInput('phone', { type: 'tel', required: true, placeholder: '+8801XXXXXXXXX' }) : <div className={`info-value ${!employee.phone ? 'muted' : ''}`}>{employee.phone || 'Not Provided'}</div>}
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Hash size={16}/> Employee ID</div>
                                    {isEditing ? editInput('employeeId', { placeholder: 'EMP-001' }) : <div className={`info-value ${!employee.employeeId ? 'muted' : ''}`}>{employee.employeeId || 'Not Assigned'}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="card info-card">
                            <h3 className="card-title">Employment Details</h3>
                            <div className="info-list">
                                <div className="info-row">
                                    <div className="info-label"><Building2 size={16}/> Department</div>
                                    {isEditing ? editInput('department') : <div className={`info-value ${!employee.department ? 'muted' : ''}`}>{employee.department || 'Not Assigned'}</div>}
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Briefcase size={16}/> Designation</div>
                                    {isEditing ? editInput('designation') : <div className={`info-value ${!employee.designation ? 'muted' : ''}`}>{employee.designation || 'Not Assigned'}</div>}
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Calendar size={16}/> Joining Date</div>
                                    {isEditing ? editInput('joiningDate', { type: 'date' }) : <div className={`info-value ${!employee.joiningDate ? 'muted' : ''}`}>{formatDate(employee.joiningDate) || 'Unknown'}</div>}
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Clock size={16}/> Tenure</div>
                                    <div className={`info-value ${!employee.joiningDate ? 'muted' : ''}`}>{formatTenure(employee.joiningDate) || 'Unknown'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Activity size={16}/> Employment Status</div>
                                    <div className="info-value"><span className={`status-badge ${employee.status}`}>{employee.status}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="card info-card">
                            <h3 className="card-title">System Access</h3>
                            <div className="info-list">
                                <div className="info-row">
                                    <div className="info-label"><ShieldCheck size={16}/> Pages</div>
                                    {!employee.account ? (
                                        <div className="info-value muted">No login account yet</div>
                                    ) : employee.account.isOwner ? (
                                        <div className="info-value">Company Owner · all pages</div>
                                    ) : employee.account.permissions?.length ? (
                                        <div className="access-chips">
                                            {PERMISSIONS.filter(p => employee.account.permissions.includes(p.key)).map(p => (
                                                <span key={p.key} className="access-chip">{p.label}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="info-value muted">No pages</div>
                                    )}
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><KeyRound size={16}/> Account Access</div>
                                    <div className="info-value">
                                        {employee.account ? (
                                            <span className={`status-badge ${employee.account.isActive ? 'active' : 'terminated'}`}>
                                                {employee.account.isActive ? 'Active' : 'Revoked'}
                                            </span>
                                        ) : (
                                            <span className="status-badge inactive">Invite Pending</span>
                                        )}
                                    </div>
                                </div>
                                {employee.account?.createdAt && (
                                    <div className="info-row">
                                        <div className="info-label"><Calendar size={16}/> Account Created</div>
                                        <div className="info-value">{formatDate(employee.account.createdAt)}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="card info-card">
                            <h3 className="card-title">Financial Profile</h3>
                            <div className="info-list">
                                <div className="info-row">
                                    <div className="info-label"><Calculator size={16}/> Monthly Salary</div>
                                    {isEditing ? editInput('salary', { type: 'number', min: 0 }) : <div className="info-value font-bold">{formatCurrency(employee.salary)}</div>}
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><ShieldCheck size={16}/> Max Loan Limit</div>
                                    {isEditing ? editInput('loanLimit', { type: 'number', min: 0 }) : <div className="info-value font-bold">{formatCurrency(employee.loanLimit)}</div>}
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Wallet size={16}/> Available Loan Limit</div>
                                    <div className="info-value font-bold">{formatCurrency(Math.max((employee.loanLimit || 0) - totalOutstanding, 0))}</div>
                                </div>
                            </div>
                        </div>

                        <div className="card info-card">
                            <h3 className="card-title">Record Info</h3>
                            <div className="info-list">
                                <div className="info-row">
                                    <div className="info-label"><UserPlus size={16}/> Added By</div>
                                    <div className={`info-value ${!employee.createdBy?.name ? 'muted' : ''}`}>{employee.createdBy?.name || 'Unknown'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Calendar size={16}/> Added On</div>
                                    <div className="info-value">{formatDate(employee.createdAt) || 'Unknown'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label"><Clock size={16}/> Last Updated</div>
                                    <div className="info-value">{formatDate(employee.updatedAt) || 'Unknown'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="card info-card">
                            <h3 className="card-title"><FileText size={16} className="title-icon"/> Internal Notes</h3>
                            {isEditing ? (
                                <textarea name="notes" className="inline-input inline-textarea" rows="4" placeholder="Add internal notes..." value={editForm.notes ?? ''} onChange={handleInputChange} />
                            ) : employee.notes
                                ? <p className="notes-text">{employee.notes}</p>
                                : <p className="notes-empty">No notes added.</p>}
                        </div>
                    </form>

                    {/* Right Column: Loans Overview */}
                    <div className="right-col">
                        <div className="card info-card">
                            <div className="section-head">
                                <h3 className="card-title" style={{marginBottom: 0}}>Loans & Advances</h3>
                                <Link href="/loans" className="btn btn-secondary">Go to Loans</Link>
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
                                        <Banknote size={32} className="empty-loans-icon"/>
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

                <style jsx>{`
                    .employee-details-container { padding-bottom: 2rem; }
                    .nav-header { margin-bottom: 1.5rem; }
                    .nav-header :global(.back-link) { display: inline-flex; align-items: center; gap: 0.5rem; color: #64748b; font-weight: 600; text-decoration: none; font-size: 0.875rem; transition: color 0.2s; }
                    .nav-header :global(.back-link:hover) { color: #0f172a; }

                    .profile-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem; margin-bottom: 1.5rem; padding: 2rem; border-radius: 6px; }
                    .profile-info { display: flex; align-items: center; gap: 1.5rem; min-width: 0; }
                    .avatar-block { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; flex-shrink: 0; }
                    .avatar-large { position: relative; width: 88px; height: 88px; overflow: hidden; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #64748b; box-shadow: 0 4px 15px -3px rgba(15, 23, 42, 0.15); }
                    .avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
                    .avatar-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.45); color: #ffffff; }
                    .avatar-actions { display: flex; gap: 0.375rem; }
                    .avatar-btn { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px; background: #ffffff; color: #475569; font-size: 0.75rem; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.15s; }
                    .avatar-btn:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
                    .avatar-btn.danger { color: #dc2626; }
                    .avatar-btn.danger:hover:not(:disabled) { background: #fef2f2; color: #b91c1c; }
                    .avatar-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                    .photo-error { display: flex; align-items: center; gap: 0.375rem; margin: 0.75rem 0 0; font-size: 0.8125rem; font-weight: 600; color: #dc2626; }
                    .name-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
                    .name-row h1 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
                    .status-badge { padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; }
                    .status-badge.active { background: #dcfce7; color: #166534; }
                    .status-badge.inactive { background: #f1f5f9; color: #64748b; }
                    .status-badge.terminated { background: #fee2e2; color: #991b1b; }
                    
                    .meta-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
                    .meta-item { display: flex; align-items: center; gap: 0.375rem; font-size: 0.875rem; color: #64748b; font-weight: 500; }

                    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start; }
                    .left-col { display: flex; flex-direction: column; gap: 1.5rem; min-width: 0; }
                    .right-col { min-width: 0; }
                    .section-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
                    .empty-loans-icon { display: block; margin: 0 auto 0.75rem; color: #cbd5e1; }
                    @media (max-width: 900px) { .details-grid { grid-template-columns: 1fr; } .profile-header { flex-direction: column; align-items: stretch; } .profile-header .btn { width: 100%; justify-content: center; } }
                    @media (max-width: 600px) { .profile-info { flex-direction: column; text-align: center; } .name-row, .meta-row { justify-content: center; } .loan-stats { grid-template-columns: 1fr; } }
                    
                    .card-title { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 1.25rem; }
                    .info-card { padding: 1.75rem; }
                    .info-list { display: flex; flex-direction: column; gap: 1rem; }
                    .info-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; border-bottom: 1px dashed #e2e8f0; }
                    .info-row:last-child { border-bottom: none; padding-bottom: 0; }
                    .info-label { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-size: 0.875rem; font-weight: 600; }
                    .info-value { font-size: 0.9rem; color: #0f172a; font-weight: 500; text-align: right; word-break: break-word; }
                    .info-value.muted { color: #94a3b8; }
                    .info-row { gap: 1rem; }
                    .info-label { flex-shrink: 0; }
                    .card-title { display: flex; align-items: center; gap: 0.5rem; }
                    .notes-empty { margin: 0; font-size: 0.875rem; color: #94a3b8; }
                    .access-chips { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.375rem; max-width: 70%; }
                    .access-chip { padding: 0.1875rem 0.5rem; border-radius: 4px; background: #eef2ff; color: #4338ca; font-size: 0.75rem; font-weight: 600; }
                    .edit-actions { display: flex; gap: 0.75rem; flex-shrink: 0; }
                    .edit-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border: 1px solid #fecaca; border-radius: 6px; background: #fef2f2; color: #b91c1c; font-size: 0.8125rem; font-weight: 600; }
                    .left-col.editing .info-card { border-color: #c7d2fe; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08); }
                    .inline-input { width: 100%; max-width: 280px; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; font-size: 0.875rem; font-family: inherit; font-weight: 500; color: #0f172a; text-align: right; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
                    .inline-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
                    .inline-textarea { max-width: none; text-align: left; resize: vertical; line-height: 1.5; }
                    @media (max-width: 600px) { .edit-actions { width: 100%; } .edit-actions .btn { flex: 1; justify-content: center; } .inline-input { max-width: 60%; } }
                    
                    .notes-text { font-size: 0.875rem; color: #475569; line-height: 1.6; white-space: pre-wrap; background: #f8fafc; padding: 1rem; border-radius: 6px; border: 1px solid #e2e8f0; }

                    .loan-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
                    .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 1.25rem; border-radius: 6px; }
                    .stat-label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; }
                    .stat-value { font-size: 1.5rem; font-weight: 800; }
                    .text-danger { color: #e11d48; }
                    .text-primary { color: #4f46e5; }

                    .loan-history h4 { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem; }
                    .empty-loans { text-align: center; padding: 3rem 1rem; background: #f8fafc; border-radius: 6px; border: 1px dashed #cbd5e1; color: #64748b; font-size: 0.875rem; }
                    
                    .loan-list { display: flex; flex-direction: column; gap: 0.75rem; }
                    .loan-list :global(.loan-item) { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; text-decoration: none; transition: all 0.2s; }
                    .loan-list :global(.loan-item:hover) { border-color: #cbd5e1; background: #f8fafc; transform: translateY(-1px); }
                    .loan-amount { font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
                    .loan-date { font-size: 0.75rem; color: #64748b; font-weight: 500; }
                    .loan-status { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 0.125rem 0.5rem; border-radius: 4px; margin-bottom: 0.25rem; display: inline-block; }
                    .badge-active, .badge-approved, .badge-partially_repaid { background: #dcfce7; color: #166534; }
                    .badge-pending_approval { background: #fef3c7; color: #b45309; }
                    .badge-completed { background: #f1f5f9; color: #475569; }
                    .badge-overdue { background: #fee2e2; color: #991b1b; }
                    .loan-out { font-size: 0.75rem; font-weight: 700; color: #e11d48; text-align: right; }
                    
                    
                    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
