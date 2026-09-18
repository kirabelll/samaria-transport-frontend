import { useEffect, useState } from 'react';
import { Plus, Send, CheckCircle, XCircle, DollarSign, Edit, Trash2, Eye, Search, Sparkles, Check, RotateCcw, RefreshCw } from 'lucide-react';
import api, { vehicleApi, paymentRequestApi } from '../services/api';
import { formatDualDate } from '../utils/ethCalendar';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import DateInput from '../components/ui/DateInput';

const DEPARTMENTS = ['fleet', 'workshop', 'store', 'office', 'admin', 'hr'];
const PAYMENT_TYPES = ['advance', 'fuel', 'garage', 'spare_part', 'salary', 'rental', 'po_payment', 'settlement', 'other'];
const REF_TYPES = ['trip', 'work_order', 'po', 'payroll', 'settlement'];
const STATUSES = ['all', 'draft', 'submitted', 'approved', 'rejected', 'paid'];
const PAY_METHODS = ['cash', 'bank_transfer', 'mobile_banking'];
// Payment types that should show the vehicle dropdown
const VEHICLE_LINKED = ['fuel', 'garage', 'spare_part', 'rental'];

const emptyForm = {
  department: 'fleet',
  paymentType: 'advance',
  payee: '',
  amount: '',
  description: '',
  referenceType: 'trip',
  referenceId: '',
  dueDate: '',
  payeeBank: '',
  payeeAccountHolder: '',
  payeeAccountNumber: '',
  paymentMethod: 'cash',
  vehicleId: '',
};

