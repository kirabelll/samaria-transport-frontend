import { useEffect, useState } from 'react';
import { FileText, Filter } from 'lucide-react';
import { auditApi } from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDualDate } from '../utils/ethCalendar';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ entityType: '', action: '' });

  const load = () => {
    setLoading(true);
    const params: any = {};
    if (filters.entityType) params.entityType = filters.entityType;
    if (filters.action) params.action = filters.action;
    auditApi.list(params).then(r => setLogs(r.data.logs || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { auditApi.summary().then(r => setSummary(r.data)).catch(console.error); }, []);
  useEffect(() => { load(); }, [filters]);

  const entityTypes = summary?.byEntity ? Object.keys(summary.byEntity) : [];
  const actions = summary?.byAction ? Object.keys(summary.byAction) : [];

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5" />Audit Trail</h2>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center"><p className="text-xs text-gray-500">Today</p><p className="text-2xl font-bold text-blue-600">{summary.todayCount}</p></div>
          <div className="card text-center"><p className="text-xs text-gray-500">This Week</p><p className="text-2xl font-bold text-blue-600">{summary.weekCount}</p></div>
          <div className="card text-center"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold text-blue-600">{summary.totalCount}</p></div>
        </div>
      )}

      <div className="flex gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select className="select w-40" value={filters.entityType} onChange={e => setFilters(f => ({...f, entityType: e.target.value}))}>
          <option value="">All entities</option>
          {entityTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="select w-40" value={filters.action} onChange={e => setFilters(f => ({...f, action: e.target.value}))}>
          <option value="">All actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr><th className="th">Time</th><th className="th">User</th><th className="th">Action</th><th className="th">Entity</th><th className="th">Details</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            : logs.length === 0 ? <tr><td colSpan={5} className="td text-center py-10 text-gray-400">No audit logs</td></tr>
            : logs.map(log => (
              <tr key={log.id} className="tr">
                <td className="td text-sm text-gray-500">{formatDualDate(log.createdAt)}</td>
                <td className="td">{log.user?.name || 'System'}<br/><span className="text-xs text-gray-400">{log.user?.role}</span></td>
                <td className="td"><StatusBadge status={log.action} /></td>
                <td className="td capitalize">{log.entityType?.replace(/_/g, ' ')}<br/><span className="text-xs text-gray-400 font-mono">{log.entityId?.slice(0, 8)}</span></td>
                <td className="td text-xs text-gray-500 max-w-xs truncate">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
