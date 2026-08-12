import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, DollarSign, Fuel, AlertTriangle, Landmark, Send, Clock, ArrowRightLeft, CheckCircle, XCircle, Plus } from 'lucide-react';
import { cashierApi, cashTransferApi, employeeApi, vehicleApi, mainCashApi, authApi } from '../services/api';
import { formatDualDate } from '../utils/ethCalendar';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import DateInput from '../components/ui/DateInput';
import StatCard from '../components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type TabKey = 'transactions' | 'advances' | 'fuel' | 'fuel_analytics' | 'main_cash' | 'sessions' | 'transfers' | 'reconciliation';

export default function CashierPage() {
  const [tab, setTab] = useState<TabKey>('transactions');
  const [cashier, setCashier] = useState<any>(null);
  const [allCashiers, setAllCashiers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txModal, setTxModal] = useState<'in' | 'out' | null>(null);
  const [advanceModal, setAdvanceModal] = useState(false);
  const [fuelModal, setFuelModal] = useState(false);
  const [txForm, setTxForm] = useState({ amount: '', description: '', reference: '', paymentMethod: 'cash', category: '' });
  const [advForm, setAdvForm] = useState({ driverId: '', amount: '', reason: '' });
  const [fuelForm, setFuelForm] = useState({ vehicleId: '', liters: '', costPerLiter: '', odometerKm: '', fuelStation: '' });
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [fuelAnalyticsData, setFuelAnalyticsData] = useState<any>(null);
  const [fuelAnalyticsLoading, setFuelAnalyticsLoading] = useState(false);
  // Main cash state
  const [mainCashData, setMainCashData] = useState<any>(null);
  const [mainCashLoading, setMainCashLoading] = useState(false);
  const [cashActionModal, setCashActionModal] = useState<'allocate'|'return'|'deposit'|null>(null);
  const [cashActionForm, setCashActionForm] = useState({ cashierId: '', amount: '', reference: '', notes: '' });
  // Session state
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [closeSessionModal, setCloseSessionModal] = useState(false);
  const [closeForm, setCloseForm] = useState({ closingBalance: '', notes: '' });
  const [todaySession, setTodaySession] = useState<any>(null);
  // Transfer state
  const [transfers, setTransfers] = useState<any[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromCashierId: '', toCashierId: '', amount: '', reason: '' });
  // Add Cashier state
  const [addCashierModal, setAddCashierModal] = useState(false);
  const [addCashierForm, setAddCashierForm] = useState({ userId: '', name: '', location: '', code: '', floatAmount: '' });
  const [users, setUsers] = useState<any[]>([]);
  // Reconciliation state
  const [reconData, setReconData] = useState<any>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconDate, setReconDate] = useState(new Date().toISOString().split('T')[0]);

  const loadCashier = () => {
    cashierApi.getMyCashier().then(r => setCashier(r.data.cashier)).catch(console.error);
  };

  const loadAllCashiers = () => {
    cashierApi.list().then(r => setAllCashiers(r.data.cashiers || [])).catch(console.error);
  };

  const load = () => {
    setLoading(true);
    let promise: Promise<any>;
    if (tab === 'transactions') promise = cashierApi.listTransactions();
    else if (tab === 'advances') promise = cashierApi.listAdvances();
    else promise = cashierApi.listFuelLogs();
    promise.then(r => setItems(r.data.transactions || r.data.advances || r.data.fuelLogs || []))
      .catch(console.error).finally(() => setLoading(false));
  };

  const loadSessions = () => {
    if (!cashier) return;
    setSessionsLoading(true);
    cashierApi.getSessions(cashier.id).then(r => {
      setSessions(r.data.sessions || []);
      const today = new Date().toISOString().split('T')[0];
      const ts = (r.data.sessions || []).find((s: any) => s.sessionDate === today);
      setTodaySession(ts || null);
    }).catch(console.error).finally(() => setSessionsLoading(false));
  };

  const loadTransfers = () => {
    setTransfersLoading(true);
    cashTransferApi.list().then(r => setTransfers(r.data.transfers || []))
      .catch(console.error).finally(() => setTransfersLoading(false));
  };

  const loadReconciliation = () => {
    setReconLoading(true);
    cashierApi.dailyReconciliation({ date: reconDate }).then(r => setReconData(r.data))
      .catch(console.error).finally(() => setReconLoading(false));
  };

  useEffect(() => { loadCashier(); loadAllCashiers(); }, []);
  useEffect(() => {
    if (tab === 'transactions' || tab === 'advances' || tab === 'fuel') load();
  }, [tab]);

  useEffect(() => {
    if (tab === 'fuel_analytics' && !fuelAnalyticsData) {
      setFuelAnalyticsLoading(true);
      cashierApi.fuelAnalytics().then(r => setFuelAnalyticsData(r.data)).catch(console.error).finally(() => setFuelAnalyticsLoading(false));
    }
    if (tab === 'main_cash') {
      setMainCashLoading(true);
      mainCashApi.get().then(r => setMainCashData(r.data)).catch(console.error).finally(() => setMainCashLoading(false));
    }
    if (tab === 'sessions' && cashier) loadSessions();
    if (tab === 'transfers') loadTransfers();
    if (tab === 'reconciliation') loadReconciliation();
  }, [tab, cashier]);

  useEffect(() => {
    if ((advanceModal || fuelModal) && employees.length === 0) {
      employeeApi.list().then(r => setEmployees(r.data.employees || []));
      vehicleApi.list().then(r => setVehicles(r.data.vehicles || []));
    }
  }, [advanceModal, fuelModal]);

  useEffect(() => {
    if (addCashierModal && users.length === 0) {
      authApi.listUsers().then(r => setUsers(r.data.users || r.data || [])).catch(console.error);
    }
  }, [addCashierModal]);

  const doTransaction = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!cashier) { alert('No cashier record found'); return; }
    setSaving(true);
    try {
      if (txModal === 'in') {
        await cashierApi.receivePayment(cashier.id, { ...txForm, amount: Number(txForm.amount) });
      } else {
        await cashierApi.makePayment(cashier.id, { ...txForm, amount: Number(txForm.amount) });
      }
      setTxModal(null); loadCashier(); load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const doAdvance = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      const res = await cashierApi.createAdvance({ ...advForm, amount: Number(advForm.amount) });
      setAdvanceModal(false); load();
      if (res.data.requiresApproval) {
        alert(res.data.message || 'This advance requires approval. Check the Approvals page.');
      }
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const doFuel = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      await cashierApi.createFuelLog({
        ...fuelForm,
        liters: Number(fuelForm.liters),
        costPerLiter: Number(fuelForm.costPerLiter),
        odometerKm: fuelForm.odometerKm ? Number(fuelForm.odometerKm) : undefined,
        cashierId: cashier?.id
      });
      setFuelModal(false); loadCashier(); load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const settleAdvance = async (id: string) => {
    if (!cashier) { alert('No cashier record'); return; }
    try {
      await cashierApi.settleAdvance(id, { cashierId: cashier.id });
      loadCashier(); load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const openSession = async () => {
    if (!cashier) return;
    setSaving(true);
    try {
      await cashierApi.openSession(cashier.id);
      loadSessions(); loadCashier();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const doCloseSession = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      await cashierApi.closeSession(cashier.id, {
        closingBalance: Number(closeForm.closingBalance),
        notes: closeForm.notes || undefined,
      });
      setCloseSessionModal(false); loadSessions(); loadCashier();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const reconcileSession = async (sessionId: string) => {
    try {
      await cashierApi.reconcileSession(sessionId);
      if (tab === 'sessions') loadSessions();
      if (tab === 'reconciliation') loadReconciliation();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const doTransfer = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      await cashTransferApi.create({
        fromCashierId: transferForm.fromCashierId,
        toCashierId: transferForm.toCashierId,
        amount: Number(transferForm.amount),
        reason: transferForm.reason,
      });
      setTransferModal(false); loadTransfers();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const approveTransfer = async (id: string) => {
    try { await cashTransferApi.approve(id); loadTransfers(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const completeTransfer = async (id: string) => {
    try { await cashTransferApi.complete(id); loadTransfers(); loadCashier(); loadAllCashiers(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const rejectTransfer = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;
    try { await cashTransferApi.reject(id, { reason }); loadTransfers(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const doAddCashier = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      await cashierApi.create({
        userId: addCashierForm.userId,
        name: addCashierForm.name,
        location: addCashierForm.location || undefined,
        code: addCashierForm.code || undefined,
        floatAmount: addCashierForm.floatAmount ? Number(addCashierForm.floatAmount) : 0,
      });
      setAddCashierModal(false); loadAllCashiers();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  // Filter users who don't already have a cashier record
  const availableUsers = users.filter((u: any) => !allCashiers.some((c: any) => c.userId === u.id));

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'transactions', label: 'Transactions' },
    { key: 'advances', label: 'Advances' },
    { key: 'fuel', label: 'Fuel' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'transfers', label: 'Transfers' },
    { key: 'reconciliation', label: 'Reconciliation' },
    { key: 'fuel_analytics', label: 'Fuel Analytics' },
    { key: 'main_cash', label: 'Main Cash' },
  ];

  return (
    <div className="space-y-5">
      {cashier && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Current Balance" value={`ETB ${cashier.currentBalance?.toLocaleString()}`} icon={DollarSign} color="green" />
          <StatCard title="Float Amount" value={`ETB ${cashier.floatAmount?.toLocaleString()}`} icon={DollarSign} color="blue" />
          <StatCard title="Location" value={cashier.location || 'Not set'} icon={Landmark} color="purple" />
          <StatCard title="Session" value={todaySession ? (todaySession.status === 'open' ? 'Open' : 'Closed') : 'No Session'} icon={Clock} color={todaySession?.status === 'open' ? 'green' : 'gray'} />
        </div>
      )}
      {!cashier && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          No cashier record linked to your account.
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>{t.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {tab === 'transactions' && (
            <>
              <button onClick={() => { setTxForm({ amount: '', description: '', reference: '', paymentMethod: 'cash', category: 'income' }); setTxModal('in'); }} className="btn-success py-1.5 px-3 text-sm">
                <ArrowDown className="w-4 h-4" />Receive
              </button>
              <button onClick={() => { setTxForm({ amount: '', description: '', reference: '', paymentMethod: 'cash', category: 'expense' }); setTxModal('out'); }} className="btn-danger py-1.5 px-3 text-sm">
                <ArrowUp className="w-4 h-4" />Pay Out
              </button>
            </>
          )}
          {tab === 'advances' && (
            <button onClick={() => { setAdvForm({ driverId: '', amount: '', reason: '' }); setAdvanceModal(true); }} className="btn-primary py-1.5 px-3 text-sm">
              <ArrowUp className="w-4 h-4" />Give Advance
            </button>
          )}
          {tab === 'fuel' && (
            <button onClick={() => { setFuelForm({ vehicleId: '', liters: '', costPerLiter: '', odometerKm: '', fuelStation: '' }); setFuelModal(true); }} className="btn-primary py-1.5 px-3 text-sm">
              Log Fuel
            </button>
          )}
          {tab === 'sessions' && cashier && (
            <>
              {!todaySession && <button onClick={openSession} disabled={saving} className="btn-success py-1.5 px-3 text-sm"><Clock className="w-4 h-4" />Open Session</button>}
              {todaySession?.status === 'open' && <button onClick={() => { setCloseForm({ closingBalance: '', notes: '' }); setCloseSessionModal(true); }} className="btn-danger py-1.5 px-3 text-sm"><XCircle className="w-4 h-4" />Close Session</button>}
            </>
          )}
          {tab === 'transfers' && (
            <>
              <button onClick={() => { setTransferForm({ fromCashierId: '', toCashierId: '', amount: '', reason: '' }); setTransferModal(true); }} className="btn-primary py-1.5 px-3 text-sm">
                <ArrowRightLeft className="w-4 h-4" />New Transfer
              </button>
              <button onClick={() => { setAddCashierForm({ userId: '', name: '', location: '', code: '', floatAmount: '' }); setAddCashierModal(true); }} className="btn-secondary py-1.5 px-3 text-sm">
                <Plus className="w-4 h-4" />Add Cashier
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transactions/Advances/Fuel tables */}
      {(tab === 'transactions' || tab === 'advances' || tab === 'fuel') && (
        <div className="table-container">
          <table className="table">
            <thead>
              {tab === 'transactions' && <tr><th className="th">Date</th><th className="th">Type</th><th className="th">Description</th><th className="th">Category</th><th className="th">Amount</th></tr>}
              {tab === 'advances' && <tr><th className="th">Date</th><th className="th">Driver</th><th className="th">Amount</th><th className="th">Reason</th><th className="th">Status</th><th className="th">Actions</th></tr>}
              {tab === 'fuel' && <tr><th className="th">Date</th><th className="th">Vehicle</th><th className="th">Liters</th><th className="th">Cost/L</th><th className="th">Total</th><th className="th">Station</th></tr>}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="td text-center py-10 text-gray-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="td text-center py-10 text-gray-400">No records</td></tr>
              ) : items.map((item: any) => (
                <tr key={item.id} className="tr">
                  {tab === 'transactions' && <>
                    <td className="td text-sm">{formatDualDate(item.createdAt)}</td>
                    <td className="td"><StatusBadge status={item.type} /></td>
                    <td className="td">{item.description}</td>
                    <td className="td text-gray-500">{item.category}</td>
                    <td className={`td font-semibold ${item.type === 'in' ? 'text-green-700' : 'text-red-600'}`}>
                      ETB {item.amount?.toLocaleString()}
                    </td>
                  </>}
                  {tab === 'advances' && <>
                    <td className="td text-sm">{formatDualDate(item.requestedAt || item.createdAt)}</td>
                    <td className="td">{item.driver?.firstName} {item.driver?.lastName}</td>
                    <td className="td font-semibold">ETB {item.amount?.toLocaleString()}</td>
                    <td className="td text-gray-500">{item.reason}</td>
                    <td className="td"><StatusBadge status={item.status} /></td>
                    <td className="td">
                      <div className="flex gap-1 items-center">
                        {item.status === 'requested' && (
                          <button onClick={async () => { try { await cashierApi.approveAdvance(item.id); load(); } catch (e: any) { alert(e.response?.data?.error || 'Failed'); } }} className="btn-primary py-1 px-2 text-xs">Approve</button>
                        )}
                        {item.status === 'pending_approval' && (
                          <span className="text-xs text-amber-600 font-medium">⏳ Awaiting approval workflow</span>
                        )}
                        {item.status === 'approved' && (
                          <button onClick={() => settleAdvance(item.id)} className="btn-success py-1 px-2 text-xs">Pay</button>
                        )}
                      </div>
                    </td>
                  </>}
                  {tab === 'fuel' && <>
                    <td className="td text-sm">{formatDualDate(item.date || item.createdAt)}</td>
                    <td className="td">{item.vehicle?.plateNumber}</td>
                    <td className="td">{item.liters} L</td>
                    <td className="td">ETB {item.costPerLiter}</td>
                    <td className="td font-semibold">ETB {item.totalCost?.toLocaleString()}</td>
                    <td className="td text-gray-500">{item.fuelStation || '-'}</td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sessions Tab */}
      {tab === 'sessions' && (
        sessionsLoading ? <div className="text-center py-10 text-gray-400">Loading sessions...</div> : (
          <div className="space-y-4">
            {todaySession && (
              <div className={`card ${todaySession.status === 'open' ? 'bg-green-50 border-green-200' : todaySession.variance && Math.abs(todaySession.variance) > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                <h3 className="font-semibold text-sm mb-2">Today's Session ({todaySession.sessionDate})</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div><span className="text-gray-500">Opening:</span> <span className="font-semibold">ETB {todaySession.openingBalance?.toLocaleString()}</span></div>
                  <div><span className="text-gray-500">Cash In:</span> <span className="font-semibold text-green-600">ETB {todaySession.totalCashIn?.toLocaleString()}</span></div>
                  <div><span className="text-gray-500">Cash Out:</span> <span className="font-semibold text-red-600">ETB {todaySession.totalCashOut?.toLocaleString()}</span></div>
                  {todaySession.status !== 'open' && (
                    <>
                      <div><span className="text-gray-500">Closing:</span> <span className="font-semibold">ETB {todaySession.closingBalance?.toLocaleString()}</span></div>
                      <div><span className="text-gray-500">Variance:</span> <span className={`font-semibold ${todaySession.variance && Math.abs(todaySession.variance) > 0 ? 'text-red-600' : 'text-green-600'}`}>ETB {todaySession.variance?.toLocaleString()}</span></div>
                    </>
                  )}
                </div>
                <div className="mt-2">
                  <StatusBadge status={todaySession.status} />
                </div>
              </div>
            )}

            <div className="table-container">
              <table className="table">
                <thead><tr>
                  <th className="th">Date</th><th className="th">Opening</th><th className="th">Cash In</th>
                  <th className="th">Cash Out</th><th className="th">Closing</th><th className="th">Expected</th>
                  <th className="th">Variance</th><th className="th">Status</th><th className="th">Actions</th>
                </tr></thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr><td colSpan={9} className="td text-center py-10 text-gray-400">No sessions yet</td></tr>
                  ) : sessions.map((s: any) => (
                    <tr key={s.id} className={`tr ${s.variance && Math.abs(s.variance) > 0 ? 'bg-red-50' : ''}`}>
                      <td className="td text-sm">{s.sessionDate}</td>
                      <td className="td">ETB {s.openingBalance?.toLocaleString()}</td>
                      <td className="td text-green-600">ETB {s.totalCashIn?.toLocaleString()}</td>
                      <td className="td text-red-600">ETB {s.totalCashOut?.toLocaleString()}</td>
                      <td className="td">{s.closingBalance != null ? `ETB ${s.closingBalance.toLocaleString()}` : '-'}</td>
                      <td className="td">{s.expectedBalance != null ? `ETB ${s.expectedBalance.toLocaleString()}` : '-'}</td>
                      <td className={`td font-semibold ${s.variance && Math.abs(s.variance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {s.variance != null ? `ETB ${s.variance.toLocaleString()}` : '-'}
                      </td>
                      <td className="td"><StatusBadge status={s.status} /></td>
                      <td className="td">
                        {s.status === 'closed' && (
                          <button onClick={() => reconcileSession(s.id)} className="btn-success py-1 px-2 text-xs">Reconcile</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Transfers Tab */}
      {tab === 'transfers' && (
        transfersLoading ? <div className="text-center py-10 text-gray-400">Loading transfers...</div> : (
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Number</th><th className="th">From</th><th className="th">To</th>
                <th className="th">Amount</th><th className="th">Reason</th><th className="th">Status</th><th className="th">Actions</th>
              </tr></thead>
              <tbody>
                {transfers.length === 0 ? (
                  <tr><td colSpan={7} className="td text-center py-10 text-gray-400">No transfers</td></tr>
                ) : transfers.map((t: any) => (
                  <tr key={t.id} className="tr">
                    <td className="td text-sm font-medium">{t.transferNumber}</td>
                    <td className="td">{t.fromCashier?.name}{t.fromCashier?.location ? ` (${t.fromCashier.location})` : ''}</td>
                    <td className="td">{t.toCashier?.name}{t.toCashier?.location ? ` (${t.toCashier.location})` : ''}</td>
                    <td className="td font-semibold">ETB {t.amount?.toLocaleString()}</td>
                    <td className="td text-gray-500 text-sm">{t.reason}</td>
                    <td className="td"><StatusBadge status={t.status} /></td>
                    <td className="td">
                      <div className="flex gap-1">
                        {t.status === 'pending' && (
                          <>
                            <button onClick={() => approveTransfer(t.id)} className="btn-success py-1 px-2 text-xs">Approve</button>
                            <button onClick={() => rejectTransfer(t.id)} className="btn-danger py-1 px-2 text-xs">Reject</button>
                          </>
                        )}
                        {t.status === 'approved' && (
                          <button onClick={() => completeTransfer(t.id)} className="btn-primary py-1 px-2 text-xs">Complete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Reconciliation Tab */}
      {tab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <DateInput className="input w-48" value={reconDate} onChange={val => setReconDate(val)} />
            <button onClick={loadReconciliation} className="btn-primary py-1.5 px-3 text-sm">Load</button>
          </div>
          {reconLoading ? <div className="text-center py-10 text-gray-400">Loading...</div> : reconData ? (
            <div className="space-y-4">
              <div className="table-container">
                <table className="table">
                  <thead><tr>
                    <th className="th">Cashier</th><th className="th">Location</th><th className="th">Opening</th>
                    <th className="th">Cash In</th><th className="th">Cash Out</th><th className="th">Expected</th>
                    <th className="th">Closing</th><th className="th">Variance</th><th className="th">Status</th><th className="th">Actions</th>
                  </tr></thead>
                  <tbody>
                    {(reconData.sessions || []).map((s: any) => (
                      <tr key={s.id} className={`tr ${s.variance && Math.abs(s.variance) > 0 ? 'bg-red-50' : ''}`}>
                        <td className="td font-medium">{s.cashier?.name}</td>
                        <td className="td text-gray-500">{s.cashier?.location || '-'}</td>
                        <td className="td">ETB {s.openingBalance?.toLocaleString()}</td>
                        <td className="td text-green-600">ETB {s.totalCashIn?.toLocaleString()}</td>
                        <td className="td text-red-600">ETB {s.totalCashOut?.toLocaleString()}</td>
                        <td className="td">{s.expectedBalance != null ? `ETB ${s.expectedBalance.toLocaleString()}` : '-'}</td>
                        <td className="td">{s.closingBalance != null ? `ETB ${s.closingBalance.toLocaleString()}` : '-'}</td>
                        <td className={`td font-semibold ${s.variance && Math.abs(s.variance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {s.variance != null ? `ETB ${s.variance.toLocaleString()}` : '-'}
                        </td>
                        <td className="td"><StatusBadge status={s.status} /></td>
                        <td className="td">
                          {s.status === 'closed' && (
                            <button onClick={() => reconcileSession(s.id)} className="btn-success py-1 px-2 text-xs">Reconcile</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(reconData.missingCashiers || []).map((c: any) => (
                      <tr key={c.id} className="tr bg-yellow-50">
                        <td className="td font-medium">{c.name}</td>
                        <td className="td text-gray-500">{c.location || '-'}</td>
                        <td colSpan={8} className="td text-center text-yellow-700 text-sm">No session opened</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Fuel Analytics Tab */}
      {tab === 'fuel_analytics' && (
        fuelAnalyticsLoading ? <div className="text-center py-10 text-gray-400">Loading fuel analytics...</div> : fuelAnalyticsData ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card"><p className="text-xs text-gray-500 mb-1">Total Fuel Spend</p><p className="text-2xl font-bold text-red-600">ETB {(fuelAnalyticsData.summary?.totalCost || 0).toLocaleString()}</p></div>
              <div className="card"><p className="text-xs text-gray-500 mb-1">Total Liters</p><p className="text-2xl font-bold">{(fuelAnalyticsData.summary?.totalLiters || 0).toLocaleString()} L</p></div>
              <div className="card"><p className="text-xs text-gray-500 mb-1">Fleet Avg L/km</p><p className="text-2xl font-bold text-blue-600">{fuelAnalyticsData.summary?.fleetAvgFuelPerKm || 'N/A'}</p></div>
              <div className="card"><p className="text-xs text-gray-500 mb-1">Anomalies</p><p className="text-2xl font-bold text-amber-600">{fuelAnalyticsData.summary?.anomalyCount || 0}</p></div>
            </div>

            {fuelAnalyticsData.vehicles?.length > 0 && (
              <div className="card">
                <h3 className="section-title mb-4">Fuel Cost by Vehicle</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={fuelAnalyticsData.vehicles.slice(0, 10).map((v: any) => ({ name: v.plateNumber, cost: v.totalCost, liters: v.totalLiters }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                    <YAxis tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => Number(v).toLocaleString()} />
                    <Bar dataKey="cost" fill="#ef4444" name="Cost (ETB)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="table-container">
              <table className="table">
                <thead><tr>
                  <th className="th">Vehicle</th><th className="th">Category</th><th className="th">Liters</th>
                  <th className="th">Cost</th><th className="th">L/km</th><th className="th">L/ton</th>
                  <th className="th">L/trip</th><th className="th">Status</th>
                </tr></thead>
                <tbody>
                  {(fuelAnalyticsData.vehicles || []).map((v: any) => (
                    <tr key={v.vehicleId} className={`tr ${v.isAnomaly ? 'bg-red-50' : ''}`}>
                      <td className="td font-medium">{v.plateNumber}</td>
                      <td className="td text-sm capitalize text-gray-500">{v.category?.replace(/_/g, ' ')}</td>
                      <td className="td">{v.totalLiters?.toFixed(0)} L</td>
                      <td className="td text-red-600 font-semibold">ETB {v.totalCost?.toLocaleString()}</td>
                      <td className="td">{v.fuelPerKm ?? '-'}</td>
                      <td className="td">{v.fuelPerTon ?? '-'}</td>
                      <td className="td">{v.fuelPerTrip ?? '-'}</td>
                      <td className="td">
                        {v.isAnomaly ? (
                          <span className="flex items-center gap-1 text-red-600 text-xs font-semibold"><AlertTriangle className="w-3 h-3"/>High</span>
                        ) : <span className="text-green-600 text-xs">Normal</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <div className="text-center py-10 text-gray-400">No fuel data available</div>
      )}

      {/* Main Cash Tab */}
      {tab === 'main_cash' && (
        mainCashLoading ? <div className="text-center py-10 text-gray-400">Loading main cash data...</div> : mainCashData ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card bg-green-50 border-green-200">
                <p className="text-xs text-gray-500">Main Cash Balance</p>
                <p className="text-2xl font-bold text-green-700">ETB {(mainCashData.center?.totalBalance || 0).toLocaleString()}</p>
              </div>
              <div className="card">
                <p className="text-xs text-gray-500">Sub-Cashiers</p>
                <p className="text-2xl font-bold">{mainCashData.cashiers?.length || 0}</p>
              </div>
              <div className="card">
                <p className="text-xs text-gray-500">Total in Sub-Cashiers</p>
                <p className="text-2xl font-bold text-blue-600">ETB {(mainCashData.cashiers || []).reduce((s: number, c: any) => s + (c.currentBalance || 0), 0).toLocaleString()}</p>
              </div>
              <div className="card">
                <p className="text-xs text-gray-500">Recent Allocations</p>
                <p className="text-2xl font-bold">{mainCashData.allocations?.length || 0}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setCashActionForm({ cashierId: '', amount: '', reference: '', notes: '' }); setCashActionModal('deposit'); }} className="btn-success text-sm py-1.5 px-3">
                <ArrowDown className="w-4 h-4"/>Deposit
              </button>
              <button onClick={() => { setCashActionForm({ cashierId: '', amount: '', reference: '', notes: '' }); setCashActionModal('allocate'); }} className="btn-primary text-sm py-1.5 px-3">
                <Send className="w-4 h-4"/>Allocate to Cashier
              </button>
              <button onClick={() => { setCashActionForm({ cashierId: '', amount: '', reference: '', notes: '' }); setCashActionModal('return'); }} className="btn-secondary text-sm py-1.5 px-3">
                <ArrowUp className="w-4 h-4"/>Return from Cashier
              </button>
            </div>

            <div>
              <h3 className="section-title mb-2">Sub-Cashier Balances</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(mainCashData.cashiers || []).map((c: any) => (
                  <div key={c.id} className="card">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-lg font-bold">ETB {(c.currentBalance || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Float: ETB {(c.floatAmount || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="section-title mb-2">Recent Allocations</h3>
              <div className="table-container">
                <table className="table">
                  <thead><tr><th className="th">Date</th><th className="th">Type</th><th className="th">Cashier</th><th className="th">Amount</th><th className="th">Reference</th></tr></thead>
                  <tbody>
                    {(mainCashData.allocations || []).map((a: any) => (
                      <tr key={a.id} className="tr">
                        <td className="td text-sm">{formatDualDate(a.createdAt)}</td>
                        <td className="td"><StatusBadge status={a.type} /></td>
                        <td className="td">{a.cashier?.name || '-'}</td>
                        <td className={`td font-semibold ${a.type === 'deposit' || a.type === 'return' ? 'text-green-600' : 'text-red-600'}`}>ETB {a.amount?.toLocaleString()}</td>
                        <td className="td text-gray-500">{a.reference || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : <div className="text-center py-10 text-gray-400">No main cash data</div>
      )}

      {/* Cash Action Modal */}
      {cashActionModal && (
        <Modal title={cashActionModal === 'deposit' ? 'Deposit to Main Cash' : cashActionModal === 'allocate' ? 'Allocate to Cashier' : 'Return from Cashier'} onClose={() => setCashActionModal(null)}>
          <form onSubmit={async (ev) => {
            ev.preventDefault(); setSaving(true);
            try {
              if (cashActionModal === 'deposit') await mainCashApi.deposit({ amount: Number(cashActionForm.amount), reference: cashActionForm.reference, notes: cashActionForm.notes });
              else if (cashActionModal === 'allocate') await mainCashApi.allocate({ cashierId: cashActionForm.cashierId, amount: Number(cashActionForm.amount), reference: cashActionForm.reference, notes: cashActionForm.notes });
              else await mainCashApi.returnFunds({ cashierId: cashActionForm.cashierId, amount: Number(cashActionForm.amount), reference: cashActionForm.reference, notes: cashActionForm.notes });
              setCashActionModal(null);
              mainCashApi.get().then(r => setMainCashData(r.data));
              loadCashier();
            } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
            finally { setSaving(false); }
          }} className="space-y-3">
            {cashActionModal !== 'deposit' && (
              <div>
                <label className="label">Cashier *</label>
                <select className="select" value={cashActionForm.cashierId} onChange={e => setCashActionForm(f => ({...f, cashierId: e.target.value}))} required>
                  <option value="">Select cashier</option>
                  {(mainCashData?.cashiers || []).map((c: any) => <option key={c.id} value={c.id}>{c.name} (Balance: ETB {c.currentBalance?.toLocaleString()})</option>)}
                </select>
              </div>
            )}
            <div><label className="label">Amount (ETB) *</label><input type="number" className="input" value={cashActionForm.amount} onChange={e => setCashActionForm(f => ({...f, amount: e.target.value}))} required /></div>
            <div><label className="label">Reference</label><input className="input" value={cashActionForm.reference} onChange={e => setCashActionForm(f => ({...f, reference: e.target.value}))} /></div>
            <div><label className="label">Notes</label><input className="input" value={cashActionForm.notes} onChange={e => setCashActionForm(f => ({...f, notes: e.target.value}))} /></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setCashActionModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Processing...' : 'Confirm'}</button>
            </div>
          </form>
        </Modal>
      )}

      {txModal && (
        <Modal title={txModal === 'in' ? 'Receive Payment' : 'Make Payment'} onClose={() => setTxModal(null)}>
          <form onSubmit={doTransaction} className="space-y-3">
            <div><label className="label">Amount (ETB) *</label><input type="number" className="input" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} required /></div>
            <div><label className="label">Description *</label><input className="input" value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <select className="select" value={txForm.category} onChange={e => setTxForm(f => ({ ...f, category: e.target.value }))}>
                  {txModal === 'in' ? <>
                    <option value="income">Income</option>
                    <option value="customer_payment">Customer Payment</option>
                    <option value="other_income">Other</option>
                  </> : <>
                    <option value="expense">Expense</option>
                    <option value="fuel">Fuel</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="salary">Salary</option>
                    <option value="other">Other</option>
                  </>}
                </select>
              </div>
              <div><label className="label">Reference</label><input className="input" value={txForm.reference} onChange={e => setTxForm(f => ({ ...f, reference: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setTxModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className={txModal === 'in' ? 'btn-success' : 'btn-danger'}>
                {saving ? 'Saving...' : txModal === 'in' ? 'Receive' : 'Pay Out'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {advanceModal && (
        <Modal title="Give Driver Advance" onClose={() => setAdvanceModal(false)}>
          <form onSubmit={doAdvance} className="space-y-3">
            <div>
              <label className="label">Driver *</label>
              <select className="select" value={advForm.driverId} onChange={e => setAdvForm(f => ({ ...f, driverId: e.target.value }))} required>
                <option value="">Select driver</option>
                {employees.filter((e: any) => e.role === 'driver').map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            <div><label className="label">Amount (ETB) *</label><input type="number" className="input" value={advForm.amount} onChange={e => setAdvForm(f => ({ ...f, amount: e.target.value }))} required /></div>
            <div><label className="label">Reason</label><input className="input" value={advForm.reason} onChange={e => setAdvForm(f => ({ ...f, reason: e.target.value }))} /></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setAdvanceModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Record Advance'}</button>
            </div>
          </form>
        </Modal>
      )}

      {fuelModal && (
        <Modal title="Log Fuel" onClose={() => setFuelModal(false)}>
          <form onSubmit={doFuel} className="space-y-3">
            <div>
              <label className="label">Vehicle *</label>
              <select className="select" value={fuelForm.vehicleId} onChange={e => setFuelForm(f => ({ ...f, vehicleId: e.target.value }))} required>
                <option value="">Select vehicle</option>
                {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plateNumber} - {v.make}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Liters *</label><input type="number" step="0.1" className="input" value={fuelForm.liters} onChange={e => setFuelForm(f => ({ ...f, liters: e.target.value }))} required /></div>
              <div><label className="label">Cost per Liter (ETB) *</label><input type="number" step="0.01" className="input" value={fuelForm.costPerLiter} onChange={e => setFuelForm(f => ({ ...f, costPerLiter: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Odometer (km)</label><input type="number" className="input" value={fuelForm.odometerKm} onChange={e => setFuelForm(f => ({ ...f, odometerKm: e.target.value }))} /></div>
              <div><label className="label">Station Name</label><input className="input" value={fuelForm.fuelStation} onChange={e => setFuelForm(f => ({ ...f, fuelStation: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setFuelModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Log Fuel'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Close Session Modal */}
      {closeSessionModal && (
        <Modal title="Close Today's Session" onClose={() => setCloseSessionModal(false)}>
          <form onSubmit={doCloseSession} className="space-y-3">
            <div className="p-3 bg-blue-50 rounded text-sm">
              <p><strong>Opening Balance:</strong> ETB {todaySession?.openingBalance?.toLocaleString()}</p>
              <p><strong>Cash In:</strong> ETB {todaySession?.totalCashIn?.toLocaleString()}</p>
              <p><strong>Cash Out:</strong> ETB {todaySession?.totalCashOut?.toLocaleString()}</p>
              <p className="font-semibold mt-1"><strong>Expected:</strong> ETB {((todaySession?.openingBalance || 0) + (todaySession?.totalCashIn || 0) - (todaySession?.totalCashOut || 0)).toLocaleString()}</p>
            </div>
            <div><label className="label">Actual Closing Balance (ETB) *</label><input type="number" step="0.01" className="input" value={closeForm.closingBalance} onChange={e => setCloseForm(f => ({ ...f, closingBalance: e.target.value }))} required /></div>
            <div><label className="label">Notes</label><input className="input" value={closeForm.notes} onChange={e => setCloseForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setCloseSessionModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-danger">{saving ? 'Closing...' : 'Close Session'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Cashier Modal */}
      {addCashierModal && (
        <Modal title="Add New Cashier" onClose={() => setAddCashierModal(false)}>
          <form onSubmit={doAddCashier} className="space-y-3">
            <div>
              <label className="label">Link to User *</label>
              <select className="select" value={addCashierForm.userId} onChange={e => {
                const u = users.find((u: any) => u.id === e.target.value);
                setAddCashierForm(f => ({ ...f, userId: e.target.value, name: u?.name || f.name }));
              }} required>
                <option value="">Select user</option>
                {availableUsers.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role}) - {u.email}</option>)}
              </select>
            </div>
            <div><label className="label">Cashier Name *</label><input className="input" value={addCashierForm.name} onChange={e => setAddCashierForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Location</label><input className="input" value={addCashierForm.location} onChange={e => setAddCashierForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Head Office" /></div>
              <div><label className="label">Code</label><input className="input" value={addCashierForm.code} onChange={e => setAddCashierForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CSH-01" /></div>
            </div>
            <div><label className="label">Float / Opening Balance (ETB)</label><input type="number" className="input" value={addCashierForm.floatAmount} onChange={e => setAddCashierForm(f => ({ ...f, floatAmount: e.target.value }))} /></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setAddCashierModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Add Cashier'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transfer Modal */}
      {transferModal && (
        <Modal title="New Cash Transfer" onClose={() => setTransferModal(false)}>
          <form onSubmit={doTransfer} className="space-y-3">
            <div>
              <label className="label">From Cashier *</label>
              <select className="select" value={transferForm.fromCashierId} onChange={e => setTransferForm(f => ({ ...f, fromCashierId: e.target.value }))} required>
                <option value="">Select source</option>
                {allCashiers.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.location ? ` (${c.location})` : ''} - ETB {c.currentBalance?.toLocaleString()}</option>)}
              </select>
            </div>
            <div>
              <label className="label">To Cashier *</label>
              <select className="select" value={transferForm.toCashierId} onChange={e => setTransferForm(f => ({ ...f, toCashierId: e.target.value }))} required>
                <option value="">Select destination</option>
                {allCashiers.filter(c => c.id !== transferForm.fromCashierId).map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.location ? ` (${c.location})` : ''} - ETB {c.currentBalance?.toLocaleString()}</option>)}
              </select>
            </div>
            <div><label className="label">Amount (ETB) *</label><input type="number" className="input" value={transferForm.amount} onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))} required /></div>
            <div><label className="label">Reason *</label><input className="input" value={transferForm.reason} onChange={e => setTransferForm(f => ({ ...f, reason: e.target.value }))} required /></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setTransferModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Request Transfer'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