export default function PaymentRequestsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false); // show review screen before submit
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [detailItem, setDetailItem] = useState<any>(null);

  // Dynamic source data selection states
  const [sourceItems, setSourceItems] = useState<any[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(true);

  const load = () => {
    setLoading(true);
    const params: any = {};
    if (filter !== 'all') params.status = filter;
    Promise.all([
      paymentRequestApi.list(params),
      paymentRequestApi.stats(),
    ])
      .then(([listRes, statsRes]) => {
        setItems(listRes.data.requests || listRes.data.paymentRequests || []);
        setStats(statsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    vehicleApi.list({ status: 'active' })
      .then(r => setVehicles(r.data.vehicles || []))
      .catch(() => setVehicles([]));
  }, []);

  const fetchSourceData = (type: string, q = '') => {
    setSourceLoading(true);
    paymentRequestApi.sourceData({ type, search: q })
      .then(res => {
        setSourceItems(res.data.items || []);
      })
      .catch(() => {
        setSourceItems([]);
      })
      .finally(() => setSourceLoading(false));
  };

  useEffect(() => {
    if (modal && !reviewing) {
      fetchSourceData(form.paymentType, sourceSearch);
    }
  }, [modal, form.paymentType, sourceSearch]);

  const handlePaymentTypeChange = (newType: string) => {
    setSelectedSourceId(null);
    let defaultDept = form.department;
    let defaultRefType = form.referenceType;
    if (newType === 'advance') { defaultDept = 'fleet'; defaultRefType = 'trip'; }
    else if (newType === 'fuel') { defaultDept = 'fleet'; defaultRefType = 'trip'; }
    else if (newType === 'garage') { defaultDept = 'workshop'; defaultRefType = 'work_order'; }
    else if (newType === 'spare_part') { defaultDept = 'store'; defaultRefType = 'po'; }
    else if (newType === 'salary') { defaultDept = 'hr'; defaultRefType = 'payroll'; }
    else if (newType === 'rental') { defaultDept = 'fleet'; defaultRefType = 'trip'; }
    else if (newType === 'po_payment') { defaultDept = 'store'; defaultRefType = 'po'; }
    else if (newType === 'settlement') { defaultDept = 'admin'; defaultRefType = 'settlement'; }

    setForm((f: any) => ({
      ...f,
      paymentType: newType,
      department: defaultDept,
      referenceType: defaultRefType,
    }));
  };

  const handleSelectSourceItem = (item: any) => {
    setSelectedSourceId(item.id);
    setForm((f: any) => ({
      ...f,
      department: item.department || f.department,
      payee: item.payee || f.payee,
      amount: item.amount != null ? String(item.amount) : f.amount,
      description: item.description || f.description,
      referenceType: item.referenceType || f.referenceType || 'trip',
      referenceId: item.referenceId || f.referenceId,
      vehicleId: item.vehicleId || (VEHICLE_LINKED.includes(form.paymentType) ? f.vehicleId : ''),
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : f.dueDate,
      payeeBank: item.payeeBank || f.payeeBank,
      payeeAccountHolder: item.payeeAccountHolder || f.payeeAccountHolder,
      payeeAccountNumber: item.payeeAccountNumber || f.payeeAccountNumber,
      paymentMethod: item.paymentMethod || f.paymentMethod || 'cash',
    }));
  };

  const handleClearSelection = () => {
    setSelectedSourceId(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setSelectedSourceId(null);
    setSourceSearch('');
    setShowSourcePicker(true);
    setReviewing(false);
    setError('');
    setModal(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setSelectedSourceId(null);
    setSourceSearch('');
    setShowSourcePicker(false);
    setForm({
      department: item.department || 'fleet',
      paymentType: item.paymentType || 'advance',
      payee: item.payee || '',
      amount: String(item.amount ?? ''),
      description: item.description || '',
      referenceType: item.referenceType || '',
      referenceId: item.referenceId || '',
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : '',
      payeeBank: item.payeeBank || '',
      payeeAccountHolder: item.payeeAccountHolder || '',
      payeeAccountNumber: item.payeeAccountNumber || '',
      paymentMethod: item.paymentMethod || 'cash',
      vehicleId: item.vehicleId || '',
    });
    setReviewing(false);
    setError('');
    setModal(true);
  };

  const saveDraft = async (ev?: React.FormEvent) => {
    if (ev) ev.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        referenceType: form.referenceType || undefined,
        referenceId: form.referenceId || undefined,
        dueDate: form.dueDate || undefined,
        vehicleId: form.vehicleId || undefined,
      };
      if (editingId) {
        await api.put(`/payment-requests/${editingId}`, payload);
      } else {
        await api.post('/payment-requests', payload);
      }
      setModal(false);
      setReviewing(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const proceedToReview = () => {
    if (!form.payee || !form.amount || !form.description) {
      setError('Payee, Amount, and Description are required');
      return;
    }
    if (!form.referenceType || !form.referenceId) {
      setError('Reference Type and Reference ID are required');
      return;
    }
    setError('');
    setReviewing(true);
  };

  const submitRequest = async (id: string) => {
    if (!confirm('Submit this draft for approval? You will not be able to edit after submission.')) return;
    try { await api.put(`/payment-requests/${id}/submit`); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const approveRequest = async (id: string) => {
    try { await api.put(`/payment-requests/${id}/approve`); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const rejectRequest = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try { await api.put(`/payment-requests/${id}/reject`, { reason }); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const payRequest = async (id: string) => {
    const cashierId = prompt('Cashier ID (leave blank for self):');
    try {
      await api.put(`/payment-requests/${id}/pay`, { cashierId: cashierId || undefined });
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const deleteDraft = async (id: string) => {
    if (!confirm('Delete this draft payment request?')) return;
    try { await api.delete(`/payment-requests/${id}`); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const fmt = (n: number | undefined | null) =>
    n != null ? `ETB ${Number(n).toLocaleString('en', { minimumFractionDigits: 2 })}` : 'ETB 0.00';

  const showVehicleField = VEHICLE_LINKED.includes(form.paymentType);

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700 font-medium">Pending</p>
            <p className="text-2xl font-bold text-yellow-800">{stats.pending?.count ?? 0}</p>
            <p className="text-sm text-yellow-600">{fmt(stats.pending?.totalAmount)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 font-medium">Approved</p>
            <p className="text-2xl font-bold text-blue-800">{stats.approved?.count ?? 0}</p>
            <p className="text-sm text-blue-600">{fmt(stats.approved?.totalAmount)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 font-medium">Paid</p>
            <p className="text-2xl font-bold text-green-800">{stats.paid?.count ?? 0}</p>
            <p className="text-sm text-green-600">{fmt(stats.paid?.totalAmount)}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <select className="select w-48" value={filter} onChange={e => setFilter(e.target.value)}>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />New Payment Request
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="th">Request #</th>
              <th className="th">Date</th>
              <th className="th">Department</th>
              <th className="th">Payee</th>
              <th className="th text-right">Amount</th>
              <th className="th">Method</th>
              <th className="th">Status</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="td text-center py-10 text-gray-400">No payment requests</td></tr>
            ) : items.map((item: any) => (
              <tr key={item.id} className="tr">
                <td className="td font-mono text-xs">{item.requestNumber || '-'}</td>
                <td className="td text-gray-500 text-sm">{formatDualDate(item.requestDate || item.createdAt)}</td>
                <td className="td capitalize">{item.department}</td>
                <td className="td">{item.payee}</td>
                <td className="td text-right font-medium">{fmt(item.amount)}</td>
                <td className="td text-xs text-gray-500 capitalize">{(item.paymentMethod || '').replace(/_/g, ' ') || '-'}</td>
                <td className="td"><StatusBadge status={item.status} /></td>
                <td className="td">
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => setDetailItem(item)} className="btn-secondary py-1 px-2 text-xs" title="View">
                      <Eye className="w-3 h-3" />
                    </button>
                    {item.status === 'draft' && (
                      <>
                        <button onClick={() => openEdit(item)} className="btn-secondary py-1 px-2 text-xs" title="Edit">
                          <Edit className="w-3 h-3" />
                        </button>
                        <button onClick={() => submitRequest(item.id)} className="btn-secondary py-1 px-2 text-xs" title="Submit">
                          <Send className="w-3 h-3" />Submit
                        </button>
                        <button onClick={() => deleteDraft(item.id)} className="btn-danger py-1 px-2 text-xs" title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    {item.status === 'submitted' && (
                      <>
                        <button onClick={() => approveRequest(item.id)} className="btn-success py-1 px-2 text-xs" title="Approve">
                          <CheckCircle className="w-3 h-3" />Approve
                        </button>
                        <button onClick={() => rejectRequest(item.id)} className="btn-danger py-1 px-2 text-xs" title="Reject">
                          <XCircle className="w-3 h-3" />Reject
                        </button>
                      </>
                    )}
                    {item.status === 'approved' && (
                      <button onClick={() => payRequest(item.id)} className="btn-success py-1 px-2 text-xs" title="Pay">
                        <DollarSign className="w-3 h-3" />Pay
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      {modal && !reviewing && (
        <Modal title={editingId ? 'Edit Draft Payment Request' : 'New Payment Request (Draft)'} onClose={() => setModal(false)} size="max-w-3xl">
          <form onSubmit={e => { e.preventDefault(); proceedToReview(); }} className="space-y-4">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              💡 This is a <strong>draft</strong>. You can select an existing record below to auto-fill fields or type them manually before submitting for approval.
            </div>

            {/* Department & Payment Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Department *</label>
                <select className="select" value={form.department} onChange={e => setForm((f: any) => ({ ...f, department: e.target.value }))}>
                  {DEPARTMENTS.map(d => (<option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>))}
                </select>
              </div>
              <div>
                <label className="label">Payment Type *</label>
                <select className="select font-medium text-blue-700 bg-blue-50/50 border-blue-300" value={form.paymentType} onChange={e => handlePaymentTypeChange(e.target.value)}>
                  {PAYMENT_TYPES.map(t => (<option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>))}
                </select>
              </div>
            </div>

            {/* Source Records Selector based on selected paymentType */}
            <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    Select from {form.paymentType.replace(/_/g, ' ')} Records ({sourceItems.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSourceId && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-[11px] text-gray-500 hover:text-red-600 flex items-center gap-1 underline"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear selection
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowSourcePicker(!showSourcePicker)}
                    className="text-xs text-blue-700 font-medium hover:underline"
                  >
                    {showSourcePicker ? 'Hide List' : 'Show List'}
                  </button>
                </div>
              </div>

              {showSourcePicker && (
                <>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      className="input pl-8 py-1.5 text-xs bg-white"
                      placeholder={`Filter ${form.paymentType.replace(/_/g, ' ')} records (name, reference, plate, station, etc.)...`}
                      value={sourceSearch}
                      onChange={e => setSourceSearch(e.target.value)}
                    />
                  </div>

                  {sourceLoading ? (
                    <div className="p-4 text-center text-xs text-gray-500 bg-white rounded border border-dashed flex items-center justify-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Loading {form.paymentType.replace(/_/g, ' ')} candidate records...
                    </div>
                  ) : sourceItems.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-500 bg-white rounded border border-dashed">
                      No specific records found for "{form.paymentType.replace(/_/g, ' ')}". You can enter details manually below.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {sourceItems.map(item => {
                        const isSelected = selectedSourceId === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectSourceItem(item)}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-400/40 shadow-sm'
                                : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isSelected ? (
                                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" />
                                )}
                                <span className="font-semibold text-xs text-gray-900 truncate">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-700 border border-gray-200 flex-shrink-0 capitalize">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-bold text-emerald-700 flex-shrink-0">
                                {fmt(item.amount)}
                              </div>
                            </div>

                            <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 pl-6">
                              <span className="truncate">{item.subtitle}</span>
                              <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 flex-shrink-0 ml-2">
                                {item.referenceType?.toUpperCase()}: {item.referenceId}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-[11px] text-blue-700 flex items-center justify-between pt-1">
                    <span>💡 Clicking any record above auto-populates Payee, Amount, Ref ID, Vehicle, and Bank info.</span>
                    {selectedSourceId && (
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" /> Linked & Pre-filled
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {showVehicleField && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <label className="label text-amber-900">Vehicle (Plate Number)</label>
                <select className="select bg-white" value={form.vehicleId} onChange={e => setForm((f: any) => ({ ...f, vehicleId: e.target.value }))}>
                  <option value="">— Select vehicle —</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plateNumber} · {v.make} {v.model}</option>
                  ))}
                </select>
                <p className="text-[11px] text-amber-700 mt-1">Link this payment to a specific vehicle for cost tracking.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Payee *</label>
                <input className="input" value={form.payee} onChange={e => setForm((f: any) => ({ ...f, payee: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Amount (ETB) *</label>
                <input type="number" step="0.01" min="0" className="input" value={form.amount} onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))} required />
              </div>
            </div>

            <div>
              <label className="label">Description *</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} required />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Reference Type *</label>
                <select className="select" value={form.referenceType} onChange={e => setForm((f: any) => ({ ...f, referenceType: e.target.value }))} required>
                  <option value="">— Select —</option>
                  {REF_TYPES.map(t => (<option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>))}
                </select>
              </div>
              <div>
                <label className="label">Reference ID *</label>
                <input className="input" value={form.referenceId} onChange={e => setForm((f: any) => ({ ...f, referenceId: e.target.value }))} placeholder="e.g. TRP-001" required />
              </div>
              <div>
                <label className="label">Due Date</label>
                <DateInput value={form.dueDate} onChange={val => setForm((f: any) => ({ ...f, dueDate: val }))} />
              </div>
            </div>

            {/* Payee bank / payment method */}
            <div className="border-t pt-3 mt-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">Payee Account & Payment Method</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Payment Method *</label>
                  <select className="select" value={form.paymentMethod} onChange={e => setForm((f: any) => ({ ...f, paymentMethod: e.target.value }))}>
                    {PAY_METHODS.map(m => (<option key={m} value={m}>{m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>))}
                  </select>
                </div>
                <div>
                  <label className="label">Bank Name</label>
                  <input className="input" value={form.payeeBank} onChange={e => setForm((f: any) => ({ ...f, payeeBank: e.target.value }))}
                    placeholder="e.g. CBE, Awash, Dashen" disabled={form.paymentMethod === 'cash'} />
                </div>
                <div>
                  <label className="label">Account Holder Name</label>
                  <input className="input" value={form.payeeAccountHolder} onChange={e => setForm((f: any) => ({ ...f, payeeAccountHolder: e.target.value }))}
                    disabled={form.paymentMethod === 'cash'} />
                </div>
                <div>
                  <label className="label">Account Number</label>
                  <input className="input" value={form.payeeAccountNumber} onChange={e => setForm((f: any) => ({ ...f, payeeAccountNumber: e.target.value }))}
                    disabled={form.paymentMethod === 'cash'} />
                </div>
              </div>
              {form.paymentMethod === 'cash' && (
                <p className="text-[11px] text-gray-500 mt-1">Bank fields disabled for cash payments.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={saveDraft} disabled={saving} className="btn-secondary">
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button type="submit" className="btn-primary">Review →</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Review (before submit) modal */}
      {modal && reviewing && (
        <Modal title="Review Payment Request" onClose={() => setReviewing(false)} size="max-w-2xl">
          <div className="space-y-3">
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              📋 Review all fields. Click <strong>Save as Draft</strong> to keep it editable, or <strong>Save & Submit</strong> to send for approval.
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Department:</span> <strong className="capitalize">{form.department}</strong></div>
              <div><span className="text-gray-500">Type:</span> <strong className="capitalize">{form.paymentType.replace(/_/g, ' ')}</strong></div>
              <div><span className="text-gray-500">Payee:</span> <strong>{form.payee}</strong></div>
              <div><span className="text-gray-500">Amount:</span> <strong>{fmt(Number(form.amount))}</strong></div>
              <div><span className="text-gray-500">Reference:</span> <strong>{form.referenceType} · {form.referenceId}</strong></div>
              {showVehicleField && form.vehicleId && (
                <div><span className="text-gray-500">Vehicle:</span> <strong>{vehicles.find(v => v.id === form.vehicleId)?.plateNumber || '-'}</strong></div>
              )}
              <div className="col-span-2"><span className="text-gray-500">Description:</span> <strong>{form.description}</strong></div>
              <div><span className="text-gray-500">Method:</span> <strong className="capitalize">{form.paymentMethod.replace(/_/g, ' ')}</strong></div>
              {form.paymentMethod !== 'cash' && (
                <>
                  <div><span className="text-gray-500">Bank:</span> <strong>{form.payeeBank || '-'}</strong></div>
                  <div><span className="text-gray-500">Holder:</span> <strong>{form.payeeAccountHolder || '-'}</strong></div>
                  <div><span className="text-gray-500">Account:</span> <strong>{form.payeeAccountNumber || '-'}</strong></div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t">
              <button onClick={() => setReviewing(false)} className="btn-secondary">← Back to Edit</button>
              <button onClick={saveDraft} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : (editingId ? 'Save Draft' : 'Save as Draft')}
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Draft saved. Click <strong>Submit</strong> on the list row to send for approval.
            </p>
          </div>
        </Modal>
      )}

      {/* Detail modal */}
      {detailItem && (
        <Modal title={`Payment Request: ${detailItem.requestNumber}`} onClose={() => setDetailItem(null)} size="max-w-xl">
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500">Status:</span> <StatusBadge status={detailItem.status} /></div>
            <div><span className="text-gray-500">Date:</span> <strong>{formatDualDate(detailItem.requestDate || detailItem.createdAt)}</strong></div>
            <div><span className="text-gray-500">Department:</span> <strong className="capitalize">{detailItem.department || '-'}</strong></div>
            <div><span className="text-gray-500">Type:</span> <strong className="capitalize">{detailItem.paymentType?.replace(/_/g, ' ')}</strong></div>
            <div><span className="text-gray-500">Payee:</span> <strong>{detailItem.payee}</strong></div>
            <div><span className="text-gray-500">Amount:</span> <strong>{fmt(detailItem.amount)}</strong></div>
            <div><span className="text-gray-500">Description:</span> <strong>{detailItem.description}</strong></div>
            <div><span className="text-gray-500">Reference:</span> <strong>{detailItem.referenceType} · {detailItem.referenceId}</strong></div>
            {detailItem.vehicleId && (
              <div><span className="text-gray-500">Vehicle:</span> <strong>{vehicles.find(v => v.id === detailItem.vehicleId)?.plateNumber || detailItem.vehicleId}</strong></div>
            )}
            <div><span className="text-gray-500">Payment Method:</span> <strong className="capitalize">{(detailItem.paymentMethod || '-').replace(/_/g, ' ')}</strong></div>
            {detailItem.payeeBank && <div><span className="text-gray-500">Bank:</span> <strong>{detailItem.payeeBank}</strong></div>}
            {detailItem.payeeAccountHolder && <div><span className="text-gray-500">Holder:</span> <strong>{detailItem.payeeAccountHolder}</strong></div>}
            {detailItem.payeeAccountNumber && <div><span className="text-gray-500">Account:</span> <strong>{detailItem.payeeAccountNumber}</strong></div>}
            {detailItem.rejectedReason && <div className="p-2 bg-red-50 rounded"><span className="text-red-700">Rejected reason:</span> <strong>{detailItem.rejectedReason}</strong></div>}
          </div>
        </Modal>
      )}
    </div>
  );
}
