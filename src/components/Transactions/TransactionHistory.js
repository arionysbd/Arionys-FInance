'use client';
import { useState } from 'react';
import { Filter, User, CheckCircle } from 'lucide-react';

export default function TransactionHistory({ transactions, onUpdate }) {
  const [filterType, setFilterType] = useState('');

  const filteredTransactions = filterType 
    ? transactions.filter(tx => tx.type === filterType)
    : transactions;

  return (
    <div className="card">
      <div className="history-header">
        <div className="title-area">
          <h3>Approved History</h3>
          <p className="subtitle">Verified and finalized financial records</p>
        </div>
        <div className="filters">
          <Filter size={14} />
          <select 
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="revenue">Revenue</option>
            <option value="expense">Expense</option>
            <option value="investment">Investment</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Creator</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr key={tx._id}>
                <td>{new Date(tx.date).toLocaleDateString()}</td>
                <td>
                  <div className="tx-desc-cell">
                    <span>{tx.description}</span>
                    <small>{tx.category}</small>
                  </div>
                </td>
                <td><span className={`badge badge-${tx.type}`}>{tx.type}</span></td>
                <td className={`amount-cell ${tx.type}`}>
                  {tx.type === 'expense' ? '-' : '+'}${tx.amount.toLocaleString()}
                </td>
                <td>
                  <div className="user-badge">
                    <User size={12} />
                    {tx.createdBy?.name || 'System'}
                  </div>
                </td>
                <td>
                  <div className="status-badge">
                    <CheckCircle size={14} className="text-success" />
                    <span>Approved</span>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-state">No approved transactions found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .title-area h3 { font-size: 1.125rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
        .subtitle { font-size: 0.8125rem; color: var(--muted-foreground); }
        
        .filters { display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border); }
        .filter-select { background: transparent; border: none; color: #475569; font-size: 0.8125rem; font-weight: 600; outline: none; }
        
        .table-container { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 600px; }
        th { text-align: left; padding: 1rem; border-bottom: 1px solid var(--border); color: #64748b; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 1.25rem 1rem; border-bottom: 1px solid #f1f5f9; font-size: 0.875rem; color: #334155; }
        tr:last-child td { border-bottom: none; }
        
        .tx-desc-cell { display: flex; flex-direction: column; }
        .tx-desc-cell span { font-weight: 600; color: #1e293b; }
        .tx-desc-cell small { color: #94a3b8; font-size: 0.75rem; margin-top: 0.1rem; }
        
        .amount-cell { font-weight: 700; }
        .amount-cell.revenue { color: #10b981; }
        .amount-cell.expense { color: #ef4444; }
        .amount-cell.investment { color: #2563eb; }
        
        .user-badge { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #64748b; background: #f1f5f9; padding: 0.25rem 0.6rem; border-radius: 999px; width: fit-content; }
        
        .status-badge { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 600; color: #10b981; }
        
        .empty-state { text-align: center; color: var(--muted-foreground); padding: 4rem !important; font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
