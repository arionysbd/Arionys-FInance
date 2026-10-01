'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { hasPermission } from '@/lib/permissions';
import CustomSelect from '@/components/UI/CustomSelect';
import { getLoans, createLoan, getEmployees, getAccounts } from '@/lib/api';
import { Banknote, Plus, Search, Filter, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoansPage() {
  const { user, loading: authLoading } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Create Loan modal (CEO/CFO/Admin). Loan requests live on their own page: /loans/request
  const [showCreate, setShowCreate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  const [formData, setFormData] = useState(() => ({
    employeeId: '',
    paidFromAccount: '',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
  }));

  const canCreateLoan = hasPermission(user, 'loans');

  const emptyLoanForm = () => ({
    employeeId: '',
    paidFromAccount: '',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
  });

  const openModal = () => {
    setFormData(emptyLoanForm());
    setError('');
    setShowCreate(true);
  };

  const closeModal = () => setShowCreate(false);

  useEffect(() => {
    if (authLoading) return;
    fetchLoans();
  }, [user, authLoading, search, filterStatus]);

  useEffect(() => {
    if (showCreate) {
        fetchFormData();
    }
  }, [showCreate]);

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
      if (!canCreateLoan) return;
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
      // Empty employeeId = request for myself
      const res = await createLoan(formData);
      if (res.success) {
        closeModal();
        setFormData(emptyLoanForm());
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
        <div className="card loans-toolbar">
            <div className="toolbar-title">
                <h2>Employee Loans</h2>
                <p className="text-muted">Manage advances and loans for your staff</p>
            </div>
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
            <div className="filter-box">
                <CustomSelect
                    size="sm"
                    icon={<Filter size={16} />}
                    ariaLabel="Filter by status"
                    value={filterStatus}
                    onChange={setFilterStatus}
                    options={[
                        { value: '', label: 'All Statuses' },
                        { value: 'pending_approval', label: 'Pending Approval' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'active,partially_repaid', label: 'Active & Disbursed' },
                        { value: 'overdue', label: 'Overdue' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'rejected', label: 'Rejected' },
                    ]}
                />
            </div>
            {canCreateLoan && (
                <div className="toolbar-actions">
                    <button className="btn btn-primary toolbar-btn" onClick={openModal}>
                        <Plus size={18} /> Create Loan
                    </button>
                </div>
            )}
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
                                <h3 className="emp-name">
                                    {loan.employeeName}
                                    <span className={`origin-tag ${loan.origin === 'request' ? 'is-request' : 'is-issued'}`}>
                                        {loan.origin === 'request' ? 'Request' : 'Issued'}
                                    </span>
                                </h3>
                                <p className="loan-date">Created {new Date(loan.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="loan-status">
                                {loan.status === 'pending_approval' && <span className="badge badge-pending">Pending</span>}
                                {loan.status === 'approved' && <span className="badge" style={{background:'#fef3c7',color:'#d97706'}}>Approved</span>}
                                {(loan.status === 'active' || loan.status === 'partially_repaid') && <span className="badge badge-approved">Active</span>}
                                {loan.status === 'overdue' && <span className="badge badge-expense">Overdue</span>}
                                {loan.status === 'completed' && <span className="badge" style={{background:'#f1f5f9',color:'#64748b'}}>Completed</span>}
                                {loan.status === 'rejected' && <span className="badge badge-expense">Rejected</span>}
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
                        <p className="text-muted">No employee loans or requests yet.</p>
                        {canCreateLoan && (
                            <button className="btn btn-primary" style={{marginTop: '1rem'}} onClick={openModal}>
                                <Plus size={18} /> Create First Loan
                            </button>
                        )}
                    </div>
                )}
            </div>
        )}
      </div>

      {showCreate && canCreateLoan && (
          <div className="modal-overlay animate-fade-in">
              <div className="modal-content animate-slide-up">
                  <div className="modal-header">
                      <div>
                          <h3>Create Employee Loan</h3>
                          <p className="modal-sub">Issue a loan to an employee. It will be sent for approval.</p>
                      </div>
                      <button className="close-btn" onClick={closeModal}>&times;</button>
                  </div>
                  {error && <div className="alert alert-danger">{error}</div>}
                    <form onSubmit={handleSubmit} className="modal-form">
                      <div className="form-group">
                          <label>Employee *</label>
                          <CustomSelect 
                              required
                              value={formData.employeeId} 
                              onChange={(val) => handleInputChange({ target: { name: 'employeeId', value: val } })}
                              placeholder="Select Employee..."
                              options={employees.map(emp => ({
                                  value: emp._id,
                                  label: `${emp.fullName} ${emp.designation ? `(${emp.designation})` : ''}`,
                                  subtext: emp.email
                              }))}
                          />
                          {formData.employeeId && (
                              <p className="text-xs text-muted-foreground mt-1">
                                  Limit: {formatCurrency(employees.find(e => e._id === formData.employeeId)?.loanLimit || 0)} 
                                  (Salary: {formatCurrency(employees.find(e => e._id === formData.employeeId)?.salary || 0)})
                              </p>
                          )}
                      </div>
                      <div className="form-group">
                          <label>Source Account (For Disbursement)</label>
                          <CustomSelect 
                              value={formData.paidFromAccount} 
                              onChange={(val) => handleInputChange({ target: { name: 'paidFromAccount', value: val } })}
                              placeholder="Select Account..."
                              options={accounts.map(acc => ({
                                  value: acc._id,
                                  label: `${acc.bankName} - ${acc.acName || 'Cash'}`,
                                  subtext: `Balance: ${formatCurrency(acc.balance)}`
                              }))}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Optional. Can also be chosen at disbursement. Funds are deducted only when the loan is disbursed.</p>
                      </div>
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
                              <label>End Date *</label>
                              <input 
                                  type="date" 
                                  name="endDate" 
                                  className="input-field" 
                                  required 
                                  value={formData.endDate} 
                                  onChange={handleInputChange} 
                              />
                          </div>
                      </div>
                      <div className="form-group">
                          <label>Notes</label>
                          <textarea
                              name="notes"
                              className="input-field"
                              rows="3"
                              value={formData.notes}
                              onChange={handleInputChange}
                              placeholder="Terms, repayment plan, etc."
                          ></textarea>
                      </div>
                      <div className="modal-actions">
                          <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                          <button type="submit" className="btn btn-primary" disabled={isSubmitting || !formData.employeeId}>
                              {isSubmitting ? <Loader2 size={18} className="spinner" /> : 'Create Loan'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

        <style jsx>{`
            .loans-toolbar { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; margin-bottom: 2rem; }
            .toolbar-title { flex: 1; min-width: 0; }
            .toolbar-title h2 { font-size: 1.25rem; color: #0f172a; margin: 0 0 0.125rem; white-space: nowrap; }
            .toolbar-title p { margin: 0; font-size: 0.8125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .search-box { position: relative; flex: 0 1 340px; min-width: 200px; }
            :global(.search-icon) { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
            .search-box .input-field { padding-left: 2.5rem; width: 100%; }
            .filter-box { position: relative; flex: 0 0 210px; }
            .toolbar-btn { flex-shrink: 0; white-space: nowrap; }
            .toolbar-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
            .emp-name { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
            .origin-tag { padding: 0.0625rem 0.4375rem; border-radius: 4px; font-size: 0.625rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
            .origin-tag.is-request { background: #fef3c7; color: #92400e; }
            .origin-tag.is-issued { background: #e0e7ff; color: #3730a3; }
            @media (max-width: 960px) {
                .loans-toolbar { flex-wrap: wrap; }
                .toolbar-title { flex: 1 1 100%; }
                .search-box { flex: 1 1 200px; }
                .filter-box { flex: 1 1 180px; }
            }
            @media (max-width: 640px) {
                .search-box, .filter-box { flex: 1 1 100%; }
                .toolbar-actions { width: 100%; }
                .toolbar-btn { flex: 1; justify-content: center; }
                .form-row { flex-direction: column; }
            }

            .loans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
            .loan-card { padding: 1.5rem; transition: all 0.2s; text-decoration: none; display: flex; flex-direction: column; color: inherit; }
            .loan-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border-color: #cbd5e1; }
            
            .loan-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
            .emp-name { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem; }
            .loan-date { font-size: 0.8rem; color: #64748b; }
            
            .loan-amounts { display: flex; justify-content: space-between; padding: 1rem; background: #f8fafc; border-radius: 6px; margin-bottom: 1.5rem; }
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

            .modal-content { max-width: 600px; }
            
            .modal-form { padding: 1.5rem; }
            .form-group { margin-bottom: 1.25rem; }
            .form-group label { display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }
            .form-row { display: flex; gap: 1rem; }
            .form-row .form-group { flex: 1; }
            
            
            .alert { padding: 1rem; border-radius: 6px; margin: 1rem 1.5rem 0; font-size: 0.875rem; font-weight: 500; }
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
    </DashboardLayout>
  );
}
