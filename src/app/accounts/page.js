'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAccounts, addAccount, getStats, getTransactions } from '@/lib/api';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { hasPermission } from '@/lib/permissions';
import { Wallet, Plus, Copy, Check, X, Landmark, TrendingUp, TrendingDown, MoreVertical, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { typeLabel } from '@/lib/transactionTypes';

export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const [formData, setFormData] = useState({
    accountNo: '',
    acName: '',
    bankName: '',
    branch: '',
    routingNo: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const params = { companyId: user.companyId };
      const [accountsRes, statsRes] = await Promise.all([
        getAccounts(params),
        getStats(params)
      ]);
      setAccounts(accountsRes.data || []);

      const balanceMap = {};
      let total = 0;
      if (statsRes.data?.accountBalances) {
        statsRes.data.accountBalances.forEach(acc => {
          if (acc.accountId) {
            balanceMap[acc.accountId] = acc.balance;
            total += acc.balance;
          }
        });
      }
      setBalances(balanceMap);
      setTotalBalance(total);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.companyId) fetchData();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCopyDetails = (account) => {
    const lines = [
      account.bankName ? `Bank Name: ${account.bankName}` : `Account: ${account._id}`,
      account.acName ? `A/C Name: ${account.acName}` : '',
      account.branch ? `Branch: ${account.branch}` : '',
      account.accountNo ? `A/C No: ${account.accountNo}` : '',
      account.routingNo ? `Routing No: ${account.routingNo}` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(lines);
    setCopiedId(account._id);
    setOpenMenuId(null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadStatement = async (account, balance) => {
    setOpenMenuId(null);
    try {
      const txRes = await getTransactions({ status: 'approved', companyId: user.companyId });
      const allTx = txRes.data || [];
      const txForAccount = allTx.filter(tx =>
        tx.account?._id === account._id || tx.toAccount?._id === account._id
      );

      const doc = new jsPDF({ orientation: 'portrait' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text('Arionys Ltd.', 15, 20);
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text('Account Statement', 15, 28);
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 36);
      doc.text(`Account: ${account.bankName}`, 15, 41);
      if (account.acName) doc.text(`A/C Name: ${account.acName}`, 15, 46);
      if (account.accountNo) doc.text(`A/C No: ${account.accountNo}`, pageWidth - 15, 36, { align: 'right' });
      if (account.branch) doc.text(`Branch: ${account.branch}`, pageWidth - 15, 41, { align: 'right' });
      doc.text(`Current Balance: BDT ${balance.toLocaleString()}`, pageWidth - 15, 46, { align: 'right' });

      // Table
      const tableData = txForAccount.map(tx => {
        const isTransfer = tx.type === 'transfer';
        const accountInfo = isTransfer
          ? `${tx.account?.bankName || '?'} -> ${tx.toAccount?.bankName || '?'}`
          : tx.account?.bankName || '';
        return [
          new Date(tx.date).toLocaleDateString(),
          tx.description,
          typeLabel(tx.type),
          `BDT ${tx.amount.toLocaleString()}\n${accountInfo}`,
          tx.performedBy || 'N/A',
          tx.createdBy?.name || 'System',
          tx.approvedBy?.name || '—'
        ];
      });

      autoTable(doc, {
        startY: account.acName || account.accountNo ? 54 : 48,
        head: [['Date', 'Description', 'Type', 'Amount', 'By', 'Rec.', 'Appr.']],
        body: tableData,
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 15, right: 15 },
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak', textColor: [0, 0, 0], lineColor: [200, 200, 200], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 43 },
          2: { cellWidth: 22 },
          3: { cellWidth: 25 },
          4: { cellWidth: 24 },
          5: { cellWidth: 24 },
          6: { cellWidth: 24 },
        },
        willDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            data.cell.text = []; // Prevent autoTable from drawing the default text
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const rawValue = data.row.raw[3] || '';
            const lines = rawValue.split('\n');
            const amountText = lines[0] || '';
            const accText = lines[1] || '';

            const { x, y, styles, width } = data.cell;

            // Draw Amount (Bold, Black)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);
            doc.text(amountText, x + styles.cellPadding, y + styles.cellPadding + 2.5);

            // Draw Account Name (Normal, Dark Gray)
            if (accText) {
              doc.setFont("helvetica", "normal");
              doc.setTextColor(100, 100, 100);
              const splitAcc = doc.splitTextToSize(accText, width - (styles.cellPadding * 2));
              doc.text(splitAcc, x + styles.cellPadding, y + styles.cellPadding + 6.5);
            }
          }
        }
      });

      // Summary
      const finalY = doc.lastAutoTable.finalY || 54;
      const totalRevenue = txForAccount.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0);
      const totalInvestment = txForAccount.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
      const totalExpense = txForAccount.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const netBal = (totalRevenue + totalInvestment) - totalExpense;

      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
      doc.text('Financial Summary', 15, finalY + 15);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text('Total Investment:', 15, finalY + 22);
      doc.text(`BDT ${totalInvestment.toLocaleString()}`, 60, finalY + 22, { align: 'right' });
      doc.text('Total Inflow:', 15, finalY + 27);
      doc.text(`BDT ${totalRevenue.toLocaleString()}`, 60, finalY + 27, { align: 'right' });
      doc.text('Total Outflow:', 15, finalY + 32);
      doc.text(`BDT ${totalExpense.toLocaleString()}`, 60, finalY + 32, { align: 'right' });
      doc.setLineWidth(0.2); doc.line(15, finalY + 34, 60, finalY + 34);
      doc.setFont('helvetica', 'bold');
      doc.text('Net Balance:', 15, finalY + 39);
      doc.text(`BDT ${netBal.toLocaleString()}`, 60, finalY + 39, { align: 'right' });

      const safeName = (account.bankName || 'account').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`statement_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      alert('Failed to generate statement');
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addAccount({
        accountNo: formData.accountNo,
        acName: formData.acName,
        bankName: formData.bankName,
        branch: formData.branch,
        routingNo: formData.routingNo,
        userId: user._id,
        companyId: user.companyId
      });
      setFormData({ accountNo: '', acName: '', bankName: '', branch: '', routingNo: '' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const CARD_GRADIENTS = [
    ['#6366f1', '#4f46e5'], // Indigo
    ['#10b981', '#059669'], // Emerald
    ['#f59e0b', '#d97706'], // Amber
    ['#ec4899', '#db2777'], // Pink
    ['#8b5cf6', '#7c3aed'], // Violet
    ['#06b6d4', '#0891b2'], // Cyan
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card shim" />
          ))}
        </div>
        <style jsx>{`
          .skeleton-card { height: 260px; border-radius: 8px; }
          .shim {
            background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        `}</style>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-root">

        {/* ── Summary Bar ── */}
        <div className="summary-bar">
          <div className="summary-item">
            <div className="summary-icon-wrap" style={{ background: '#eff6ff' }}>
              <Wallet size={18} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <p className="summary-label">Account Balance</p>
              <p className="summary-value">BDT {totalBalance.toLocaleString()}</p>
            </div>
          </div>
          <div className="summary-item">
            <div className="summary-icon-wrap" style={{ background: '#ecfdf5' }}>
              <TrendingUp size={18} style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="summary-label">Active Accounts</p>
              <p className="summary-value">{accounts.length}</p>
            </div>
          </div>
          <div className="summary-item">
            <div className="summary-icon-wrap" style={{ background: '#fef9c3' }}>
              <TrendingDown size={18} style={{ color: '#ca8a04' }} />
            </div>
            <div>
              <p className="summary-label">Avg. Balance</p>
              <p className="summary-value">
                BDT {accounts.length ? Math.round(totalBalance / accounts.length).toLocaleString() : 0}
              </p>
            </div>
          </div>
          {hasPermission(user, 'accounts') && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} />
              New Account
            </button>
          )}
        </div>

        {/* ── Create Account Modal ── */}
        {showForm && (
          <div className="overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <div className="modal animate-fade-in">
              <div className="modal-head">
                <div>
                  <h2 className="modal-title">Create Account</h2>
                  <p className="modal-sub">Add a new bank or mobile banking account</p>
                </div>
                <button className="btn-icon" onClick={() => setShowForm(false)} aria-label="Close">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-section-label">Bank Details</div>
                <div className="form-grid-2">
                  <div className="fg" style={{ gridColumn: '1 / -1' }}>
                    <label>Bank Name <span className="req">*</span></label>
                    <input name="bankName" placeholder="e.g. Dutch-Bangla Bank"
                      value={formData.bankName} onChange={handleInputChange} required />
                  </div>
                  <div className="fg">
                    <label>Branch</label>
                    <input name="branch" placeholder="e.g. Rajshahi Branch"
                      value={formData.branch} onChange={handleInputChange} />
                  </div>
                  <div className="fg">
                    <label>A/C Holder Name</label>
                    <input name="acName" placeholder="e.g. MD. NADIM SHAHRIAR APURBO"
                      value={formData.acName} onChange={handleInputChange} />
                  </div>
                  <div className="fg">
                    <label>Account Number</label>
                    <input name="accountNo" placeholder="e.g. 1234567890123"
                      value={formData.accountNo} onChange={handleInputChange} />
                  </div>
                  <div className="fg">
                    <label>Routing Number</label>
                    <input name="routingNo" placeholder="e.g. 090267548"
                      value={formData.routingNo} onChange={handleInputChange} />
                  </div>

                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Creating…' : <><Plus size={15} /> Create Account</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Account Cards ── */}
        {accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap"><Wallet size={32} /></div>
            <h3>No accounts yet</h3>
            <p>Create your first bank account to start tracking balances.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Create Account
            </button>
          </div>
        ) : (
          <div className="cards-grid animate-fade-in">
            {accounts.map((account, index) => {
              const balance = balances[account._id] !== undefined ? balances[account._id] : 0;
              const isPos = balance >= 0;
              const displayTitle = account.bankName || 'Unknown Bank';
              const displaySub = account.branch || 'No Branch Name';

              return (
                <div key={account._id} className="card account-card">
                  {/* Card Header */}
                  <div className="ac-header">
                    <div className="ac-title-group">
                      <div className="ac-icon-wrap">
                        <Landmark size={20} style={{ color: '#0f172a' }} />
                      </div>
                      <div>
                        <h3 className="ac-title">{displayTitle}</h3>
                        {displaySub !== displayTitle && <p className="ac-subtitle">{displaySub}</p>}
                      </div>
                    </div>

                    {/* 3-dot menu */}
                    <div className="card-menu-wrap" ref={openMenuId === account._id ? menuRef : null}>
                      <button
                        className="btn-three-dot"
                        onClick={() => setOpenMenuId(openMenuId === account._id ? null : account._id)}
                        title="More options"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === account._id && (
                        <div className="card-dropdown animate-pop">
                          <button
                            className="dropdown-item"
                            onClick={() => handleCopyDetails(account)}
                          >
                            {copiedId === account._id
                              ? <><Check size={14} style={{ color: '#10b981' }} /><span>Copied!</span></>
                              : <><Copy size={14} /><span>Copy Details</span></>}
                          </button>
                          <button
                            className="dropdown-item"
                            onClick={() => handleDownloadStatement(account, balance)}
                          >
                            <Download size={14} />
                            <span>Download Statement</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Balance Section */}
                  <div className="ac-balance-sec">
                    <span className="ac-bal-label">Current Balance</span>
                    <div className="ac-bal-val" style={{ color: isPos ? '#10b981' : '#ef4444' }}>
                      <span className="ac-currency">BDT</span> {balance.toLocaleString()}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="ac-details">
                    <div className="ac-detail-item">
                      <span className="dr-label">A/C Name</span>
                      <span className="dr-val">{account.acName || <span className="dr-nil">Not provided</span>}</span>
                    </div>
                    <div className="ac-detail-item">
                      <span className="dr-label">Bank</span>
                      <span className="dr-val">{account.bankName || <span className="dr-nil">Not provided</span>}</span>
                    </div>
                    <div className="ac-detail-item">
                      <span className="dr-label">Branch</span>
                      <span className="dr-val">{account.branch || <span className="dr-nil">Not provided</span>}</span>
                    </div>
                    <div className="ac-detail-item">
                      <span className="dr-label">A/C No</span>
                      <span className="dr-val mono">{account.accountNo || <span className="dr-nil">Not provided</span>}</span>
                    </div>
                    <div className="ac-detail-item">
                      <span className="dr-label">Routing No</span>
                      <span className="dr-val mono">{account.routingNo || <span className="dr-nil">Not provided</span>}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        /* ─── Root ─── */
        .page-root { display: flex; flex-direction: column; gap: 2rem; max-width: var(--page-max-width); margin: 0 auto; width: 100%; }

        /* ─── Summary Bar ─── */
        .summary-bar {
          display: flex; align-items: center; gap: 0;
          background: var(--card); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          overflow: hidden;
          width: 100%;
        }
        .summary-item {
          display: flex; align-items: center; gap: 0.875rem;
          padding: 1.25rem 2rem; flex: 1;
          border-right: 1px solid var(--border);
        }
        .summary-icon-wrap {
          width: 40px; height: 40px; border-radius: var(--radius);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .summary-label { font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); margin: 0 0 0.2rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .summary-value { font-size: 1.125rem; font-weight: 800; color: var(--foreground); margin: 0; }
        .summary-bar .btn-primary { margin: 0 1.25rem; flex-shrink: 0; white-space: nowrap; }

        @media (max-width: 900px) {
          .summary-bar { flex-direction: column; gap: 0; }
          .summary-item { border-right: none; border-bottom: 1px solid var(--border); width: 100%; padding: 1rem 1.25rem; }
          .summary-bar .btn-primary { width: 100%; margin: 0; border-radius: 0 0 var(--radius) var(--radius); justify-content: center; padding: 1rem; }
        }

        /* ─── Button Styles ─── */
        .btn-primary {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.65rem 1.25rem;
          background: var(--primary); color: var(--primary-foreground); border: none;
          border-radius: var(--radius); font-size: 0.875rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-outline {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.65rem 1.25rem;
          background: var(--card); color: var(--secondary-foreground);
          border: 1px solid var(--border); border-radius: var(--radius);
          font-size: 0.875rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-outline:hover { background: var(--secondary); }

        .btn-icon {
          width: 32px; height: 32px; border-radius: var(--radius);
          background: var(--secondary); border: none; color: var(--muted-foreground);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.15s; flex-shrink: 0;
        }
        .btn-icon:hover { background: var(--border); color: var(--foreground); }

        /* ─── Modal ─── */
        .modal { max-width: 620px; }

        .form-section-label {
          font-size: 0.75rem; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--muted-foreground); margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
        }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 560px) { .form-grid-2 { grid-template-columns: 1fr; } }

        .fg { display: flex; flex-direction: column; gap: 0.4rem; }
        .fg label {
          font-size: 0.75rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground);
        }
        .req { color: var(--destructive); }
        .fg input {
          padding: 0.75rem 1rem;
          border: 1px solid var(--border); border-radius: var(--radius);
          background: var(--card); font-size: 0.9rem; color: var(--foreground);
          transition: all 0.2s; width: 100%; box-sizing: border-box;
        }
        .fg input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(15,23,42,0.05); }

        .input-prefix-wrap { position: relative; }
        .inp-prefix { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); font-size: 0.875rem; font-weight: 700; color: var(--muted-foreground); pointer-events: none; }


        /* ─── Cards Grid ─── */
        .cards-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.5rem; }
        @media (max-width: 1200px) { .cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .cards-grid { grid-template-columns: 1fr; } }

        /* ─── Standardized Account Card ─── */
        .account-card {
          display: flex; flex-direction: column;
          padding: 1.5rem;
        }

        .ac-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        .ac-title-group { display: flex; align-items: center; gap: 0.875rem; }
        .ac-icon-wrap {
          width: 42px; height: 42px; border-radius: 6px;
          background: var(--secondary); border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ac-title {
          font-size: 1.125rem; font-weight: 800; color: var(--foreground);
          margin: 0; line-height: 1.2;
        }
        .ac-subtitle {
          font-size: 0.75rem; color: var(--muted-foreground);
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
          margin: 0.25rem 0 0 0;
        }

        /* ─── 3-dot Menu ─── */
        .card-menu-wrap { position: relative; }
        .btn-three-dot {
          width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          background: transparent; border: 1px solid var(--border);
          border-radius: 4px; color: var(--muted-foreground);
          cursor: pointer; transition: all 0.2s; flex-shrink: 0;
        }
        .btn-three-dot:hover { background: var(--secondary); color: var(--foreground); border-color: var(--muted-foreground); }
        .card-dropdown {
          position: absolute; top: calc(100% + 6px); right: 0;
          background: var(--card); border: 1px solid var(--border);
          border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06);
          min-width: 180px; z-index: 500; padding: 0.35rem;
          overflow: hidden;
        }
        .dropdown-item {
          width: 100%; display: flex; align-items: center; gap: 0.65rem;
          padding: 0.6rem 0.875rem; background: transparent; border: none;
          border-radius: 4px; font-size: 0.8125rem; font-weight: 600;
          color: var(--foreground); cursor: pointer; text-align: left;
          transition: background 0.15s;
        }
        .dropdown-item:hover { background: var(--secondary); }
        .dropdown-item svg { color: var(--muted-foreground); flex-shrink: 0; }
        @keyframes popIn { from { opacity: 0; transform: scale(0.95) translateY(-6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-pop { animation: popIn 0.15s ease-out; }

        .ac-balance-sec {
          display: flex; flex-direction: column; gap: 0.25rem;
          padding-bottom: 1.25rem; border-bottom: 1px dashed var(--border);
          margin-bottom: 1.25rem;
        }
        .ac-bal-label { font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.05em; }
        .ac-bal-val { font-size: 1.75rem; font-weight: 800; display: flex; align-items: baseline; gap: 0.35rem; }
        .ac-currency { font-weight: 800; color: var(--muted-foreground); }

        .ac-details { display: flex; flex-direction: column; gap: 0.75rem; }
        .ac-detail-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; }
        .dr-label { color: var(--muted-foreground); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .dr-val { color: var(--foreground); font-weight: 600; text-align: right; }
        .dr-val.mono { font-family: 'Courier New', monospace; letter-spacing: 0.05em; }
        .dr-nil { color: #cbd5e1; font-weight: 500; font-style: italic; font-family: var(--font-hero), system-ui, sans-serif; letter-spacing: 0.015em; }

        /* ─── Empty State ─── */
        .empty-state {
          display: flex; flex-direction: column; align-items: center;
          gap: 0.75rem; padding: 4rem 2rem; text-align: center;
          background: var(--card); border-radius: var(--radius);
          border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .empty-icon-wrap {
          width: 64px; height: 64px; border-radius: var(--radius);
          background: var(--secondary); color: var(--muted-foreground);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 0.5rem;
        }
        .empty-state h3 { font-size: 1.25rem; font-weight: 800; color: var(--foreground); margin: 0; }
        .empty-state p { font-size: 0.875rem; color: var(--muted-foreground); margin: 0; max-width: 300px; }

        /* ─── Animations ─── */
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out both; }
      `}</style>
    </DashboardLayout>
  );
}
