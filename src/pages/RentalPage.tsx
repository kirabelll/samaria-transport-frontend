import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { rentalApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDualDate } from '../utils/ethCalendar';

export default function RentalPage() {
  const [tab, setTab] = useState<'owners' | 'vehicles' | 'trips'>('owners');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [owners, setOwners] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);

  const load = () => {
    setLoading(true);
    let promise: Promise<any>;
    if (tab === 'owners') promise = rentalApi.listOwners();
    else if (tab === 'vehicles') promise = rentalApi.listVehicles();
    else promise = rentalApi.listTrips();
    promise.then(r => setItems(r.data.owners || r.data.vehicles || r.data.trips || []))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  useEffect(() => {
    if (modal) {
      if (tab === 'vehicles' && owners.length === 0) {
        rentalApi.listOwners().then(r => setOwners(r.data.owners || []));
      }
      if (tab === 'trips' && vehicles.length === 0) {
        rentalApi.listVehicles().then(r => setVehicles(r.data.vehicles || []));
      }
    }
  }, [modal]);

  const getEmptyForm = () => {
    if (tab === 'owners') return {
      name: '', phone: '', email: '', address: '', bankAccount: '', paymentTerms: 'cash',
      ownerType: 'individual', role: 'owner',
      driverName: '', driverPhone: '', driverLicenseNumber: '',
      bankName: '', bankAccountHolder: '', bankAccountNumber: '',
      paymentMethod: 'cash',
    };
    if (tab === 'vehicles') return { ownerId: '', plateNumber: '', vehicleType: 'gravel_tipper', capacityTons: '0', ratePerTon: '', ratePerTrip: '' };
    return { rentalVehicleId: '', pickupLocation: '', deliveryLocation: '', quantityTons: '', customerRevenue: '', notes: '', tip: '' };
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      if (tab === 'owners') await rentalApi.createOwner(form);
      else if (tab === 'vehicles') {
        await rentalApi.createVehicle({
          ...form,
          capacityTons: Number(form.capacityTons),
          ratePerTon: form.ratePerTon ? Number(form.ratePerTon) : undefined,
          ratePerTrip: form.ratePerTrip ? Number(form.ratePerTrip) : undefined,
        });
      } else {
        await rentalApi.createTrip({
          ...form,
          quantityTons: Number(form.quantityTons),
          customerRevenue: Number(form.customerRevenue),
          tip: form.tip !== '' && form.tip != null ? Number(form.tip) : undefined,
        });
      }
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 border-b border-gray-200">
          {(['owners', 'vehicles', 'trips'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>{t}</button>
          ))}
        </div>
        <button onClick={() => { setForm(getEmptyForm()); setError(''); setModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" />Add {tab === 'owners' ? 'Owner' : tab === 'vehicles' ? 'Vehicle' : 'Trip'}
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            {tab === 'owners' && <tr><th className="th">Owner Name</th><th className="th">Phone</th><th className="th">Email</th><th className="th">Balance</th><th className="th">Vehicles</th></tr>}
            {tab === 'vehicles' && <tr><th className="th">Plate</th><th className="th">Owner</th><th className="th">Type</th><th className="th">Capacity</th><th className="th">Rate/Trip</th></tr>}
            {tab === 'trips' && <tr><th className="th">Date</th><th className="th">Vehicle</th><th className="th">Route</th><th className="th">Qty (t)</th><th className="th">Revenue</th><th className="th">Payable</th><th className="th">Margin</th></tr>}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="td text-center py-10 text-gray-400">No {tab}</td></tr>
            ) : items.map((item: any) => (
              <tr key={item.id} className="tr">
                {tab === 'owners' && <>
                  <td className="td font-medium">{item.name}</td>
                  <td className="td">{item.phone}</td>
                  <td className="td text-gray-500">{item.email || '-'}</td>
                  <td className={`td font-semibold ${(item.currentBalance || 0) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    ETB {item.currentBalance?.toLocaleString() || '0'}
                  </td>
                  <td className="td">{item._count?.vehicles || 0}</td>
                </>}
                {tab === 'vehicles' && <>
                  <td className="td font-medium">{item.plateNumber}</td>
                  <td className="td">{item.owner?.name}</td>
                  <td className="td"><StatusBadge status={item.vehicleType} /></td>
                  <td className="td">{item.capacityTons} t</td>
                  <td className="td">ETB {item.ratePerTrip?.toLocaleString() || '-'}</td>
                </>}
                {tab === 'trips' && <>
                  <td className="td text-sm">{formatDualDate(item.tripDate)}</td>
                  <td className="td">{item.rentalVehicle?.plateNumber}</td>
                  <td className="td text-gray-500 text-xs">{item.pickupLocation} → {item.deliveryLocation}</td>
                  <td className="td">{item.quantityTons} t</td>
                  <td className="td text-green-700">ETB {item.customerRevenue?.toLocaleString()}</td>
                  <td className="td text-red-600">ETB {item.rentalPayable?.toLocaleString()}</td>
                  <td className={`td font-semibold ${(item.grossMargin || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    ETB {item.grossMargin?.toLocaleString()}
                  </td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={`Add ${tab === 'owners' ? 'Owner' : tab === 'vehicles' ? 'Rental Vehicle' : 'Rental Trip'}`} onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

            {tab === 'owners' && <>
              {/* Owner Information */}
              <div className="border border-gray-200 rounded p-3 space-y-3">
                <div className="text-sm font-semibold text-gray-700">Owner Information</div>
                <div><label className="label">Owner Name *</label><input className="input" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Phone *</label><input className="input" value={form.phone} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} required /></div>
                  <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
                </div>
                <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Owner Type</label>
                    <select className="select" value={form.ownerType || 'individual'} onChange={e => setForm((f: any) => ({ ...f, ownerType: e.target.value }))}>
                      <option value="individual">Individual</option>
                      <option value="organization">Organization</option>
                      <option value="broker">Broker</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select className="select" value={form.role || 'owner'} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))}>
                      <option value="owner">Owner</option>
                      <option value="driver">Driver</option>
                      <option value="owner_driver">Owner &amp; Driver</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Driver Info */}
              <div className="border border-gray-200 rounded p-3 space-y-3">
                <div className="text-sm font-semibold text-gray-700">Driver Info</div>
                {(() => {
                  const driverRequired = form.role === 'driver' || form.role === 'owner_driver';
                  return <>
                    <div><label className="label">Driver Name {driverRequired && '*'}</label><input className="input" value={form.driverName || ''} onChange={e => setForm((f: any) => ({ ...f, driverName: e.target.value }))} required={driverRequired} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="label">Driver Phone {driverRequired && '*'}</label><input className="input" value={form.driverPhone || ''} onChange={e => setForm((f: any) => ({ ...f, driverPhone: e.target.value }))} required={driverRequired} /></div>
                      <div><label className="label">License Number {driverRequired && '*'}</label><input className="input" value={form.driverLicenseNumber || ''} onChange={e => setForm((f: any) => ({ ...f, driverLicenseNumber: e.target.value }))} required={driverRequired} /></div>
                    </div>
                  </>;
                })()}
              </div>

              {/* Bank & Payment */}
              <div className="border border-gray-200 rounded p-3 space-y-3">
                <div className="text-sm font-semibold text-gray-700">Bank &amp; Payment</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Payment Method</label>
                    <select className="select" value={form.paymentMethod || 'cash'} onChange={e => setForm((f: any) => ({ ...f, paymentMethod: e.target.value }))}>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="mobile_banking">Mobile Banking</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Payment Terms</label>
                    <select className="select" value={form.paymentTerms} onChange={e => setForm((f: any) => ({ ...f, paymentTerms: e.target.value }))}>
                      <option value="cash">Cash</option><option value="credit">Credit</option><option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                {(() => {
                  const bankDisabled = (form.paymentMethod || 'cash') === 'cash';
                  return <>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="label">Bank Name</label><input className="input" value={form.bankName || ''} onChange={e => setForm((f: any) => ({ ...f, bankName: e.target.value }))} disabled={bankDisabled} /></div>
                      <div><label className="label">Account Holder</label><input className="input" value={form.bankAccountHolder || ''} onChange={e => setForm((f: any) => ({ ...f, bankAccountHolder: e.target.value }))} disabled={bankDisabled} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="label">Account Number</label><input className="input" value={form.bankAccountNumber || ''} onChange={e => setForm((f: any) => ({ ...f, bankAccountNumber: e.target.value }))} disabled={bankDisabled} /></div>
                      <div><label className="label">Bank Account (legacy)</label><input className="input" value={form.bankAccount} onChange={e => setForm((f: any) => ({ ...f, bankAccount: e.target.value }))} disabled={bankDisabled} /></div>
                    </div>
                  </>;
                })()}
              </div>
            </>}

            {tab === 'vehicles' && <>
              <div>
                <label className="label">Owner *</label>
                <select className="select" value={form.ownerId} onChange={e => setForm((f: any) => ({ ...f, ownerId: e.target.value }))} required>
                  <option value="">Select owner</option>
                  {owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Plate Number *</label><input className="input" value={form.plateNumber} onChange={e => setForm((f: any) => ({ ...f, plateNumber: e.target.value }))} required /></div>
                <div>
                  <label className="label">Vehicle Type *</label>
                  <select className="select" value={form.vehicleType} onChange={e => setForm((f: any) => ({ ...f, vehicleType: e.target.value }))}>
                    <option value="gravel_tipper">Gravel Tipper</option>
                    <option value="cement_tanker">Cement Tanker</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Capacity (t) *</label><input type="number" className="input" value={form.capacityTons} onChange={e => setForm((f: any) => ({ ...f, capacityTons: e.target.value }))} required /></div>
                <div><label className="label">Rate/Ton</label><input type="number" className="input" value={form.ratePerTon} onChange={e => setForm((f: any) => ({ ...f, ratePerTon: e.target.value }))} /></div>
                <div><label className="label">Rate/Trip</label><input type="number" className="input" value={form.ratePerTrip} onChange={e => setForm((f: any) => ({ ...f, ratePerTrip: e.target.value }))} /></div>
              </div>
            </>}

            {tab === 'trips' && <>
              <div>
                <label className="label">Rental Vehicle *</label>
                <select className="select" value={form.rentalVehicleId} onChange={e => setForm((f: any) => ({ ...f, rentalVehicleId: e.target.value }))} required>
                  <option value="">Select vehicle</option>
                  {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plateNumber} ({v.capacityTons}t) - {v.owner?.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Pickup Location *</label><input className="input" value={form.pickupLocation} onChange={e => setForm((f: any) => ({ ...f, pickupLocation: e.target.value }))} required /></div>
                <div><label className="label">Delivery Location *</label><input className="input" value={form.deliveryLocation} onChange={e => setForm((f: any) => ({ ...f, deliveryLocation: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Quantity (t)</label><input type="number" className="input" value={form.quantityTons} onChange={e => setForm((f: any) => ({ ...f, quantityTons: e.target.value }))} /></div>
                <div><label className="label">Customer Revenue (ETB) *</label><input type="number" className="input" value={form.customerRevenue} onChange={e => setForm((f: any) => ({ ...f, customerRevenue: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tip (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={form.tip ?? ''}
                    onChange={e => setForm((f: any) => ({ ...f, tip: e.target.value }))}
                  />
                </div>
                <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
              </div>
            </>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
