import { useEffect, useState } from 'react';
import { Plus, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import { inventoryApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

const empty = { partName:'', partNumber:'', category:'spare_part', unit:'pcs', quantityInStock:'0', minimumStock:'5', unitCost:'', location:'', supplier:'', reportGroup:'' };

const REPORT_GROUPS: { value: string; label: string }[] = [
  { value: '', label: '— Unclassified —' },
  { value: 'heavy_vehicle_tires', label: 'Heavy Vehicle Tires' },
  { value: 'mechanical_spares', label: 'Mechanical Spares' },
  { value: 'consumables', label: 'Consumables (Oil/Filters)' },
  { value: 'office_materials', label: 'Office/Building Materials' },
  { value: 'project_specific', label: 'Project Specific' },
];

const reportGroupLabel = (v?: string) => REPORT_GROUPS.find(g => g.value === (v || ''))?.label || '';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [issueModal, setIssueModal] = useState<any>(null);
  const [receiveModal, setReceiveModal] = useState<any>(null);
  const [txForm, setTxForm] = useState({ quantity:'', unitCost:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);

  const load = () => {
    setLoading(true);
    inventoryApi.list({ category: filterCategory||undefined })
      .then(r => setItems(r.data.items || []))
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterCategory]);

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, quantityInStock: Number(form.quantityInStock), minimumStock: Number(form.minimumStock), unitCost: Number(form.unitCost) };
      if (editing) await inventoryApi.update(editing.id, payload);
      else await inventoryApi.create(payload);
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const issue = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      await inventoryApi.issue(issueModal.id, { quantity: Number(txForm.quantity), notes: txForm.notes });
      setIssueModal(null); load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const receive = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      await inventoryApi.receive(receiveModal.id, { quantity: Number(txForm.quantity), unitCost: Number(txForm.unitCost||receiveModal.unitCost), notes: txForm.notes });
      setReceiveModal(null); load();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const displayed = showLowOnly ? items.filter(i => i.quantityInStock <= i.minimumStock) : items;
  const lowCount = items.filter(i => i.quantityInStock <= i.minimumStock).length;
  const CATS = ['spare_part','tire','lubricant','consumable','fuel'];

  return (
    <div className="space-y-5">
      {lowCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 cursor-pointer" onClick={()=>setShowLowOnly(!showLowOnly)}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {lowCount} item(s) are at or below minimum stock level. {showLowOnly ? 'Click to show all.' : 'Click to filter.'}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <select className="select w-44" value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATS.map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
        </select>
        <button onClick={()=>{ setEditing(null); setForm(empty); setError(''); setModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4"/>Add Item
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead><tr>
            <th className="th">Part Name</th><th className="th">Part #</th>
            <th className="th">Category</th><th className="th">In Stock</th>
            <th className="th">Min Stock</th><th className="th">Unit Cost</th>
            <th className="th">Total Value</th><th className="th">Location</th>
            <th className="th">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={9} className="td text-center py-10 text-gray-400">No items</td></tr>
            ) : displayed.map((item:any) => {
              const isLow = item.quantityInStock <= item.minimumStock;
              return (
                <tr key={item.id} className={`tr ${isLow ? 'bg-red-50' : ''}`}>
                  <td className="td font-medium">
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onClick={()=>{
                        setEditing(item);
                        setForm({
                          partName: item.partName||'',
                          partNumber: item.partNumber||'',
                          category: item.category||'spare_part',
                          unit: item.unit||'pcs',
                          quantityInStock: String(item.quantityInStock??'0'),
                          minimumStock: String(item.minimumStock??'5'),
                          unitCost: String(item.unitCost??''),
                          location: item.location||'',
                          supplier: item.supplier||'',
                          reportGroup: item.reportGroup||'',
                        });
                        setError('');
                        setModal(true);
                      }}
                    >{item.partName}</button>
                    {item.reportGroup && (
                      <div><span className="text-xs text-gray-500">{reportGroupLabel(item.reportGroup)}</span></div>
                    )}
                  </td>
                  <td className="td font-mono text-xs text-gray-500">{item.partNumber||'-'}</td>
                  <td className="td"><StatusBadge status={item.category} /></td>
                  <td className={`td font-semibold ${isLow ? 'text-red-600' : 'text-green-700'}`}>
                    {item.quantityInStock} {item.unit}
                    {isLow && <AlertTriangle className="w-3.5 h-3.5 inline ml-1 text-red-500"/>}
                  </td>
                  <td className="td text-gray-500">{item.minimumStock} {item.unit}</td>
                  <td className="td">ETB {item.unitCost?.toLocaleString()}</td>
                  <td className="td">ETB {item.totalValue?.toLocaleString()}</td>
                  <td className="td text-gray-500">{item.location||'-'}</td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={()=>{ setIssueModal(item); setTxForm({quantity:'',unitCost:'',notes:''}); }} className="btn-danger py-1 px-2 text-xs" title="Issue">
                        <ArrowUp className="w-3 h-3"/>Issue
                      </button>
                      <button onClick={()=>{ setReceiveModal(item); setTxForm({quantity:'',unitCost:'',notes:''}); }} className="btn-success py-1 px-2 text-xs" title="Receive">
                        <ArrowDown className="w-3 h-3"/>Receive
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Edit Item' : 'Add Inventory Item'} onClose={()=>setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div><label className="label">Part Name *</label><input className="input" value={form.partName} onChange={e=>setForm((f:any)=>({...f,partName:e.target.value}))} required /></div>
            <div><label className="label">Part Number</label><input className="input" value={form.partNumber} onChange={e=>setForm((f:any)=>({...f,partNumber:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Category</label>
                <select className="select" value={form.category} onChange={e=>setForm((f:any)=>({...f,category:e.target.value}))}>
                  {CATS.map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={e=>setForm((f:any)=>({...f,unit:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Current Stock</label><input type="number" className="input" value={form.quantityInStock} onChange={e=>setForm((f:any)=>({...f,quantityInStock:e.target.value}))} /></div>
              <div><label className="label">Min Stock</label><input type="number" className="input" value={form.minimumStock} onChange={e=>setForm((f:any)=>({...f,minimumStock:e.target.value}))} /></div>
            </div>
            <div><label className="label">Unit Cost (ETB)</label><input type="number" className="input" value={form.unitCost} onChange={e=>setForm((f:any)=>({...f,unitCost:e.target.value}))} /></div>
            <div><label className="label">Location</label><input className="input" value={form.location} onChange={e=>setForm((f:any)=>({...f,location:e.target.value}))} /></div>
            <div>
              <label className="label">Report Group</label>
              <select className="select" value={form.reportGroup||''} onChange={e=>setForm((f:any)=>({...f,reportGroup:e.target.value}))}>
                {REPORT_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving?'Saving...':'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {issueModal && (
        <Modal title={`Issue: ${issueModal.partName}`} onClose={()=>setIssueModal(null)}>
          <form onSubmit={issue} className="space-y-3">
            <p className="text-sm text-gray-500">Current stock: <strong>{issueModal.quantityInStock} {issueModal.unit}</strong></p>
            <div><label className="label">Quantity to Issue *</label><input type="number" className="input" value={txForm.quantity} onChange={e=>setTxForm(f=>({...f,quantity:e.target.value}))} required /></div>
            <div><label className="label">Notes</label><input className="input" value={txForm.notes} onChange={e=>setTxForm(f=>({...f,notes:e.target.value}))} /></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setIssueModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-danger">{saving?'Issuing...':'Issue Parts'}</button>
            </div>
          </form>
        </Modal>
      )}

      {receiveModal && (
        <Modal title={`Receive: ${receiveModal.partName}`} onClose={()=>setReceiveModal(null)}>
          <form onSubmit={receive} className="space-y-3">
            <div><label className="label">Quantity to Receive *</label><input type="number" className="input" value={txForm.quantity} onChange={e=>setTxForm(f=>({...f,quantity:e.target.value}))} required /></div>
            <div><label className="label">Unit Cost (ETB)</label><input type="number" className="input" value={(txForm as any).unitCost||''} onChange={e=>setTxForm(f=>({...f,unitCost:e.target.value} as any))} /></div>
            <div><label className="label">Notes</label><input className="input" value={txForm.notes} onChange={e=>setTxForm(f=>({...f,notes:e.target.value}))} /></div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>setReceiveModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-success">{saving?'Receiving...':'Receive Stock'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
