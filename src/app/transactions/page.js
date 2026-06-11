'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import TransactionHistory from '@/components/Transactions/TransactionHistory';
import { getStats, getTransactions, exportTransactions, importTransactions } from '@/lib/api';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Plus, Download, Upload, Loader2 } from 'lucide-react';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalInvestment: 0, totalRevenue: 0, totalExpense: 0, netBalance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchStats = async () => {
    try {
      const { data } = await getStats({ companyId: user.companyId });
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchTransactions = async (pageNumber = 1, append = false) => {
    try {
      const params = { 
        companyId: user.companyId,
        page: pageNumber,
        limit: 20
      };
      
      if (filterType === 'rejected') {
        params.status = 'rejected';
      } else if (filterType) {
        params.type = filterType;
        params.status = 'approved';
      } else {
        params.status = 'approved';
      }

      const txData = await getTransactions(params);
      
      if (append) {
        setTransactions(prev => [...prev, ...txData.data]);
      } else {
        setTransactions(txData.data);
      }
      setHasMore(txData.hasMore);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchTransactions(1, false)]);
    setLoading(false);
  };

  useEffect(() => {
    if (user?.companyId) {
      setPage(1);
      loadData();
    }
  }, [user, filterType]);

  const loadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchTransactions(nextPage, true);
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, user, filterType]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportTransactions(user.companyId);
      if (result.success && result.data) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result.data, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `transactions-backup-${new Date().toISOString().split('T')[0]}.json`);
        dlAnchorElem.click();
      } else {
        alert(result.message || 'Export failed');
      }
    } catch (err) {
      alert('Failed to export transactions');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      const result = await importTransactions({
        companyId: user.companyId,
        transactions: json
      });
      
      if (result.success) {
        alert(result.message || 'Import successful!');
        setPage(1);
        loadData();
      } else {
        alert(result.message || 'Import failed');
      }
    } catch (err) {
      alert('Failed to parse or import JSON file. Please ensure it is a valid backup.');
      console.error(err);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="tx-skeleton">
          <div className="skeleton-bar shim"></div>
          <div className="skeleton-form shim"></div>
          <div className="skeleton-history">
            <div className="skeleton-h-header shim"></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton-h-row shim"></div>
            ))}
          </div>
        </div>
        <style jsx>{`
          .tx-skeleton { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; padding: 1rem 5vw 1rem 1rem; }
          .skeleton-bar { height: 80px; border-radius: 6px; }
          .skeleton-form { height: 350px; border-radius: 6px; }
          .skeleton-history { display: flex; flex-direction: column; gap: 0.75rem; }
          .skeleton-h-header { height: 50px; border-radius: 6px; }
          .skeleton-h-row { height: 70px; border-radius: 6px; }
          .shim {
            background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="tx-layout">
        <div className="tx-quick-stats-bar animate-slide-up">
          <div className="tx-stat-item">
            <span className="tx-stat-label">Net Balance</span>
            <span className="tx-stat-value">BDT {stats.netBalance.toLocaleString()}</span>
          </div>
          <div className="tx-stat-divider"></div>
          <div className="tx-stat-item">
            <span className="tx-stat-label">Total Records</span>
            <span className="tx-stat-value">{transactions.length}</span>
          </div>
          <div className="tx-actions-wrapper">
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".json" 
              onChange={handleImportFile} 
            />
            <button className="btn-action-outline" onClick={handleImportClick} disabled={importing}>
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Import
            </button>
            <button className="btn-action-outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export
            </button>
            <Link href="/transactions/create" className="btn-create-tx">
              <Plus size={16} />
              Create Transaction
            </Link>
          </div>
        </div>

        <div className="tx-history-container">
          <TransactionHistory 
            transactions={transactions} 
            onUpdate={loadData} 
            filterType={filterType}
            setFilterType={setFilterType}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
          />
        </div>
      </div>

      <style jsx>{`
        .tx-layout { max-width: 1200px; margin: 0 auto; padding-right: 5vw; }
        .tx-quick-stats-bar { 
          display: flex; 
          width: 100%;
          align-items: center; 
          background: #ffffff; 
          padding: clamp(1rem, 4vw, 1.5rem) clamp(1.25rem, 5vw, 2rem); 
          border-radius: 6px; 
          border: 1px solid #e2e8f0;
          margin-bottom: clamp(1.5rem, 6vw, 2rem);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .tx-actions-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: none;
        }
        .btn-action-outline {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: white;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-action-outline:hover:not(:disabled) {
          background: #f8fafc;
          border-color: #94a3b8;
        }
        .btn-action-outline:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .tx-history-container { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
        .tx-stat-item { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
        .tx-stat-label { font-size: clamp(0.6rem, 2.5vw, 0.7rem); font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
        .tx-stat-value { font-size: clamp(1rem, 5vw, 1.25rem); font-weight: 900; color: #0f172a; }
        .tx-stat-divider { width: 1px; height: 40px; background: #f1f5f9; margin: 0 2rem; }
        .btn-create-tx {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #0f172a;
          color: white;
          padding: 0.75rem 1.25rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.875rem;
          text-decoration: none;
          transition: all 0.2s;
        }
        .btn-create-tx:hover {
          background: #1e293b;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }
        
        @media (max-width: 768px) {
          .tx-layout { padding-right: 0; }
          .tx-quick-stats-bar { flex-direction: row; gap: 0; align-items: center; padding: 1rem 1.25rem; }
          .tx-stat-divider { display: block; height: 30px; margin: 0 1rem; }
          .tx-stat-value { font-size: 1.1rem; }
          .btn-create-tx { padding: 0.5rem 1rem; font-size: 0.8rem; margin-left: 1rem; }
        }
      `}</style>
    </DashboardLayout>
  );
}
