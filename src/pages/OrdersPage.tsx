import { useEffect, useState } from 'react';
import { Plus, CheckCircle, XCircle, Eye, FileText, Truck, Edit3, AlertTriangle, Search } from 'lucide-react';
import { orderApi, customerApi, orderRevisionApi, penaltyApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDualDate } from '../utils/ethCalendar';
import DateTimeInput from '../components/ui/DateTimeInput';

const empty = { customerId:'', orderType:'cement', quantity:'', materialType:'',
  pickupLocation:'', deliveryLocation:'', requiredDeliveryDate:'', ratePerTon:'',
  paymentType:'cash', poNumber:'', notes:'', deliverySite:'', itemProduct:'' };

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [lifecycle, setLifecycle] = useState<any>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState<{id:string}|null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Phase 2: Revisions & Penalties
  const [lifecycleTab, setLifecycleTab] = useState<'overview'|'revisions'|'penalties'>('overview');
  const [revisions, setRevisions] = useState<any[]>([]);
  const [penalties, setPenalties] = useState<any[]>([]);
  const [revisionModal, setRevisionModal] = useState<{orderId:string}|null>(null);
  const [revForm, setRevForm] = useState({ fieldChanged:'ratePerTon', newValue:'', reason:'' });
  const [penaltyModal, setPenaltyModal] = useState<{orderId:string}|null>(null);
  const [penForm, setPenForm] = useState({ type:'shortage', description:'', amount:'', quantityAffected:'', rateApplied:'' });

  const load = () => {
    setLoading(true);
    Promise.all([
      orderApi.list({ status: filterStatus||undefined, orderType: filterType||undefined }),
      customerApi.list(),
    ]).then(([oRes, cRes]) => {
      setOrders(oRes.data.orders || []);
      setCustomers(cRes.data.customers || []);
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterStatus, filterType]);

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      await orderApi.create({ ...form, quantity: Number(form.quantity), ratePerTon: Number(form.ratePerTon) });
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string, data?: any) => {
    try {
      await orderApi.updateStatus(id, { status, ...data });
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const openLifecycle = async (o: any) => {
    setLifecycleLoading(true); setLifecycle(null); setLifecycleTab('overview');
    try {
      const [lcRes, revRes, penRes] = await Promise.all([
        orderApi.lifecycle(o.orderNumber),
        orderRevisionApi.list({ orderId: o.id }),
        penaltyApi.list({ orderId: o.id }),
      ]);
      setLifecycle(lcRes.data);
      setRevisions(revRes.data.revisions || []);
      setPenalties(penRes.data.penalties || []);
    } catch (e: any) { alert('Failed to load lifecycle'); }
    finally { setLifecycleLoading(false); }
  };

  const submitRevision = async () => {
    if (!revisionModal) return;
    try {
      await orderRevisionApi.create({ orderId: revisionModal.orderId, ...revForm });
      setRevisionModal(null);
      const res = await orderRevisionApi.list({ orderId: revisionModal.orderId });
      setRevisions(res.data.revisions || []);
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const submitPenalty = async () => {
    if (!penaltyModal) return;
    try {
      await penaltyApi.create({ orderId: penaltyModal.orderId, ...penForm, amount: Number(penForm.amount) });
      setPenaltyModal(null);
      const res = await penaltyApi.list({ orderId: penaltyModal.orderId });
      setPenalties(res.data.penalties || []);
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const STATUSES = ['submitted','approved','scheduled','dispatched','in_transit','delivered','invoiced','paid','rejected'];

  const filteredOrders = orders.filter((o: any) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (o.orderNumber && String(o.orderNumber).toLowerCase().includes(term)) ||
      (o.poNumber && String(o.poNumber).toLowerCase().includes(term)) ||
      (o.customer?.companyName && String(o.customer.companyName).toLowerCase().includes(term)) ||
      (o.pickupLocation && String(o.pickupLocation).toLowerCase().includes(term)) ||
      (o.deliveryLocation && String(o.deliveryLocation).toLowerCase().includes(term)) ||
      String(o.quantity).includes(term) ||
      String(o.totalDelivered).includes(term)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search order #, customer, PO..."
              className="input pl-9 w-60 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="select w-40" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select w-36" value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="cement">Cement</option>
            <option value="gravel">Gravel</option>
          </select>
        </div>
        <button onClick={()=>{ setForm(empty); setError(''); setModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4"/>New Order
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th className="th">Order #</th><th className="th">Customer</th>
            <th className="th">Type</th><th className="th">Qty (t)</th>
            <th className="th">Delivered</th><th className="th">Remaining</th>
            <th className="th">Trips</th><th className="th">Rate/t</th>
            <th className="th">Status</th><th className="th">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={10} className="td text-center py-10 text-gray-400">No orders found</td></tr>
            ) : filteredOrders.map((o:any) => (
              <tr key={o.id} className="tr cursor-pointer" onClick={()=>setDetail(o)}>
                <td className="td font-mono text-xs font-semibold text-blue-700">{o.orderNumber}</td>
                <td className="td">{o.customer?.companyName}</td>
                <td className="td"><StatusBadge status={o.orderType} /></td>
                <td className="td">{o.quantity}</td>
                <td className="td font-medium text-green-700">{o.totalDelivered || 0}</td>
                <td className="td font-medium text-orange-600">{o.remainingQty ?? o.quantity}</td>
                <td className="td text-center">{o.totalTrips || 0}</td>
                <td className="td">{o.ratePerTon ? `ETB ${o.ratePerTon}` : '-'}</td>
                <td className="td"><StatusBadge status={o.status} /></td>
                <td className="td" onClick={e=>e.stopPropagation()}>
                  <div className="flex gap-1">
                    {o.status === 'submitted' && <>
                      <button onClick={()=>updateStatus(o.id,'approved')} className="btn-success py-1 px-2 text-xs">
                        <CheckCircle className="w-3 h-3"/>Approve
                      </button>
                      <button onClick={()=>{ setRejectModal({id:o.id}); setRejectReason(''); }} className="btn-danger py-1 px-2 text-xs">
                        <XCircle className="w-3 h-3"/>Reject
                      </button>
                    </>}
                    {o.status === 'approved' && (
                      <button onClick={()=>updateStatus(o.id,'scheduled')} className="btn-primary py-1 px-2 text-xs">Schedule</button>
                    )}
                    <button onClick={()=>openLifecycle(o)} className="py-1 px-2 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100">
                      <Eye className="w-3 h-3 inline mr-1"/>Lifecycle
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Order Modal */}
      {modal && (
        <Modal title="New Transport Order" onClose={()=>setModal(false)} size="max-w-2xl">
          <form onSubmit={save} className="grid grid-cols-2 gap-3">
            {error && <div className="col-span-2 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div className="col-span-2">
              <label className="label">Customer *</label>
              <select className="select" value={form.customerId} onChange={e=>setForm((f:any)=>({...f,customerId:e.target.value}))} required>
                <option value="">Select customer...</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Order Type *</label>
              <select className="select" value={form.orderType} onChange={e=>setForm((f:any)=>({...f,orderType:e.target.value}))}>
                <option value="cement">Cement</option>
                <option value="gravel">Gravel</option>
              </select>
            </div>
            <div>
              <label className="label">Item / Product</label>
              <input className="input" value={form.itemProduct} onChange={e=>setForm((f:any)=>({...f,itemProduct:e.target.value}))} placeholder="e.g. OPC 42.5, PPC" />
            </div>
            <div>
              <label className="label">Quantity (tons) *</label>
              <input type="number" className="input" value={form.quantity} onChange={e=>setForm((f:any)=>({...f,quantity:e.target.value}))} required />
            </div>
            <div>
              <label className="label">Material Type</label>
              <input className="input" value={form.materialType} onChange={e=>setForm((f:any)=>({...f,materialType:e.target.value}))} />
            </div>
            <div>
              <label className="label">Rate Per Ton (ETB)</label>
              <input type="number" className="input" value={form.ratePerTon} onChange={e=>setForm((f:any)=>({...f,ratePerTon:e.target.value}))} />
            </div>
            <div>
              <label className="label">Pickup Location *</label>
              <input className="input" value={form.pickupLocation} onChange={e=>setForm((f:any)=>({...f,pickupLocation:e.target.value}))} required />
            </div>
            <div>
              <label className="label">Delivery Location *</label>
              <input className="input" value={form.deliveryLocation} onChange={e=>setForm((f:any)=>({...f,deliveryLocation:e.target.value}))} required />
            </div>
            <div>
              <label className="label">Delivery Site</label>
              <input className="input" value={form.deliverySite} onChange={e=>setForm((f:any)=>({...f,deliverySite:e.target.value}))} placeholder="Specific site name" />
            </div>
            <div>
              <label className="label">Required Delivery Date</label>
              <DateTimeInput value={form.requiredDeliveryDate} onChange={val=>setForm((f:any)=>({...f,requiredDeliveryDate:val}))} />
            </div>
            <div>
              <label className="label">Payment Type</label>
              <select className="select" value={form.paymentType} onChange={e=>setForm((f:any)=>({...f,paymentType:e.target.value}))}>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-md">
              <label className="label text-amber-900 font-bold flex items-center gap-1">
                PO Number
                <span className="text-[10px] font-normal text-amber-700 ml-1">(customer PO reference)</span>
              </label>
              <input
                className="input font-semibold text-base bg-white border-amber-400"
                value={form.poNumber}
                onChange={e=>setForm((f:any)=>({...f,poNumber:e.target.value}))}
                placeholder="e.g. PO-2026-0001"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={e=>setForm((f:any)=>({...f,notes:e.target.value}))} />
            </div>
            <div className="col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving?'Submitting...':'Submit Order'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal title="Reject Order" onClose={()=>setRejectModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Reason for rejection</label>
              <textarea className="input" rows={3} value={rejectReason} onChange={e=>setRejectReason(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setRejectModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={()=>{ updateStatus(rejectModal.id,'rejected',{rejectionReason:rejectReason}); setRejectModal(null); }} className="btn-danger">Reject Order</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {detail && (
        <Modal title={`Order: ${detail.orderNumber}`} onClose={()=>setDetail(null)} size="max-w-2xl">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{detail.customer?.companyName}</span></div>
              <div><span className="text-gray-500">Type:</span> <StatusBadge status={detail.orderType} /></div>
              <div><span className="text-gray-500">Quantity:</span> <span className="font-medium">{detail.quantity} tons</span></div>
              <div><span className="text-gray-500">Rate:</span> <span className="font-medium">ETB {detail.ratePerTon}/t</span></div>
              {detail.itemProduct && <div><span className="text-gray-500">Product:</span> <span className="font-medium">{detail.itemProduct}</span></div>}
              {detail.deliverySite && <div><span className="text-gray-500">Site:</span> <span className="font-medium">{detail.deliverySite}</span></div>}
              <div className="col-span-2"><span className="text-gray-500">Route:</span> <span className="font-medium">{detail.route || `${detail.pickupLocation} -> ${detail.deliveryLocation}`}</span></div>
              <div><span className="text-gray-500">Status:</span> <StatusBadge status={detail.status} /></div>
              <div><span className="text-gray-500">Payment:</span> <StatusBadge status={detail.paymentType} /></div>
              <div><span className="text-gray-500">Delivered:</span> <span className="font-medium text-green-700">{detail.totalDelivered || 0} tons</span></div>
              <div><span className="text-gray-500">Remaining:</span> <span className="font-medium text-orange-600">{detail.remainingQty ?? detail.quantity} tons</span></div>
              <div><span className="text-gray-500">Total Trips:</span> <span className="font-medium">{detail.totalTrips || 0}</span></div>
            </div>
            {detail.notes && <div className="p-3 bg-gray-50 rounded text-gray-600">{detail.notes}</div>}
            <div className="flex justify-end">
              <button onClick={()=>openLifecycle(detail)} className="btn-primary text-xs py-1 px-3">
                <Eye className="w-3 h-3 inline mr-1"/>View Full Lifecycle
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lifecycle Modal */}
      {(lifecycle || lifecycleLoading) && (
        <Modal title={lifecycle ? `Lifecycle: ${lifecycle.order.orderNumber}` : 'Loading...'} onClose={()=>{ setLifecycle(null); setLifecycleLoading(false); }} size="max-w-4xl">
          {lifecycleLoading ? (
            <div className="text-center py-10 text-gray-400">Loading lifecycle...</div>
          ) : lifecycle && (
            <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto">
              {/* Tabs */}
              <div className="flex gap-1 border-b">
                {(['overview','revisions','penalties'] as const).map(tab => (
                  <button key={tab} onClick={()=>setLifecycleTab(tab)}
                    className={`px-4 py-2 text-xs font-medium border-b-2 capitalize ${lifecycleTab===tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {tab} {tab==='revisions' && revisions.length>0 ? `(${revisions.length})` : tab==='penalties' && penalties.length>0 ? `(${penalties.length})` : ''}
                  </button>
                ))}
              </div>

              {lifecycleTab === 'overview' && <>
                {/* Order Summary */}
                <div className="p-3 bg-blue-50 rounded">
                  <h4 className="font-semibold text-blue-800 mb-2">Order Summary</h4>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>Customer: <strong>{lifecycle.order.customer?.companyName}</strong></div>
                    <div>Qty: <strong>{lifecycle.order.quantity} t</strong></div>
                    <div>Rate: <strong>ETB {lifecycle.order.adjustedRate || lifecycle.order.ratePerTon}/t</strong></div>
                    <div>Status: <StatusBadge status={lifecycle.order.status} /></div>
                  </div>
                </div>

                {/* Trip Summary Cards */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 bg-green-50 rounded text-center">
                    <div className="text-lg font-bold text-green-700">{lifecycle.tripSummary.totalDelivered.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">Tons Delivered</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded text-center">
                    <div className="text-lg font-bold text-blue-700">{lifecycle.tripSummary.completedTrips}/{lifecycle.tripSummary.totalTrips}</div>
                    <div className="text-xs text-gray-500">Trips Completed</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded text-center">
                    <div className="text-lg font-bold text-purple-700">ETB {(lifecycle.tripSummary.totalRevenue || 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Total Revenue</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded text-center">
                    <div className="text-lg font-bold text-orange-700">{lifecycle.tripSummary.podCount}/{lifecycle.tripSummary.totalTrips}</div>
                    <div className="text-xs text-gray-500">PODs Collected</div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-3 bg-gray-50 rounded">
                  <h4 className="font-semibold mb-2">Financial Summary</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>Total Advances: <strong className="text-red-600">ETB {(lifecycle.tripSummary.totalAdvances || 0).toLocaleString()}</strong></div>
                    <div>Total Fuel Cost: <strong className="text-red-600">ETB {(lifecycle.tripSummary.totalFuelCost || 0).toLocaleString()}</strong></div>
                    <div>Total Shortage: <strong className="text-orange-600">{(lifecycle.tripSummary.totalShortage || 0).toFixed(2)} t</strong></div>
                  </div>
                </div>

                {/* Trips Table */}
                <div>
                  <h4 className="font-semibold mb-2">Linked Trips ({lifecycle.order.trips.length})</h4>
                  {lifecycle.order.trips.length === 0 ? (
                    <div className="text-gray-400 text-center py-4">No trips linked yet</div>
                  ) : (
                    <table className="table text-xs">
                      <thead><tr>
                        <th className="th">Trip #</th><th className="th">Vehicle</th><th className="th">Driver</th>
                        <th className="th">Loaded</th><th className="th">Delivered</th><th className="th">Shortage</th>
                        <th className="th">POD</th><th className="th">Confirmed</th><th className="th">Status</th>
                      </tr></thead>
                      <tbody>
                        {lifecycle.order.trips.map((t: any) => (
                          <tr key={t.id} className="tr">
                            <td className="td font-mono">{t.tripNumber}</td>
                            <td className="td">{t.vehicle?.plateNumber}</td>
                            <td className="td">{t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : '-'}</td>
                            <td className="td">{t.loadedQuantityTons || '-'}</td>
                            <td className="td font-medium">{t.deliveredQuantityTons || '-'}</td>
                            <td className="td text-orange-600">{t.shortage > 0 ? t.shortage.toFixed(2) : '-'}</td>
                            <td className="td">{t.podUrl || t.podDocument ? <span title="POD uploaded"><FileText className="w-4 h-4 text-green-600 inline" /></span> : <span className="text-red-400">Missing</span>}</td>
                            <td className="td"><StatusBadge status={t.customerConfirmationStatus || 'pending'} /></td>
                            <td className="td"><StatusBadge status={t.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Invoice */}
                {lifecycle.order.invoice && (
                  <div className="p-3 bg-yellow-50 rounded">
                    <h4 className="font-semibold mb-1">Invoice: {lifecycle.order.invoice.invoiceNumber}</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>Total: <strong>ETB {lifecycle.order.invoice.totalAmount?.toLocaleString()}</strong></div>
                      <div>Paid: <strong className="text-green-700">ETB {lifecycle.order.invoice.paidAmount?.toLocaleString()}</strong></div>
                      <div>Balance: <strong className="text-red-600">ETB {lifecycle.order.invoice.balanceDue?.toLocaleString()}</strong></div>
                    </div>
                  </div>
                )}

                {/* Status History */}
                {lifecycle.order.statusHistory?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Order Status History</h4>
                    <div className="space-y-1">
                      {lifecycle.order.statusHistory.map((h: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-32">{formatDualDate(h.changedAt)}</span>
                          <StatusBadge status={h.status} />
                          {h.note && <span className="text-gray-500">- {h.note}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>}

              {lifecycleTab === 'revisions' && <>
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Order Revisions / Amendments</h4>
                  <button onClick={()=>{ setRevisionModal({orderId:lifecycle.order.id}); setRevForm({fieldChanged:'ratePerTon',newValue:'',reason:''}); }}
                    className="btn-primary text-xs py-1 px-3"><Edit3 className="w-3 h-3 inline mr-1"/>Request Revision</button>
                </div>
                {revisions.length === 0 ? (
                  <div className="text-gray-400 text-center py-6">No revisions yet</div>
                ) : (
                  <table className="table text-xs">
                    <thead><tr>
                      <th className="th">#</th><th className="th">Field</th><th className="th">Old</th>
                      <th className="th">New</th><th className="th">Reason</th><th className="th">Status</th><th className="th">Actions</th>
                    </tr></thead>
                    <tbody>
                      {revisions.map((r: any) => (
                        <tr key={r.id} className="tr">
                          <td className="td">{r.revisionNumber}</td>
                          <td className="td font-mono">{r.fieldChanged}</td>
                          <td className="td text-red-600">{r.oldValue}</td>
                          <td className="td text-green-700 font-medium">{r.newValue}</td>
                          <td className="td">{r.reason}</td>
                          <td className="td"><StatusBadge status={r.status} /></td>
                          <td className="td">
                            {r.status === 'pending' && (
                              <div className="flex gap-1">
                                <button onClick={async()=>{ await orderRevisionApi.approve(r.id); const res=await orderRevisionApi.list({orderId:lifecycle.order.id}); setRevisions(res.data.revisions||[]); load(); }}
                                  className="btn-success py-0.5 px-2 text-xs"><CheckCircle className="w-3 h-3"/>Approve</button>
                                <button onClick={async()=>{ await orderRevisionApi.reject(r.id); const res=await orderRevisionApi.list({orderId:lifecycle.order.id}); setRevisions(res.data.revisions||[]); }}
                                  className="btn-danger py-0.5 px-2 text-xs"><XCircle className="w-3 h-3"/>Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>}

              {lifecycleTab === 'penalties' && <>
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Order Penalties</h4>
                  <button onClick={()=>{ setPenaltyModal({orderId:lifecycle.order.id}); setPenForm({type:'shortage',description:'',amount:'',quantityAffected:'',rateApplied:''}); }}
                    className="btn-primary text-xs py-1 px-3"><AlertTriangle className="w-3 h-3 inline mr-1"/>Add Penalty</button>
                </div>
                {penalties.length === 0 ? (
                  <div className="text-gray-400 text-center py-6">No penalties recorded</div>
                ) : (
                  <table className="table text-xs">
                    <thead><tr>
                      <th className="th">Type</th><th className="th">Description</th><th className="th">Qty</th>
                      <th className="th">Rate</th><th className="th">Amount</th><th className="th">Status</th><th className="th">Actions</th>
                    </tr></thead>
                    <tbody>
                      {penalties.map((p: any) => (
                        <tr key={p.id} className="tr">
                          <td className="td"><StatusBadge status={p.type} /></td>
                          <td className="td">{p.description || '-'}</td>
                          <td className="td">{p.quantityAffected || '-'}</td>
                          <td className="td">{p.rateApplied ? `ETB ${p.rateApplied}` : '-'}</td>
                          <td className="td font-medium text-red-600">ETB {p.amount?.toLocaleString()}</td>
                          <td className="td"><StatusBadge status={p.status} /></td>
                          <td className="td">
                            {p.status === 'pending' && (
                              <div className="flex gap-1">
                                <button onClick={async()=>{ await penaltyApi.approve(p.id); const res=await penaltyApi.list({orderId:lifecycle.order.id}); setPenalties(res.data.penalties||[]); }}
                                  className="btn-success py-0.5 px-2 text-xs">Approve</button>
                                <button onClick={async()=>{ const reason=prompt('Waive reason:'); if(reason){ await penaltyApi.waive(p.id,reason); const res=await penaltyApi.list({orderId:lifecycle.order.id}); setPenalties(res.data.penalties||[]); } }}
                                  className="py-0.5 px-2 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100">Waive</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>}
            </div>
          )}
        </Modal>
      )}

      {/* Revision Request Modal */}
      {revisionModal && (
        <Modal title="Request Order Revision" onClose={()=>setRevisionModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Field to Change *</label>
              <select className="select" value={revForm.fieldChanged} onChange={e=>setRevForm(f=>({...f,fieldChanged:e.target.value}))}>
                <option value="ratePerTon">Rate Per Ton</option>
                <option value="quantity">Quantity</option>
                <option value="deliveryLocation">Delivery Location</option>
                <option value="pickupLocation">Pickup Location</option>
                <option value="deliverySite">Delivery Site</option>
                <option value="itemProduct">Item/Product</option>
              </select>
            </div>
            <div>
              <label className="label">New Value *</label>
              <input className="input" value={revForm.newValue} onChange={e=>setRevForm(f=>({...f,newValue:e.target.value}))} />
            </div>
            <div>
              <label className="label">Reason *</label>
              <textarea className="input" rows={2} value={revForm.reason} onChange={e=>setRevForm(f=>({...f,reason:e.target.value}))} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setRevisionModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={submitRevision} disabled={!revForm.newValue||!revForm.reason} className="btn-primary">Submit Revision</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Penalty Modal */}
      {penaltyModal && (
        <Modal title="Add Penalty" onClose={()=>setPenaltyModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="label">Penalty Type *</label>
              <select className="select" value={penForm.type} onChange={e=>setPenForm(f=>({...f,type:e.target.value}))}>
                <option value="shortage">Shortage</option>
                <option value="delay">Delay</option>
                <option value="damage">Damage</option>
                <option value="demurrage">Demurrage</option>
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={penForm.description} onChange={e=>setPenForm(f=>({...f,description:e.target.value}))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Qty Affected</label>
                <input type="number" className="input" value={penForm.quantityAffected} onChange={e=>setPenForm(f=>({...f,quantityAffected:e.target.value}))} />
              </div>
              <div>
                <label className="label">Rate</label>
                <input type="number" className="input" value={penForm.rateApplied} onChange={e=>setPenForm(f=>({...f,rateApplied:e.target.value}))} />
              </div>
              <div>
                <label className="label">Amount (ETB) *</label>
                <input type="number" className="input" value={penForm.amount} onChange={e=>setPenForm(f=>({...f,amount:e.target.value}))} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setPenaltyModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={submitPenalty} disabled={!penForm.amount} className="btn-primary">Add Penalty</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
