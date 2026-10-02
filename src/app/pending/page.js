'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getTransactions, approveTransaction, getLoans, approveLoan, getAccounts } from '@/lib/api';
import CustomSelect from '@/components/UI/CustomSelect';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { CheckCircle, XCircle, Loader2, ArrowUpRight, TrendingDown, Wallet, ArrowRightLeft, Banknote } from 'lucide-react';
import Link from 'next/link';

const TYPE_META = {
  revenue: { icon: ArrowUpRight, label: 'Inflow' },
  expense: { icon: TrendingDown, label: 'Outflow' },
  investment: { icon: Wallet, label: 'Investment' },
  transfer: { icon: ArrowRightLeft, label: 'Transfer' },
  loan: { icon: Banknote, label: 'Loan Request' },
};

export default function PendingApprovalsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, transactionId: null, status: null, kind: 'transaction' });
  const [accounts, setAccounts] = useState([]);
  // Account chosen in the Approve popup (pre-filled with the one on the transaction, if any)
  const [approveAccount, setApproveAccount] = useState('');
  // Bulk review: selected row keys ("transaction-<id>" / "loan-<id>") and the open bulk dialog ({ status })
  const [selected, setSelected] = useState(() => new Set());
  const [bulkDialog, setBulkDialog] = useState(null);
  const [bulkAccount, setBulkAccount] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);

  const fetchPending = async () => {
    try {
      const [txRes, loanRes, accRes] = await Promise.all([
        getTransactions({ status: 'pending', companyId: user.companyId }),
        getLoans({ status: 'pending_approval' }),
        getAccounts().catch(() => null),
      ]);
      setTransactions(txRes.data);
      setLoans(loanRes.success ? loanRes.data : []);
      if (accRes?.success) setAccounts(accRes.data);
    } catch (err) {
      console.error('Error fetching pending transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.companyId) {
      fetchPending();
    }
  }, [user]);

  const initiateAction = (transactionId, status, kind = 'transaction') => {
    const tx = kind === 'transaction' ? transactions.find(t => t._id === transactionId) : null;
    setApproveAccount(tx?.account?._id || '');
    setConfirmDialog({ isOpen: true, transactionId, status, kind, txType: tx?.type });
  };

  // Approving a (non-transfer) transaction requires choosing the bank account
  const needsAccount = confirmDialog.isOpen && confirmDialog.kind === 'transaction'
    && confirmDialog.status === 'approved' && confirmDialog.txType !== 'transfer';

  const handleAction = async () => {
    const { transactionId, status, kind } = confirmDialog;
    setConfirmDialog({ isOpen: false, transactionId: null, status: null, kind: 'transaction' });
    
    setProcessingId(transactionId);
    try {
      if (kind === 'loan') {
        await approveLoan(transactionId, status);
      } else {
        await approveTransaction({
          transactionId,
          status,
          ...(status === 'approved' && approveAccount ? { account: approveAccount } : {}),
        });
      }
      await fetchPending();
    } catch (err) {
      console.error(`Error ${status} ${kind}:`, err);
      alert(err.response?.data?.message || `Failed to ${status === 'approved' ? 'approve' : 'reject'} ${kind}. You may not have permission.`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="pending-layout">
          <div className="pending-header">
            <div>
              <div className="skeleton skeleton-title"></div>
              <div className="skeleton skeleton-subtitle"></div>
            </div>
            <div className="skeleton skeleton-badge"></div>
          </div>
          
          <div className="table-card" style={{ padding: '2rem' }}>
            <div className="skeleton skeleton-line long" style={{ marginBottom: '1.5rem' }}></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <div className="skeleton skeleton-pill"></div>
                <div className="skeleton skeleton-line" style={{ flex: 1 }}></div>
                <div className="skeleton skeleton-amount"></div>
                <div className="skeleton skeleton-btn" style={{ width: '80px', flex: 'none' }}></div>
                <div className="skeleton skeleton-btn" style={{ width: '80px', flex: 'none' }}></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Loans and transactions share one approval queue, newest first
  const rows = [
    ...transactions.map(tx => ({
      kind: 'transaction',
      id: tx._id,
      type: tx.type,
      description: tx.description,
      account: !tx.account && tx.type !== 'transfer' ? 'Account chosen at approval' : tx.type === 'transfer'
        ? `From: ${tx.account?.bankName || 'N/A'} → To: ${tx.toAccount?.bankName || 'N/A'}`
        : tx.account?.bankName || 'N/A',
      amount: tx.amount,
      date: tx.date,
      creator: tx.createdBy?.name || tx.performedBy || 'System',
      isOwn: false,
      // Approving needs an account to be chosen
      needsAccount: !tx.account && tx.type !== 'transfer',
    })),
    ...loans.map(loan => ({
      kind: 'loan',
      id: loan._id,
      type: 'loan',
      label: loan.origin === 'request' ? 'Loan Request' : 'New Loan',
      description: `Loan for ${loan.employeeName}${loan.notes ? ` — ${loan.notes}` : ''}`,
      account: loan.paidFromAccount?.bankName || 'Chosen at disbursement',
      amount: loan.amount,
      date: loan.createdAt,
      creator: loan.createdBy?.name || loan.employeeName,
      isOwn: String(loan.createdBy?._id || loan.createdBy) === String(user?._id),
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const rowKey = (row) => `${row.kind}-${row.id}`;
  // Own loan requests can't be reviewed by their submitter, so they can't be selected either
  const selectableRows = rows.filter(r => !r.isOwn);
  const selectedRows = selectableRows.filter(r => selected.has(rowKey(r)));
  const allSelected = selectableRows.length > 0 && selectedRows.length === selectableRows.length;
  const bulkNeedsAccount = selectedRows.filter(r => r.needsAccount);

  const toggleRow = (row) => {
    setSelected(prev => {
      const next = new Set(prev);
      const key = rowKey(row);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableRows.map(rowKey)));

  const openBulk = (status) => {
    setBulkAccount('');
    setBulkDialog({ status });
  };

  // Approve or reject every selected item, one after another, then report anything that failed
  const runBulk = async () => {
    const { status } = bulkDialog;
    setBulkRunning(true);
    const failures = [];
    for (const row of selectedRows) {
      try {
        if (row.kind === 'loan') {
          await approveLoan(row.id, status);
        } else {
          await approveTransaction({
            transactionId: row.id,
            status,
            ...(status === 'approved' && row.needsAccount ? { account: bulkAccount } : {}),
          });
        }
      } catch (err) {
        failures.push(`${row.description}: ${err.response?.data?.message || 'failed'}`);
      }
    }
    setBulkRunning(false);
    setBulkDialog(null);
    setSelected(new Set());
    await fetchPending();
    if (failures.length) {
      alert(`${selectedRows.length - failures.length} of ${selectedRows.length} done. These could not be processed:\n\n${failures.join('\n')}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="pending-layout">
        {rows.length === 0 ? (
          <div className="premium-empty-state">
            <div className="empty-icon-container">
              <CheckCircle size={32} className="text-success" />
            </div>
            <h4>All caught up!</h4>
            <p>There are no pending transactions or loan requests waiting for your approval right now.</p>
          </div>
        ) : (
          <>
          <div className="queue-summary">
            {selectedRows.length > 0 ? (
              <div className="bulk-bar">
                <span className="queue-count">{selectedRows.length}</span>
                <span>selected</span>
                <button className="bulk-link" onClick={() => setSelected(new Set())}>Clear</button>
                <div className="bulk-actions">
                  <button className="btn-action reject" onClick={() => openBulk('rejected')}>
                    <XCircle size={16} /> Reject selected
                  </button>
                  <button className="btn-action approve" onClick={() => openBulk('approved')}>
                    <CheckCircle size={16} /> Approve selected
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="queue-count">{rows.length}</span>
                <span>{rows.length === 1 ? 'item awaiting your review' : 'items awaiting your review'}</span>
                {selectableRows.length > 1 && (
                  <button className="bulk-link mobile-select-all" onClick={toggleAll}>Select all</button>
                )}
              </>
            )}
          </div>

          <div className="table-card desktop-view">
            <div className="table-responsive">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th className="select-col">
                      <input
                        type="checkbox"
                        className="row-check"
                        aria-label="Select all"
                        checked={allSelected}
                        onChange={toggleAll}
                        disabled={selectableRows.length === 0}
                      />
                    </th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Account Info</th>
                    <th>Amount (BDT)</th>
                    <th>Date & User</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const meta = TYPE_META[row.type] || TYPE_META.revenue;
                    const TypeIcon = meta.icon;
                    const busy = processingId === row.id;
                    return (
                      <tr key={`${row.kind}-${row.id}`} className={`tx-row ${selected.has(rowKey(row)) ? 'is-selected' : ''}`}>
                        <td className="select-col">
                          {!row.isOwn && (
                            <input
                              type="checkbox"
                              className="row-check"
                              aria-label={`Select ${row.description}`}
                              checked={selected.has(rowKey(row))}
                              onChange={() => toggleRow(row)}
                            />
                          )}
                        </td>
                        <td data-label="Type">
                          <div className={`type-pill-minimal type-${row.type}`}>
                            <TypeIcon size={13} />
                            <span>{row.label || meta.label}</span>
                          </div>
                        </td>
                        <td data-label="Description">
                          {row.kind === 'loan' ? (
                            <Link href={`/loans/${row.id}`} className="tx-main-desc tx-link">{row.description}</Link>
                          ) : (
                            <span className="tx-main-desc">{row.description}</span>
                          )}
                        </td>
                        <td data-label="Account Info">
                          <span className="tx-account">{row.account}</span>
                        </td>
                        <td data-label="Amount (BDT)">
                          <div className={`amount-cell amount-${row.type}`}>
                            {row.amount.toLocaleString()}
                          </div>
                        </td>
                        <td data-label="Date & User">
                          <div className="meta-stack">
                            <span className="meta-value">{new Date(row.date).toLocaleDateString()}</span>
                            <span className="creator-badge">{row.creator}</span>
                          </div>
                        </td>
                        <td className="action-cell">
                          {row.isOwn ? (
                            <span className="own-request-note">Your request — awaiting another approver</span>
                          ) : (
                            <>
                              <button
                                className="btn-action approve"
                                disabled={busy}
                                onClick={() => initiateAction(row.id, 'approved', row.kind)}
                                title="Approve"
                              >
                                {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Approve
                              </button>
                              <button
                                className="btn-action reject"
                                disabled={busy}
                                onClick={() => initiateAction(row.id, 'rejected', row.kind)}
                                title="Reject"
                              >
                                {busy ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: dedicated approval cards */}
          <div className="mobile-view approval-list">
            {rows.map(row => {
              const meta = TYPE_META[row.type] || TYPE_META.revenue;
              const TypeIcon = meta.icon;
              const busy = processingId === row.id;
              return (
                <article key={`m-${row.kind}-${row.id}`} className={`approval-card accent-${row.type}`}>
                  <header className="ac-top">
                    {!row.isOwn && (
                      <input
                        type="checkbox"
                        className="row-check"
                        aria-label={`Select ${row.description}`}
                        checked={selected.has(rowKey(row))}
                        onChange={() => toggleRow(row)}
                      />
                    )}
                    <div className={`type-pill-minimal type-${row.type}`}>
                      <TypeIcon size={13} />
                      <span>{row.label || meta.label}</span>
                    </div>
                    <div className={`ac-amount amount-${row.type}`}>
                      <span className="ac-currency">BDT</span>
                      {row.amount.toLocaleString()}
                    </div>
                  </header>

                  <div className="ac-body">
                    {row.kind === 'loan' ? (
                      <Link href={`/loans/${row.id}`} className="ac-title tx-link">{row.description}</Link>
                    ) : (
                      <h3 className="ac-title">{row.description}</h3>
                    )}
                    <p className="ac-account">{row.account}</p>
                  </div>

                  <dl className="ac-meta">
                    <div>
                      <dt>Date</dt>
                      <dd>{new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</dd>
                    </div>
                    <div>
                      <dt>Submitted by</dt>
                      <dd>{row.creator}</dd>
                    </div>
                  </dl>

                  <footer className="ac-actions">
                    {row.isOwn ? (
                      <span className="own-request-note">Your request — awaiting another approver</span>
                    ) : (
                      <>
                        <button
                          className="ac-btn ac-reject"
                          disabled={busy}
                          onClick={() => initiateAction(row.id, 'rejected', row.kind)}
                        >
                          {busy ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                          Reject
                        </button>
                        <button
                          className="ac-btn ac-approve"
                          disabled={busy}
                          onClick={() => initiateAction(row.id, 'approved', row.kind)}
                        >
                          {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          Approve
                        </button>
                      </>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
          </>
        )}
      </div>

      {bulkDialog && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale">
            <h3 className="modal-title">
              {bulkDialog.status === 'approved' ? 'Approve' : 'Reject'} {selectedRows.length} item{selectedRows.length === 1 ? '' : 's'}
            </h3>
            <p className="modal-message">
              {bulkDialog.status === 'approved'
                ? 'All selected transactions and loans will be approved.'
                : 'All selected transactions and loans will be rejected. This cannot be undone.'}
            </p>
            {bulkDialog.status === 'approved' && bulkNeedsAccount.length > 0 && (
              <div className="approve-account">
                <label>Account for {bulkNeedsAccount.length} transaction{bulkNeedsAccount.length === 1 ? '' : 's'} without one</label>
                <CustomSelect
                  placeholder="Select account..."
                  value={bulkAccount}
                  onChange={setBulkAccount}
                  options={accounts.map(acc => ({
                    value: acc._id,
                    label: `${acc.bankName} (BDT ${Math.round(acc.balance || 0).toLocaleString()})`,
                    subtext: acc.acName || undefined,
                  }))}
                />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setBulkDialog(null)} disabled={bulkRunning}>Cancel</button>
              <button
                className={`btn-confirm ${bulkDialog.status}`}
                onClick={runBulk}
                disabled={bulkRunning || (bulkDialog.status === 'approved' && bulkNeedsAccount.length > 0 && !bulkAccount)}
              >
                {bulkRunning ? 'Working...' : `Yes, ${bulkDialog.status === 'approved' ? 'Approve' : 'Reject'} all`}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale">
            <h3 className="modal-title">{needsAccount ? 'Approve Transaction' : 'Confirm Action'}</h3>
            <p className="modal-message">
              {needsAccount
                ? 'Choose the bank account this transaction belongs to, then approve it.'
                : <>Are you sure you want to <strong>{confirmDialog.status === 'approved' ? 'approve' : 'reject'}</strong> this {confirmDialog.kind === 'loan' ? 'loan request' : 'transaction'}?</>}
            </p>
            {needsAccount && (
              <div className="approve-account">
                <label>Account</label>
                <CustomSelect
                  placeholder="Select account..."
                  value={approveAccount}
                  onChange={setApproveAccount}
                  options={accounts.map(acc => ({
                    value: acc._id,
                    label: `${acc.bankName} (BDT ${Math.round(acc.balance || 0).toLocaleString()})`,
                    subtext: acc.acName || undefined,
                  }))}
                />
              </div>
            )}
            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setConfirmDialog({ isOpen: false, transactionId: null, status: null, kind: 'transaction' })}
              >
                Cancel
              </button>
              <button 
                className={`btn-confirm ${confirmDialog.status}`} 
                onClick={handleAction}
                disabled={needsAccount && !approveAccount}
              >
                Yes, {confirmDialog.status === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Skeleton Loading */
        .skeleton {
          background: #e2e8f0;
          border-radius: 4px;
          animation: pulse 1.5s infinite ease-in-out;
        }
        .skeleton-title { width: 220px; height: 28px; margin-bottom: 0.5rem; max-width: 100%; }
        .skeleton-subtitle { width: 380px; height: 16px; max-width: 100%; }
        .skeleton-badge { width: 110px; height: 34px; border-radius: 4px; }
        .skeleton-pill { width: 90px; height: 24px; border-radius: 4px; }
        .skeleton-amount { width: 100px; height: 22px; }
        .skeleton-line { width: 100%; height: 16px; }
        .skeleton-line.long { width: 70%; height: 20px; }
        .skeleton-chip { width: 100px; height: 32px; border-radius: 6px; }
        .skeleton-btn { flex: 1; height: 40px; border-radius: 6px; }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        .pending-layout {
          max-width: var(--page-max-width);
          margin: 0 auto;
        }
        .pending-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          padding: 1.75rem 2rem;
          border-radius: 8px;
          border: 1px solid #e8edf3;
          box-shadow: 0 4px 20px -8px rgba(15, 23, 42, 0.08);
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 1.125rem;
        }
        .header-icon {
          flex-shrink: 0;
          width: 52px;
          height: 52px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          box-shadow: 0 8px 18px -6px rgba(15, 23, 42, 0.45);
        }
        .title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 0.375rem 0;
          letter-spacing: -0.02em;
        }
        .subtitle {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0;
          line-height: 1.4;
        }
        .stat-badge {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          color: #b45309;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: 800;
          font-size: 0.8125rem;
          border: 1px solid #fde68a;
          box-shadow: 0 2px 8px -2px rgba(217, 119, 6, 0.2);
          white-space: nowrap;
        }
        /* Queue summary */
        .queue-summary { display: flex; align-items: center; gap: 0.625rem; min-height: 40px; margin-bottom: 1rem; font-size: 0.875rem; font-weight: 600; color: #64748b; }
        .bulk-bar { display: flex; align-items: center; gap: 0.625rem; width: 100%; flex-wrap: wrap; padding: 0.5rem 0.75rem; border: 1px solid #c7d2fe; border-radius: 8px; background: #f5f7ff; color: #3730a3; }
        .bulk-bar .queue-count { background: #4f46e5; }
        .bulk-actions { display: flex; gap: 0.5rem; margin-left: auto; }
        .bulk-link { padding: 0; border: none; background: none; font-family: inherit; font-size: 0.8125rem; font-weight: 600; color: #4f46e5; cursor: pointer; }
        .bulk-link:hover { text-decoration: underline; }
        .mobile-select-all { display: none; margin-left: auto; }
        .select-col { width: 44px; padding-right: 0 !important; }
        .row-check { width: 16px; height: 16px; min-height: 0 !important; margin: 0; accent-color: #4f46e5; cursor: pointer; }
        .tx-row.is-selected td { background: #f5f7ff; }
        .ac-top .row-check { margin-right: 0.25rem; }
        .queue-count { min-width: 26px; height: 26px; padding: 0 0.5rem; display: inline-grid; place-items: center; border-radius: 6px; background: #0f172a; color: #ffffff; font-size: 0.8125rem; font-weight: 800; }

        /* Mobile approval cards (hidden on desktop) */
        .mobile-view { display: none; }
        .approval-list { flex-direction: column; gap: 0.875rem; }
        .approval-card { position: relative; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06); overflow: hidden; }
        .approval-card::before { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background: #cbd5e1; }
        .approval-card.accent-expense::before { background: #ef4444; }
        .approval-card.accent-revenue::before { background: #10b981; }
        .approval-card.accent-investment::before { background: #6366f1; }
        .approval-card.accent-transfer::before { background: #a855f7; }
        .approval-card.accent-loan::before { background: #f59e0b; }
        .ac-top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 1rem 1.125rem 0; }
        .ac-amount { display: flex; align-items: baseline; gap: 0.25rem; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
        .ac-currency { font-size: 0.6875rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.04em; }
        .ac-body { padding: 0.75rem 1.125rem 1rem; }
        .approval-card :global(.ac-title) { display: block; margin: 0 0 0.25rem; font-size: 1rem; font-weight: 700; line-height: 1.4; color: #0f172a; word-break: break-word; }
        .ac-account { margin: 0; font-size: 0.8125rem; font-weight: 500; color: #64748b; }
        .ac-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 0; padding: 0.875rem 1.125rem; background: #f8fafc; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
        .ac-meta dt { margin-bottom: 0.25rem; font-size: 0.6875rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        .ac-meta dd { margin: 0; font-size: 0.875rem; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ac-actions { display: flex; gap: 0.625rem; padding: 0.875rem 1.125rem 1rem; }
        .ac-btn { flex: 1; height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 6px; font-size: 0.875rem; font-weight: 700; font-family: inherit; cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s; }
        .ac-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ac-reject { background: #ffffff; color: #b91c1c; border: 1px solid #e2e8f0; }
        .ac-reject:hover:not(:disabled) { background: #fef2f2; border-color: #fecaca; }
        .ac-approve { background: #0f172a; color: #ffffff; border: 1px solid #0f172a; }
        .ac-approve:hover:not(:disabled) { background: #1e293b; }

        /* Table styling */
        .table-card {
          background: #fff;
          border: 1px solid #e8edf3;
          border-radius: 8px;
          box-shadow: 0 4px 20px -8px rgba(15, 23, 42, 0.05);
          overflow: hidden;
        }
        .table-responsive {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .tx-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }
        .tx-table th {
          background: #f8fafc;
          padding: 1rem 1.5rem;
          font-size: 0.75rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        .tx-table th.text-right { text-align: right; }
        .tx-table td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .tx-row:hover { background: #f8fafc; }
        .tx-row:last-child td { border-bottom: none; }
        
        .tx-main-desc { font-weight: 700; color: #0f172a; font-size: 0.9375rem; display: block; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tx-account { font-size: 0.8125rem; font-weight: 600; color: #64748b; display: block; }
        .meta-stack { display: flex; flex-direction: column; gap: 0.25rem; }
        .meta-value { font-size: 0.8125rem; font-weight: 600; color: #475569; }
        .creator-badge { font-size: 0.75rem; font-weight: 700; color: #94a3b8; }
        .action-cell { display: flex; justify-content: flex-end; gap: 0.5rem; }
        
        .amount-cell {
          font-weight: 800;
          font-size: 1.0625rem;
          color: #0f172a;
          white-space: nowrap;
          letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
        }
        .amount-currency { font-size: 0.75rem; font-weight: 700; color: #94a3b8; }
        .amount-revenue { color: #059669; }
        .amount-expense { color: #dc2626; }
        .amount-investment { color: #4f46e5; }
        .amount-transfer { color: #9333ea; }
        .amount-loan { color: #b45309; }

        .type-pill-minimal {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.3125rem 0.75rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .type-revenue { background: #dcfce7; color: #166534; }
        .type-expense { background: #fee2e2; color: #991b1b; }
        .type-investment { background: #e0e7ff; color: #3730a3; }
        .type-transfer { background: #f3e8ff; color: #6b21a8; }
        .type-loan { background: #fef3c7; color: #92400e; }
        :global(.tx-link) { text-decoration: none; }
        :global(.tx-link:hover) { color: #4f46e5; text-decoration: underline; }
        .own-request-note { font-size: 0.75rem; font-weight: 600; color: #94a3b8; font-style: italic; }
        
        .btn-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-action:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-action.approve {
          background: #dcfce7;
          color: #059669;
        }
        .btn-action.approve:hover:not(:disabled) { background: #bbf7d0; color: #047857; }
        .btn-action.reject {
          background: #fee2e2;
          color: #dc2626;
        }
        .btn-action.reject:hover:not(:disabled) { background: #fecaca; color: #b91c1c; }
        
        .premium-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 2rem;
          text-align: center;
          background: #ffffff;
          border-radius: 6px;
          border: 1px dashed #cbd5e1;
        }
        .empty-icon-container {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          color: #94a3b8;
        }
        .premium-empty-state h4 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 0.5rem 0; }
        .premium-empty-state p { font-size: 0.9375rem; color: #64748b; margin: 0; max-width: 400px; }

        .modal-content { max-width: 460px; padding: 1.75rem; overflow: visible; }
        .animate-scale {
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .approve-account { display: flex; flex-direction: column; gap: 0.375rem; margin: 0 0 1.25rem; }
        .approve-account label { font-size: 0.8125rem; font-weight: 600; color: #334155; }
        .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
        .modal-message {
          color: #475569;
          font-size: 0.9375rem;
          line-height: 1.5;
          margin: 0 0 1.5rem 0;
        }
        .btn-cancel {
          padding: 0.625rem 1rem;
          background: #f1f5f9;
          color: #475569;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-cancel:hover { background: #e2e8f0; }
        .btn-confirm {
          padding: 0.625rem 1rem;
          border: none;
          border-radius: 4px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-confirm.approved { background: #10b981; }
        .btn-confirm.approved:hover { background: #059669; }
        .btn-confirm.rejected { background: #f87171; }
        .btn-confirm.rejected:hover { background: #dc2626; }

        @media (max-width: 768px) {
          .pending-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 1.5rem;
            padding: 2rem 1.5rem;
            border-radius: 8px;
          }
          .header-left {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }
          .header-icon {
            width: 64px;
            height: 64px;
          }
          .title { font-size: 1.35rem; }
          .subtitle { max-width: 280px; }
          
          .desktop-view { display: none; }
          .mobile-view { display: flex; }
          .mobile-select-all { display: inline; }
          .bulk-actions { width: 100%; margin-left: 0; }
          .bulk-actions .btn-action { flex: 1; justify-content: center; }
          .ac-top .type-pill-minimal { margin-right: auto; }
        }
      `}</style>
    </DashboardLayout>
  );
}
