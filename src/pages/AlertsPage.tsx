import { useEffect, useState } from 'react';
import { ShieldAlert, Bell, CheckCircle, AlertTriangle, XCircle, Info, Search, Settings, Sprout, Eye, Check } from 'lucide-react';
import { alertApi } from '../services/api';
import Modal from '../components/ui/Modal';
import { formatDualDate } from '../utils/ethCalendar';

const fmt = (n: number) => `ETB ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SEVERITY_STYLES: any = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle, badge: 'bg-red-500 text-white' },
  urgent: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle, badge: 'bg-orange-500 text-white' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: AlertTriangle, badge: 'bg-yellow-500 text-white' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Info, badge: 'bg-blue-500 text-white' },
};

const TYPE_LABELS: any = {
  delayed_loading: 'Delayed Loading', delayed_delivery: 'Delayed Delivery', missing_pod: 'Missing POD',
  qty_mismatch: 'Qty Mismatch', repeated_breakdown: 'Repeated Breakdown', unusual_expense: 'Unusual Expense',
  expired_docs: 'Expired Docs', cash_variance: 'Cash Variance', overdue_invoice: 'Overdue Invoice',
  unresolved_accountability: 'Unresolved Accountability',
};

type Tab = 'dashboard' | 'active' | 'resolved' | 'rules';

export default function AlertsPage() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'active', label: 'Active Alerts' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'rules', label: 'Alert Rules' },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5" /> Alerts & Exceptions
      </h2>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <AlertDashboard />}
      {tab === 'active' && <AlertList resolved={false} />}
      {tab === 'resolved' && <AlertList resolved={true} />}
      {tab === 'rules' && <AlertRules />}
    </div>
  );
}

function AlertDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      alertApi.summary(),
      alertApi.list({ isResolved: 'false', limit: '10' }),
    ]).then(([s, a]) => {
      setSummary(s.data);
      setRecent(a.data.alerts || []);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const r = await alertApi.scan();
      setScanResult(r.data);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;

  return (
    <>
      {/* Severity summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['critical', 'urgent', 'warning', 'info'].map(sev => {
          const style = SEVERITY_STYLES[sev];
          const Icon = style.icon;
          const count = summary?.[sev] || 0;
          return (
            <div key={sev} className={`card border ${style.border} ${style.bg}`}>
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${style.text}`} />
                <span className={`text-sm font-medium capitalize ${style.text}`}>{sev}</span>
              </div>
              <div className={`text-2xl font-bold mt-1 ${style.text}`}>{count}</div>
            </div>
          );
        })}
        <div className="card border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-500">Total Unresolved</span>
          </div>
          <div className="text-2xl font-bold mt-1 text-gray-900">{summary?.unresolved || 0}</div>
        </div>
      </div>

      {/* Scan button & results */}
      <div className="flex items-center gap-3">
        <button onClick={runScan} disabled={scanning} className="btn-primary">
          <Search className="w-4 h-4" /> {scanning ? 'Scanning...' : 'Run Alert Scan'}
        </button>
        {scanResult && (
          <div className="text-sm text-gray-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded">
            Scanned {scanResult.scanned?.length || 0} rules, created {scanResult.alertsCreated || 0} new alerts
          </div>
        )}
      </div>

      {/* Recent alerts */}
      <div>
        <h3 className="section-title mb-3">Recent Active Alerts</h3>
        {recent.length === 0 ? (
          <div className="card text-center py-8 text-gray-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
            No active alerts
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(a => <AlertCard key={a.id} alert={a} onResolve={load} />)}
          </div>
        )}
      </div>
    </>
  );
}

function AlertCard({ alert: a, onResolve }: { alert: any; onResolve: () => void }) {
  const [resolving, setResolving] = useState(false);
  const style = SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.info;
  const Icon = style.icon;

  const resolve = async () => {
    setResolving(true);
    try {
      await alertApi.resolve(a.id, 'Resolved from dashboard');
      onResolve();
    } catch { }
    setResolving(false);
  };

  return (
    <div className={`card border ${style.border} ${style.bg} flex items-start gap-3`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.text}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>{a.severity}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{TYPE_LABELS[a.type] || a.type}</span>
          <span className="text-xs text-gray-400">{formatDualDate(a.createdAt)}</span>
        </div>
        <p className="text-sm font-medium text-gray-900">{a.title}</p>
        <p className="text-xs text-gray-600 mt-0.5">{a.message}</p>
      </div>
      {!a.isResolved && (
        <button onClick={resolve} disabled={resolving} className="btn-ghost text-sm flex-shrink-0 text-green-600 hover:text-green-700">
          <Check className="w-4 h-4" /> Resolve
        </button>
      )}
    </div>
  );
}

