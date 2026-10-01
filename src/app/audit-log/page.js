'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { hasPermission } from '@/lib/permissions';
import CustomSelect from '@/components/UI/CustomSelect';
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

  const canView = hasPermission(user, 'audit_log');

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

  // Icon + tone per entity type (tones map to CSS classes below)
  const ENTITY_META = {
    transaction: { icon: Banknote, tone: 'green' },
    loan: { icon: Banknote, tone: 'amber' },
    repayment: { icon: Banknote, tone: 'blue' },
    account: { icon: Building, tone: 'indigo' },
    employee: { icon: Users, tone: 'purple' },
    user: { icon: ShieldCheck, tone: 'rose' },
    company: { icon: Building, tone: 'slate' },
    settings: { icon: Settings, tone: 'slate' },
  };
  const getEntityMeta = (entity) => ENTITY_META[entity] || { icon: Activity, tone: 'slate' };

  const formatTime = (value) => {
    const d = new Date(value);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
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
        <div className="card toolbar">
            <div className="toolbar-title">
                <span className="toolbar-icon"><ClipboardList size={20} /></span>
                <div>
                    <h2>System Audit Log</h2>
                    <p>Every significant action and security event, newest first</p>
                </div>
            </div>
            <div className="filters">
                <div className="filter-box">
                    <CustomSelect
                        size="sm"
                        icon={<Filter size={16} />}
                        ariaLabel="Filter by entity"
                        value={entityFilter}
                        onChange={setEntityFilter}
                        options={[
                            { value: '', label: 'All Entities' },
                            { value: 'transaction', label: 'Transactions' },
                            { value: 'loan', label: 'Loans' },
                            { value: 'repayment', label: 'Repayments' },
                            { value: 'account', label: 'Accounts' },
                            { value: 'employee', label: 'Employees' },
                            { value: 'user', label: 'Users' },
                            { value: 'company', label: 'Company' },
                        ]}
                    />
                </div>
                <div className="filter-box">
                    <CustomSelect
                        size="sm"
                        icon={<Activity size={16} />}
                        ariaLabel="Filter by action"
                        value={actionFilter}
                        onChange={setActionFilter}
                        options={[
                            { value: '', label: 'All Actions' },
                            { value: 'created', label: 'Created' },
                            { value: 'updated', label: 'Updated' },
                            { value: 'deleted', label: 'Deleted' },
                            { value: 'approved', label: 'Approved' },
                            { value: 'rejected', label: 'Rejected' },
                            { value: 'access_changed', label: 'Access Changed' },
                            { value: 'status_changed', label: 'Status Changed' },
                        ]}
                    />
                </div>
            </div>
        </div>

        <div className="card list-card">
            {logs.length > 0 ? (
                <ul className="log-list">
                    {logs.map((log) => {
                        const meta = getEntityMeta(log.entity);
                        const EntityIcon = meta.icon;
                        const when = formatTime(log.createdAt);
                        return (
                            <li key={log._id} className="log-item">
                                <span className={`log-icon tone-${meta.tone}`}><EntityIcon size={16} /></span>
                                <div className="log-main">
                                    <div className="log-line">
                                        <span className="log-action">{formatAction(log.action)}</span>
                                        {log.entity && <span className={`log-entity tone-${meta.tone}`}>{log.entity}</span>}
                                    </div>
                                    <p className="log-label">{log.entityLabel || 'No details provided'}</p>
                                    <div className="log-meta">
                                        <span><UserIcon size={13} /> {log.actorName || 'System'}</span>
                                        <span className="log-meta-time"><Clock size={13} /> {when.date} · {when.time}</span>
                                    </div>
                                </div>
                                <time className="log-time" dateTime={log.createdAt}>
                                    <span>{when.date}</span>
                                    <span>{when.time}</span>
                                </time>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                !loading && (
                    <div className="empty-state">
                        <span className="empty-icon"><ClipboardList size={24} /></span>
                        <h3>No logs found</h3>
                        <p>No activity matches your current filters.</p>
                    </div>
                )
            )}

            {loading && (
                <div className="loading-state">
                    <Loader2 size={24} className="spinner" />
                    <p>Loading audit trail...</p>
                </div>
            )}

            {hasMore && !loading && (
                <div className="load-more-container">
                    <button className="btn btn-secondary" onClick={() => fetchLogs(false)}>
                        Load older activity
                    </button>
                </div>
            )}
        </div>

        <style jsx>{`
            .audit-layout { max-width: var(--page-max-width); margin: 0 auto; }

            .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; padding: 1rem 1.25rem; margin-bottom: 1.25rem; }
            .toolbar-title { display: flex; align-items: center; gap: 0.875rem; min-width: 0; }
            .toolbar-icon { flex-shrink: 0; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 8px; background: #f1f5f9; color: #0f172a; }
            .toolbar-title h2 { margin: 0 0 0.125rem; font-size: 1.125rem; font-weight: 800; color: #0f172a; }
            .toolbar-title p { margin: 0; font-size: 0.8125rem; color: #64748b; }
            .filters { display: flex; gap: 0.625rem; flex-shrink: 0; }
            .filter-box { width: 200px; }

            .list-card { padding: 0.5rem 0; }
            .log-list { list-style: none; margin: 0; padding: 0; }
            .log-item { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem 1.5rem; }
            .log-item + .log-item { border-top: 1px solid #f1f5f9; }
            .log-item:hover { background: #fafbfc; }
            .log-icon { flex-shrink: 0; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 8px; }
            .log-main { flex: 1; min-width: 0; }
            .log-line { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
            .log-action { font-size: 0.875rem; font-weight: 700; color: #0f172a; }
            .log-entity { padding: 0.0625rem 0.4375rem; border-radius: 4px; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
            .log-label { margin: 0.25rem 0 0; font-size: 0.8125rem; line-height: 1.5; color: #475569; word-break: break-word; }
            .log-meta { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; margin-top: 0.375rem; font-size: 0.75rem; color: #94a3b8; }
            .log-meta span { display: inline-flex; align-items: center; gap: 0.3125rem; }
            .log-meta-time { display: none !important; }
            .log-time { flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 0.125rem; font-size: 0.75rem; color: #64748b; font-variant-numeric: tabular-nums; white-space: nowrap; }
            .log-time span:first-child { font-weight: 600; color: #334155; }

            .tone-green { background: #ecfdf5; color: #047857; }
            .tone-amber { background: #fffbeb; color: #b45309; }
            .tone-blue { background: #eff6ff; color: #1d4ed8; }
            .tone-indigo { background: #eef2ff; color: #4338ca; }
            .tone-purple { background: #faf5ff; color: #7e22ce; }
            .tone-rose { background: #fff1f2; color: #be123c; }
            .tone-slate { background: #f1f5f9; color: #475569; }

            .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 3.5rem 1.5rem; text-align: center; }
            .empty-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 8px; background: #f1f5f9; color: #94a3b8; }
            .empty-state h3 { margin: 0.25rem 0 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
            .empty-state p { margin: 0; font-size: 0.8125rem; color: #64748b; }
            .loading-state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2.5rem 0; color: #94a3b8; font-size: 0.8125rem; }
            .loading-state p { margin: 0; }
            .load-more-container { display: flex; justify-content: center; padding: 1rem 1.5rem 0.75rem; border-top: 1px solid #f1f5f9; }

            :global(.spinner) { animation: spin 1s linear infinite; }
            @keyframes spin { 100% { transform: rotate(360deg); } }

            @media (max-width: 900px) {
                .toolbar { flex-direction: column; align-items: stretch; }
                .filters { display: grid; grid-template-columns: 1fr 1fr; }
                .filter-box { width: auto; min-width: 0; }
            }
            @media (max-width: 640px) {
                .toolbar { padding: 1rem; }
                .log-item { padding: 0.875rem 1rem; gap: 0.75rem; }
                .log-time { display: none; }
                .log-meta-time { display: inline-flex !important; }
            }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
