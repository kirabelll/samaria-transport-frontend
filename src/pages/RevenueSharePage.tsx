import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { revenueShareApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDualDate } from '../utils/ethCalendar';
import DateInput from '../components/ui/DateInput';

const fmt = (n: number | undefined | null) => (n ?? 0).toLocaleString();

export default function RevenueSharePage() {
  const [tab, setTab] = useState<'contracts' | 'trips' | 'settlements'>('contracts');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [trips, setTrips] = useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  // ── Load list data ───────────────────────────────────
  const load = () => {
    setLoading(true);
    let promise: Promise<any>;
    if (tab === 'contracts') promise = revenueShareApi.listContracts();
    else if (tab === 'settlements') promise = revenueShareApi.listSettlements();
    else { setLoading(false); return; }
    promise
      .then(r => setItems(r.data.contracts || r.data.settlements || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  // Load contracts list for dropdowns
  useEffect(() => {
    if ((tab === 'trips' || tab === 'settlements') && contracts.length === 0) {
      revenueShareApi.listContracts().then(r => setContracts(r.data.contracts || []));
    }
  }, [tab]);

  // Load trips when a contract is selected in Trips tab
  useEffect(() => {
    if (tab === 'trips' && selectedContractId) {
      setTripsLoading(true);
      revenueShareApi.getContract(selectedContractId)
        .then(r => setTrips(r.data.contract?.trips || r.data.trips || []))
        .catch(console.error)
        .finally(() => setTripsLoading(false));
    } else {
      setTrips([]);
    }
  }, [selectedContractId, tab]);

  // ── Auto-calculate trip expenses / shares ────────────
  const calcTrip = (f: any) => {
    const revenue = Number(f.tripRevenue) || 0;
    const fuel = Number(f.fuelCost) || 0;
    const driver = Number(f.driverPerDiem) || 0;
    const gps = Number(f.gpsCost) || 0;
    const insurance = Number(f.insuranceCost) || 0;
    const broker = Number(f.brokerCommission) || 0;
    const other = Number(f.otherExpenses) || 0;
    const totalExpenses = fuel + driver + gps + insurance + broker + other;
    const netIncome = revenue - totalExpenses;

    // find the contract to get share percentages
    const contract = contracts.find((c: any) => c.id === f.contractId);
    const ownerPct = contract ? Number(contract.ownerSharePercent) : 0;
    const companyPct = contract ? Number(contract.companySharePercent) : 0;
    const ownerShare = Math.round((netIncome * ownerPct) / 100 * 100) / 100;
    const companyShare = Math.round((netIncome * companyPct) / 100 * 100) / 100;
    return { ...f, totalExpenses, netIncome, ownerShare, companyShare };
  };

  const updateTripForm = (updates: any) => {
    setForm((f: any) => calcTrip({ ...f, ...updates }));
  };

  // ── Empty forms ──────────────────────────────────────
  const getEmptyForm = () => {
    if (tab === 'contracts') return { powerVehiclePlate: '', companyTrailerPlate: '', ownerSharePercent: '50', companySharePercent: '50', startDate: '', notes: '' };
    if (tab === 'trips') return { contractId: selectedContractId || '', tripDate: '', route: '', customer: '', quantityTons: '', tripRevenue: '', fuelCost: '', driverPerDiem: '', gpsCost: '', insuranceCost: '', brokerCommission: '', otherExpenses: '', totalExpenses: 0, netIncome: 0, ownerShare: 0, companyShare: 0 };
    return { contractId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() };
  };

  // ── Save ─────────────────────────────────────────────
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      if (tab === 'contracts') {
        const ownerPct = Number(form.ownerSharePercent);
        const companyPct = Number(form.companySharePercent);
        if (ownerPct + companyPct !== 100) { setError('Owner % + Company % must equal 100'); setSaving(false); return; }
        await revenueShareApi.createContract({
          ...form,
          ownerSharePercent: ownerPct,
          companySharePercent: companyPct,
        });
      } else if (tab === 'trips') {
        await revenueShareApi.addTrip({
          ...form,
          quantityTons: Number(form.quantityTons),
          tripRevenue: Number(form.tripRevenue),
          fuelCost: Number(form.fuelCost) || 0,
          driverPerDiem: Number(form.driverPerDiem) || 0,
          gpsCost: Number(form.gpsCost) || 0,
          insuranceCost: Number(form.insuranceCost) || 0,
          brokerCommission: Number(form.brokerCommission) || 0,
          otherExpenses: Number(form.otherExpenses) || 0,
        });
      } else {
        await revenueShareApi.generateSettlement({
          contractId: form.contractId,
          month: Number(form.month),
          year: Number(form.year),
        });
      }
      setModal(false);
      if (tab === 'trips' && selectedContractId) {
        revenueShareApi.getContract(selectedContractId)
          .then(r => setTrips(r.data.contract?.trips || r.data.trips || []));
      } else {
        load();
      }
    } catch (e: any) { setError(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  // ── Approve / Pay settlement ─────────────────────────
  const approveSettlement = async (id: string) => {
    try {
      await revenueShareApi.approveSettlement(id);
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Approve failed'); }
  };

  const paySettlement = async (id: string) => {
    try {
      await revenueShareApi.paySettlement(id);
      load();
    } catch (e: any) { alert(e.response?.data?.error || 'Payment failed'); }
  };

  // ── Tab labels ───────────────────────────────────────
  const tabLabels = { contracts: 'Contracts', trips: 'Trips', settlements: 'Monthly Settlements' };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 border-b border-gray-200">
          {(['contracts', 'trips', 'settlements'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>{tabLabels[t]}</button>
          ))}
        </div>
        <button onClick={() => { setForm(getEmptyForm()); setError(''); setModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />{tab === 'contracts' ? 'Add Contract' : tab === 'trips' ? 'Add Trip' : 'Generate Settlement'}
        </button>
      </div>

      {/* ── Contracts Tab ────────────────────────────── */}
      {tab === 'contracts' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Contract #</th>
                <th className="th">Power Vehicle</th>
                <th className="th">Trailer</th>
                <th className="th">Owner %</th>
                <th className="th">Company %</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="td text-center py-10 text-gray-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="td text-center py-10 text-gray-400">No contracts</td></tr>
              ) : items.map((item: any) => (
                <tr key={item.id} className="tr">
                  <td className="td font-medium">{item.contractNumber || item.id?.slice(0, 8)}</td>
                  <td className="td">{item.powerVehiclePlate}</td>
                  <td className="td">{item.companyTrailerPlate || '-'}</td>
                  <td className="td">{item.ownerSharePercent}%</td>
                  <td className="td">{item.companySharePercent}%</td>
                  <td className="td"><StatusBadge status={item.status || 'active'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Trips Tab ────────────────────────────────── */}
      {tab === 'trips' && (
        <div className="space-y-4">
          <div>
            <label className="label">Select Contract</label>
            <select className="select" style={{ maxWidth: 400 }} value={selectedContractId} onChange={e => setSelectedContractId(e.target.value)}>
              <option value="">-- Select a contract --</option>
              {contracts.map((c: any) => (
                <option key={c.id} value={c.id}>{c.contractNumber || c.id?.slice(0, 8)} - {c.powerVehiclePlate}</option>
              ))}
            </select>
          </div>
          {selectedContractId && (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Date</th>
                    <th className="th">Route</th>
                    <th className="th">Customer</th>
                    <th className="th">Qty (t)</th>
                    <th className="th">Revenue</th>
                    <th className="th">Expenses</th>
                    <th className="th">Net</th>
                    <th className="th">Owner Share</th>
                    <th className="th">Company Share</th>
                  </tr>
                </thead>
                <tbody>
                  {tripsLoading ? (
                    <tr><td colSpan={9} className="td text-center py-10 text-gray-400">Loading...</td></tr>
                  ) : trips.length === 0 ? (
                    <tr><td colSpan={9} className="td text-center py-10 text-gray-400">No trips for this contract</td></tr>
                  ) : trips.map((t: any) => (
                    <tr key={t.id} className="tr">
                      <td className="td text-sm">{formatDualDate(t.tripDate)}</td>
                      <td className="td text-gray-500 text-xs">{t.route}</td>
                      <td className="td">{t.customer || '-'}</td>
                      <td className="td">{t.quantityTons}</td>
                      <td className="td text-green-700">ETB {fmt(t.tripRevenue)}</td>
                      <td className="td text-red-600">ETB {fmt(t.totalExpenses)}</td>
                      <td className={`td font-semibold ${(t.netIncome || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>ETB {fmt(t.netIncome)}</td>
                      <td className="td">ETB {fmt(t.ownerShare)}</td>
                      <td className="td">ETB {fmt(t.companyShare)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Settlements Tab ──────────────────────────── */}
      {tab === 'settlements' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Settlement #</th>
                <th className="th">Contract</th>
                <th className="th">Month/Year</th>
                <th className="th">Trips</th>
                <th className="th">Revenue</th>
                <th className="th">Expenses</th>
                <th className="th">Net</th>
                <th className="th">Owner Payable</th>
                <th className="th">Company Share</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="td text-center py-10 text-gray-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={11} className="td text-center py-10 text-gray-400">No settlements</td></tr>
              ) : items.map((s: any) => (
                <tr key={s.id} className="tr">
                  <td className="td font-medium">{s.settlementNumber || s.id?.slice(0, 8)}</td>
                  <td className="td">{s.contract?.contractNumber || s.contract?.powerVehiclePlate || s.contractId?.slice(0, 8)}</td>
                  <td className="td">{s.month}/{s.year}</td>
                  <td className="td">{s.totalTrips ?? '-'}</td>
                  <td className="td text-green-700">ETB {fmt(s.totalRevenue)}</td>
                  <td className="td text-red-600">ETB {fmt(s.totalExpenses)}</td>
                  <td className={`td font-semibold ${(s.netIncome || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>ETB {fmt(s.netIncome)}</td>
                  <td className="td">ETB {fmt(s.ownerPayable)}</td>
                  <td className="td">ETB {fmt(s.companyShare)}</td>
                  <td className="td"><StatusBadge status={s.status || 'draft'} /></td>
                  <td className="td">
                    <div className="flex gap-2">
                      {(s.status === 'draft' || s.status === 'pending') && (
                        <button onClick={() => approveSettlement(s.id)} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Approve</button>
                      )}
                      {s.status === 'approved' && (
                        <button onClick={() => paySettlement(s.id)} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Pay</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ────────────────────────────────────── */}
      {modal && (
        <Modal title={tab === 'contracts' ? 'Add Contract' : tab === 'trips' ? 'Add Trip' : 'Generate Settlement'} onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

            {tab === 'contracts' && <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Power Vehicle Plate *</label><input className="input" value={form.powerVehiclePlate} onChange={e => setForm((f: any) => ({ ...f, powerVehiclePlate: e.target.value }))} required /></div>
                <div><label className="label">Company Trailer Plate</label><input className="input" value={form.companyTrailerPlate} onChange={e => setForm((f: any) => ({ ...f, companyTrailerPlate: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Owner Share % *</label><input type="number" min="0" max="100" className="input" value={form.ownerSharePercent} onChange={e => setForm((f: any) => ({ ...f, ownerSharePercent: e.target.value }))} required /></div>
                <div><label className="label">Company Share % *</label><input type="number" min="0" max="100" className="input" value={form.companySharePercent} onChange={e => setForm((f: any) => ({ ...f, companySharePercent: e.target.value }))} required /></div>
              </div>
              {Number(form.ownerSharePercent) + Number(form.companySharePercent) !== 100 && (
                <div className="text-red-500 text-xs">Owner % + Company % must equal 100 (currently {Number(form.ownerSharePercent) + Number(form.companySharePercent)})</div>
              )}
              <div><label className="label">Start Date *</label><DateInput value={form.startDate} onChange={val => setForm((f: any) => ({ ...f, startDate: val }))} required /></div>
              <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
            </>}

            {tab === 'trips' && <>
              <div>
                <label className="label">Contract *</label>
                <select className="select" value={form.contractId} onChange={e => updateTripForm({ contractId: e.target.value })} required>
                  <option value="">Select contract</option>
                  {contracts.map((c: any) => <option key={c.id} value={c.id}>{c.contractNumber || c.id?.slice(0, 8)} - {c.powerVehiclePlate} ({c.ownerSharePercent}/{c.companySharePercent})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Trip Date *</label><DateInput value={form.tripDate} onChange={val => updateTripForm({ tripDate: val })} required /></div>
                <div><label className="label">Route *</label><input className="input" value={form.route} onChange={e => updateTripForm({ route: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Customer</label><input className="input" value={form.customer} onChange={e => updateTripForm({ customer: e.target.value })} /></div>
                <div><label className="label">Quantity (tons)</label><input type="number" className="input" value={form.quantityTons} onChange={e => updateTripForm({ quantityTons: e.target.value })} /></div>
              </div>
              <div>
                <label className="label">Trip Revenue (ETB) *</label>
                <input type="number" className="input" value={form.tripRevenue} onChange={e => updateTripForm({ tripRevenue: e.target.value })} required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Fuel Cost</label><input type="number" className="input" value={form.fuelCost} onChange={e => updateTripForm({ fuelCost: e.target.value })} /></div>
                <div><label className="label">Driver Per Diem</label><input type="number" className="input" value={form.driverPerDiem} onChange={e => updateTripForm({ driverPerDiem: e.target.value })} /></div>
                <div><label className="label">GPS Cost</label><input type="number" className="input" value={form.gpsCost} onChange={e => updateTripForm({ gpsCost: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Insurance Cost</label><input type="number" className="input" value={form.insuranceCost} onChange={e => updateTripForm({ insuranceCost: e.target.value })} /></div>
                <div><label className="label">Broker Commission</label><input type="number" className="input" value={form.brokerCommission} onChange={e => updateTripForm({ brokerCommission: e.target.value })} /></div>
                <div><label className="label">Other Expenses</label><input type="number" className="input" value={form.otherExpenses} onChange={e => updateTripForm({ otherExpenses: e.target.value })} /></div>
              </div>
              <div className="p-3 bg-gray-50 rounded space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total Expenses:</span><span className="text-red-600 font-medium">ETB {fmt(form.totalExpenses)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Net Income:</span><span className={`font-semibold ${(form.netIncome || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>ETB {fmt(form.netIncome)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Owner Share:</span><span className="font-medium">ETB {fmt(form.ownerShare)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Company Share:</span><span className="font-medium">ETB {fmt(form.companyShare)}</span></div>
              </div>
            </>}

            {tab === 'settlements' && <>
              <div>
                <label className="label">Contract *</label>
                <select className="select" value={form.contractId} onChange={e => setForm((f: any) => ({ ...f, contractId: e.target.value }))} required>
                  <option value="">Select contract</option>
                  {contracts.map((c: any) => <option key={c.id} value={c.id}>{c.contractNumber || c.id?.slice(0, 8)} - {c.powerVehiclePlate}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Month *</label>
                  <select className="select" value={form.month} onChange={e => setForm((f: any) => ({ ...f, month: Number(e.target.value) }))}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div><label className="label">Year *</label><input type="number" className="input" value={form.year} onChange={e => setForm((f: any) => ({ ...f, year: Number(e.target.value) }))} required /></div>
              </div>
            </>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : tab === 'settlements' ? 'Generate' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
