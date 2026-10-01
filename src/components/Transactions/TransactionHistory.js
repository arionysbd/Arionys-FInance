'use client';
import { useState, useRef, useEffect } from 'react';
import { Filter, CheckCircle, XCircle, Download, ChevronDown, Check, ArrowUpRight, TrendingDown, Wallet, ArrowRightLeft, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { typeLabel } from '@/lib/transactionTypes';

export default function TransactionHistory({ transactions, onUpdate, filterType, setFilterType, hasMore, loadingMore, onLoadMore }) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterMenu(false);
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const generatePDF = (type) => {
    setShowDownloadMenu(false);
    const doc = new jsPDF({ orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Header (Black & White compatible)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0); // Pure black
    doc.text("Arionys Ltd.", 15, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(40); // Dark gray
    const title = type === 'all' ? 'General Financial Statement' : `${type.charAt(0).toUpperCase() + type.slice(1)} Statement`;
    doc.text(title, 15, 28);
    
    doc.setFontSize(8);
    doc.setTextColor(80); // Medium gray
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 36);
    doc.text(`Report Scope: ${type.toUpperCase()}`, 15, 41);

    // 2. Table Data
    let txToExport;
    if (type === 'rejected') {
      txToExport = transactions.filter(t => t.status === 'rejected');
    } else if (type === 'all') {
      txToExport = transactions.filter(t => t.status !== 'rejected');
    } else {
      txToExport = transactions.filter(t => t.type === type && t.status !== 'rejected');
    }

    const tableData = txToExport.map(tx => {
      const accountInfo = tx.type === 'transfer' 
        ? `From: ${tx.account?.bankName || 'Unknown'} -> To: ${tx.toAccount?.bankName || 'Unknown'}` 
        : tx.account?.bankName || 'Unknown';

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
      startY: 48,
      head: [['Date', 'Description', 'Type', 'Amount', 'By', 'Rec.', 'Appr.']],
      body: tableData,
      headStyles: { 
        fillColor: [0, 0, 0], // Pure black background
        textColor: [255, 255, 255], // White text
        fontStyle: 'bold',
        fontSize: 7
      },
      alternateRowStyles: { fillColor: [245, 245, 245] }, // Very light gray
      margin: { left: 15, right: 15 },
      styles: { 
        fontSize: 7, 
        cellPadding: 2, 
        overflow: 'linebreak',
        textColor: [0, 0, 0], // Black text
        lineColor: [200, 200, 200], // Light gray borders
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 18 },   // Date
        1: { cellWidth: 43 },   // Description (wide)
        2: { cellWidth: 22 },   // Type
        3: { cellWidth: 25 },   // Amount
        4: { cellWidth: 24 },   // By (Performed By)
        5: { cellWidth: 24 },   // Rec. (Recorded By)
        6: { cellWidth: 24 },   // Appr. (Approved By)
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

    // 3. Financial Summary (B&W compatible)
    const finalY = doc.lastAutoTable.finalY || 50;
    const totalRevenue = txToExport.filter(t => t.type === 'revenue').reduce((acc, t) => acc + t.amount, 0);
    const totalInvestment = txToExport.filter(t => t.type === 'investment').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = txToExport.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const balance = (totalInvestment + totalRevenue) - totalExpense;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Financial Summary", 15, finalY + 15);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Total Investment:`, 15, finalY + 22);
    doc.text(`BDT ${totalInvestment.toLocaleString()}`, 60, finalY + 22, { align: 'right' });

    doc.text(`Total Inflow:`, 15, finalY + 27);
    doc.text(`BDT ${totalRevenue.toLocaleString()}`, 60, finalY + 27, { align: 'right' });

    doc.text(`Total Outflow:`, 15, finalY + 32);
    doc.text(`BDT ${totalExpense.toLocaleString()}`, 60, finalY + 32, { align: 'right' });

    doc.setLineWidth(0.2);
    doc.line(15, finalY + 34, 60, finalY + 34); // Separator line

    doc.setFont("helvetica", "bold");
    doc.text(`Net Balance:`, 15, finalY + 39);
    doc.text(`BDT ${balance.toLocaleString()}`, 60, finalY + 39, { align: 'right' });

    doc.save(`${type}_statement_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filterOptions = [
    { value: '', label: 'All Records', icon: <Filter size={14} /> },
    { value: 'revenue', label: 'Inflow', icon: <ArrowUpRight size={14} className="text-tx-revenue" /> },
    { value: 'expense', label: 'Outflow', icon: <TrendingDown size={14} className="text-tx-expense" /> },
    { value: 'investment', label: 'Investment', icon: <Wallet size={14} className="text-tx-investment" /> },
    { value: 'transfer', label: 'Transfer', icon: <ArrowRightLeft size={14} style={{ color: '#8b5cf6' }} /> },
    { value: 'rejected', label: 'Rejected Items', icon: <XCircle size={14} className="text-danger" /> }
  ];

  const currentFilter = filterOptions.find(o => o.value === filterType);
  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && onLoadMore) {
          onLoadMore();
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <div className="card" ref={filterRef}>
      <div className="history-header">
        <div className="title-area">
          <h3>Approved History</h3>
          <p className="subtitle">Verified and finalized financial records</p>
        </div>
        
        <div className="header-actions">
          {/* Custom Filter Dropdown */}
          <div className="custom-dropdown-wrapper">
            <div 
              className={`custom-filter-trigger ${showFilterMenu ? 'active' : ''}`}
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <div className="trigger-content">
                {currentFilter?.icon}
                <span>{currentFilter?.label}</span>
              </div>
              <ChevronDown size={14} className={`arrow ${showFilterMenu ? 'rotate' : ''}`} />
            </div>

            {showFilterMenu && (
              <div className="custom-dropdown-menu animate-pop-in">
                {filterOptions.map((opt) => (
                  <div 
                    key={opt.value}
                    className={`dropdown-item ${filterType === opt.value ? 'selected' : ''}`}
                    onClick={() => {
                      setFilterType(opt.value);
                      setShowFilterMenu(false);
                    }}
                  >
                    <div className="item-label">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                    {filterType === opt.value && <Check size={14} className="check-icon" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="download-area">
            <button 
              className="btn btn-secondary download-btn"
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            >
              <Download size={14} />
              <span>Download</span>
              <ChevronDown size={14} className={`arrow ${showDownloadMenu ? 'rotate' : ''}`} />
            </button>
            
            {showDownloadMenu && (
              <div className="download-menu animate-pop-in">
                <button onClick={() => generatePDF('all')}>General Statement</button>
                <button onClick={() => generatePDF('revenue')}>Inflow Statement</button>
                <button onClick={() => generatePDF('investment')}>Investment Statement</button>
                <button onClick={() => generatePDF('expense')}>Outflow Statement</button>
                <div className="menu-divider" />
                <button onClick={() => generatePDF('rejected')} className="text-danger">Rejected Items</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="table-container desktop-only">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Transaction Details</th>
              <th>Type</th>
              <th>Value</th>
              <th className="initiated-by-cell">Initiated By</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx._id} className="tx-row">
                <td className="date-cell">{new Date(tx.date).toLocaleDateString()}</td>
                <td>
                  <div className="tx-desc-cell">
                    <span className="tx-main-desc">{tx.description}</span>
                  </div>
                </td>
                <td>
                  <div className={`type-pill-minimal type-${tx.type}`}>
                    {tx.type === 'revenue' && <ArrowUpRight size={12} />}
                    {tx.type === 'expense' && <TrendingDown size={12} />}
                    {tx.type === 'investment' && <Wallet size={12} />}
                    {tx.type === 'transfer' && <ArrowRightLeft size={12} />}
                    <span>{typeLabel(tx.type)}</span>
                  </div>
                </td>
                <td className="amount-cell-premium">
                  <div>
                    <span className="currency">BDT</span>
                    <span className="value">{tx.amount.toLocaleString()}</span>
                  </div>
                  <div className="tx-account-desc" style={{ 
                    marginTop: '0.25rem', 
                    display: '-webkit-box', 
                    WebkitLineClamp: 2, 
                    WebkitBoxOrient: 'vertical', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'normal', 
                    wordBreak: 'break-word',
                    minWidth: '130px',
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    color: '#64748b' 
                  }}>
                    {tx.type === 'transfer' ? `From: ${tx.account?.bankName || 'Unknown'} → To: ${tx.toAccount?.bankName || 'Unknown'}` : `Account: ${tx.account?.bankName || 'Unknown'}`}
                  </div>
                </td>
                <td className="initiated-by-cell">
                  <div className="audit-stack">
                    <div className="audit-line">
                      <span className="audit-label">Perf:</span>
                      <span className="audit-name">{tx.performedBy || 'N/A'}</span>
                    </div>
                    <div className="audit-line">
                      <span className="audit-label">Rec:</span>
                      <span className="audit-name">{tx.createdBy?.name || 'System'}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="status-cell">
                    <div className={`status-chip ${tx.status}`}>
                      {tx.status === 'approved' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      <span>{tx.status === 'approved' ? 'Verified' : 'Rejected'}</span>
                    </div>
                    {tx.approvedBy?.name && (
                      <span className="verifier-name">By: {tx.approvedBy.name}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-only tx-card-list">
        {transactions.map((tx) => (
          <article key={tx._id} className={`txm-card txm-${tx.type}`}>
            <header className="txm-top">
              <div className={`type-pill-minimal type-${tx.type}`}>
                <span>{typeLabel(tx.type)}</span>
              </div>
              <div className="txm-amount">
                <span className="txm-cur">BDT</span>
                {tx.amount.toLocaleString()}
              </div>
            </header>

            <div className="txm-body">
              <h4 className="txm-title">{tx.description}</h4>
              <p className="txm-account">
                {tx.type === 'transfer'
                  ? `${tx.account?.bankName || 'Unknown'} → ${tx.toAccount?.bankName || 'Unknown'}`
                  : tx.account?.bankName || 'No account'}
              </p>
            </div>

            <dl className="txm-meta">
              <div>
                <dt>Date</dt>
                <dd>{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</dd>
              </div>
              <div>
                <dt>Recorded by</dt>
                <dd>{tx.createdBy?.name || tx.performedBy || 'System'}</dd>
              </div>
            </dl>

            <footer className="txm-foot">
              <span className={`txm-status ${tx.status}`}>
                {tx.status === 'approved' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                {tx.status === 'approved' ? 'Verified' : 'Rejected'}
              </span>
              {tx.approvedBy?.name && <span className="txm-by">by {tx.approvedBy.name}</span>}
            </footer>
          </article>
        ))}
      </div>

      {transactions.length === 0 && (
        <div className="premium-empty-state">
          <div className="empty-icon-container">
            <Filter size={32} />
          </div>
          <h4>No Records Found</h4>
          <p>We couldn't find any finalized transactions matching your criteria.</p>
        </div>
      )}

      {hasMore && (
        <div ref={observerTarget} className="infinite-scroll-loader">
          {loadingMore ? (
            <div className="loader-content">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span>Loading more records...</span>
            </div>
          ) : (
            <div style={{ height: '20px' }}></div>
          )}
        </div>
      )}

      <style jsx>{`
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 0.5rem 0;
        }
        .header-actions { display: flex; align-items: center; gap: 1rem; }
        .title-area h3 { font-size: clamp(1.1rem, 4vw, 1.25rem); font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
        .subtitle { font-size: clamp(0.75rem, 3vw, 0.875rem); color: #64748b; }

        /* Custom Dropdown Styling */
        .custom-dropdown-wrapper { position: relative; width: 180px; }
        
        .custom-filter-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 42px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        
        .custom-filter-trigger:hover { border-color: #cbd5e1; }
        .custom-filter-trigger.active { border-color: #0f172a; box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05); }

        .trigger-content { display: flex; align-items: center; gap: 0.625rem; font-size: 0.8125rem; font-weight: 700; color: #0f172a; }
        .trigger-content :global(svg) { color: #64748b; }
        
        .arrow { color: #64748b; transition: transform 0.2s; }
        .arrow.rotate { transform: rotate(180deg); }

        .custom-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 0.5rem;
          z-index: 1000;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 0.875rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .dropdown-item:hover { background: #f8fafc; }
        .dropdown-item.selected { background: #f1f5f9; }

        .item-label { display: flex; align-items: center; gap: 0.625rem; font-size: 0.8125rem; font-weight: 700; color: #0f172a; }
        .check-icon { color: #0f172a; }

        /* Table & Data Styling */
        .table-container { 
          background: white;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }
        table { width: 100%; border-collapse: collapse; min-width: 800px; }
        
        th { 
          text-align: left; 
          padding: 1rem 1.5rem; 
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0; 
          color: #64748b; 
          font-size: 0.7rem; 
          font-weight: 800; 
          text-transform: uppercase; 
          letter-spacing: 0.05em; 
        }
        
        .tx-row { border-bottom: 1px solid #f1f5f9; transition: all 0.15s; }
        .tx-row:hover { background: #fafafa; }
        
        td { padding: 1.25rem 1.5rem; vertical-align: middle; }
        th.initiated-by-cell { padding-left: 4rem; }
        td.initiated-by-cell { padding-left: 4rem; }
        .date-cell { font-weight: 600; color: #64748b; font-size: 0.8125rem; }

        .tx-desc-cell { display: flex; flex-direction: column; gap: 0.3rem; }
        .tx-main-desc { font-weight: 700; color: #0f172a; font-size: 0.9375rem; word-break: break-word; max-width: 400px; line-height: 1.4; }
        .tx-performed-badge { 
          display: flex; 
          align-items: center; 
          gap: 0.3rem; 
          font-size: 0.7rem; 
          font-weight: 700; 
          color: #64748b; 
          background: #f1f5f9;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          width: fit-content;
        }

        .infinite-scroll-loader {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem 0;
          color: #64748b;
        }
        .loader-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
        }

        .type-pill-minimal {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          width: fit-content;
        }
        .type-revenue { background: #f0fdf4; border-color: #dcfce7; color: #15803d; }
        .type-expense { background: #fef2f2; border-color: #fee2e2; color: #b91c1c; }
        .type-transfer { background: #f5f3ff; border-color: #ede9fe; color: #6d28d9; }
        
        .tx-account-desc { font-size: 0.75rem; color: #64748b; font-weight: 600; margin-top: 0.1rem; }

        .amount-cell-premium { font-weight: 800; color: #0f172a; white-space: nowrap; }
        .amount-cell-premium .currency { font-size: 0.7rem; color: #64748b; margin-right: 0.25rem; }
        .amount-cell-premium .value { font-size: 1rem; }

        .creator-badge { display: flex; align-items: center; gap: 0.625rem; }
        .avatar-mini { 
          width: 24px; 
          height: 24px; 
          background: #0f172a; 
          border-radius: 4px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 0.7rem; 
          font-weight: 800; 
          color: white;
        }
        .creator-badge span { font-weight: 700; color: #0f172a; font-size: 0.8125rem; }

        .status-chip {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.25rem 0.625rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 800;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          width: fit-content;
        }
        .status-chip.approved { color: #10b981; border-color: #dcfce7; background: #f0fdf4; }
        .status-chip.rejected { color: #ef4444; border-color: #fee2e2; background: #fef2f2; }
        
        .status-cell { display: flex; flex-direction: column; gap: 0.25rem; }
        .audit-stack { display: flex; flex-direction: column; gap: 0.25rem; }
        .audit-line { display: flex; align-items: baseline; gap: 0.4rem; white-space: nowrap; }
        .audit-label { font-size: 0.65rem; color: #94a3b8; font-weight: 800; letter-spacing: 0.02em; min-width: 32px; }
        .audit-name { font-size: 0.8125rem; font-weight: 700; color: #0f172a; }
        
        .verifier-name { font-size: 0.65rem; color: #94a3b8; font-weight: 600; padding-left: 2px; }
        .status-stack { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
        .m-verifier { font-size: 0.6rem; color: #94a3b8; font-weight: 600; }

        /* Mobile cards */
        .tx-card-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .txm-card { position: relative; overflow: hidden; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); }
        .txm-card::before { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background: #cbd5e1; }
        .txm-expense::before { background: #ef4444; }
        .txm-revenue::before { background: #10b981; }
        .txm-investment::before { background: #6366f1; }
        .txm-transfer::before { background: #a855f7; }
        .txm-top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.875rem 1rem 0; }
        .txm-amount { display: flex; align-items: baseline; gap: 0.25rem; font-size: 1.125rem; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .txm-cur { font-size: 0.6875rem; font-weight: 700; color: #94a3b8; }
        .txm-body { padding: 0.625rem 1rem 0.875rem; min-width: 0; }
        .txm-title { margin: 0 0 0.25rem; font-size: 0.9375rem; font-weight: 700; line-height: 1.4; color: #0f172a; word-break: break-word; }
        .txm-account { margin: 0; font-size: 0.8125rem; color: #64748b; word-break: break-word; }
        .txm-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 0; padding: 0.75rem 1rem; background: #f8fafc; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
        .txm-meta div { min-width: 0; }
        .txm-meta dt { margin-bottom: 0.125rem; font-size: 0.6875rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
        .txm-meta dd { margin: 0; font-size: 0.8125rem; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .txm-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.625rem 1rem; }
        .txm-status { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.1875rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
        .txm-status.approved { background: #f0fdf4; color: #15803d; }
        .txm-status.rejected { background: #fef2f2; color: #b91c1c; }
        .txm-by { min-width: 0; font-size: 0.75rem; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .download-area { position: relative; }
        .download-btn { 
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.625rem; 
          font-size: 0.8125rem; 
          font-weight: 700; 
          min-height: 42px !important; 
          border-radius: 4px;
          background: #f8fafc;
          color: #0f172a;
          border: 1px solid #e2e8f0;
          padding: 0 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .download-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
        
        .download-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 220px;
          background: white;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 50;
          padding: 0.5rem;
        }
        .download-menu button {
          display: block;
          width: 100%;
          text-align: left;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          font-size: 0.8125rem;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 4px;
        }
        .download-menu button:hover { background: #f8fafc; padding-left: 1.25rem; }
        .download-menu .menu-divider { height: 1px; background: #f1f5f9; margin: 4px 0; }
        .download-menu .text-danger { color: #ef4444; }
        .download-menu .text-danger:hover { background: #fef2f2; color: #b91c1c; }

        .premium-empty-state { 
          text-align: center; 
          padding: 5rem 2rem; 
          background: #ffffff; 
          border-radius: 4px; 
          border: 1px dashed #e2e8f0;
        }
        .empty-icon-container { 
          width: 56px; 
          height: 56px; 
          background: #f8fafc; 
          border-radius: 4px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          margin: 0 auto 1.25rem;
          color: #64748b;
        }
        .premium-empty-state h4 { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
        .premium-empty-state p { color: #64748b; font-size: 0.875rem; }

        .desktop-only { display: block; }
        .mobile-only { display: none; }

        @media (max-width: 768px) {
          .desktop-only { display: none; }
          .mobile-only { display: block; }
          .tx-card-list { display: flex; }
          .history-header { flex-direction: column; align-items: flex-start; gap: 1.25rem; }
          .header-actions { flex-direction: row; width: 100%; gap: 0.75rem; align-items: center; }
          .custom-dropdown-wrapper, .download-area { flex: 1; min-width: 0; }
          .custom-filter-trigger, .download-btn { width: 100%; padding: 0 0.75rem; font-size: 0.75rem; }
          .trigger-content span, .download-btn span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.8125rem; font-weight: 700; }
          .custom-filter-trigger, .download-btn { min-height: 42px; }
          .download-menu { width: 200px; left: auto; right: 0; }
        }

        .animate-pop-in {
          animation: popIn 0.2s ease-out;
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
