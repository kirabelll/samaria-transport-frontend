import { useEffect, useState } from 'react';
import { Plus, CheckCircle, AlertTriangle, Wrench, BarChart3, Edit, Trash2 } from 'lucide-react';
import { maintenanceApi, vehicleApi, employeeApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDualDate } from '../utils/ethCalendar';
import { useAuthStore } from '../store/auth';

export default function MaintenancePage() {
  const currentUser = useAuthStore(s => s.user);
  const [tab, setTab] = useState<'workorders'|'breakdowns'|'schedules'|'analytics'>('workorders');
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [breakdowns, setBreakdowns] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [garages, setGarages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [woModal, setWoModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [woForm, setWoForm] = useState({ vehicleId:'', type:'corrective', description:'', priority:'normal', garageId:'', garageType:'internal', technicianId:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      maintenanceApi.workOrders(),
      maintenanceApi.breakdowns(),
      maintenanceApi.schedules(),
      vehicleApi.list(),
      employeeApi.list({ role: 'technical' }),
      maintenanceApi.garages(),
    ]).then(([wo, bd, sc, v, t, g]) => {
      setWorkOrders(wo.data.workOrders || []);
      setBreakdowns(bd.data.breakdowns || []);
      setSchedules(sc.data.schedules || []);
      setVehicles(v.data.vehicles || []);
      setTechnicians(t.data.employees || []);
      setGarages(g.data.garages || []);
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const approveBreakdown = async (id: string, approved: boolean) => {
    try { await maintenanceApi.approveBreakdown(id, { approved }); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const completeWO = async (id: string) => {
    const cost = prompt('Enter total repair cost (ETB):');
    if (!cost) return;
    try { await maintenanceApi.completeWorkOrder(id, { totalCost: Number(cost) }); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const markScheduleDone = async (id: string) => {
    const km = prompt('Current KM reading:');
    try { await maintenanceApi.updateSchedule(id, { status: 'completed', lastDoneDate: new Date().toISOString(), lastDoneKm: km ? Number(km) : undefined, nextDueDate: new Date(Date.now() + 90 * 86400000).toISOString() }); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const saveWO = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      if (editingId) {
        await maintenanceApi.updateWorkOrder(editingId, woForm);
      } else {
        await maintenanceApi.createWorkOrder(woForm);
      }
      setWoModal(false); setEditingId(null); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const openCreateWO = () => {
    setEditingId(null);
    setWoForm({ vehicleId:'', type:'corrective', description:'', priority:'normal', garageId:'', garageType:'internal', technicianId:'' });
    setError(''); setWoModal(true);
  };

  const openEditWO = (wo: any) => {
    setEditingId(wo.id);
    setWoForm({
      vehicleId: wo.vehicleId || '',
      type: wo.type || 'corrective',
      description: wo.description || '',
      priority: wo.priority || 'normal',
      garageId: wo.garageId || '',
      garageType: wo.garageType || 'internal',
      technicianId: wo.technicianId || '',
    });
    setError(''); setWoModal(true);
  };

  const deleteWO = async (id: string) => {
    if (!confirm('Delete this draft work order? This cannot be undone.')) return;
    try { await maintenanceApi.deleteWorkOrder(id); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const canEditWO = (wo: any) => {
    if (wo.status !== 'open') return false;
    if (!currentUser) return false;
    if (currentUser.role === 'owner' || currentUser.role === 'admin') return true;
    return wo.createdById === currentUser.id;
  };

  // Garage analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  useEffect(() => {
    if (tab === 'analytics' && !analytics) {
      setAnalyticsLoading(true);
      maintenanceApi.garagePerformance().then(r => setAnalytics(r.data)).catch(console.error).finally(() => setAnalyticsLoading(false));
    }
  }, [tab]);

  const tabs = [{ key: 'workorders', label: `Work Orders (${workOrders.length})` },
    { key: 'breakdowns', label: `Breakdowns (${breakdowns.length})` },
    { key: 'schedules', label: `Schedules (${schedules.length})` },
    { key: 'analytics', label: 'Garage Analytics' }];

  const overdueCount = schedules.filter(s => s.status === 'overdue').length;

  return (
    <div className="space-y-5">
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {overdueCount} maintenance schedule(s) are overdue!
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'workorders' && (
          <button onClick={openCreateWO} className="btn-primary">
            <Plus className="w-4 h-4"/>New Work Order
          </button>
        )}
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : <>

        {/* Work Orders */}
        {tab === 'workorders' && (
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">WO #</th><th className="th">Vehicle</th>
                <th className="th">Type</th><th className="th">Priority</th>
                <th className="th">Status</th><th className="th">Description</th>
                <th className="th">Cost (ETB)</th><th className="th">Actions</th>
              </tr></thead>
              <tbody>
                {workOrders.length === 0 ? (
                  <tr><td colSpan={8} className="td text-center py-10 text-gray-400">No work orders</td></tr>
                ) : workOrders.map((wo:any) => (
                  <tr key={wo.id} className="tr">
                    <td className="td font-mono text-xs text-blue-700">{wo.workOrderNumber}</td>
                    <td className="td">{wo.vehicle?.plateNumber}</td>
                    <td className="td"><StatusBadge status={wo.type} /></td>
                    <td className="td"><StatusBadge status={wo.priority} /></td>
                    <td className="td"><StatusBadge status={wo.status} /></td>
                    <td className="td text-gray-500 max-w-xs truncate">{wo.description}</td>
                    <td className="td">{wo.totalCost ? wo.totalCost.toLocaleString() : '-'}</td>
                    <td className="td">
                      <div className="flex gap-1">
                        {canEditWO(wo) && (
                          <>
                            <button onClick={()=>openEditWO(wo)} className="btn-secondary py-1 px-2 text-xs" title="Edit draft work order">
                              <Edit className="w-3 h-3"/>Edit
                            </button>
                            <button onClick={()=>deleteWO(wo.id)} className="btn-danger py-1 px-2 text-xs" title="Delete draft work order">
                              <Trash2 className="w-3 h-3"/>
                            </button>
                          </>
                        )}
                        {(wo.status === 'open' || wo.status === 'in_progress') && (
                          <button onClick={()=>completeWO(wo.id)} className="btn-success py-1 px-2 text-xs">
                            <CheckCircle className="w-3 h-3"/>Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Breakdowns */}
        {tab === 'breakdowns' && (
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Vehicle</th><th className="th">Reported By</th>
                <th className="th">Location</th><th className="th">Description</th>
                <th className="th">Date</th><th className="th">Status</th>
                <th className="th">Actions</th>
              </tr></thead>
              <tbody>
                {breakdowns.length === 0 ? (
                  <tr><td colSpan={7} className="td text-center py-10 text-gray-400">No breakdowns reported</td></tr>
                ) : breakdowns.map((bd:any) => (
                  <tr key={bd.id} className="tr">
                    <td className="td">{bd.vehicle?.plateNumber}</td>
                    <td className="td">{bd.reportedBy ? `${bd.reportedBy.firstName} ${bd.reportedBy.lastName}` : '-'}</td>
                    <td className="td">{bd.location}</td>
                    <td className="td text-gray-500 max-w-xs truncate">{bd.description}</td>
                    <td className="td text-xs">{formatDualDate(bd.reportedAt)}</td>
                    <td className="td"><StatusBadge status={bd.status} /></td>
                    <td className="td">
                      {bd.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={()=>approveBreakdown(bd.id, true)} className="btn-success py-1 px-2 text-xs">Approve</button>
                          <button onClick={()=>approveBreakdown(bd.id, false)} className="btn-danger py-1 px-2 text-xs">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Schedules */}
        {tab === 'schedules' && (
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th className="th">Vehicle</th><th className="th">Maintenance Type</th>
                <th className="th">Interval (days)</th><th className="th">Last Done</th>
                <th className="th">Next Due</th><th className="th">Status</th>
                <th className="th">Actions</th>
              </tr></thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr><td colSpan={7} className="td text-center py-10 text-gray-400">No schedules</td></tr>
                ) : schedules.map((s:any) => (
                  <tr key={s.id} className={`tr ${s.status === 'overdue' ? 'bg-red-50' : ''}`}>
                    <td className="td">{s.vehicle?.plateNumber}</td>
                    <td className="td">{s.maintenanceType?.replace(/_/g,' ')}</td>
                    <td className="td">{s.intervalDays} days</td>
                    <td className="td text-xs">{s.lastDoneDate ? formatDualDate(s.lastDoneDate) : 'Never'}</td>
                    <td className="td text-xs">{s.nextDueDate ? formatDualDate(s.nextDueDate) : '-'}</td>
                    <td className="td"><StatusBadge status={s.status} /></td>
                    <td className="td">
                      <button onClick={()=>markScheduleDone(s.id)} className="btn-primary py-1 px-2 text-xs">
                        <Wrench className="w-3 h-3"/>Mark Done
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Garage Analytics */}
        {tab === 'analytics' && (
          analyticsLoading ? <div className="text-center py-10 text-gray-400">Loading analytics...</div> : analytics ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="card"><p className="text-xs text-gray-500 mb-1">Total Work Orders</p><p className="text-2xl font-bold">{analytics.summary?.totalOrders || 0}</p></div>
                <div className="card"><p className="text-xs text-gray-500 mb-1">Total Maintenance Spend</p><p className="text-2xl font-bold text-red-600">ETB {(analytics.summary?.totalCost || 0).toLocaleString()}</p></div>
                <div className="card"><p className="text-xs text-gray-500 mb-1">Avg Repair Cost</p><p className="text-2xl font-bold text-orange-600">ETB {(analytics.summary?.avgRepairCost || 0).toLocaleString()}</p></div>
              </div>

              {analytics.garages?.length > 0 && (
                <div className="card">
                  <h3 className="section-title mb-4">Cost by Garage</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={analytics.garages.map((g: any) => ({ name: g.name, labor: g.totalLabor, parts: g.totalParts }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => `ETB ${Number(v).toLocaleString()}`} />
                      <Bar dataKey="labor" fill="#3b82f6" name="Labor" stackId="a" />
                      <Bar dataKey="parts" fill="#f59e0b" name="Parts" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="table-container">
                <table className="table">
                  <thead><tr>
                    <th className="th">Garage</th><th className="th">Type</th><th className="th">Orders</th>
                    <th className="th">Total Cost</th><th className="th">Avg Cost</th><th className="th">Avg Repair (hrs)</th>
                    <th className="th">Avg Downtime (hrs)</th>
                  </tr></thead>
                  <tbody>
                    {(analytics.garages || []).map((g: any) => (
                      <tr key={g.garageId} className="tr">
                        <td className="td font-medium">{g.name}</td>
                        <td className="td text-sm">{g.isInternal ? 'Internal' : 'Outsourced'}</td>
                        <td className="td">{g.totalOrders}</td>
                        <td className="td text-red-600 font-semibold">ETB {g.totalCost?.toLocaleString()}</td>
                        <td className="td">ETB {g.avgCost?.toLocaleString()}</td>
                        <td className="td">{g.avgRepairHours}h</td>
                        <td className="td">{g.avgDowntimeHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {analytics.vehicleDowntime?.length > 0 && (
                <>
                  <h3 className="section-title">Top 10 Vehicles by Downtime</h3>
                  <div className="table-container">
                    <table className="table">
                      <thead><tr><th className="th">Vehicle</th><th className="th">Work Orders</th><th className="th">Total Downtime (hrs)</th><th className="th">Total Cost</th></tr></thead>
                      <tbody>
                        {analytics.vehicleDowntime.map((v: any) => (
                          <tr key={v.vehicleId} className="tr">
                            <td className="td font-medium">{v.plateNumber}</td>
                            <td className="td">{v.orders}</td>
                            <td className="td text-amber-600 font-semibold">{v.totalDowntime}h</td>
                            <td className="td text-red-600">ETB {v.totalCost?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : <div className="text-center py-10 text-gray-400">No analytics data</div>
        )}
      </>}

      {/* Create / Edit Work Order Modal */}
      {woModal && (
        <Modal title={editingId ? 'Edit Work Order (Draft)' : 'New Work Order'} onClose={()=>{ setWoModal(false); setEditingId(null); }}>
          <form onSubmit={saveWO} className="space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div>
              <label className="label">Vehicle *</label>
              <select className="select" value={woForm.vehicleId} onChange={e=>setWoForm(f=>({...f,vehicleId:e.target.value}))} required>
                <option value="">Select vehicle...</option>
                {vehicles.map(v=><option key={v.id} value={v.id}>{v.plateNumber}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select className="select" value={woForm.type} onChange={e=>setWoForm(f=>({...f,type:e.target.value}))}>
                  <option value="corrective">Corrective</option>
                  <option value="preventive">Preventive</option>
                  <option value="inspection">Inspection</option>
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="select" value={woForm.priority} onChange={e=>setWoForm(f=>({...f,priority:e.target.value}))}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Garage Type</label>
                <select className="select" value={woForm.garageType} onChange={e=>setWoForm(f=>({...f,garageType:e.target.value}))}>
                  <option value="internal">Internal</option>
                  <option value="outsourced">Outsourced</option>
                </select>
              </div>
              <div>
                <label className="label">Garage</label>
                <select className="select" value={woForm.garageId} onChange={e=>setWoForm(f=>({...f,garageId:e.target.value}))}>
                  <option value="">Select...</option>
                  {garages.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Technician</label>
              <select className="select" value={woForm.technicianId} onChange={e=>setWoForm(f=>({...f,technicianId:e.target.value}))}>
                <option value="">Select...</option>
                {technicians.map(t=><option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Description *</label>
              <textarea className="input" rows={3} value={woForm.description}
                onChange={e=>setWoForm(f=>({...f,description:e.target.value}))} required />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={()=>{ setWoModal(false); setEditingId(null); }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save Changes' : 'Create Work Order')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
