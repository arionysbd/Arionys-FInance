'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { ClipboardList, Search, Filter, Loader2, ArrowRight, Clock, User as UserIcon, Settings, Banknote, Users, Building, ShieldCheck, Activity } from 'lucide-react';
import axios from 'axios';

export default function AuditLogPage() {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const canView = ['owner', 'admin'].includes(user?.role?.toLowerCase());

  useEffect(() => {
    if (authLoading || !canView) return;
    fetchLogs(true);
  }, [user, authLoading, actionFilter, entityFilter]);

  const fetchLogs = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      const res = await axios.get('/api/audit-logs', {
        params: {
          page: currentPage,
          limit: 30,
          action: actionFilter,
          entity: entityFilter
        }
      });
      
      if (res.data.success) {
        if (reset) {
          setLogs(res.data.data);
        } else {
          setLogs(prev => [...prev, ...res.data.data]);
        }
        setHasMore(res.data.hasMore);
        setPage(currentPage + 1);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAction = (action) => {
    if (!action) return 'Unknown Action';
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getEntityIcon = (entity) => {
    switch (entity) {
      case 'transaction': return <Banknote size={16} className="text-emerald-500" />;
      case 'loan': return <Banknote size={16} className="text-amber-500" />;
      case 'repayment': return <Banknote size={16} className="text-blue-500" />;
      case 'account': return <Building size={16} className="text-indigo-500" />;
      case 'employee': return <Users size={16} className="text-purple-500" />;
      case 'user': return <ShieldCheck size={16} className="text-rose-500" />;
      case 'company': return <Building size={16} className="text-slate-500" />;
      case 'settings': return <Settings size={16} className="text-slate-500" />;
      default: return <Activity size={16} className="text-slate-400" />;
    }
  };

  if (!authLoading && !canView) {
    return (
      <DashboardLayout>
        <div className="empty-state">
          <ShieldCheck size={48} className="empty-icon text-slate-300" />
          <h3>Access Denied</h3>
          <p className="text-muted">You do not have permission to view the audit log.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in audit-layout">
        <div className="page-header">
            <div>
                <h2>System Audit Log</h2>
                <p className="text-muted">Track all significant system actions and security events</p>
            </div>
            <div className="header-icon-box">
                <ClipboardList size={24} />
            </div>
        </div>

        <div className="card controls-card">
            <div className="filter-box">
                <Filter size={18} className="text-muted-foreground" />
                <select className="input-field" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
                    <option value="">All Entities</option>
                    <option value="transaction">Transactions</option>
                    <option value="loan">Loans</option>
                    <option value="repayment">Repayments</option>
                    <option value="account">Accounts</option>
                    <option value="employee">Employees</option>
                    <option value="user">Users</option>
                    <option value="company">Company</option>
                </select>
            </div>
            <div className="filter-box">
                <Activity size={18} className="text-muted-foreground" />
                <select className="input-field" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                    <option value="">All Actions</option>
                    <option value="created">Created</option>
                    <option value="updated">Updated</option>
                    <option value="deleted">Deleted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="role_changed">Role Changed</option>
                    <option value="status_changed">Status Changed</option>
                </select>
            </div>
        </div>

        <div className="card list-card">
            {logs.length > 0 ? (
                <div className="log-timeline">
                    {logs.map((log) => (
                        <div key={log._id} className="log-item">
                            <div className="log-icon-wrapper">
                                {getEntityIcon(log.entity)}
                            </div>
                            <div className="log-content">
                                <div className="log-header">
                                    <span className="log-actor"><UserIcon size={14} className="inline-icon" /> {log.actorName || 'System'}</span>
                                    <span className="log-time"><Clock size={14} className="inline-icon" /> {new Date(log.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="log-body">
                                    <span className="log-action">{formatAction(log.action)}</span>
                                    <span className="log-entity">[{log.entity?.toUpperCase()}]</span>
                                    <span className="log-label">{log.entityLabel || 'No details provided'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                !loading && (
                    <div className="empty-state py-12">
                        <ClipboardList size={48} className="empty-icon text-slate-300" />
                        <h3>No logs found</h3>
                        <p className="text-muted">No activities match your current filters.</p>
                    </div>
                )
            )}

            {loading && (
                <div className="loading-state py-8">
                    <Loader2 size={32} className="spinner mx-auto" />
                    <p className="mt-4 text-center text-slate-500">Loading audit trail...</p>
                </div>
            )}

            {hasMore && !loading && (
                <div className="load-more-container">
                    <button className="btn btn-outline" onClick={() => fetchLogs(false)}>
                        Load Older Logs
                    </button>
                </div>
            )}
        </div>

        <style jsx>{`
            .audit-layout { max-width: 1000px; margin: 0 auto; }
            .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
            .page-header h2 { font-size: 1.5rem; color: #0f172a; margin-bottom: 0.25rem; font-weight: 800; }
            .header-icon-box { background: #f8fafc; padding: 1rem; border-radius: 12px; border: 1px solid #e2e8f0; color: #0f172a; }
            
            .controls-card { padding: 1.25rem; margin-bottom: 1.5rem; display: flex; gap: 1rem; align-items: center; background: white; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
            .filter-box { display: flex; align-items: center; gap: 0.75rem; flex: 1; }
            .filter-box .input-field { width: 100%; padding: 0.625rem 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #0f172a; font-size: 0.875rem; font-weight: 600; outline: none; transition: all 0.2s; }
            .filter-box .input-field:focus { border-color: #64748b; background: white; }
            
            .list-card { padding: 2rem; background: white; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
            
            .log-timeline { display: flex; flex-direction: column; gap: 1.5rem; }
            .log-item { display: flex; gap: 1.25rem; align-items: flex-start; }
            
            .log-icon-wrapper { 
                width: 36px; height: 36px; border-radius: 50%; background: #f8fafc; border: 1px solid #e2e8f0; 
                display: flex; align-items: center; justify-content: center; flex-shrink: 0;
            }
            
            .log-content { flex: 1; padding-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9; }
            .log-item:last-child .log-content { border-bottom: none; padding-bottom: 0; }
            
            .log-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
            .log-actor { font-size: 0.8125rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.375rem; }
            .log-time { font-size: 0.75rem; color: #94a3b8; display: flex; align-items: center; gap: 0.375rem; font-weight: 600; }
            
            .log-body { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
            .log-action { font-size: 0.9375rem; font-weight: 800; color: #0f172a; }
            .log-entity { font-size: 0.7rem; font-weight: 900; color: #64748b; letter-spacing: 0.05em; background: #f1f5f9; padding: 0.125rem 0.375rem; border-radius: 4px; }
            .log-label { font-size: 0.9rem; color: #475569; }
            
            .inline-icon { color: #94a3b8; }
            
            .load-more-container { text-align: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #f1f5f9; }
            
            @media (max-width: 640px) {
                .controls-card { flex-direction: column; align-items: stretch; }
                .log-header { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
                .list-card { padding: 1.25rem; }
            }
            
            :global(.spinner) { animation: spin 1s linear infinite; }
            @keyframes spin { 100% { transform: rotate(360deg); } }
            .text-muted { color: #64748b; }
            .text-muted-foreground { color: #94a3b8; }
            .text-emerald-500 { color: #10b981; }
            .text-amber-500 { color: #f59e0b; }
            .text-blue-500 { color: #3b82f6; }
            .text-indigo-500 { color: #6366f1; }
            .text-purple-500 { color: #a855f7; }
            .text-rose-500 { color: #f43f5e; }
            .text-slate-500 { color: #64748b; }
            .text-slate-400 { color: #94a3b8; }
            .text-slate-300 { color: #cbd5e1; }
            .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
            .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .mt-4 { margin-top: 1rem; }
            .text-center { text-align: center; }
            .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
