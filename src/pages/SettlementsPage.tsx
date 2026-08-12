import { useEffect, useState } from 'react';
import { Plus, CheckCircle, Eye, FileText, DollarSign, Search, Banknote } from 'lucide-react';
import { settlementApi, orderApi } from '../services/api';
import { formatDualDate } from '../utils/ethCalendar';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [detailModal, setDetailModal] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Generate modal
  const [genModal, setGenModal] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [genNotes, setGenNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Collection modal
  const [collectModal, setCollectModal] = useState<any>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [collecting, setCollecting] = useState(false);

  const recordCollection = async () => {
    if (!collectModal || !collectAmount) return;
    setCollecting(true);
    try {
      await settlementApi.recordCollection(collectModal.id, { amount: Number(collectAmount), notes: collectNotes });
      setCollectModal(null); load();
      if (detailModal?.id === collectModal.id) openDetail({ id: collectModal.id });
    } catch (e: any) { alert(e.response?.data?.error || 'Failed to record collection'); }
    finally { setCollecting(false); }
  };

  const load = () => {
    setLoading(true);
    settlementApi.list({ status: filterStatus || undefined })
      .then(r => setSettlements(r.data.settlements || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterStatus]);

  const openGenerate = async () => {
    setGenModal(true); setGenError(''); setSelectedOrderId(''); setGenNotes('');
    try {
      const res = await orderApi.list({ status: 'delivered' });
      const all = await orderApi.list({});
      // Show delivered + approved orders that have completed trips
      setOrders([...(res.data.orders || []), ...(all.data.orders || []).filter((o: any) => ['approved','scheduled','dispatched','in_transit'].includes(o.status) && o.totalTrips > 0)]);
    } catch { setOrders([]); }
  };

  const generate = async () => {
    if (!selectedOrderId) return;
    setGenerating(true); setGenError('');
    try {
      await settlementApi.generate(selectedOrderId, { notes: genNotes });
      setGenModal(false); load();
    } catch (e: any) { setGenError(e.response?.data?.error || 'Failed to generate settlement'); }
    finally { setGenerating(false); }
  };

  const openDetail = async (s: any) => {
    setDetailLoading(true); setDetailModal(null);
    try {
      const res = await settlementApi.get(s.id);
      setDetailModal(res.data);
    } catch { alert('Failed to load settlement'); }
    finally { setDetailLoading(false); }
  };

  const doAction = async (id: string, action: string) => {
    try {
      if (action === 'review') await settlementApi.review(id);
      else if (action === 'approve') await settlementApi.approve(id);
      else if (action === 'invoice') await settlementApi.generateInvoice(id);
      load();
      if (detailModal?.id === id) openDetail({ id });
    } catch (e: any) { alert(e.response?.data?.error || 'Action failed'); }
  };

  const STATUSES = ['draft', 'reviewed', 'approved', 'invoiced'];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <select className="select w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={openGenerate} className="btn-primary">
          <Plus className="w-4 h-4" />Generate Settlement
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">{settlements.length}</div>
          <div className="text-xs text-gray-500">Total Settlements</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">{settlements.filter(s => s.status === 'draft').length}</div>
          <div className="text-xs text-gray-500">Draft</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{settlements.filter(s => s.status === 'approved').length}</div>
          <div className="text-xs text-gray-500">Approved</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">
            ETB {settlements.reduce((s, st) => s + (st.netAmount || 0), 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Total Net Amount</div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th className="th">Settlement #</th>
            <th className="th">Order #</th>
            <th className="th">Customer</th>
            <th className="th">Delivered (t)</th>
            <th className="th">Gross</th>
            <th className="th">Penalties</th>
            <th className="th">Net Amount</th>
            <th className="th">Collected</th>
            <th className="th">Remaining</th>
            <th className="th">Status</th>
            <th className="th">Invoice</th>
            <th className="th">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : settlements.length === 0 ? (
              <tr><td colSpan={12} className="td text-center py-10 text-gray-400">No settlements found</td></tr>
            ) : settlements.map((s: any) => (
              <tr key={s.id} className="tr">
                <td className="td font-mono text-xs font-semibold text-blue-700">{s.settlementNumber}</td>
                <td className="td font-mono text-xs">{s.order?.orderNumber}</td>
                <td className="td">{s.order?.customer?.companyName}</td>
                <td className="td">{s.totalDeliveredTons?.toFixed(1)}</td>
                <td className="td">ETB {s.grossAmount?.toLocaleString()}</td>
                <td className="td text-red-600">{s.totalPenalties > 0 ? `-ETB ${s.totalPenalties.toLocaleString()}` : '-'}</td>
                <td className="td font-semibold">ETB {s.netAmount?.toLocaleString()}</td>
                <td className="td text-green-600">{s.collectedAmount > 0 ? `ETB ${s.collectedAmount.toLocaleString()}` : '-'}</td>
                <td className="td font-bold text-red-600">{s.remainingAmount > 0 ? `ETB ${s.remainingAmount.toLocaleString()}` : '-'}</td>
                <td className="td"><StatusBadge status={s.status} /></td>
                <td className="td text-xs">{s.invoice ? <span className="text-green-600 font-mono">{s.invoice.invoiceNumber}</span> : '-'}</td>
                <td className="td">
                  <div className="flex gap-1">
                    <button onClick={() => openDetail(s)} className="py-1 px-2 text-xs bg-gray-100 rounded hover:bg-gray-200">
                      <Eye className="w-3 h-3 inline mr-1" />View
                    </button>
                    {s.status === 'draft' && (
                      <button onClick={() => doAction(s.id, 'review')} className="py-1 px-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                        <Search className="w-3 h-3 inline mr-1" />Review
                      </button>
                    )}
                    {['draft', 'reviewed'].includes(s.status) && (
                      <button onClick={() => doAction(s.id, 'approve')} className="btn-success py-1 px-2 text-xs">
                        <CheckCircle className="w-3 h-3 inline mr-1" />Approve
                      </button>
                    )}
                    {s.status === 'approved' && !s.invoice && (
                      <button onClick={() => doAction(s.id, 'invoice')} className="py-1 px-2 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100">
                        <FileText className="w-3 h-3 inline mr-1" />Invoice
                      </button>
                    )}
                    {s.status === 'invoiced' && s.remainingAmount > 0 && (
                      <button onClick={() => { setCollectModal(s); setCollectAmount(''); setCollectNotes(''); }} className="py-1 px-2 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">
                        <Banknote className="w-3 h-3 inline mr-1" />Collect
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generate Settlement Modal */}
      {genModal && (
        <Modal title="Generate Settlement from Order" onClose={() => setGenModal(false)}>
          <div className="space-y-4">
            {genError && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{genError}</div>}
            <div>
              <label className="label">Select Order *</label>
              <select className="select" value={selectedOrderId} onChange={e => setSelectedOrderId(e.target.value)}>
                <option value="">Choose an order...</option>
                {orders.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} - {o.customer?.companyName} ({o.totalDelivered || 0}t delivered)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={genNotes} onChange={e => setGenNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setGenModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={generate} disabled={generating || !selectedOrderId} className="btn-primary">
                {generating ? 'Generating...' : 'Generate Settlement'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {(detailModal || detailLoading) && (
        <Modal title={detailModal ? `Settlement: ${detailModal.settlementNumber}` : 'Loading...'} onClose={() => { setDetailModal(null); setDetailLoading(false); }} size="max-w-4xl">
          {detailLoading ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : detailModal && (
            <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded">
                  <h4 className="font-semibold text-blue-800 mb-2">Settlement Info</h4>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div>Order: <strong>{detailModal.order?.orderNumber}</strong></div>
                    <div>Customer: <strong>{detailModal.order?.customer?.companyName}</strong></div>
                    <div>Delivered: <strong>{detailModal.totalDeliveredTons?.toFixed(1)} t</strong></div>
                    <div>Rate: <strong>ETB {detailModal.adjustedRate || detailModal.baseRate}/t</strong></div>
                    <div>Status: <StatusBadge status={detailModal.status} /></div>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <h4 className="font-semibold text-green-800 mb-2">Financial Summary</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span>Gross Amount:</span> <strong>ETB {detailModal.grossAmount?.toLocaleString()}</strong></div>
                    <div className="flex justify-between text-red-600"><span>Penalties:</span> <strong>-ETB {detailModal.totalPenalties?.toLocaleString()}</strong></div>
                    <div className="flex justify-between text-red-600"><span>Per Diem:</span> <strong>-ETB {detailModal.totalPerDiem?.toLocaleString()}</strong></div>
                    <hr />
                    <div className="flex justify-between text-lg font-bold"><span>Net Amount:</span> <span>ETB {detailModal.netAmount?.toLocaleString()}</span></div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-semibold mb-2">Line Items ({detailModal.lines?.length || 0})</h4>
                <table className="table text-xs">
                  <thead><tr>
                    <th className="th">Type</th>
                    <th className="th">Description</th>
                    <th className="th">Qty</th>
                    <th className="th">Rate</th>
                    <th className="th text-right">Amount</th>
                  </tr></thead>
                  <tbody>
                    {(detailModal.lines || []).map((l: any) => (
                      <tr key={l.id} className="tr">
                        <td className="td"><StatusBadge status={l.type} /></td>
                        <td className="td">{l.description}</td>
                        <td className="td">{l.quantity || '-'}</td>
                        <td className="td">{l.rate ? `ETB ${l.rate}` : '-'}</td>
                        <td className={`td text-right font-medium ${l.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                          ETB {l.amount?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Invoice */}
              {detailModal.invoice && (
                <div className="p-3 bg-yellow-50 rounded">
                  <h4 className="font-semibold mb-1">Invoice: {detailModal.invoice.invoiceNumber}</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>Total: <strong>ETB {detailModal.invoice.totalAmount?.toLocaleString()}</strong></div>
                    <div>Paid: <strong className="text-green-700">ETB {detailModal.invoice.paidAmount?.toLocaleString()}</strong></div>
                    <div>Balance: <strong className="text-red-600">ETB {detailModal.invoice.balanceDue?.toLocaleString()}</strong></div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2 border-t">
                {detailModal.status === 'draft' && (
                  <button onClick={() => doAction(detailModal.id, 'review')} className="btn-primary text-xs py-1.5 px-3">
                    <Search className="w-3 h-3 inline mr-1" />Mark as Reviewed
                  </button>
                )}
                {['draft', 'reviewed'].includes(detailModal.status) && (
                  <button onClick={() => doAction(detailModal.id, 'approve')} className="btn-success text-xs py-1.5 px-3">
                    <CheckCircle className="w-3 h-3 inline mr-1" />Approve
                  </button>
                )}
                {detailModal.status === 'approved' && !detailModal.invoice && (
                  <button onClick={() => doAction(detailModal.id, 'invoice')} className="py-1.5 px-3 text-xs bg-purple-600 text-white rounded hover:bg-purple-700">
                    <DollarSign className="w-3 h-3 inline mr-1" />Generate Invoice
                  </button>
                )}
              </div>

              {/* Collection Tracking */}
              {(detailModal.shortageQuantity > 0 || detailModal.collectedAmount > 0) && (
                <div className="p-3 bg-amber-50 rounded">
                  <h4 className="font-semibold text-amber-800 mb-2">Collection Tracking</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {detailModal.shortageQuantity > 0 && (
                      <>
                        <div>Shortage: <strong className="text-red-600">{detailModal.shortageQuantity?.toFixed(2)} t</strong></div>
                        <div>Shortage Value: <strong className="text-red-600">ETB {detailModal.shortageValue?.toLocaleString()}</strong></div>
                        <div>Customer Deduction: <strong className="text-red-600">ETB {detailModal.customerDeductionAmount?.toLocaleString()}</strong></div>
                      </>
                    )}
                    <div>Collectible: <strong>ETB {detailModal.finalCollectibleAmount?.toLocaleString()}</strong></div>
                    <div>Collected: <strong className="text-green-700">ETB {detailModal.collectedAmount?.toLocaleString()}</strong></div>
                    <div>Remaining: <strong className="text-red-600">ETB {detailModal.remainingAmount?.toLocaleString()}</strong></div>
                  </div>
                </div>
              )}

              {detailModal.notes && (
                <div className="p-3 bg-gray-50 rounded text-gray-600 text-xs">{detailModal.notes}</div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Record Collection Modal */}
      {collectModal && (
        <Modal title={`Record Collection: ${collectModal.settlementNumber}`} onClose={() => setCollectModal(null)}>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded text-sm space-y-1">
              <p>Customer: <strong>{collectModal.order?.customer?.companyName}</strong></p>
              <p>Net Amount: <strong>ETB {collectModal.netAmount?.toLocaleString()}</strong></p>
              <p>Already Collected: <strong className="text-green-600">ETB {(collectModal.collectedAmount || 0).toLocaleString()}</strong></p>
              <p>Remaining: <strong className="text-red-600">ETB {(collectModal.remainingAmount || 0).toLocaleString()}</strong></p>
            </div>
            <div>
              <label className="label">Collection Amount (ETB) *</label>
              <input type="number" step="0.01" className="input" value={collectAmount}
                onChange={e => setCollectAmount(e.target.value)} placeholder="Amount received" />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={collectNotes} onChange={e => setCollectNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCollectModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={recordCollection} disabled={collecting || !collectAmount} className="btn-success">
                {collecting ? 'Recording...' : 'Record Collection'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
