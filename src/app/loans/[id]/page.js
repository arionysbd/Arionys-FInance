'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { getLoan, getLoanRepayments, addLoanRepayment, approveLoan, disburseLoan, getAccounts } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { Banknote, Calendar, CheckCircle, Clock, CheckCircle2, ArrowRightLeft, User, FileText, Loader2, ArrowLeft, ShieldCheck, ShieldAlert, Plus, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function LoanDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [loan, setLoan] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isApproving, setIsApproving] = useState(false);
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [disburseAccount, setDisburseAccount] = useState('');
  
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [isSubmittingRepayment, setIsSubmittingRepayment] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [repayForm, setRepayForm] = useState({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      receivedIntoAccount: '',
      paymentMethod: 'cash',
      reference: '',
      notes: ''
  });

  const canManage = ['owner', 'admin', 'ceo', 'cfo', 'accountant'].includes(user?.role?.toLowerCase());
  const canApprove = ['owner', 'admin', 'ceo', 'cfo'].includes(user?.role?.toLowerCase());

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [id, user, authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [loanRes, repRes, accRes] = await Promise.all([
          getLoan(id),
          getLoanRepayments(id),
          getAccounts()
      ]);
      if (loanRes.success) setLoan(loanRes.data);
      if (repRes.success) setRepayments(repRes.data);
      if (accRes.success) setAccounts(accRes.data);
    } catch (err) {
      setError('Failed to load loan details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
      if (!window.confirm("Approve this loan?")) return;
      setIsApproving(true);
      setError('');
      try {
          const res = await approveLoan(id);
          if (res.success) fetchData();
          else setError(res.message);
      } catch(err) {
          setError(err.response?.data?.message || err.message);
      } finally {
          setIsApproving(false);
      }
  }

  const handleDisburse = async () => {
      if (!loan.paidFromAccount && !disburseAccount) {
          alert('Please select a source account to disburse from.');
          return;
      }
      if (!window.confirm("Disburse this loan? This will deduct the amount from the selected source account.")) return;
      setIsDisbursing(true);
      setError('');
      try {
          const res = await disburseLoan(id, { paidFromAccount: disburseAccount });
          if (res.success) fetchData();
          else setError(res.message);
      } catch(err) {
          setError(err.response?.data?.message || err.message);
      } finally {
          setIsDisbursing(false);
      }
  }

  const openRepayModal = async () => {
      setShowRepayModal(true);
      try {
          const res = await getAccounts();
          if (res.success) setAccounts(res.data);
      } catch (err) { console.error(err); }
  }

  const handleRepayChange = (e) => {
      const { name, value } = e.target;
      setRepayForm(prev => ({ ...prev, [name]: value }));
  }

  const handleRepaySubmit = async (e) => {
      e.preventDefault();
      setIsSubmittingRepayment(true);
      setError('');
      try {
          const res = await addLoanRepayment(id, repayForm);
          if (res.success) {
              setShowRepayModal(false);
              setRepayForm({
                  amount: '', date: new Date().toISOString().split('T')[0],
                  receivedIntoAccount: '', paymentMethod: 'cash', reference: '', notes: ''
              });
              fetchData();
          } else {
              setError(res.message);
          }
      } catch (err) {
          setError(err.response?.data?.message || err.message);
      } finally {
          setIsSubmittingRepayment(false);
      }
  }

  const formatCurrency = (amount, currency = 'BDT') => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  };
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="spinner text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!loan) {
    return (
      <DashboardLayout>
        <div className="card text-center p-8">
            <Banknote size={48} className="mx-auto text-muted mb-4" />
            <h3>Loan Not Found</h3>
            <Link href="/loans" className="btn btn-primary mt-4">Back to Loans</Link>
        </div>
      </DashboardLayout>
    );
  }

  const isActive = ['active', 'partially_repaid', 'overdue'].includes(loan.status);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-6 flex justify-between items-center">
            <Link href="/loans" className="back-link">
                <ArrowLeft size={16} /> Back to Loans
            </Link>
            
            <div className="actions flex gap-2">
                {loan.status === 'pending_approval' && canApprove && (
                    <button onClick={handleApprove} disabled={isApproving} className="btn btn-primary">
                        {isApproving ? <Loader2 size={16} className="spinner" /> : <><ShieldCheck size={16}/> Approve Loan</>}
                    </button>
                )}
                {loan.status === 'approved' && canApprove && (
                    <div className="flex gap-2 items-center">
                        {!loan.paidFromAccount && (
                            <select 
                                className="input-field" 
                                style={{ padding: '0.4rem', height: 'auto', minWidth: '150px' }} 
                                value={disburseAccount} 
                                onChange={(e) => setDisburseAccount(e.target.value)}
                            >
                                <option value="">Select Account...</option>
                                {accounts.map(acc => (
                                    <option key={acc._id} value={acc._id}>{acc.bankName} - {acc.acName || 'Cash'}</option>
                                ))}
                            </select>
                        )}
                        <button onClick={handleDisburse} disabled={isDisbursing} className="btn btn-primary">
                            {isDisbursing ? <Loader2 size={16} className="spinner" /> : <><ArrowRightLeft size={16}/> Disburse Loan</>}
                        </button>
                    </div>
                )}
                {isActive && canManage && (
                    <button onClick={openRepayModal} className="btn btn-primary">
                        <DollarSign size={16} /> Add Repayment
                    </button>
                )}
            </div>
        </div>

        {error && <div className="alert alert-danger mb-6">{error}</div>}

        <div className="grid-layout">
            <div className="main-col">
                <div className="card mb-6 p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-1">Loan for {loan.employeeName}</h2>
                            <p className="text-muted-foreground flex items-center gap-1"><User size={14}/> {loan.employeeId?.designation || 'Employee'}</p>
                        </div>
                        <div className="loan-status">
                            {loan.status === 'pending_approval' && <span className="badge badge-pending">Pending Approval</span>}
                            {loan.status === 'approved' && <span className="badge" style={{background:'#fef3c7',color:'#d97706'}}>Approved (Awaiting Disbursement)</span>}
                            {(loan.status === 'active' || loan.status === 'partially_repaid') && <span className="badge badge-approved">Active & Disbursed</span>}
                            {loan.status === 'overdue' && <span className="badge badge-expense">Overdue</span>}
                            {loan.status === 'completed' && <span className="badge" style={{background:'#f1f5f9',color:'#64748b'}}>Completed</span>}
                        </div>
                    </div>

                    <div className="amounts-grid mb-8">
                        <div className="amount-box">
                            <span className="label">Total Amount</span>
                            <span className="value text-slate-800">{formatCurrency(loan.amount, loan.currency)}</span>
                        </div>
                        <div className="amount-box">
                            <span className="label">Repaid</span>
                            <span className="value text-success">{formatCurrency(loan.totalRepaid, loan.currency)}</span>
                        </div>
                        <div className="amount-box bg-slate-50">
                            <span className="label">Outstanding</span>
                            <span className={`value ${loan.outstandingAmount > 0 ? 'text-danger' : 'text-slate-800'}`}>
                                {formatCurrency(loan.outstandingAmount, loan.currency)}
                            </span>
                        </div>
                    </div>

                    <div className="progress-section mb-6">
                        <div className="flex justify-between text-sm font-bold text-slate-500 mb-2">
                            <span>Repayment Progress</span>
                            <span>{((loan.totalRepaid / loan.amount) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="progress-bar-large">
                            <div className="progress-fill-large" style={{width: `${(loan.totalRepaid / loan.amount) * 100}%`}}></div>
                        </div>
                    </div>
                </div>

                <div className="card p-6">
                    <h3 className="text-lg font-bold border-b pb-4 mb-4">Repayment History</h3>
                    {repayments.length > 0 ? (
                        <div className="repayments-list">
                            {repayments.map(rep => (
                                <div key={rep._id} className="repayment-item">
                                    <div className="rep-icon bg-green-100 text-green-600">
                                        <ArrowRightLeft size={16} />
                                    </div>
                                    <div className="rep-details">
                                        <div className="rep-title">
                                            <span className="font-bold">{formatCurrency(rep.amount, rep.currency)}</span>
                                            <span className="text-sm text-slate-500">via {rep.paymentMethod.replace('_', ' ')}</span>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Received into {rep.receivedIntoAccount?.bankName} • {formatDate(rep.date)}
                                            {rep.reference && ` • Ref: ${rep.reference}`}
                                        </div>
                                    </div>
                                    <div className="rep-actor text-xs text-slate-400">
                                        Recorded by {rep.recordedBy?.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="mx-auto bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                                <Clock size={20} className="text-slate-400" />
                            </div>
                            <p className="text-slate-500 font-medium">No repayments recorded yet.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="side-col">
                <div className="card p-6 mb-6">
                    <h3 className="text-lg font-bold border-b pb-3 mb-4">Terms & Details</h3>
                    <div className="detail-list">
                        <div className="detail-row">
                            <span className="label">Start Date</span>
                            <span className="val">{formatDate(loan.startDate)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="label">End Date</span>
                            <span className="val">{formatDate(loan.endDate)}</span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Duration</span>
                            <span className="val">
                                {Math.round((new Date(loan.endDate) - new Date(loan.startDate)) / (1000 * 60 * 60 * 24 * 30))} Months
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Source Account</span>
                            <span className="val">{loan.paidFromAccount?.bankName || 'Unknown'}</span>
                        </div>
                    </div>
                    {loan.notes && (
                        <div className="mt-4 pt-4 border-t text-sm text-slate-600 bg-slate-50 p-3 rounded">
                            <span className="font-bold text-xs text-slate-400 block uppercase mb-1">Notes</span>
                            {loan.notes}
                        </div>
                    )}
                </div>

                <div className="card p-6">
                    <h3 className="text-lg font-bold border-b pb-3 mb-4">Lifecycle</h3>
                    <div className="timeline">
                        <div className="timeline-item completed">
                            <div className="dot"></div>
                            <div className="content">
                                <h4>Created</h4>
                                <p>{formatDate(loan.createdAt)} by {loan.createdBy?.name}</p>
                            </div>
                        </div>
                        <div className={`timeline-item ${loan.approvedBy ? 'completed' : ''}`}>
                            <div className="dot"></div>
                            <div className="content">
                                <h4>Approved</h4>
                                {loan.approvedBy ? (
                                    <p>{formatDate(loan.approvedAt)} by {loan.approvedBy.name}</p>
                                ) : (
                                    <p>Pending</p>
                                )}
                            </div>
                        </div>
                        <div className={`timeline-item ${loan.disbursedAt ? 'completed' : ''}`}>
                            <div className="dot"></div>
                            <div className="content">
                                <h4>Disbursed</h4>
                                {loan.disbursedAt ? (
                                    <p>{formatDate(loan.disbursedAt)}</p>
                                ) : (
                                    <p>Pending</p>
                                )}
                            </div>
                        </div>
                        <div className={`timeline-item ${loan.completedAt ? 'completed' : ''}`}>
                            <div className="dot"></div>
                            <div className="content">
                                <h4>Completed</h4>
                                {loan.completedAt ? (
                                    <p>{formatDate(loan.completedAt)}</p>
                                ) : (
                                    <p>Outstanding</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {showRepayModal && (
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="modal-header">
                        <h3>Add Repayment</h3>
                        <button className="close-btn" onClick={() => setShowRepayModal(false)}>&times;</button>
                    </div>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <form onSubmit={handleRepaySubmit} className="modal-form">
                        <div className="bg-slate-50 p-4 rounded-lg mb-4 flex justify-between items-center border">
                            <span className="text-sm font-bold text-slate-500">Outstanding Balance</span>
                            <span className="text-lg font-bold text-danger">{formatCurrency(loan.outstandingAmount, loan.currency)}</span>
                        </div>
                        <div className="form-group">
                            <label>Amount Received *</label>
                            <input type="number" step="0.01" min="1" max={loan.outstandingAmount} name="amount" className="input-field" required value={repayForm.amount} onChange={handleRepayChange} />
                        </div>
                        <div className="form-group">
                            <label>Receive Into Account *</label>
                            <select name="receivedIntoAccount" className="input-field" required value={repayForm.receivedIntoAccount} onChange={handleRepayChange}>
                                <option value="">Select Account...</option>
                                {accounts.map(acc => (
                                    <option key={acc._id} value={acc._id}>{acc.bankName} - {acc.acName || 'Cash'}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Date *</label>
                                <input type="date" name="date" className="input-field" required value={repayForm.date} onChange={handleRepayChange} />
                            </div>
                            <div className="form-group">
                                <label>Method</label>
                                <select name="paymentMethod" className="input-field" value={repayForm.paymentMethod} onChange={handleRepayChange}>
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="mobile_banking">Mobile Banking</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Reference / TXN ID</label>
                            <input type="text" name="reference" className="input-field" value={repayForm.reference} onChange={handleRepayChange} />
                        </div>
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea name="notes" className="input-field" rows="2" value={repayForm.notes} onChange={handleRepayChange}></textarea>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowRepayModal(false)}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={isSubmittingRepayment}>
                                {isSubmittingRepayment ? <Loader2 size={18} className="spinner" /> : 'Save Repayment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        <style jsx>{`
            .back-link { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #64748b; transition: color 0.2s; text-decoration: none; }
            .back-link:hover { color: #0f172a; }
            
            .grid-layout { display: grid; grid-template-columns: 1fr 350px; gap: 1.5rem; }
            @media (max-width: 1024px) {
                .grid-layout { grid-template-columns: 1fr; }
            }

            .amounts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
            .amount-box { padding: 1.25rem; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 0.5rem; }
            .amount-box .label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
            .amount-box .value { font-size: 1.5rem; font-weight: 800; }
            @media (max-width: 640px) {
                .amounts-grid { grid-template-columns: 1fr; }
            }
            
            .text-danger { color: #e11d48 !important; }
            .text-success { color: #10b981 !important; }

            .progress-bar-large { height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; }
            .progress-fill-large { height: 100%; background: linear-gradient(90deg, #4f46e5, #6366f1); border-radius: 6px; transition: width 0.5s ease-out; }

            .repayment-item { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #f1f5f9; }
            .repayment-item:last-child { border-bottom: none; padding-bottom: 0; }
            .rep-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .rep-details { flex: 1; }
            .rep-title { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.25rem; }
            
            .detail-list { display: flex; flex-direction: column; gap: 0.75rem; }
            .detail-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; }
            .detail-row .label { color: #64748b; font-weight: 500; }
            .detail-row .val { color: #0f172a; font-weight: 600; text-align: right; }

            .timeline { position: relative; padding-left: 1.5rem; }
            .timeline::before { content: ''; position: absolute; left: 7px; top: 0; bottom: 0; width: 2px; background: #e2e8f0; }
            .timeline-item { position: relative; padding-bottom: 1.5rem; }
            .timeline-item:last-child { padding-bottom: 0; }
            .timeline-item .dot { position: absolute; left: -1.5rem; top: 0.25rem; width: 16px; height: 16px; border-radius: 50%; background: #e2e8f0; border: 3px solid white; box-shadow: 0 0 0 1px #cbd5e1; }
            .timeline-item.completed .dot { background: #4f46e5; border-color: white; box-shadow: 0 0 0 1px #4f46e5; }
            .timeline-item .content h4 { font-size: 0.875rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem; }
            .timeline-item .content p { font-size: 0.75rem; color: #64748b; margin: 0; }
            .timeline-item:not(.completed) .content { opacity: 0.5; }

            .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
            .modal-content { background: white; border-radius: 12px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.2); }
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
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .gap-1 { gap: 0.25rem; }
            .gap-2 { gap: 0.5rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
            .font-bold { font-weight: 700; }
            .text-slate-800 { color: #1e293b; }
            .text-slate-600 { color: #475569; }
            .text-slate-500 { color: #64748b; }
            .text-slate-400 { color: #94a3b8; }
            .bg-slate-50 { background-color: #f8fafc; }
            .bg-green-100 { background-color: #dcfce3; }
            .text-green-600 { color: #16a34a; }
            .rounded { border-radius: 0.25rem; }
            .rounded-lg { border-radius: 0.5rem; }
            .rounded-full { border-radius: 9999px; }
            .border { border: 1px solid #e2e8f0; }
            .border-b { border-bottom: 1px solid #e2e8f0; }
            .border-t { border-top: 1px solid #e2e8f0; }
            .pb-4 { padding-bottom: 1rem; }
            .pb-3 { padding-bottom: 0.75rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .p-6 { padding: 1.5rem; }
            .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
            .mt-4 { margin-top: 1rem; }
            .pt-4 { padding-top: 1rem; }
            .text-center { text-align: center; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .block { display: block; }
            .uppercase { text-transform: uppercase; }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
