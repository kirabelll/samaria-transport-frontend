import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { hrApi } from '../services/api';
import { formatDualDate } from '../utils/ethCalendar';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import DateInput from '../components/ui/DateInput';

export default function HRPage() {
  const [tab, setTab] = useState<'attendance' | 'leaves' | 'overtime'>('attendance');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const load = () => {
    setLoading(true);
    let api;
    if (tab === 'attendance') api = hrApi.listAttendance({ date: filterDate });
    else if (tab === 'leaves') api = hrApi.listLeaves({});
    else api = hrApi.listOvertime({});
    api.then(r => setItems(r.data.attendance || r.data.leaves || r.data.overtime || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab, filterDate]);

  useEffect(() => {
    if (modal && employees.length === 0) {
      import('../services/api').then(({ employeeApi }) => {
        employeeApi.list().then(r => setEmployees(r.data.employees || []));
      });
    }
  }, [modal]);

  const getEmptyForm = () => {
    if (tab === 'attendance') return { employeeId: '', date: filterDate, checkIn: '', checkOut: '', status: 'present', notes: '' };
    if (tab === 'leaves') return { employeeId: '', leaveType: 'annual', startDate: '', endDate: '', reason: '' };
    return { employeeId: '', date: filterDate, hours: '1', reason: '' };
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true); setError('');
    try {
      if (tab === 'attendance') await hrApi.markAttendance(form);
      else if (tab === 'leaves') await hrApi.createLeave(form);
      else await hrApi.logOvertime({ ...form, hours: Number(form.hours) });
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const approveLeave = async (id: string, status: 'approved' | 'rejected') => {
    try { await hrApi.updateLeave(id, { status }); load(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 border-b border-gray-200">
          {(['attendance', 'leaves', 'overtime'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>{t}</button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          {tab === 'attendance' && (
            <DateInput className="input w-40" value={filterDate} onChange={val => setFilterDate(val)} />
          )}
          <button onClick={() => { setForm(getEmptyForm()); setError(''); setModal(true); }} className="btn-primary py-1.5 px-3 text-sm">
            <Plus className="w-4 h-4" />Add
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            {tab === 'attendance' && <tr><th className="th">Employee</th><th className="th">Date</th><th className="th">Status</th><th className="th">Check In</th><th className="th">Check Out</th><th className="th">Notes</th></tr>}
            {tab === 'leaves' && <tr><th className="th">Employee</th><th className="th">Type</th><th className="th">Start</th><th className="th">End</th><th className="th">Status</th><th className="th">Actions</th></tr>}
            {tab === 'overtime' && <tr><th className="th">Employee</th><th className="th">Date</th><th className="th">Hours</th><th className="th">Reason</th><th className="th">Status</th></tr>}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="td text-center py-10 text-gray-400">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="td text-center py-10 text-gray-400">No records</td></tr>
            ) : items.map((item: any) => (
              <tr key={item.id} className="tr">
                {tab === 'attendance' && <>
                  <td className="td font-medium">{item.employee?.firstName} {item.employee?.lastName}</td>
                  <td className="td text-sm">{formatDualDate(item.date)}</td>
                  <td className="td"><StatusBadge status={item.status} /></td>
                  <td className="td text-gray-500">{item.checkIn ? new Date(item.checkIn).toLocaleTimeString() : '-'}</td>
                  <td className="td text-gray-500">{item.checkOut ? new Date(item.checkOut).toLocaleTimeString() : '-'}</td>
                  <td className="td text-gray-500 text-xs">{item.notes || '-'}</td>
                </>}
                {tab === 'leaves' && <>
                  <td className="td font-medium">{item.employee?.firstName} {item.employee?.lastName}</td>
                  <td className="td"><StatusBadge status={item.leaveType} /></td>
                  <td className="td text-sm">{formatDualDate(item.startDate)}</td>
                  <td className="td text-sm">{formatDualDate(item.endDate)}</td>
                  <td className="td"><StatusBadge status={item.status} /></td>
                  <td className="td">
                    {item.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => approveLeave(item.id, 'approved')} className="btn-success py-1 px-2 text-xs">Approve</button>
                        <button onClick={() => approveLeave(item.id, 'rejected')} className="btn-danger py-1 px-2 text-xs">Reject</button>
                      </div>
                    )}
                  </td>
                </>}
                {tab === 'overtime' && <>
                  <td className="td font-medium">{item.employee?.firstName} {item.employee?.lastName}</td>
                  <td className="td text-sm">{formatDualDate(item.date)}</td>
                  <td className="td font-semibold">{item.hours} hrs</td>
                  <td className="td text-gray-500">{item.reason || '-'}</td>
                  <td className="td"><StatusBadge status={item.status || 'pending'} /></td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={`Add ${tab === 'attendance' ? 'Attendance' : tab === 'leaves' ? 'Leave Request' : 'Overtime'}`} onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-3">
            {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div>
              <label className="label">Employee *</label>
              <select className="select" value={form.employeeId} onChange={e => setForm((f: any) => ({ ...f, employeeId: e.target.value }))} required>
                <option value="">Select employee</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.role})</option>)}
              </select>
            </div>

            {tab === 'attendance' && <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Date</label><DateInput value={form.date} onChange={val => setForm((f: any) => ({ ...f, date: val }))} /></div>
                <div>
                  <label className="label">Status</label>
                  <select className="select" value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                    <option value="present">Present</option><option value="absent">Absent</option>
                    <option value="late">Late</option><option value="half_day">Half Day</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Check In</label><input type="time" className="input" value={form.checkIn} onChange={e => setForm((f: any) => ({ ...f, checkIn: e.target.value }))} /></div>
                <div><label className="label">Check Out</label><input type="time" className="input" value={form.checkOut} onChange={e => setForm((f: any) => ({ ...f, checkOut: e.target.value }))} /></div>
              </div>
              <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
            </>}

            {tab === 'leaves' && <>
              <div>
                <label className="label">Leave Type</label>
                <select className="select" value={form.leaveType} onChange={e => setForm((f: any) => ({ ...f, leaveType: e.target.value }))}>
                  <option value="annual">Annual</option><option value="sick">Sick</option>
                  <option value="maternity">Maternity</option><option value="paternity">Paternity</option>
                  <option value="unpaid">Unpaid</option><option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Start Date *</label><DateInput value={form.startDate} onChange={val => setForm((f: any) => ({ ...f, startDate: val }))} required /></div>
                <div><label className="label">End Date *</label><DateInput value={form.endDate} onChange={val => setForm((f: any) => ({ ...f, endDate: val }))} required /></div>
              </div>
              <div><label className="label">Reason</label><textarea className="input" rows={2} value={form.reason} onChange={e => setForm((f: any) => ({ ...f, reason: e.target.value }))} /></div>
            </>}

            {tab === 'overtime' && <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Date</label><DateInput value={form.date} onChange={val => setForm((f: any) => ({ ...f, date: val }))} /></div>
                <div><label className="label">Hours *</label><input type="number" step="0.5" className="input" value={form.hours} onChange={e => setForm((f: any) => ({ ...f, hours: e.target.value }))} required /></div>
              </div>
              <div><label className="label">Reason</label><input className="input" value={form.reason} onChange={e => setForm((f: any) => ({ ...f, reason: e.target.value }))} /></div>
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