function AlertList({ resolved }: { resolved: boolean }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [resolveModal, setResolveModal] = useState<any>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    const params: any = { isResolved: String(resolved), page: String(page), limit: '30' };
    if (filterType) params.type = filterType;
    if (filterSeverity) params.severity = filterSeverity;
    alertApi.list(params)
      .then(r => { setAlerts(r.data.alerts || []); setTotal(r.data.total || 0); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [resolved, filterType, filterSeverity, page]);

  const resolveOne = async () => {
    if (!resolveModal) return;
    try {
      await alertApi.resolve(resolveModal.id, resolveNote);
      setResolveModal(null);
      setResolveNote('');
      load();
    } catch { }
  };

  const bulkResolve = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Resolve ${selected.length} alerts?`)) return;
    try {
      await alertApi.bulkResolve(selected, 'Bulk resolved');
      setSelected([]);
      load();
    } catch { }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const allTypes = [...new Set(alerts.map(a => a.type))];

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <select className="select w-44" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
          </select>
          <select className="select w-36" value={filterSeverity} onChange={e => { setFilterSeverity(e.target.value); setPage(1); }}>
            <option value="">All Severity</option>
            {['critical', 'urgent', 'warning', 'info'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        {!resolved && selected.length > 0 && (
          <button onClick={bulkResolve} className="btn-primary">
            <Check className="w-4 h-4" /> Resolve {selected.length} Selected
          </button>
        )}
        <span className="text-sm text-gray-500">{total} alerts</span>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {!resolved && <th className="th w-8"><input type="checkbox" onChange={e => setSelected(e.target.checked ? alerts.map(a => a.id) : [])} checked={selected.length === alerts.length && alerts.length > 0} /></th>}
                <th className="th">Severity</th>
                <th className="th">Type</th>
                <th className="th">Title</th>
                <th className="th">Created</th>
                {resolved && <th className="th">Resolved</th>}
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr><td colSpan={resolved ? 6 : 6} className="td text-center py-10 text-gray-400">No alerts</td></tr>
              ) : alerts.map(a => {
                const style = SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.info;
                return (
                  <tr key={a.id} className="tr">
                    {!resolved && <td className="td"><input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)} /></td>}
                    <td className="td">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>{a.severity}</span>
                    </td>
                    <td className="td text-sm">{TYPE_LABELS[a.type] || a.type}</td>
                    <td className="td">
                      <div className="text-sm font-medium">{a.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{a.message}</div>
                    </td>
                    <td className="td text-sm text-gray-500">{formatDualDate(a.createdAt)}</td>
                    {resolved && <td className="td text-sm text-gray-500">{a.resolvedAt ? formatDualDate(a.resolvedAt) : '-'}</td>}
                    <td className="td">
                      <div className="flex gap-1">
                        <button onClick={() => setDetailModal(a)} className="btn-ghost text-sm"><Eye className="w-3.5 h-3.5" /></button>
                        {!resolved && (
                          <button onClick={() => { setResolveModal(a); setResolveNote(''); }} className="btn-ghost text-sm text-green-600">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm">Prev</button>
          <span className="text-sm text-gray-500 py-1.5">Page {page} of {Math.ceil(total / 30)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 30 >= total} className="btn-secondary text-sm">Next</button>
        </div>
      )}

      {/* Detail modal */}
      {detailModal && (
        <Modal title="Alert Detail" onClose={() => setDetailModal(null)}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Type:</span> <span className="font-medium">{TYPE_LABELS[detailModal.type] || detailModal.type}</span></div>
              <div><span className="text-gray-500">Severity:</span> <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${(SEVERITY_STYLES[detailModal.severity] || SEVERITY_STYLES.info).badge}`}>{detailModal.severity}</span></div>
              <div><span className="text-gray-500">Entity:</span> {detailModal.entityType} / {detailModal.entityId?.slice(0, 8) || '-'}</div>
              <div><span className="text-gray-500">Created:</span> {formatDualDate(detailModal.createdAt)}</div>
            </div>
            <div><span className="text-gray-500">Title:</span> <span className="font-medium">{detailModal.title}</span></div>
            <div><span className="text-gray-500">Message:</span> {detailModal.message}</div>
            {detailModal.isResolved && (
              <div className="bg-green-50 p-2 rounded border border-green-200">
                <span className="text-green-700">Resolved at {formatDualDate(detailModal.resolvedAt)}</span>
                {detailModal.resolvedNote && <p className="text-gray-600 mt-1">{detailModal.resolvedNote}</p>}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Resolve modal */}
      {resolveModal && (
        <Modal title="Resolve Alert" onClose={() => setResolveModal(null)}>
          <div className="space-y-3">
            <p className="text-sm font-medium">{resolveModal.title}</p>
            <p className="text-sm text-gray-500">{resolveModal.message}</p>
            <div>
              <label className="label">Resolution Note (optional)</label>
              <textarea className="input" rows={3} value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="Describe how this was resolved..." />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setResolveModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={resolveOne} className="btn-primary"><Check className="w-4 h-4" /> Resolve</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function AlertRules() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<any>(null);
  const [form, setForm] = useState({ thresholdValue: '', severity: 'warning', isActive: true });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    alertApi.rules()
      .then(r => setRules(r.data.rules || []))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const seed = async () => {
    if (!confirm('Seed default alert rules?')) return;
    try {
      const r = await alertApi.seedRules();
      alert(`Seeded ${r.data.count} rules`);
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Seed failed'); }
  };

  const openEdit = (rule: any) => {
    setForm({ thresholdValue: rule.thresholdValue?.toString() || '', severity: rule.severity, isActive: rule.isActive });
    setEditModal(rule);
  };

  const saveRule = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await alertApi.updateRule(editModal.id, {
        thresholdValue: form.thresholdValue ? Number(form.thresholdValue) : null,
        severity: form.severity,
        isActive: form.isActive,
      });
      setEditModal(null);
      load();
    } catch { }
    setSaving(false);
  };

  const toggleActive = async (rule: any) => {
    try {
      await alertApi.updateRule(rule.id, { isActive: !rule.isActive });
      load();
    } catch { }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h3 className="section-title">Alert Rules</h3>
          <p className="text-sm text-gray-500 mt-1">Configure thresholds and severity for automated alert scans.</p>
        </div>
        <button onClick={seed} className="btn-secondary"><Sprout className="w-4 h-4" /> Seed Defaults</button>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Type</th>
                <th className="th">Description</th>
                <th className="th">Threshold</th>
                <th className="th">Severity</th>
                <th className="th text-center">Active</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan={6} className="td text-center py-10 text-gray-400">No rules. Use "Seed Defaults" to create.</td></tr>
              ) : rules.map(r => {
                const style = SEVERITY_STYLES[r.severity] || SEVERITY_STYLES.info;
                return (
                  <tr key={r.id} className="tr">
                    <td className="td font-medium text-sm">{TYPE_LABELS[r.type] || r.type}</td>
                    <td className="td text-sm text-gray-500">{r.description}</td>
                    <td className="td text-sm font-mono">{r.thresholdValue != null ? `${r.thresholdValue} ${r.thresholdUnit || ''}` : '-'}</td>
                    <td className="td">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>{r.severity}</span>
                    </td>
                    <td className="td text-center">
                      <button onClick={() => toggleActive(r)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${r.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${r.isActive ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="td">
                      <button onClick={() => openEdit(r)} className="btn-ghost text-sm"><Settings className="w-3.5 h-3.5" /> Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editModal && (
        <Modal title={`Edit Rule: ${TYPE_LABELS[editModal.type] || editModal.type}`} onClose={() => setEditModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="label">Threshold ({editModal.thresholdUnit || 'value'})</label>
              <input type="number" step="any" className="input" value={form.thresholdValue} onChange={e => setForm({ ...form, thresholdValue: e.target.value })} />
            </div>
            <div>
              <label className="label">Severity</label>
              <select className="select" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                {['critical', 'urgent', 'warning', 'info'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label className="text-sm text-gray-700">Active</label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={saveRule} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
