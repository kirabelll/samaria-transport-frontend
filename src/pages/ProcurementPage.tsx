import { useEffect, useState } from 'react';
import { Plus, Eye, AlertTriangle, Receipt, Layers, Trash2, CheckCircle2, Truck, ClipboardCheck } from 'lucide-react';
import { procurementApi } from '../services/api';
import { formatDualDate } from '../utils/ethCalendar';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

type BulkRow = {
  itemName: string;
  quantity: string;
  unit: string;
  estimatedPrice: string;
  supplier: string;
  notes: string;
  _invalid?: boolean;
};

const emptyBulkRow = (): BulkRow => ({
  itemName: '', quantity: '1', unit: 'pcs', estimatedPrice: '', supplier: '', notes: ''
});

type GrnForm = {
  quantityReceived: string;
  quantityDamaged: string;
  quantityRejected: string;
  inspectionResult: 'passed' | 'conditional' | 'failed';
  defectsNotes: string;
  supplierInvoiceNumber: string;
  notes: string;
};

const emptyGrnForm = (): GrnForm => ({
  quantityReceived: '',
  quantityDamaged: '0',
  quantityRejected: '0',
  inspectionResult: 'passed',
  defectsNotes: '',
  supplierInvoiceNumber: '',
  notes: '',
});

