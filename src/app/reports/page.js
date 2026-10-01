'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { hasPermission } from '@/lib/permissions';
import { PieChart, Loader2, Calendar, TrendingUp, TrendingDown, Scale, Wallet, ArrowRight } from 'lucide-react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Date Filters (default: last 30 days)
  const defaultEnd = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 30);
  
  const [startDate, setStartDate] = useState(defaultStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(defaultEnd.toISOString().split('T')[0]);

  const canView = hasPermission(user, 'reports');

  useEffect(() => {
    if (authLoading || !canView) return;
    fetchReportData();
  }, [user, authLoading]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/reports', {
        params: { startDate, endDate }
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReportData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(amount);
  };

  if (!authLoading && !canView) {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <PieChart size={48} className="empty-icon text-slate-300" />
          <h3>Access Denied</h3>
          <p className="text-muted">You do not have permission to view financial reports.</p>
        </div>
      </DashboardLayout>
    );
  }

  // Chart Configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          pointStyleWidth: 10,
          boxHeight: 10,
          padding: 24,
          font: { size: 13, family: 'Inter' },
          color: '#475569',
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        titleFont: { size: 13, family: 'Inter' },
        bodyFont: { size: 13, family: 'Inter' },
        cornerRadius: 8,
      }
    },
    scales: {
      y: { border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { callback: (val) => '৳' + val.toLocaleString() } },
      x: { border: { display: false }, grid: { display: false } }
    }
  };

  const chartData = {
    labels: data?.chartData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) || [],
    datasets: [
      {
        label: 'Inflow',
        data: data?.chartData.map(d => d.revenue) || [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      },
      {
        label: 'Outflow',
        data: data?.chartData.map(d => d.expense) || [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      },
      {
        label: 'Investment',
        data: data?.chartData.map(d => d.investment) || [],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }
    ]
  };

  return (
    <DashboardLayout>
      <div className="reports-layout animate-fade-in">
        <div className="card filter-card">
            <form onSubmit={handleFilterSubmit} className="filter-form">
                <div className="toolbar-title">
                    <h2>Financial Reports</h2>
                    <p className="text-muted">Analyze your company&apos;s financial performance</p>
                </div>
                <div className="filter-group">
                    <label htmlFor="report-start">From</label>
                    <div className="input-with-icon">
                        <Calendar size={16} />
                        <input id="report-start" type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </div>
                </div>
                <div className="filter-arrow"><ArrowRight size={16} className="text-slate-400" /></div>
                <div className="filter-group">
                    <label htmlFor="report-end">To</label>
                    <div className="input-with-icon">
                        <Calendar size={16} />
                        <input id="report-end" type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary filter-btn" disabled={loading}>
                    {loading ? <Loader2 size={16} className="spinner" /> : 'Generate Report'}
                </button>
            </form>
        </div>

        {loading && !data ? (
            <div className="loading-state py-12">
                <Loader2 size={32} className="spinner mx-auto" />
                <p className="mt-4 text-center text-slate-500">Generating report...</p>
            </div>
        ) : data ? (
            <>
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="m-icon-box bg-emerald-100 text-emerald-600"><TrendingUp size={24} /></div>
                        <div className="m-content">
                            <span className="m-label">Total Inflow</span>
                            <span className="m-value">{formatCurrency(data.metrics.totalRevenue)}</span>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="m-icon-box bg-rose-100 text-rose-600"><TrendingDown size={24} /></div>
                        <div className="m-content">
                            <span className="m-label">Total Outflow</span>
                            <span className="m-value">{formatCurrency(data.metrics.totalExpense)}</span>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="m-icon-box bg-blue-100 text-blue-600"><Scale size={24} /></div>
                        <div className="m-content">
                            <span className="m-label">Net Profit</span>
                            <span className={`m-value ${data.metrics.netProfit < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {formatCurrency(data.metrics.netProfit)}
                            </span>
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="m-icon-box bg-indigo-100 text-indigo-600"><Wallet size={24} /></div>
                        <div className="m-content">
                            <span className="m-label">Total Investments</span>
                            <span className="m-value">{formatCurrency(data.metrics.totalInvestment)}</span>
                        </div>
                    </div>
                </div>

                <div className="card chart-card">
                    <div className="chart-header">
                        <h3>Inflow, Outflow &amp; Investments</h3>
                        <p className="text-muted">Cash flow overview for the selected period</p>
                    </div>
                    <div className="chart-container">
                        {data.chartData.length > 0 ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : (
                            <div className="empty-chart">
                                <p>No transaction data available for this period.</p>
                            </div>
                        )}
                    </div>
                </div>
            </>
        ) : null}

        <style jsx>{`
            .reports-layout { max-width: var(--page-max-width); margin: 0 auto; }
            .filter-card { padding: 1rem 1.25rem; background: white; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
            .filter-form { display: flex; align-items: center; gap: 0.75rem; }
            .toolbar-title { flex: 1; min-width: 0; margin-right: 0.5rem; }
            .toolbar-title h2 { font-size: 1.25rem; color: #0f172a; margin: 0 0 0.125rem; font-weight: 800; white-space: nowrap; }
            .toolbar-title p { margin: 0; font-size: 0.8125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .filter-group { flex: 0 0 200px; display: flex; align-items: center; gap: 0.5rem; }
            .filter-group label { font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }
            .filter-group .input-with-icon { flex: 1; min-width: 0; }
            .filter-btn { flex-shrink: 0; white-space: nowrap; }
            .input-with-icon { position: relative; display: flex; align-items: center; }
            .input-with-icon :global(svg) { position: absolute; left: 12px; color: #94a3b8; pointer-events: none; }
            .input-field { width: 100%; padding: 0.625rem 0.75rem 0.625rem 2.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.875rem; font-weight: 600; color: #0f172a; transition: all 0.2s; outline: none; }
            .input-field:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
            .filter-arrow { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            
            .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
            .metric-card { display: flex; align-items: center; gap: 1.25rem; padding: 1.5rem; background: white; border-radius: 6px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
            .m-icon-box { width: 48px; height: 48px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
            .m-content { display: flex; flex-direction: column; gap: 0.25rem; }
            .m-label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
            .m-value { font-size: 1.25rem; font-weight: 900; color: #0f172a; }
            
            .chart-card { padding: 2rem; background: white; border-radius: 6px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
            .chart-header { margin-bottom: 2rem; }
            .chart-header h3 { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem; }
            .chart-container { height: 400px; width: 100%; position: relative; }
            .empty-chart { height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-weight: 600; border: 2px dashed #e2e8f0; border-radius: 6px; background: #f8fafc; }
            
            @media (max-width: 1024px) {
                .metrics-grid { grid-template-columns: repeat(2, 1fr); }
                .filter-form { flex-wrap: wrap; }
                .toolbar-title { flex: 1 1 100%; }
                .filter-group { flex: 1 1 200px; }
            }
            @media (max-width: 640px) {
                .filter-group { flex: 1 1 100%; }
                .filter-group label { width: 2.5rem; }
                .filter-arrow { display: none; }
                .filter-btn { width: 100%; justify-content: center; }
                .metrics-grid { grid-template-columns: 1fr; }
                .chart-container { height: 300px; }
            }
            
            :global(.spinner) { animation: spin 1s linear infinite; }
            @keyframes spin { 100% { transform: rotate(360deg); } }
            
            /* Utility Classes */
            .bg-emerald-100 { background-color: #d1fae5; }
            .text-emerald-600 { color: #059669; }
            .bg-rose-100 { background-color: #ffe4e6; }
            .text-rose-600 { color: #e11d48; }
            .bg-blue-100 { background-color: #dbeafe; }
            .text-blue-600 { color: #2563eb; }
            .bg-indigo-100 { background-color: #e0e7ff; }
            .text-indigo-600 { color: #4f46e5; }
            .text-slate-400 { color: #94a3b8; }
            .text-slate-500 { color: #64748b; }
            .text-muted { color: #64748b; }
            .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 0; text-align: center; }
            .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .mt-4 { margin-top: 1rem; }
            .text-center { text-align: center; }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
