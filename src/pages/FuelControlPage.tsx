import { useEffect, useState } from 'react';
import { fuelControlApi, vehicleApi } from '../services/api';
import DateInput from '../components/ui/DateInput';

const emptyStandard = { vehicleId: '', vehicleCategory: '', route: '', standardLiters: '', standardKmPerLiter: '', notes: '' };

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FuelControlPage() {
  const [tab, setTab] = useState<'standards' | 'variance'>('standards');

  // Standards state
  const [standards, setStandards] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyStandard);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Variance state
  const [varFrom, setVarFrom] = useState('');
  const [varTo, setVarTo] = useState('');
  const [varVehicle, setVarVehicle] = useState('');
  const [varData, setVarData] = useState<any>(null);
  const [varLoading, setVarLoading] = useState(false);

  const loadStandards = () => {
    setLoading(true);
    Promise.all([
      fuelControlApi.listStandards(),
      vehicleApi.list(),
    ]).then(([s, v]) => {
      setStandards(s.data.standards || []);
      setVehicles(v.data.vehicles || []);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadStandards(); }, []);

  const saveStandard = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        standardLiters: Number(form.standardLiters),
        standardKmPerLiter: Number(form.standardKmPerLiter),
        vehicleId: form.vehicleId || undefined,
        vehicleCategory: form.vehicleCategory || undefined,
      };
      if (editing) await fuelControlApi.updateStandard(editing.id, payload);
      else await fuelControlApi.createStandard(payload);
      setShowForm(false);
      setEditing(null);
      loadStandards();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this fuel standard?')) return;
    try {
      await fuelControlApi.deactivateStandard(id);
      loadStandards();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed');
    }
  };

  const loadVariance = () => {
    if (!varFrom || !varTo) return alert('Please select both from and to dates');
    setVarLoading(true);
    fuelControlApi.variance({ from: varFrom, to: varTo, vehicleId: varVehicle || undefined })
      .then(r => setVarData(r.data))
      .catch(console.error)
      .finally(() => setVarLoading(false));
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      vehicleId: s.vehicleId || '',
      vehicleCategory: s.vehicleCategory || '',
      route: s.route || '',
      standardLiters: s.standardLiters?.toString() || '',
      standardKmPerLiter: s.standardKmPerLiter?.toString() || '',
      notes: s.notes || '',
    });
    setError('');
    setShowForm(true);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyStandard);
    setError('');
    setShowForm(true);
  };

  const tabs = [
    { key: 'standards', label: 'Fuel Standards' },
    { key: 'variance', label: 'Fuel Variance Report' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'standards' && (
          <button onClick={openAdd} className="btn-primary">+ Add Standard</button>
        )}
      </div>

      {/* ── Fuel Standards Tab ── */}
      {tab === 'standards' && (
        <>
          {showForm && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 mb-3">{editing ? 'Edit Standard' : 'New Fuel Standard'}</h3>
              {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
              <form onSubmit={saveStandard} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="label">Vehicle (optional)</label>
                  <select className="select" value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })}>
                    <option value="">-- None --</option>
                    {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Vehicle Category (optional)</label>
                  <input className="input" value={form.vehicleCategory} onChange={e => setForm({ ...form, vehicleCategory: e.target.value })} placeholder="e.g. Truck, Bus" />
                </div>
                <div>
                  <label className="label">Route *</label>
                  <input className="input" value={form.route} onChange={e => setForm({ ...form, route: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Standard Liters *</label>
                  <input className="input" type="number" step="0.01" value={form.standardLiters} onChange={e => setForm({ ...form, standardLiters: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Standard Km/Liter *</label>
                  <input className="input" type="number" step="0.01" value={form.standardKmPerLiter} onChange={e => setForm({ ...form, standardKmPerLiter: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="md:col-span-3 flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="text-gray-500 text-sm">Loading...</div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Category</th>
                    <th>Route</th>
                    <th>Std Liters</th>
                    <th>Std Km/L</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {standards.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-gray-400 py-8">No fuel standards defined yet.</td></tr>
                  )}
                  {standards.map((s: any) => {
                    const vehicle = vehicles.find((v: any) => v.id === s.vehicleId);
                    return (
                      <tr key={s.id}>
                        <td>{vehicle ? vehicle.plateNumber : '-'}</td>
                        <td>{s.vehicleCategory || '-'}</td>
                        <td>{s.route}</td>
                        <td>{fmt(s.standardLiters)}</td>
                        <td>{fmt(s.standardKmPerLiter)}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500,
                            backgroundColor: s.active !== false ? '#DEF7EC' : '#FDE8E8',
                            color: s.active !== false ? '#03543F' : '#9B1C1C',
                          }}>
                            {s.active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-gray-500 text-xs">{s.notes || '-'}</td>
                        <td>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline text-xs">Edit</button>
                            {s.active !== false && (
                              <button onClick={() => deactivate(s.id)} className="text-red-600 hover:underline text-xs">Deactivate</button>
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
        </>
      )}

      {/* ── Fuel Variance Report Tab ── */}
      {tab === 'variance' && (
        <>
          <div className="card p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="label">From *</label>
                <DateInput value={varFrom} onChange={val => setVarFrom(val)} />
              </div>
              <div>
                <label className="label">To *</label>
                <DateInput value={varTo} onChange={val => setVarTo(val)} />
              </div>
              <div>
                <label className="label">Vehicle</label>
                <select className="select" value={varVehicle} onChange={e => setVarVehicle(e.target.value)}>
                  <option value="">All Vehicles</option>
                  {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
                </select>
              </div>
              <button onClick={loadVariance} disabled={varLoading} className="btn-primary">{varLoading ? 'Loading...' : 'Generate Report'}</button>
            </div>
          </div>

          {varData && (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Trip</th>
                      <th>Route</th>
                      <th style={{ textAlign: 'right' }}>Actual (L)</th>
                      <th style={{ textAlign: 'right' }}>Standard (L)</th>
                      <th style={{ textAlign: 'right' }}>Variance (L)</th>
                      <th style={{ textAlign: 'right' }}>Variance %</th>
                      <th style={{ textAlign: 'right' }}>Cost (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!varData.records || varData.records.length === 0) && (
                      <tr><td colSpan={8} className="text-center text-gray-400 py-8">No variance data for this period.</td></tr>
                    )}
                    {(varData.records || []).map((r: any, i: number) => {
                      const isExcess = r.varianceLiters > 0;
                      return (
                        <tr key={i} style={isExcess ? { backgroundColor: '#FEF2F2' } : undefined}>
                          <td>{r.vehiclePlate || r.plateNumber || '-'}</td>
                          <td>{r.tripCode || r.tripId || '-'}</td>
                          <td>{r.route || '-'}</td>
                          <td style={{ textAlign: 'right', color: isExcess ? '#DC2626' : undefined, fontWeight: isExcess ? 600 : undefined }}>
                            {fmt(r.actualLiters)}
                          </td>
                          <td style={{ textAlign: 'right' }}>{fmt(r.standardLiters)}</td>
                          <td style={{ textAlign: 'right', color: isExcess ? '#DC2626' : '#059669', fontWeight: 600 }}>
                            {r.varianceLiters > 0 ? '+' : ''}{fmt(r.varianceLiters)}
                          </td>
                          <td style={{ textAlign: 'right', color: isExcess ? '#DC2626' : '#059669', fontWeight: 600 }}>
                            {r.variancePercent > 0 ? '+' : ''}{fmt(r.variancePercent)}%
                          </td>
                          <td style={{ textAlign: 'right' }}>{fmt(r.cost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vehicle Summary */}
              {varData.vehicleSummary && varData.vehicleSummary.length > 0 && (
                <div className="card p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Vehicle Summary</h3>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Vehicle</th>
                          <th style={{ textAlign: 'right' }}>Trips</th>
                          <th style={{ textAlign: 'right' }}>Total Actual (L)</th>
                          <th style={{ textAlign: 'right' }}>Total Standard (L)</th>
                          <th style={{ textAlign: 'right' }}>Total Variance (L)</th>
                          <th style={{ textAlign: 'right' }}>Avg Variance %</th>
                          <th style={{ textAlign: 'right' }}>Total Cost (ETB)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {varData.vehicleSummary.map((vs: any, i: number) => {
                          const isExcess = vs.totalVarianceLiters > 0;
                          return (
                            <tr key={i}>
                              <td className="font-medium">{vs.vehiclePlate || vs.plateNumber || '-'}</td>
                              <td style={{ textAlign: 'right' }}>{vs.tripCount || vs.trips || 0}</td>
                              <td style={{ textAlign: 'right' }}>{fmt(vs.totalActualLiters)}</td>
                              <td style={{ textAlign: 'right' }}>{fmt(vs.totalStandardLiters)}</td>
                              <td style={{ textAlign: 'right', color: isExcess ? '#DC2626' : '#059669', fontWeight: 600 }}>
                                {vs.totalVarianceLiters > 0 ? '+' : ''}{fmt(vs.totalVarianceLiters)}
                              </td>
                              <td style={{ textAlign: 'right', color: isExcess ? '#DC2626' : '#059669', fontWeight: 600 }}>
                                {vs.avgVariancePercent > 0 ? '+' : ''}{fmt(vs.avgVariancePercent)}%
                              </td>
                              <td style={{ textAlign: 'right' }}>{fmt(vs.totalCost)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
