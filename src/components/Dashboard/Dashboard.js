'use client';
import { TrendingUp, TrendingDown, Wallet, PlusCircle, ArrowRight, CircleDot, Receipt, Clock } from 'lucide-react';
import Link from 'next/link';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// variant 'office' shows the whole company; 'personal' shows only the signed-in user's own records
// (Total Transactions instead of Net Balance, Pending Approval instead of Investments, no account balances).
export default function Dashboard({ stats, recentTransactions, user, variant = 'office' }) {
  const isPersonal = variant === 'personal';
  // Personal dashboards only show Inflow and Outflow; the office dashboard also shows Investments
  const chartData = {
    labels: isPersonal ? ['Inflow', 'Outflow'] : ['Inflow', 'Outflow', 'Investments'],
    datasets: [
      {
        label: 'Amount (BDT)',
        data: isPersonal
          ? [stats.totalRevenue, stats.totalExpense]
          : [stats.totalRevenue, stats.totalExpense, stats.totalInvestment],
        backgroundColor: ['#10b981', '#ef4444', '#2563eb'],
        borderRadius: 4,
        maxBarThickness: 60,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        cornerRadius: 6,
      }
    },
    scales: {
      y: { 
        grid: { color: '#f1f5f9' }, 
        ticks: { color: '#94a3b8', font: { size: 11 } },
        border: { display: false }
      },
      x: { 
        grid: { display: false }, 
        ticks: { color: '#64748b', font: { size: 12, weight: '600' } },
        border: { display: false }
      },
    },
  };

  const CARD_COLORS = [
    { bg: '#e0e7ff', text: '#4f46e5' }, // Indigo
    { bg: '#dcfce7', text: '#16a34a' }, // Green
    { bg: '#fef3c7', text: '#d97706' }, // Amber
    { bg: '#f3e8ff', text: '#9333ea' }, // Purple
    { bg: '#fee2e2', text: '#dc2626' }, // Red
    { bg: '#ccfbf1', text: '#0d9488' }, // Teal
  ];

  return (
    <div className="animate-fade-in">
      <div className="grid-stats">
        {(isPersonal
          ? ['inflow', 'outflow', 'pending', 'count']
          : ['balance', 'inflow', 'outflow', 'investment']
        ).map(key => {
          const card = {
            balance: { label: 'Net Balance', icon: Wallet, bg: '#eff6ff', fg: '#2563eb', value: stats.netBalance, money: true },
            inflow: { label: 'Total Inflow', icon: TrendingUp, bg: '#ecfdf5', fg: '#10b981', value: stats.totalRevenue, money: true, tone: 'text-success' },
            outflow: { label: 'Total Outflow', icon: TrendingDown, bg: '#fef2f2', fg: '#ef4444', value: stats.totalExpense, money: true, tone: 'text-danger' },
            investment: { label: 'Investments', icon: PlusCircle, bg: '#f5f3ff', fg: '#8b5cf6', value: stats.totalInvestment, money: true, tone: 'text-accent' },
            pending: { label: 'Pending Approval', icon: Clock, bg: '#fffbeb', fg: '#d97706', value: stats.pendingAmount, money: true, tone: 'text-warning', sub: `${stats.pendingCount || 0} awaiting review` },
            count: { label: 'Total Transactions', icon: Receipt, bg: '#eff6ff', fg: '#2563eb', value: stats.totalTransactions, sub: 'Submitted by you' },
          }[key];
          const Icon = card.icon;
          return (
            <div key={key} className="card stat-card">
              <div className="stat-icon-bg" style={{ backgroundColor: card.bg }}>
                <Icon style={{ color: card.fg }} size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-label">{card.label}</span>
                <div className={`stat-value ${card.tone || ''}`}>
                  {card.money && <span className="currency-label">BDT</span>} {(card.value || 0).toLocaleString()}
                </div>
                {card.sub && <span className="stat-sub">{card.sub}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {!isPersonal && stats.accountBalances && stats.accountBalances.length > 0 && (
        <div className="account-balances-container">
          <h3 className="section-title">Account Balances</h3>
          <div className="accounts-grid">
            {stats.accountBalances.map((acc, index) => {
              const color = CARD_COLORS[index % CARD_COLORS.length];
              return (
                <div key={acc.name} className="card acc-card" style={{ borderTop: `3px solid ${color.text}` }}>
                  <div className="acc-icon-bg" style={{ backgroundColor: color.bg }}>
                    <Wallet style={{ color: color.text }} size={18} />
                  </div>
                  <div className="acc-info">
                    <span className="acc-name">{acc.name}</span>
                    <span className="acc-bal">BDT {acc.balance.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid-content">
        <div className="card chart-container" style={{ overflow: 'hidden', minWidth: 0 }}>
          <div className="card-header">
            <h3>Financial Performance</h3>
            <p>{isPersonal ? 'Your approved transactions by category' : 'Distribution of capital across categories'}</p>
          </div>
          <div className="chart-wrapper">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card recent-transactions" style={{ overflow: 'hidden', minWidth: 0 }}>
          <div className="card-header flex-header">
            <div>
              <h3>Recent Activity</h3>
              <p>{isPersonal ? 'Your latest transactions' : 'Latest approved transactions'}</p>
            </div>
            {!isPersonal && (
              <Link href="/transactions" className="view-all-link">
                View All <ArrowRight size={14} />
              </Link>
            )}
          </div>
          <div className="transaction-list">
            {recentTransactions.slice(0, 6).map((tx) => {
              const isExpense = tx.type === 'expense';
              const dotColor = isExpense ? '#ef4444' : (tx.type === 'revenue' ? '#10b981' : '#2563eb');
              
              return (
                <div key={tx._id} className="transaction-item">
                  <div className="tx-info-wrapper">
                    <CircleDot size={14} color={dotColor} className="tx-dot" />
                    <div className="tx-info">
                      <span className="tx-desc">{tx.description}</span>
                      <span className="tx-date">
                        {new Date(tx.date).toLocaleDateString()}
                        {isPersonal && tx.status && tx.status !== 'approved' && (
                          <span className={`tx-status tx-status-${tx.status}`}>{tx.status}</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className={`tx-amount ${tx.type}`}>
                    {isExpense ? '-' : '+'} <small>BDT</small> {tx.amount.toLocaleString()}
                  </div>
                </div>
              );
            })}
            {recentTransactions.length === 0 && <p className="muted">No recent transactions</p>}
          </div>
        </div>
      </div>

      <style jsx>{`
        .grid-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }
        @media (max-width: 640px) {
          .grid-stats { grid-template-columns: 1fr; gap: 1rem; }
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.2), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .stat-card:hover::before { opacity: 1; }
        
        .stat-icon-bg {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.5);
        }
        .stat-content { display: flex; flex-direction: column; }
        .stat-sub { margin-top: 0.125rem; font-size: 0.75rem; color: #94a3b8; }
        .text-warning { color: #d97706; }
        .tx-status { margin-left: 0.5rem; padding: 0.0625rem 0.375rem; border-radius: 4px; font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .tx-status-pending { background: #fef3c7; color: #92400e; }
        .tx-status-rejected { background: #fee2e2; color: #991b1b; }
        .stat-label {
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }
        .stat-value {
          font-size: 1.625rem;
          font-weight: 800;
          color: #0f172a;
          display: flex;
          align-items: baseline;
          gap: 0.35rem;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
        }
        @media (max-width: 480px) {
          .stat-value { font-size: 1.35rem; }
          .stat-card { padding: 1.25rem; }
        }
        .currency-label { font-size: 0.875rem; font-weight: 600; color: var(--muted-foreground); }
        
        .section-title { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin-bottom: 1rem; margin-top: 1rem; }
        .account-balances-container { margin-bottom: 2.5rem; }
        .accounts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }
        .acc-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: white;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .acc-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .acc-icon-bg {
          width: 40px; height: 40px; border-radius: 6px; background: #e0f2fe; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: inset 0 2px 4px rgba(255,255,255,0.4);
        }
        .acc-info { display: flex; flex-direction: column; overflow: hidden; width: 100%; }
        .acc-name { 
          font-size: 0.75rem; font-weight: 700; color: #64748b; 
          text-transform: uppercase; margin-bottom: 0.15rem; 
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .acc-bal { font-size: 1.1rem; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; }

        .grid-content {
          display: grid;
          grid-template-columns: 1.8fr 1.2fr;
          gap: 1.5rem;
          min-width: 0;
          overflow: hidden;
        }
        .grid-content > * { min-width: 0; overflow: hidden; }
        @media (max-width: 1024px) {
          .grid-content { grid-template-columns: 1fr; }
        }
        
        .card-header p { font-size: 0.8125rem; color: #94a3b8; margin-top: 0.2rem; }
        .flex-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .view-all-link { 
          display: flex; align-items: center; gap: 0.35rem; 
          font-size: 0.8125rem; font-weight: 600; color: var(--primary); 
          background: var(--accent); padding: 0.4rem 0.75rem; border-radius: 8px;
          transition: all 0.2s;
        }
        .view-all-link:hover { background: #e0e7ff; color: #3730a3; }
        
        .chart-container { overflow: hidden; }
        .chart-wrapper { height: 300px; margin-top: 1rem; position: relative; width: 100%; }
        @media (max-width: 640px) {
          .chart-wrapper { height: 200px; }
        }
        
        .transaction-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .transaction-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0.5rem;
          border-bottom: 1px solid #f1f5f9;
          min-width: 0;
          gap: 0.5rem;
          transition: background 0.2s ease;
          border-radius: 6px;
        }
        .transaction-item:hover { background: #f8fafc; padding-left: 0.75rem; padding-right: 0.75rem; margin: 0 -0.25rem; }
        .transaction-item:last-child { border-bottom: none; }
        .tx-info-wrapper { display: flex; align-items: center; gap: 0.875rem; flex: 1; min-width: 0; }
        .tx-dot { flex-shrink: 0; opacity: 0.8; }
        .tx-info { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; flex: 1; overflow: hidden; }
        .tx-desc {
          display: block;
          font-weight: 600; font-size: 0.875rem; color: #334155;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 100%;
        }
        .tx-date { font-size: 0.75rem; color: #94a3b8; }
        .tx-amount {
          font-weight: 700;
          font-size: 0.875rem;
          flex-shrink: 0;
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
          padding-left: 1rem;
        }
        .tx-amount.revenue { color: #10b981; }
        .tx-amount.expense { color: #ef4444; }
        .tx-amount.investment { color: #2563eb; }
        .muted { color: #94a3b8; text-align: center; margin-top: 2rem; font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
