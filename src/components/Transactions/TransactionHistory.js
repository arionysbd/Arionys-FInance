'use client';
import { useState, useRef, useEffect } from 'react';
import { Filter, CheckCircle, XCircle, Download, ChevronDown, Check, ArrowUpRight, TrendingDown, Wallet, ArrowRightLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function TransactionHistory({ transactions, onUpdate }) {
  const [filterType, setFilterType] = useState('');
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
        tx.type.toUpperCase(),
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

    doc.text(`Total Revenue:`, 15, finalY + 27);
    doc.text(`BDT ${totalRevenue.toLocaleString()}`, 60, finalY + 27, { align: 'right' });

    doc.text(`Total Expense:`, 15, finalY + 32);
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
    { value: 'revenue', label: 'Revenue', icon: <ArrowUpRight size={14} className="text-tx-revenue" /> },
    { value: 'expense', label: 'Expense', icon: <TrendingDown size={14} className="text-tx-expense" /> },
    { value: 'investment', label: 'Investment', icon: <Wallet size={14} className="text-tx-investment" /> },
    { value: 'transfer', label: 'Transfer', icon: <ArrowRightLeft size={14} style={{ color: '#8b5cf6' }} /> },
    { value: 'rejected', label: 'Rejected Items', icon: <XCircle size={14} className="text-danger" /> }
  ];

  const currentFilter = filterOptions.find(o => o.value === filterType);

  const filteredTransactions = filterType 
    ? (filterType === 'rejected' 
        ? transactions.filter(tx => tx.status === 'rejected')
        : transactions.filter(tx => tx.type === filterType && tx.status === 'approved'))
    : transactions.filter(tx => tx.status === 'approved');

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
                <button onClick={() => generatePDF('revenue')}>Revenue Statement</button>
                <button onClick={() => generatePDF('investment')}>Investment Statement</button>
                <button onClick={() => generatePDF('expense')}>Expenses Statement</button>
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
            {filteredTransactions.map((tx) => (
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
                    <span>{tx.type}</span>
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
        {filteredTransactions.map((tx) => (
          <div key={tx._id} className="tx-premium-mobile-card">
            <div className="mobile-card-header">
              <div className={`type-pill-minimal type-${tx.type}`}>
                <span>{tx.type}</span>
              </div>
              <span className="mobile-date">{new Date(tx.date).toLocaleDateString()}</span>
            </div>
            
            <div className="mobile-card-body">
              <h4 className="mobile-desc"><span className="label-dim">Description:</span> {tx.description}</h4>
              
              <div className="mobile-financials" style={{ marginTop: '1rem' }}>
                <div>
                  <div className="mobile-amount-value">
                    <span className="m-curr">BDT</span>
                    <span className="m-val">{tx.amount.toLocaleString()}</span>
                  </div>
                  <div className="mobile-account" style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 600 }}>
                    {tx.type === 'transfer' ? `From: ${tx.account?.bankName || 'Unknown'} → To: ${tx.toAccount?.bankName || 'Unknown'}` : `Account: ${tx.account?.bankName || 'Unknown'}`}
                  </div>
                </div>
                <div className="status-stack">
                  <div className={`status-chip ${tx.status} mini`}>
                    {tx.status === 'approved' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                    {tx.status === 'approved' ? 'Verified' : 'Rejected'}
                  </div>
                  {tx.approvedBy?.name && (
                    <span className="m-verifier">By: {tx.approvedBy.name}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mobile-card-footer">
              <div className="creator-badge">
                <span>{tx.createdBy?.name || 'System'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTransactions.length === 0 && (
        <div className="premium-empty-state">
          <div className="empty-icon-container">
            <Filter size={32} />
          </div>
          <h4>No Records Found</h4>
          <p>We couldn't find any finalized transactions matching your criteria.</p>
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
          border-radius: 6px;
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
          border-radius: 6px;
          padding: 0.5rem;
          z-index: 1000;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 0.875rem;
          border-radius: 6px;
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
          border-radius: 6px;
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
          border-radius: 6px;
          width: fit-content;
        }

        .type-pill-minimal {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
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
          border-radius: 6px; 
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
          border-radius: 6px;
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

        /* Mobile Premium Cards */
        .tx-card-list { display: flex; flex-direction: column; gap: 1rem; }
        .tx-premium-mobile-card { 
          background: white; 
          border-radius: 6px; 
          padding: clamp(1rem, 4vw, 1.25rem); 
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .mobile-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .mobile-date { font-size: clamp(0.65rem, 2.5vw, 0.75rem); font-weight: 700; color: #64748b; }
        .mobile-desc { font-size: clamp(0.9rem, 4vw, 1rem); font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
        .label-dim { color: #94a3b8; font-weight: 600; font-size: 0.875rem; margin-right: 0.25rem; }
        .mobile-performed { font-size: 0.8125rem; color: #64748b; margin-bottom: 1.25rem; }
        .mobile-financials { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .mobile-amount-value { display: flex; align-items: baseline; gap: 0.25rem; font-weight: 900; color: #0f172a; }
        .m-curr { font-size: clamp(0.6rem, 2vw, 0.7rem); color: #64748b; }
        .m-val { font-size: clamp(1.1rem, 5vw, 1.25rem); }
        .status-chip.mini { padding: 0.125rem 0.5rem; font-size: 0.7rem; }
        .mobile-card-footer { border-top: 1px solid #f1f5f9; padding-top: 1rem; }

        .download-area { position: relative; }
        .download-btn { 
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.625rem; 
          font-size: 0.8125rem; 
          font-weight: 700; 
          min-height: 42px !important; 
          border-radius: 6px;
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
          border-radius: 6px;
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
          border-radius: 6px;
        }
        .download-menu button:hover { background: #f8fafc; padding-left: 1.25rem; }
        .download-menu .menu-divider { height: 1px; background: #f1f5f9; margin: 4px 0; }
        .download-menu .text-danger { color: #ef4444; }
        .download-menu .text-danger:hover { background: #fef2f2; color: #b91c1c; }

        .premium-empty-state { 
          text-align: center; 
          padding: 5rem 2rem; 
          background: #ffffff; 
          border-radius: 6px; 
          border: 1px dashed #e2e8f0;
        }
        .empty-icon-container { 
          width: 56px; 
          height: 56px; 
          background: #f8fafc; 
          border-radius: 6px; 
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
          .trigger-content span, .download-btn span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
