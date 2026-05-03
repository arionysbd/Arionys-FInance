'use client';
import { TrendingUp, TrendingDown, Wallet, PlusCircle } from 'lucide-react';
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

export default function Dashboard({ stats, recentTransactions, user }) {
  const isAccountant = user?.role?.toLowerCase() === 'accountant';
  const chartData = {
    labels: ['Revenue', 'Expenses', 'Investments'],
    datasets: [
      {
        label: 'Amount (BDT)',
        data: [stats.totalRevenue, stats.totalExpense, stats.totalInvestment],
        backgroundColor: ['#10b981', '#ef4444', '#2563eb'],
        borderRadius: 6,
        barThickness: 40,
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

  return (
    <div className="animate-fade-in">
      <div className="grid-stats">
        {/* Net Balance - Always visible */}
        <div className="card stat-card">
          <div className="stat-icon-bg" style={{ backgroundColor: '#eff6ff' }}>
            <Wallet style={{ color: '#2563eb' }} size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Net Balance</span>
            <div className="stat-value">
              <span className="currency-label">BDT</span> {stats.netBalance.toLocaleString()}
            </div>
          </div>
        </div>

        {!isAccountant && (
          <>
            <div className="card stat-card">
              <div className="stat-icon-bg" style={{ backgroundColor: '#ecfdf5' }}>
                <TrendingUp style={{ color: '#10b981' }} size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Revenue</span>
                <div className="stat-value text-success">
                  <span className="currency-label">BDT</span> {stats.totalRevenue.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="card stat-card">
              <div className="stat-icon-bg" style={{ backgroundColor: '#fef2f2' }}>
                <TrendingDown style={{ color: '#ef4444' }} size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Expenses</span>
                <div className="stat-value text-danger">
                  <span className="currency-label">BDT</span> {stats.totalExpense.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="card stat-card">
              <div className="stat-icon-bg" style={{ backgroundColor: '#f5f3ff' }}>
                <PlusCircle style={{ color: '#8b5cf6' }} size={20} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Investments</span>
                <div className="stat-value text-accent">
                  <span className="currency-label">BDT</span> {stats.totalInvestment.toLocaleString()}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid-content">
        <div className="card chart-container">
          <div className="card-header">
            <h3>Financial Performance</h3>
            <p>Distribution of capital across categories</p>
          </div>
          <div className="chart-wrapper">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card recent-transactions">
          <div className="card-header">
            <h3>Recent Activity</h3>
            <p>Latest approved transactions</p>
          </div>
          <div className="transaction-list">
            {recentTransactions.slice(0, 6).map((tx) => (
              <div key={tx._id} className="transaction-item">
                <div className="tx-info">
                  <span className="tx-desc">{tx.description}</span>
                  <span className="tx-date">{new Date(tx.date).toLocaleDateString()}</span>
                </div>
                <div className={`tx-amount ${tx.type}`}>
                  {tx.type === 'expense' ? '-' : '+'} <small>BDT</small> {tx.amount.toLocaleString()}
                </div>
              </div>
            ))}
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
        }
        .stat-icon-bg {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-content { display: flex; flex-direction: column; }
        .stat-label {
          color: #64748b;
          font-size: 0.8125rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          margin-bottom: 0.25rem;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1e293b;
          display: flex;
          align-items: baseline;
          gap: 0.35rem;
        }
        @media (max-width: 480px) {
          .stat-value { font-size: 1.25rem; }
          .stat-card { padding: 1rem; }
        }
        .currency-label { font-size: 0.875rem; font-weight: 600; color: var(--muted-foreground); }
        
        .grid-content {
          display: grid;
          grid-template-columns: 1.8fr 1.2fr;
          gap: 1.5rem;
        }
        @media (max-width: 1024px) {
          .grid-content { grid-template-columns: 1fr; }
        }
        
        .card-header p { font-size: 0.8125rem; color: #94a3b8; }
        
        .chart-wrapper { height: 300px; margin-top: 1rem; }
        @media (max-width: 640px) {
          .chart-wrapper { height: 220px; }
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
          padding: 0.875rem 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .transaction-item:last-child { border-bottom: none; }
        .tx-info { display: flex; flex-direction: column; gap: 0.15rem; }
        .tx-desc { font-weight: 600; font-size: 0.875rem; color: #334155; }
        .tx-date { font-size: 0.75rem; color: #94a3b8; }
        .tx-amount { font-weight: 700; font-size: 0.875rem; }
        .tx-amount.revenue { color: #10b981; }
        .tx-amount.expense { color: #ef4444; }
        .tx-amount.investment { color: #2563eb; }
        .muted { color: #94a3b8; text-align: center; margin-top: 2rem; font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