// Inspection-result color-coded badge
function InspectionBadge({ result }: { result?: string }) {
  if (!result) return <span className="text-gray-400 text-xs">-</span>;
  const r = result.toLowerCase();
  const map: Record<string, string> = {
    passed: 'bg-green-100 text-green-800',
    conditional: 'bg-amber-100 text-amber-800',
    failed: 'bg-red-100 text-red-800',
  };
  const cls = map[r] || 'bg-gray-100 text-gray-700';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${cls}`}>{r}</span>;
}

// "Shipped X days ago" helper
function daysAgo(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return null;
  const diff = Date.now() - d;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function ProcurementPage() {
  const [tab, setTab] = useState<'requests' | 'orders' | 'grnlog'>('requests');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState<any>(null);
  const [form, setForm] = useState({ urgency: 'normal', notes: '', lines: [{ itemName: '', quantityNeeded: '1', estimatedCost: '', unit: 'pcs' }] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Quotation comparison state (Task 1)
  const [comparison, setComparison] = useState<any>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState('');

  // Bulk entry state (Task 2)
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyBulkRow()]);
  const [bulkUrgency, setBulkUrgency] = useState('normal');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkResult, setBulkResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null);

  // GRN modal state
  const [grnModalPo, setGrnModalPo] = useState<any>(null);
  const [grnForm, setGrnForm] = useState<GrnForm>(emptyGrnForm());
  const [grnSaving, setGrnSaving] = useState(false);
  const [grnError, setGrnError] = useState('');

  // GRN history (for view modal)
  const [poGrns, setPoGrns] = useState<any[]>([]);
  const [poGrnsLoading, setPoGrnsLoading] = useState(false);

  // GRN Log tab state
  const [grnLog, setGrnLog] = useState<any[]>([]);
  const [grnLogLoading, setGrnLogLoading] = useState(false);
  const [grnLogPage, setGrnLogPage] = useState(1);
  const [grnLogLimit] = useState(25);
  const [grnLogTotal, setGrnLogTotal] = useState(0);
  const [grnLogFrom, setGrnLogFrom] = useState('');
  const [grnLogTo, setGrnLogTo] = useState('');

  const load = () => {
    if (tab === 'grnlog') return; // handled by separate effect
    setLoading(true);
    const promise = tab === 'requests' ? procurementApi.listRequests() : procurementApi.listOrders();
    promise.then(r => setItems(r.data.purchaseRequests || r.data.purchaseOrders || []))
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [tab]);

  // Load comparison + GRN history when viewing
  useEffect(() => {
    setComparison(null); setCompError('');
    setPoGrns([]);
    if (viewModal && tab === 'requests' && viewModal.id) {
      setCompLoading(true);
      procurementApi.quotationComparison(viewModal.id)
        .then(r => setComparison(r.data))
        .catch(e => setCompError(e.response?.data?.error || 'Failed to load quotations'))
        .finally(() => setCompLoading(false));
    }
    if (viewModal && tab === 'orders' && viewModal.id) {
      setPoGrnsLoading(true);
      procurementApi.listGRNsForPO(viewModal.id)
        .then(r => setPoGrns(r.data.grns || r.data.goodsReceiptNotes || r.data || []))
        .catch(() => setPoGrns([]))
        .finally(() => setPoGrnsLoading(false));
    }
  }, [viewModal, tab]);

  // Load GRN log
  const loadGrnLog = () => {
    setGrnLogLoading(true);
    procurementApi.listAllGRNs({
      from: grnLogFrom || undefined,
      to: grnLogTo || undefined,
      page: grnLogPage,
      limit: grnLogLimit,
    })
      .then(r => {
        const data = r.data;
        setGrnLog(data.grns || data.goodsReceiptNotes || data.items || data || []);
        setGrnLogTotal(data.total ?? data.totalCount ?? (Array.isArray(data) ? data.length : 0));
      })
      .catch(console.error)
      .finally(() => setGrnLogLoading(false));
  };
  useEffect(() => {
    if (tab === 'grnlog') loadGrnLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, grnLogPage]);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { itemName: '', quantityNeeded: '1', estimatedCost: '', unit: 'pcs' }] }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: string, val: string) =>
    setForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l) }));

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      await procurementApi.createRequest({
        urgency: form.urgency,
        notes: form.notes,
        lines: form.lines.map(l => ({
          itemName: l.itemName,
          quantityNeeded: Number(l.quantityNeeded),
          estimatedCost: l.estimatedCost ? Number(l.estimatedCost) : null,
          unit: l.unit
        }))
      });
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await procurementApi.updateRequestStatus(id, { status });
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  // Select a quotation (triggers backend 3-supplier check)
  const selectQuote = async (qId: string) => {
    try {
      await procurementApi.selectQuotation(qId);
      alert('Quotation selected and Purchase Order created.');
      setViewModal(null);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to select quotation');
    }
  };

  // ── Mark as Shipped ──────────────────────────────────
  const shipPO = async (poId: string) => {
    if (!confirm('Mark this PO as shipped by the supplier?')) return;
    try {
      await procurementApi.shipPO(poId);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to mark as shipped');
    }
  };

  // ── GRN modal handlers ───────────────────────────────
  const openGrnModal = (po: any) => {
    setGrnForm(emptyGrnForm());
    setGrnError('');
    setGrnModalPo(po);
  };

  const submitGrn = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setGrnError('');
    const qty = Number(grnForm.quantityReceived);
    if (!qty || qty <= 0) {
      setGrnError('Quantity received must be greater than 0');
      return;
    }
    if (grnForm.inspectionResult !== 'passed' && !grnForm.defectsNotes.trim()) {
      setGrnError('Defects notes are required when inspection is not passed');
      return;
    }
    setGrnSaving(true);
    try {
      await procurementApi.createGRN(grnModalPo.id, {
        quantityReceived: qty,
        quantityDamaged: Number(grnForm.quantityDamaged) || 0,
        quantityRejected: Number(grnForm.quantityRejected) || 0,
        inspectionResult: grnForm.inspectionResult,
        defectsNotes: grnForm.defectsNotes || null,
        supplierInvoiceNumber: grnForm.supplierInvoiceNumber || null,
        notes: grnForm.notes || null,
      });
      setGrnModalPo(null);
      load();
    } catch (e: any) {
      setGrnError(e.response?.data?.error || 'Failed to record GRN');
    } finally {
      setGrnSaving(false);
    }
  };

  // ── Bulk Entry helpers ─────────────────────────────
  const openBulk = () => {
    setBulkRows([emptyBulkRow()]);
    setBulkUrgency('normal');
    setBulkError('');
    setBulkResult(null);
    setBulkModal(true);
  };
  const addBulkRow = () => setBulkRows(r => [...r, emptyBulkRow()]);
  const removeBulkRow = (i: number) => setBulkRows(r => r.length > 1 ? r.filter((_, idx) => idx !== i) : r);
  const updateBulkRow = (i: number, field: keyof BulkRow, val: string) =>
    setBulkRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val, _invalid: false } : row));

  const validateBulk = (): number[] => {
    const badIdx: number[] = [];
    bulkRows.forEach((r, i) => {
      const qty = Number(r.quantity);
      if (!r.itemName.trim() || !r.unit.trim() || !qty || qty <= 0) badIdx.push(i);
    });
    return badIdx;
  };

  const submitBulk = async () => {
    setBulkError('');
    setBulkResult(null);
    const bad = validateBulk();
    if (bad.length > 0) {
      setBulkRows(r => r.map((row, i) => ({ ...row, _invalid: bad.includes(i) })));
      setBulkError(`Fix ${bad.length} invalid row(s) before submitting. Item name, unit, and quantity (>0) are required.`);
      return;
    }
    setBulkSubmitting(true);
    let created = 0; let failed = 0; const errors: string[] = [];
    for (let i = 0; i < bulkRows.length; i++) {
      const row = bulkRows[i];
      try {
        await procurementApi.createRequest({
          urgency: bulkUrgency,
          notes: row.notes || null,
          lines: [{
            itemName: row.itemName.trim(),
            quantityNeeded: Number(row.quantity),
            unit: row.unit.trim(),
            estimatedCost: row.estimatedPrice ? Number(row.estimatedPrice) : null,
            notes: row.supplier ? `Preferred supplier: ${row.supplier}` : null,
          }],
        });
        created++;
      } catch (e: any) {
        failed++;
        errors.push(`Row ${i + 1} (${row.itemName || 'unnamed'}): ${e.response?.data?.error || e.message || 'Failed'}`);
      }
    }
    setBulkSubmitting(false);
    setBulkResult({ created, failed, errors });
    if (created > 0) load();
  };

  const totalGrnLogPages = Math.max(1, Math.ceil(grnLogTotal / grnLogLimit));

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-gray-200">
        {(['requests', 'orders', 'grnlog'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'grnlog') setGrnLogPage(1); }} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'grnlog' ? 'GRN Log' : t}
          </button>
        ))}
      </div>

      {tab !== 'grnlog' && (
        <div className="flex justify-end gap-2">
          {tab === 'requests' && (
            <>
              <button onClick={openBulk} className="btn-secondary">
                <Layers className="w-4 h-4" />Bulk Entry
              </button>
              <button onClick={() => { setForm({ urgency: 'normal', notes: '', lines: [{ itemName: '', quantityNeeded: '1', estimatedCost: '', unit: 'pcs' }] }); setError(''); setModal(true); }} className="btn-primary">
                <Plus className="w-4 h-4" />New Request
              </button>
            </>
          )}
        </div>
      )}

      {tab !== 'grnlog' && (
        <div className="table-container">
          <table className="table">
            <thead><tr>
              <th className="th">Number</th><th className="th">Urgency</th>
              <th className="th">Status</th><th className="th">Notes</th>
              <th className="th">Date</th><th className="th">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="td text-center py-10 text-gray-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="td text-center py-10 text-gray-400">No {tab}</td></tr>
              ) : items.map((item: any) => {
                const shippedDays = item.shippedAt ? daysAgo(item.shippedAt) : null;
                return (
                  <tr key={item.id} className="tr">
                    <td className="td font-mono text-xs">{item.requestNumber || item.poNumber || '-'}</td>
                    <td className="td"><StatusBadge status={item.urgency || 'normal'} /></td>
                    <td className="td">
                      <div className="flex items-center gap-1 flex-wrap">
                        <StatusBadge status={item.status} />
                        {tab === 'orders' && item.status === 'shipped' && shippedDays !== null && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                            <Truck className="w-3 h-3 inline mr-0.5" />
                            {shippedDays === 0 ? 'Shipped today' : `Shipped ${shippedDays}d ago`}
                          </span>
                        )}
                        {tab === 'orders' && item.expectedDeliveryDate && (item.status === 'shipped' || item.status === 'sent') && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                            ETA {formatDualDate(item.expectedDeliveryDate)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="td text-gray-500 text-xs truncate max-w-48">{item.notes || '-'}</td>
                    <td className="td text-gray-500 text-sm">{formatDualDate(item.createdAt)}</td>
                    <td className="td">
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => setViewModal(item)} className="btn-secondary py-1 px-2 text-xs"><Eye className="w-3 h-3" />View</button>
                        {tab === 'requests' && item.status === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(item.id, 'approved')} className="btn-success py-1 px-2 text-xs">Approve</button>
                            <button onClick={() => updateStatus(item.id, 'rejected')} className="btn-danger py-1 px-2 text-xs">Reject</button>
                          </>
                        )}
                        {tab === 'requests' && item.status === 'approved' && item._count?.quotations < 3 && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            <AlertTriangle className="w-3 h-3" />{item._count?.quotations || 0}/3 quotes
                          </span>
                        )}
                        {tab === 'orders' && (item.status === 'pending' || item.status === 'sent') && (
                          <button onClick={() => shipPO(item.id)} className="py-1 px-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center gap-1">
                            <Truck className="w-3 h-3" />Mark Shipped
                          </button>
                        )}
                        {tab === 'orders' && (item.status === 'shipped' || item.status === 'partial' || item.status === 'pending' || item.status === 'sent') && (
                          <button onClick={() => openGrnModal(item)} className="py-1 px-2 text-xs bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 flex items-center gap-1">
                            <ClipboardCheck className="w-3 h-3" />GRN
                          </button>
                        )}
                        {tab === 'orders' && (item.status === 'received' || item.status === 'partial') && (
                          <button onClick={async () => {
                            try {
                              const res = await procurementApi.createPOPayment(item.id);
                              alert(`Payment request created: ${res.data.paymentRequest.requestNumber}`);
                              load();
                            } catch (e: any) { alert(e.response?.data?.error || 'Failed to create payment request'); }
                          }} className="py-1 px-2 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100">
                            <Receipt className="w-3 h-3 inline mr-0.5" />Payment Req
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

      {/* GRN Log Tab */}
      {tab === 'grnlog' && (
        <div className="space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="label">From</label>
              <input type="date" className="input" value={grnLogFrom} onChange={e => setGrnLogFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" className="input" value={grnLogTo} onChange={e => setGrnLogTo(e.target.value)} />
            </div>
            <button onClick={() => { setGrnLogPage(1); loadGrnLog(); }} className="btn-primary">Apply</button>
            <button onClick={() => { setGrnLogFrom(''); setGrnLogTo(''); setGrnLogPage(1); setTimeout(loadGrnLog, 0); }} className="btn-secondary">Clear</button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">GRN #</th>
                <th className="th">Date</th>
                <th className="th">PO #</th>
                <th className="th">Supplier</th>
                <th className="th text-right">Qty Received</th>
                <th className="th text-right">Damaged</th>
                <th className="th text-right">Rejected</th>
                <th className="th">Inspection</th>
              </tr></thead>
              <tbody>
                {grnLogLoading ? (
                  <tr><td colSpan={8} className="td text-center py-10 text-gray-400">Loading...</td></tr>
                ) : grnLog.length === 0 ? (
                  <tr><td colSpan={8} className="td text-center py-10 text-gray-400">No GRNs found</td></tr>
                ) : grnLog.map((g: any) => (
                  <tr key={g.id} className="tr">
                    <td className="td font-mono text-xs">{g.grnNumber || g.number || g.id?.slice(0, 8)}</td>
                    <td className="td text-sm">{formatDualDate(g.receivedAt || g.createdAt)}</td>
                    <td className="td font-mono text-xs">{g.purchaseOrder?.poNumber || g.po?.poNumber || g.poNumber || '-'}</td>
                    <td className="td text-sm">{g.purchaseOrder?.supplier?.name || g.po?.supplier?.name || g.supplierName || '-'}</td>
                    <td className="td text-right">{g.quantityReceived ?? '-'}</td>
                    <td className="td text-right">{g.quantityDamaged ?? 0}</td>
                    <td className="td text-right">{g.quantityRejected ?? 0}</td>
                    <td className="td"><InspectionBadge result={g.inspectionResult} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {grnLogTotal > grnLogLimit && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Page {grnLogPage} of {totalGrnLogPages} ({grnLogTotal} total)
              </span>
              <div className="flex gap-2">
                <button disabled={grnLogPage <= 1} onClick={() => setGrnLogPage(p => Math.max(1, p - 1))} className="btn-secondary text-xs">Previous</button>
                <button disabled={grnLogPage >= totalGrnLogPages} onClick={() => setGrnLogPage(p => Math.min(totalGrnLogPages, p + 1))} className="btn-secondary text-xs">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <Modal title="New Purchase Request" onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Urgency</label>
                <select className="select" value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
                  <option value="low">Low</option><option value="normal">Normal</option>
                  <option value="high">High</option><option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div><label className="label">Notes / Description</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div>
              <label className="label">Items *</label>
              <div className="space-y-2">
                {form.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-end">
                    <input className="input col-span-2" placeholder="Item name" value={l.itemName} onChange={e => updateLine(i, 'itemName', e.target.value)} required />
                    <input type="number" className="input" placeholder="Qty" value={l.quantityNeeded} onChange={e => updateLine(i, 'quantityNeeded', e.target.value)} />
                    <div className="flex gap-1">
                      <input type="number" className="input" placeholder="Est. cost" value={l.estimatedCost} onChange={e => updateLine(i, 'estimatedCost', e.target.value)} />
                      {form.lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="btn-danger px-2 py-1 text-xs">×</button>}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addLine} className="btn-secondary text-xs">+ Add Item</button>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Submit Request'}</button>
            </div>
          </form>
        </Modal>
      )}

      {viewModal && (
        <Modal title={`${tab === 'orders' ? 'PO' : 'Request'}: ${viewModal.requestNumber || viewModal.poNumber || 'Details'}`} onClose={() => setViewModal(null)} size="max-w-4xl">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Status:</span> <StatusBadge status={viewModal.status} /></div>
              <div><span className="text-gray-500">Urgency:</span> <StatusBadge status={viewModal.urgency || 'normal'} /></div>
            </div>
            {viewModal.notes && <div><span className="text-gray-500">Notes:</span> {viewModal.notes}</div>}
            {viewModal.lines?.length > 0 && (
              <div>
                <p className="text-gray-500 font-medium mt-2">Items:</p>
                <div className="mt-1 border rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50"><tr>
                      <th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Est. Cost</th>
                    </tr></thead>
                    <tbody>
                      {viewModal.lines.map((l: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{l.itemName}</td>
                          <td className="p-2 text-right">{l.quantityNeeded} {l.unit}</td>
                          <td className="p-2 text-right">{l.estimatedCost ? `ETB ${l.estimatedCost}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Quotation comparison (Task 1) */}
            {tab === 'requests' && (
              <div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-gray-700 font-semibold">Quotation Comparison</p>
                  {comparison && (
                    <span className={`text-xs px-2 py-1 rounded ${comparison.meetsMinimum ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {comparison.supplierCount}/3 supplier quotes
                      {!comparison.meetsMinimum && !viewModal.isEmergency && ' (min 3 required)'}
                      {viewModal.isEmergency && ' - Emergency'}
                    </span>
                  )}
                </div>
                {compLoading && <div className="text-gray-400 text-xs py-2">Loading quotations...</div>}
                {compError && <div className="text-red-600 text-xs py-2">{compError}</div>}
                {comparison && comparison.comparison.length === 0 && (
                  <div className="text-gray-400 text-xs py-2 border rounded p-3 text-center">No quotations yet. Add at least 3 supplier quotes before selecting one.</div>
                )}
                {comparison && comparison.comparison.length > 0 && (
                  <div className="mt-1 border rounded overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 text-left">Supplier</th>
                          <th className="p-2 text-right">Unit Price</th>
                          <th className="p-2 text-right">Delivery Days</th>
                          <th className="p-2 text-right">Total</th>
                          <th className="p-2 text-left">Notes / Terms</th>
                          <th className="p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.comparison.map((q: any) => (
                          <tr key={q.quotationId} className={`border-t ${q.isLowest ? 'bg-green-50/50' : ''}`}>
                            <td className="p-2">
                              {q.supplier}
                              {q.isLowest && <span className="ml-1 text-[10px] text-green-700 font-semibold">LOWEST</span>}
                            </td>
                            <td className="p-2 text-right">ETB {q.unitPrice?.toLocaleString?.() ?? q.unitPrice}</td>
                            <td className="p-2 text-right">{q.deliveryDays ?? '-'}</td>
                            <td className="p-2 text-right">ETB {q.totalPrice?.toLocaleString?.() ?? q.totalPrice}</td>
                            <td className="p-2 text-gray-600">{q.paymentTerms || '-'}</td>
                            <td className="p-2 text-center">
                              {q.status === 'selected' ? (
                                <span className="text-green-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Selected</span>
                              ) : q.status === 'rejected' ? (
                                <span className="text-gray-400">Rejected</span>
                              ) : (
                                <button onClick={() => selectQuote(q.quotationId)} className="btn-primary py-0.5 px-2 text-xs">Select</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* GRN history (orders only) */}
            {tab === 'orders' && (
              <div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-gray-700 font-semibold">Goods Receipt Notes (GRN)</p>
                  {(viewModal.status === 'shipped' || viewModal.status === 'partial' || viewModal.status === 'pending' || viewModal.status === 'sent') && (
                    <button onClick={() => { setViewModal(null); openGrnModal(viewModal); }} className="btn-primary py-1 px-2 text-xs">
                      <ClipboardCheck className="w-3 h-3" />Record GRN
                    </button>
                  )}
                </div>
                {poGrnsLoading && <div className="text-gray-400 text-xs py-2">Loading GRNs...</div>}
                {!poGrnsLoading && poGrns.length === 0 && (
                  <div className="text-gray-400 text-xs py-2 border rounded p-3 text-center">No goods receipts yet for this PO.</div>
                )}
                {!poGrnsLoading && poGrns.length > 0 && (
                  <div className="mt-1 border rounded overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 text-left">GRN #</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-right">Qty Received</th>
                          <th className="p-2 text-right">Damaged</th>
                          <th className="p-2 text-right">Rejected</th>
                          <th className="p-2 text-left">Inspection</th>
                          <th className="p-2 text-left">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poGrns.map((g: any) => (
                          <tr key={g.id} className="border-t">
                            <td className="p-2 font-mono">{g.grnNumber || g.number || g.id?.slice(0, 8)}</td>
                            <td className="p-2">{formatDualDate(g.receivedAt || g.createdAt)}</td>
                            <td className="p-2 text-right">{g.quantityReceived ?? '-'}</td>
                            <td className="p-2 text-right">{g.quantityDamaged ?? 0}</td>
                            <td className="p-2 text-right">{g.quantityRejected ?? 0}</td>
                            <td className="p-2"><InspectionBadge result={g.inspectionResult} /></td>
                            <td className="p-2 text-gray-600 truncate max-w-48">{g.notes || g.defectsNotes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setViewModal(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </Modal>
      )}

      {/* GRN Modal */}
      {grnModalPo && (
        <Modal title={`Record GRN — PO ${grnModalPo.poNumber || ''}`} onClose={() => setGrnModalPo(null)} size="max-w-2xl">
          <form onSubmit={submitGrn} className="space-y-3 text-sm">
            {grnError && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{grnError}</div>}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Quantity Received *</label>
                <input type="number" min="0" step="any" required className="input"
                  value={grnForm.quantityReceived}
                  onChange={e => setGrnForm(f => ({ ...f, quantityReceived: e.target.value }))} />
              </div>
              <div>
                <label className="label">Quantity Damaged</label>
                <input type="number" min="0" step="any" className="input"
                  value={grnForm.quantityDamaged}
                  onChange={e => setGrnForm(f => ({ ...f, quantityDamaged: e.target.value }))} />
              </div>
              <div>
                <label className="label">Qty Rejected (Inspection)</label>
                <input type="number" min="0" step="any" className="input"
                  value={grnForm.quantityRejected}
                  onChange={e => setGrnForm(f => ({ ...f, quantityRejected: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Inspection Result *</label>
                <select className="select" value={grnForm.inspectionResult}
                  onChange={e => setGrnForm(f => ({ ...f, inspectionResult: e.target.value as any }))}>
                  <option value="passed">Passed</option>
                  <option value="conditional">Conditional</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="label">Supplier Invoice Number</label>
                <input className="input" value={grnForm.supplierInvoiceNumber}
                  onChange={e => setGrnForm(f => ({ ...f, supplierInvoiceNumber: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="label">
                Defects Notes {grnForm.inspectionResult !== 'passed' && <span className="text-red-600">*</span>}
              </label>
              <textarea className="input" rows={2}
                placeholder={grnForm.inspectionResult !== 'passed' ? 'Required when inspection is not passed' : 'Optional'}
                value={grnForm.defectsNotes}
                onChange={e => setGrnForm(f => ({ ...f, defectsNotes: e.target.value }))} />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={grnForm.notes}
                onChange={e => setGrnForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={() => setGrnModalPo(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={grnSaving} className="btn-primary">
                {grnSaving ? 'Saving...' : 'Record GRN'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk Entry Modal (Task 2) */}
      {bulkModal && (
        <Modal title="Bulk Purchase Request Entry" onClose={() => setBulkModal(false)} size="max-w-5xl">
          <div className="space-y-3 text-sm">
            {bulkError && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{bulkError}</div>}
            {bulkResult && (
              <div className={`p-3 rounded text-sm ${bulkResult.failed === 0 ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                <div className="font-semibold">{bulkResult.created} item(s) created, {bulkResult.failed} failed</div>
                {bulkResult.errors.length > 0 && (
                  <ul className="mt-1 text-xs list-disc ml-5">
                    {bulkResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Urgency (applies to all)</label>
                <select className="select" value={bulkUrgency} onChange={e => setBulkUrgency(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="col-span-2 flex items-end text-xs text-gray-500">
                Each row becomes a separate purchase request. Useful for recurring expenses like fuel or bulk spare parts.
              </div>
            </div>

            <div className="border rounded overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left w-8">#</th>
                    <th className="p-2 text-left">Item Name *</th>
                    <th className="p-2 text-left">Qty *</th>
                    <th className="p-2 text-left">Unit *</th>
                    <th className="p-2 text-left">Est. Price</th>
                    <th className="p-2 text-left">Supplier</th>
                    <th className="p-2 text-left">Notes</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((row, i) => (
                    <tr key={i} className={`border-t ${row._invalid ? 'bg-red-50' : ''}`}>
                      <td className="p-2 text-gray-400">{i + 1}</td>
                      <td className="p-1">
                        <input className="input py-1 text-xs" value={row.itemName}
                          onChange={e => updateBulkRow(i, 'itemName', e.target.value)} placeholder="Diesel fuel" />
                      </td>
                      <td className="p-1 w-20">
                        <input type="number" min="0" step="any" className="input py-1 text-xs" value={row.quantity}
                          onChange={e => updateBulkRow(i, 'quantity', e.target.value)} />
                      </td>
                      <td className="p-1 w-20">
                        <input className="input py-1 text-xs" value={row.unit}
                          onChange={e => updateBulkRow(i, 'unit', e.target.value)} placeholder="L / pcs / kg" />
                      </td>
                      <td className="p-1 w-28">
                        <input type="number" min="0" step="any" className="input py-1 text-xs" value={row.estimatedPrice}
                          onChange={e => updateBulkRow(i, 'estimatedPrice', e.target.value)} placeholder="0.00" />
                      </td>
                      <td className="p-1">
                        <input className="input py-1 text-xs" value={row.supplier}
                          onChange={e => updateBulkRow(i, 'supplier', e.target.value)} placeholder="optional" />
                      </td>
                      <td className="p-1">
                        <input className="input py-1 text-xs" value={row.notes}
                          onChange={e => updateBulkRow(i, 'notes', e.target.value)} placeholder="optional" />
                      </td>
                      <td className="p-1 text-center">
                        {bulkRows.length > 1 && (
                          <button type="button" onClick={() => removeBulkRow(i)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Remove row">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={addBulkRow} className="btn-secondary text-xs">+ Add Row</button>
              <div className="text-xs text-gray-500">{bulkRows.length} row(s)</div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={() => setBulkModal(false)} className="btn-secondary">
                {bulkResult ? 'Close' : 'Cancel'}
              </button>
              {!bulkResult && (
                <button type="button" onClick={submitBulk} disabled={bulkSubmitting} className="btn-primary">
                  {bulkSubmitting ? 'Submitting...' : `Submit Bulk (${bulkRows.length})`}
                </button>
              )}
              {bulkResult && bulkResult.created > 0 && (
                <button type="button" onClick={() => { setBulkResult(null); setBulkRows([emptyBulkRow()]); }} className="btn-primary">
                  New Bulk Entry
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
