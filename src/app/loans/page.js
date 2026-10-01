'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { getLoans, createLoan, getEmployees, getAccounts } from '@/lib/api';
import { Banknote, Plus, Search, Filter, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoansPage() {
  const { user, loading: authLoading } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [formData, setFormData] = useState({
    employeeId: '',
    paidFromAccount: '',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    periodMonths: '',
    notes: '',
  });

  const isAdmin = ['owner', 'admin', 'ceo', 'cfo'].includes(user?.role?.toLowerCase());

  useEffect(() => {
    if (authLoading) return;
    fetchLoans();
  }, [user, authLoading, search, filterStatus]);

  useEffect(() => {
    if (showModal) {
        fetchFormData();
    }
  }, [showModal]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await getLoans({ search, status: filterStatus });
      if (res.success) {
        setLoans(res.data);
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
      try {
          const [empRes, accRes] = await Promise.all([
              getEmployees({ status: 'active' }),
              getAccounts()
          ]);
          if (empRes.success) setEmployees(empRes.data);
          if (accRes.success) setAccounts(accRes.data);
      } catch (err) {
          console.error("Error fetching form data:", err);
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
      // Calculate End Date
      let endDate = null;
      if (formData.startDate && formData.periodMonths) {
          const start = new Date(formData.startDate);
          start.setMonth(start.getMonth() + parseInt(formData.periodMonths));
          endDate = start.toISOString().split('T')[0];
      }

      const res = await createLoan({ ...formData, endDate });
      if (res.success) {
        setShowModal(false);
        setFormData({ employeeId: '', paidFromAccount: '', amount: '', startDate: new Date().toISOString().split('T')[0], periodMonths: '', notes: '' });
        fetchLoans();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount, currency = 'BDT') => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="page-header">
            <div>
                <h2>Employee Loans</h2>
                <p className="text-muted">Manage advances and loans for your staff</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={18} /> {isAdmin ? 'New Loan' : 'Request Loan'}
            </button>
        </div>

        <div className="card controls-card">
            <div className="search-box">
                <Search size={18} className="search-icon" />
                <input 
                    type="text" 
                    placeholder="Search by employee name..." 
                    className="input-field"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="filter-box flex items-center gap-2">
                <Filter size={18} className="text-muted-foreground" />
                <select className="input-field" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="active,partially_repaid">Active & Disbursed</option>
                    <option value="overdue">Overdue</option>
                    <option value="completed">Completed</option>
                </select>
            </div>
        </div>

        {loading ? (
            <div className="loading-state">
                <Loader2 size={32} className="spinner" />
                <p>Loading loans...</p>
            </div>
        ) : (
            <div className="loans-grid">
                {loans.map(loan => (
                    <Link href={`/loans/${loan._id}`} key={loan._id} className="card loan-card">
                        <div className="loan-header">
                            <div>
                                <h3 className="emp-name">{loan.employeeName}</h3>
                                <p className="loan-date">Created {new Date(loan.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="loan-status">
                                {loan.status === 'pending_approval' && <span className="badge badge-pending">Pending</span>}
                                {loan.status === 'approved' && <span className="badge" style={{background:'#fef3c7',color:'#d97706'}}>Approved</span>}
                                {(loan.status === 'active' || loan.status === 'partially_repaid') && <span className="badge badge-approved">Active</span>}
                                {loan.status === 'overdue' && <span className="badge badge-expense">Overdue</span>}
                                {loan.status === 'completed' && <span className="badge" style={{background:'#f1f5f9',color:'#64748b'}}>Completed</span>}
                            </div>
                        </div>
                        
                        <div className="loan-amounts">
                            <div className="amount-block">
                                <span className="label">Total Loan</span>
                                <span className="value">{formatCurrency(loan.amount, loan.currency)}</span>
                            </div>
                            <div className="amount-block text-right">
                                <span className="label">Outstanding</span>
                                <span className={`value ${loan.outstandingAmount > 0 ? 'text-danger' : 'text-success'}`}>
                                    {formatCurrency(loan.outstandingAmount, loan.currency)}
                                </span>
                            </div>
                        </div>

                        <div className="loan-progress">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{width: `${(loan.totalRepaid / loan.amount) * 100}%`}}></div>
                            </div>
                            <div className="progress-text">
                                {((loan.totalRepaid / loan.amount) * 100).toFixed(0)}% Repaid
                            </div>
                        </div>

                        <div className="loan-footer">
                            <span className="text-sm text-slate-500">View Details</span>
                            <ArrowRight size={16} className="text-slate-400" />
                        </div>
                    </Link>
                ))}
                {loans.length === 0 && (
                    <div className="empty-state">
                        <Banknote size={48} className="empty-icon" />
                        <h3>No loans found</h3>
                        <p className="text-muted">You haven't issued any employee loans yet.</p>
                        <button className="btn btn-primary" style={{marginTop: '1rem'}} onClick={() => setShowModal(true)}>
                            <Plus size={18} /> {isAdmin ? 'Create First Loan' : 'Request First Loan'}
                        </button>
                    </div>
                )}
            </div>
        )}

        {showModal && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="modal-header">
                        <h3>Create Employee Loan</h3>
                        <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
                    </div>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <form onSubmit={handleSubmit} className="modal-form">
                        {isAdmin && (
                            <div className="form-group">
                                <label>Employee *</label>
                                <select name="employeeId" className="input-field" required value={formData.employeeId} onChange={handleInputChange}>
                                    <option value="">Select Employee...</option>
                                    {employees.map(emp => (
                                        <option key={emp._id} value={emp._id}>{emp.fullName} {emp.designation ? `(${emp.designation})` : ''}</option>
                                    ))}
                                </select>
                                {formData.employeeId && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Limit: {formatCurrency(employees.find(e => e._id === formData.employeeId)?.loanLimit || 0)} 
                                        (Salary: {formatCurrency(employees.find(e => e._id === formData.employeeId)?.salary || 0)})
                                    </p>
                                )}
                            </div>
                        )}
                        {isAdmin && (
                            <div className="form-group">
                                <label>Source Account (For Disbursement) *</label>
                                <select name="paidFromAccount" className="input-field" required value={formData.paidFromAccount} onChange={handleInputChange}>
                                    <option value="">Select Account...</option>
                                    {accounts.map(acc => (
                                        <option key={acc._id} value={acc._id}>{acc.bankName} - {acc.acName || 'Cash'} (Bal: {formatCurrency(acc.balance)})</option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">Funds will be deducted from this account when the loan is disbursed.</p>
                            </div>
                        )}
                        <div className="form-group">
                            <label>Loan Amount *</label>
                            <input type="number" step="0.01" min="1" name="amount" className="input-field" required value={formData.amount} onChange={handleInputChange} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Start Date *</label>
                                <input type="date" name="startDate" className="input-field" required value={formData.startDate} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>Period (Months) *</label>
                                <select name="periodMonths" className="input-field" required value={formData.periodMonths} onChange={handleInputChange}>
                                    <option value="">Select duration...</option>
                                    {[3, 6, 9, 12, 18, 24, 36].map(m => (
                                        <option key={m} value={m}>{m} Months</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea name="notes" className="input-field" rows="3" value={formData.notes} onChange={handleInputChange} placeholder="Reason for loan, terms, etc."></textarea>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 size={18} className="spinner" /> : (isAdmin ? 'Create Loan' : 'Submit Request')}
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
            .search-box .input-field { padding-left: 2.5rem; width: 100%; }
            .filter-box { width: 250px; }
            @media (max-width: 640px) {
                .controls-card { flex-direction: column; align-items: stretch; }
                .search-box { max-width: 100%; }
                .filter-box { width: 100%; }
                .form-row { flex-direction: column; }
            }

            .loans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
            .loan-card { padding: 1.5rem; transition: all 0.2s; text-decoration: none; display: flex; flex-direction: column; color: inherit; }
            .loan-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border-color: #cbd5e1; }
            
            .loan-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
            .emp-name { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem; }
            .loan-date { font-size: 0.8rem; color: #64748b; }
            
            .loan-amounts { display: flex; justify-content: space-between; padding: 1rem; background: #f8fafc; border-radius: 8px; margin-bottom: 1.5rem; }
            .amount-block { display: flex; flex-direction: column; gap: 0.25rem; }
            .amount-block .label { font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
            .amount-block .value { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
            .text-danger { color: #e11d48 !important; }
            .text-success { color: #10b981 !important; }
            
            .loan-progress { margin-bottom: 1.5rem; }
            .progress-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-bottom: 0.5rem; }
            .progress-fill { height: 100%; background: #4f46e5; border-radius: 3px; transition: width 0.3s ease; }
            .progress-text { font-size: 0.75rem; color: #64748b; text-align: right; font-weight: 600; }

            .loan-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #f1f5f9; margin-top: auto; }

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
            
            /* Utils */
            .flex { display: flex; }
            .items-center { align-items: center; }
            .gap-2 { gap: 0.5rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
