import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Shield, Settings, AlertTriangle, Filter } from 'lucide-react';
import { approvalApi } from '../services/api';
import StatCard from '../components/ui/StatCard';
import { formatDualDate } from '../utils/ethCalendar';

const TYPE_LABELS: Record<string, string> = {
  rate_adjustment: 'Rate Adjustment',
  penalty_waiver: 'Penalty Waiver',
  vehicle_swap: 'Vehicle Swap',
  large_advance: 'Large Advance',
  cash_transfer: 'Cash Transfer',
  invoice_cancellation: 'Invoice Cancellation',
  settlement_override: 'Settlement Override',
  compliance_unlock: 'Compliance Unlock',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'history' | 'rules'>('pending');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [rules, setRules] = useState<any[]>([]);
  const [rejectModal, setRejectModal] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailModal, setDetailModal] = useState<any>(null);
  const [ruleModal, setRuleModal] = useState<any>(null);

  const loadRequests = () => {
    setLoading(true);
    const params: any = {};
    if (tab === 'pending') params.status = 'pending';
    else if (statusFilter && tab === 'history') params.status = statusFilter !== 'all' ? statusFilter : undefined;
    if (typeFilter) params.type = typeFilter;
    approvalApi.list(params).then(r => {
      setRequests(r.data.requests);
      setTotal(r.data.total);
    }).catch(console.error).finally(() => setLoading(false));
  };

  const loadRules = () => {
    approvalApi.rules().then(r => setRules(r.data.rules)).catch(console.error);
  };

  useEffect(() => { loadRequests(); }, [tab, statusFilter, typeFilter]);
  useEffect(() => { if (tab === 'rules') loadRules(); }, [tab]);

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this request?')) return;
    try {
      await approvalApi.approve(id);
      loadRequests();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await approvalApi.reject(rejectModal.id, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      loadRequests();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const handleSeedRules = async () => {
    try {
      await approvalApi.seedRules();
      loadRules();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const handleToggleRule = async (rule: any) => {
    try {
      await approvalApi.updateRule(rule.id, { isActive: !rule.isActive });
      loadRules();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const handleSaveRule = async () => {
    if (!ruleModal) return;
    try {
      if (ruleModal.id) {
        await approvalApi.updateRule(ruleModal.id, {
          requiredRole: ruleModal.requiredRole,
          thresholdAmount: ruleModal.thresholdAmount || null,
          description: ruleModal.description,
        });
      } else {
        await approvalApi.upsertRule(ruleModal);
      }
      setRuleModal(null);
      loadRules();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const pendingCount = tab === 'pending' ? total : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5" /> Approval Workflow
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'pending', label: 'Pending', count: pendingCount },
          { key: 'history', label: 'History' },
          { key: 'rules', label: 'Rules Config' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key as any); if (t.key === 'history') setStatusFilter('all'); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1 ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            {t.key === 'pending' && pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Pending & History tabs */}
      {(tab === 'pending' || tab === 'history') && (
        <>
          {tab === 'history' && (
            <div className="flex gap-2 items-center">
              <Filter className="w-4 h-4 text-gray-400" />
              {['all', 'approved', 'rejected', 'pending'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 text-xs rounded-lg capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s}
                </button>
              ))}
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input text-sm py-1 ml-2">
                <option value="">All Types</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}

          {loading ? <div className="text-center py-20 text-gray-400">Loading...</div> : (
            <div className="space-y-2">
              {requests.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  {tab === 'pending' ? 'No pending approval requests' : 'No approval records found'}
                </div>
              ) : requests.map((req: any) => (
                <div key={req.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-gray-400">{req.requestNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status] || ''}`}>
                          {req.status}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[req.priority] || ''}`}>
                          {req.priority}
                        </span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {TYPE_LABELS[req.type] || req.type}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-1">{req.description}</p>
                      {req.amount && <p className="text-sm text-gray-500">Amount: ETB {req.amount.toLocaleString()}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        Created: {formatDualDate(req.createdAt)}
                        {req.rejectionReason && <span className="text-red-500 ml-2">Reason: {req.rejectionReason}</span>}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setDetailModal(req)} className="btn-secondary text-xs py-1 px-2">Details</button>
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(req.id)} className="btn-primary text-xs py-1 px-2 flex items-center gap-1 bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => { setRejectModal(req); setRejectReason(''); }} className="btn-primary text-xs py-1 px-2 flex items-center gap-1 bg-red-600 hover:bg-red-700">
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Rules Config tab */}
      {tab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Configure which actions require approval and who can approve them.</p>
            <button onClick={handleSeedRules} className="btn-secondary text-sm">
              <Settings className="w-4 h-4 mr-1 inline" /> Seed Default Rules
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No rules configured. Click "Seed Default Rules" to create defaults.
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Required Role</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Threshold</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">Active</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.map((rule: any) => (
                    <tr key={rule.id} className={rule.isActive ? '' : 'opacity-50'}>
                      <td className="px-4 py-3 font-medium">{TYPE_LABELS[rule.type] || rule.type}</td>
                      <td className="px-4 py-3 text-gray-500">{rule.description}</td>
                      <td className="px-4 py-3 capitalize">{rule.requiredRole}</td>
                      <td className="px-4 py-3">{rule.thresholdAmount ? `ETB ${rule.thresholdAmount.toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleToggleRule(rule)}
                          className={`w-10 h-5 rounded-full transition-colors ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setRuleModal({ ...rule })} className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" /> Reject Request
            </h3>
            <p className="text-sm text-gray-600">{rejectModal.requestNumber} - {rejectModal.description}</p>
            <div>
              <label className="text-sm font-medium text-gray-700">Rejection Reason</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Why is this being rejected?" className="input w-full mt-1" rows={3} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleReject} className="btn-primary bg-red-600 hover:bg-red-700">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Approval Request Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Request #</span><span className="font-mono">{detailModal.requestNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Type</span><span>{TYPE_LABELS[detailModal.type] || detailModal.type}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[detailModal.status]}`}>{detailModal.status}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Priority</span><span className="capitalize">{detailModal.priority}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Entity</span><span>{detailModal.entityType} / {detailModal.entityId?.substring(0, 8)}...</span></div>
              {detailModal.amount && <div className="flex justify-between"><span className="text-gray-500">Amount</span><span>ETB {detailModal.amount.toLocaleString()}</span></div>}
              <div><span className="text-gray-500">Description</span><p className="mt-1">{detailModal.description}</p></div>
              {detailModal.currentData && (
                <div><span className="text-gray-500">Current Data</span>
                  <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32">{JSON.stringify(JSON.parse(detailModal.currentData), null, 2)}</pre>
                </div>
              )}
              {detailModal.proposedData && (
                <div><span className="text-gray-500">Proposed Data</span>
                  <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32">{JSON.stringify(JSON.parse(detailModal.proposedData), null, 2)}</pre>
                </div>
              )}
              <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{formatDualDate(detailModal.createdAt)}</span></div>
              {detailModal.approvedAt && <div className="flex justify-between"><span className="text-gray-500">Approved</span><span>{formatDualDate(detailModal.approvedAt)}</span></div>}
              {detailModal.rejectedAt && <div className="flex justify-between"><span className="text-gray-500">Rejected</span><span>{formatDualDate(detailModal.rejectedAt)}</span></div>}
              {detailModal.rejectionReason && <div><span className="text-gray-500">Rejection Reason</span><p className="mt-1 text-red-600">{detailModal.rejectionReason}</p></div>}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setDetailModal(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {ruleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRuleModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Edit Approval Rule</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <input value={TYPE_LABELS[ruleModal.type] || ruleModal.type} disabled className="input w-full mt-1 bg-gray-50" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <input value={ruleModal.description || ''} onChange={e => setRuleModal({ ...ruleModal, description: e.target.value })} className="input w-full mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Required Role</label>
                <select value={ruleModal.requiredRole} onChange={e => setRuleModal({ ...ruleModal, requiredRole: e.target.value })} className="input w-full mt-1">
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="technical_manager">Technical Manager</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Threshold Amount (ETB)</label>
                <input type="number" value={ruleModal.thresholdAmount || ''} onChange={e => setRuleModal({ ...ruleModal, thresholdAmount: e.target.value })} placeholder="Leave empty for no threshold" className="input w-full mt-1" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRuleModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveRule} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
