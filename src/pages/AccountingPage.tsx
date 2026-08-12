import { useEffect, useState } from 'react';
import { BookOpen, FileText, Scale, TrendingUp, Building, List, Plus, ChevronDown, ChevronRight, Edit2, Sprout, Wallet, Settings } from 'lucide-react';
import { accountingApi } from '../services/api';
import { formatDualDate } from '../utils/ethCalendar';
import Modal from '../components/ui/Modal';
import DateInput from '../components/ui/DateInput';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const CATEGORIES = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const TYPES = ['debit', 'credit'];

const fmt = (n: number) => `ETB ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const emptyAccount = { code: '', name: '', category: 'asset', type: 'debit', description: '' };
const emptyLine = { accountId: '', description: '', debit: '', credit: '' };

type Tab = 'coa' | 'journal' | 'trial' | 'pnl' | 'bs' | 'gl' | 'cashbook' | 'config';

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>('coa');

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'coa', label: 'Chart of Accounts', icon: BookOpen },
    { key: 'journal', label: 'Journal Entries', icon: FileText },
    { key: 'cashbook', label: 'Cash Book', icon: Wallet },
    { key: 'trial', label: 'Trial Balance', icon: Scale },
    { key: 'pnl', label: 'Profit & Loss', icon: TrendingUp },
    { key: 'bs', label: 'Balance Sheet', icon: Building },
    { key: 'gl', label: 'General Ledger', icon: List },
    { key: 'config', label: 'Auto-Post Config', icon: Settings },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <BookOpen className="w-5 h-5" /> Accounting
      </h2>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'coa' && <ChartOfAccounts />}
      {tab === 'journal' && <JournalEntries />}
      {tab === 'cashbook' && <CashBook />}
      {tab === 'trial' && <TrialBalance />}
      {tab === 'pnl' && <ProfitLoss />}
      {tab === 'bs' && <BalanceSheetTab />}
      {tab === 'gl' && <GeneralLedger />}
      {tab === 'config' && <AccountingConfigTab />}
    </div>
  );
}

/* ===================== 1. Chart of Accounts ===================== */
function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyAccount });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const load = () => {
    setLoading(true);
    accountingApi.accounts(filterCat ? { category: filterCat } : undefined)
      .then(r => setAccounts(r.data.accounts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterCat]);

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await accountingApi.updateAccount(editing.id, form);
      } else {
        await accountingApi.createAccount(form);
      }
      setModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const seed = async () => {
    if (!confirm('This will create default chart of accounts. Continue?')) return;
    try {
      const r = await accountingApi.seed();
      alert(r.data.message || 'Seeded successfully');
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Seed failed');
    }
  };

  const openEdit = (acct: any) => {
    setEditing(acct);
    setForm({ code: acct.code, name: acct.name, category: acct.category, type: acct.type, description: acct.description || '' });
    setError('');
    setModal(true);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyAccount });
    setError('');
    setModal(true);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <select className="select w-44" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={seed} className="btn-secondary"><Sprout className="w-4 h-4" /> Seed Defaults</button>
          <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add Account</button>
        </div>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Code</th>
                <th className="th">Name</th>
                <th className="th">Category</th>
                <th className="th">Type</th>
                <th className="th text-right">Balance</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr><td colSpan={6} className="td text-center py-10 text-gray-400">No accounts found. Use "Seed Defaults" to create standard accounts.</td></tr>
              ) : accounts.map(a => (
                <tr key={a.id} className="tr">
                  <td className="td font-mono text-sm">{a.code}</td>
                  <td className="td font-medium">{a.name}</td>
                  <td className="td capitalize text-sm text-gray-500">{a.category}</td>
                  <td className="td capitalize text-sm text-gray-500">{a.type}</td>
                  <td className="td text-right font-mono">{fmt(a.balance)}</td>
                  <td className="td">
                    <button onClick={() => openEdit(a)} className="btn-ghost text-sm"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={editing ? 'Edit Account' : 'Add Account'} onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-4">
            {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Code</label>
                <input className="input" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. 1000" />
              </div>
              <div>
                <label className="label">Name</label>
                <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Cash" />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Type</label>
                <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ===================== 2. Journal Entries ===================== */
function JournalEntries() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', reference: '' });
  const [lines, setLines] = useState<any[]>([{ ...emptyLine }, { ...emptyLine }]);

  const load = () => {
    setLoading(true);
    accountingApi.journalEntries()
      .then(r => setEntries(r.data.entries || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ date: new Date().toISOString().split('T')[0], description: '', reference: '' });
    setLines([{ ...emptyLine }, { ...emptyLine }]);
    setError('');
    accountingApi.accounts().then(r => setAccounts(r.data.accounts || [])).catch(console.error);
    setModal(true);
  };

  const updateLine = (idx: number, field: string, value: string) => {
    const updated = lines.map((l, i) => i === idx ? { ...l, [field]: value } : l);
    setLines(updated);
  };

  const addLine = () => setLines([...lines, { ...emptyLine }]);

  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!isBalanced) { setError('Total debits must equal total credits'); return; }
    const validLines = lines.filter(l => l.accountId && (parseFloat(l.debit) || parseFloat(l.credit)));
    if (validLines.length < 2) { setError('At least two lines required'); return; }
    setSaving(true);
    setError('');
    try {
      await accountingApi.createJournalEntry({
        date: form.date,
        description: form.description,
        reference: form.reference,
        lines: validLines.map(l => ({
          accountId: l.accountId,
          description: l.description,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
      });
      setModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> New Entry</button>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="th w-8"></th>
                <th className="th">Entry #</th>
                <th className="th">Date</th>
                <th className="th">Description</th>
                <th className="th">Reference</th>
                <th className="th text-right">Total</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={7} className="td text-center py-10 text-gray-400">No journal entries</td></tr>
              ) : entries.map(e => (
                <>
                  <tr key={e.id} className="tr cursor-pointer" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                    <td className="td">
                      {expanded === e.id
                        ? <ChevronDown className="w-4 h-4 text-gray-400" />
                        : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </td>
                    <td className="td font-mono text-sm">{e.entryNumber}</td>
                    <td className="td text-sm">{formatDualDate(e.date)}</td>
                    <td className="td">{e.description}</td>
                    <td className="td text-sm text-gray-500">{e.reference || '-'}</td>
                    <td className="td text-right font-mono">{fmt(e.totalAmount)}</td>
                    <td className="td">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${e.status === 'posted' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                  {expanded === e.id && (
                    <tr key={e.id + '-lines'}>
                      <td colSpan={7} className="px-4 pb-4 bg-gray-50">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left py-1 px-2">Account</th>
                              <th className="text-left py-1 px-2">Description</th>
                              <th className="text-right py-1 px-2">Debit</th>
                              <th className="text-right py-1 px-2">Credit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(e.lines || []).map((l: any, i: number) => (
                              <tr key={i} className="border-t border-gray-100">
                                <td className="py-1 px-2 font-mono">{l.account?.code} - {l.account?.name}</td>
                                <td className="py-1 px-2 text-gray-500">{l.description || '-'}</td>
                                <td className="py-1 px-2 text-right font-mono">{l.debit ? fmt(l.debit) : ''}</td>
                                <td className="py-1 px-2 text-right font-mono">{l.credit ? fmt(l.credit) : ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title="New Journal Entry" onClose={() => setModal(false)} size="max-w-3xl">
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Date</label>
                <DateInput required value={form.date} onChange={val => setForm({ ...form, date: val })} />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="label">Reference</label>
                <input className="input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="INV-001" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Line Items</label>
                <button type="button" onClick={addLine} className="btn-ghost text-sm"><Plus className="w-3.5 h-3.5" /> Add Line</button>
              </div>
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <select className="select text-sm" value={line.accountId} onChange={e => updateLine(idx, 'accountId', e.target.value)}>
                        <option value="">Select Account</option>
                        {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input className="input text-sm" placeholder="Description" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <input type="number" step="0.01" min="0" className="input text-sm text-right" placeholder="Debit"
                        value={line.debit} onChange={e => updateLine(idx, 'debit', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <input type="number" step="0.01" min="0" className="input text-sm text-right" placeholder="Credit"
                        value={line.credit} onChange={e => updateLine(idx, 'credit', e.target.value)} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {lines.length > 2 && (
                        <button type="button" onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-6 mt-3 text-sm font-medium border-t pt-2">
                <span>Total Debit: <span className="font-mono">{fmt(totalDebit)}</span></span>
                <span>Total Credit: <span className="font-mono">{fmt(totalCredit)}</span></span>
                {isBalanced
                  ? <span className="text-green-600">Balanced</span>
                  : <span className="text-red-600">Unbalanced ({fmt(Math.abs(totalDebit - totalCredit))})</span>}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving || !isBalanced} className="btn-primary">{saving ? 'Saving...' : 'Create Entry'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ===================== 3. Trial Balance ===================== */
function TrialBalance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountingApi.trialBalance()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;
  if (!data) return <div className="text-center py-10 text-gray-400">Failed to load trial balance</div>;

  return (
    <>
      <div className="flex items-center gap-3">
        <h3 className="section-title">Trial Balance</h3>
        {data.balanced
          ? <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">Balanced</span>
          : <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">Unbalanced</span>}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="th">Code</th>
              <th className="th">Account</th>
              <th className="th text-right">Debit</th>
              <th className="th text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {(data.trialBalance || []).length === 0 ? (
              <tr><td colSpan={4} className="td text-center py-10 text-gray-400">No data</td></tr>
            ) : (data.trialBalance || []).map((row: any, i: number) => (
              <tr key={i} className="tr">
                <td className="td font-mono text-sm">{row.code}</td>
                <td className="td">{row.name}</td>
                <td className="td text-right font-mono">{row.debit ? fmt(row.debit) : ''}</td>
                <td className="td text-right font-mono">{row.credit ? fmt(row.credit) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold">
              <td className="td" colSpan={2}>Totals</td>
              <td className="td text-right font-mono">{fmt(data.totalDebit)}</td>
              <td className="td text-right font-mono">{fmt(data.totalCredit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

/* ===================== 4. Profit & Loss ===================== */
function ProfitLoss() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);

  const load = () => {
    setLoading(true);
    accountingApi.profitLoss({ from, to })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [from, to]);

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;
  if (!data) return <div className="text-center py-10 text-gray-400">Failed to load</div>;

  const pieData = [
    ...(data.revenues || []).map((r: any) => ({ name: r.name, value: r.amount, type: 'revenue' })),
    ...(data.expenses || []).map((e: any) => ({ name: e.name, value: e.amount, type: 'expense' })),
  ].filter(d => d.value > 0);

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h3 className="section-title">Profit & Loss Statement</h3>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-500">From:</label>
          <DateInput className="input w-36" value={from} onChange={val => setFrom(val)} />
          <label className="text-sm text-gray-500">To:</label>
          <DateInput className="input w-36" value={to} onChange={val => setTo(val)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue & Expense tables */}
        <div className="lg:col-span-2 space-y-5">
          {/* Revenue */}
          <div className="card">
            <h4 className="text-sm font-semibold text-green-700 mb-3">Revenue</h4>
            <table className="w-full text-sm">
              <tbody>
                {(data.revenues || []).map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 font-mono text-gray-500">{r.code}</td>
                    <td className="py-1.5">{r.name}</td>
                    <td className="py-1.5 text-right font-mono">{fmt(r.amount)}</td>
                  </tr>
                ))}
                {(data.revenues || []).length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400">No revenue items</td></tr>}
              </tbody>
              <tfoot>
                <tr className="font-semibold text-green-700 border-t">
                  <td colSpan={2} className="py-2">Total Revenue</td>
                  <td className="py-2 text-right font-mono">{fmt(data.totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Expenses */}
          <div className="card">
            <h4 className="text-sm font-semibold text-red-700 mb-3">Expenses</h4>
            <table className="w-full text-sm">
              <tbody>
                {(data.expenses || []).map((e: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 font-mono text-gray-500">{e.code}</td>
                    <td className="py-1.5">{e.name}</td>
                    <td className="py-1.5 text-right font-mono">{fmt(e.amount)}</td>
                  </tr>
                ))}
                {(data.expenses || []).length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400">No expense items</td></tr>}
              </tbody>
              <tfoot>
                <tr className="font-semibold text-red-700 border-t">
                  <td colSpan={2} className="py-2">Total Expenses</td>
                  <td className="py-2 text-right font-mono">{fmt(data.totalExpense)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Net Income summary */}
          <div className="card bg-gray-50">
            <div className="flex justify-between items-center text-base font-semibold">
              <span>Net Income</span>
              <span className={data.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}>{fmt(data.netIncome)}</span>
            </div>
            {data.margin !== undefined && (
              <div className="text-sm text-gray-500 mt-1">Margin: {(data.margin * 100).toFixed(1)}%</div>
            )}
          </div>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Breakdown</h4>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">No data for chart</div>
          )}
        </div>
      </div>
    </>
  );
}

/* ===================== 5. Balance Sheet ===================== */
function BalanceSheetTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountingApi.balanceSheet()
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;
  if (!data) return <div className="text-center py-10 text-gray-400">Failed to load</div>;

  const Section = ({ title, items, total, color }: { title: string; items: any[]; total: number; color: string }) => (
    <div className="card">
      <h4 className={`text-sm font-semibold mb-3 ${color}`}>{title}</h4>
      <table className="w-full text-sm">
        <tbody>
          {items.map((item: any, i: number) => (
            <tr key={i} className="border-b border-gray-50">
              <td className="py-1.5 font-mono text-gray-500">{item.code}</td>
              <td className="py-1.5">{item.name}</td>
              <td className="py-1.5 text-right font-mono">{fmt(item.balance ?? item.amount ?? 0)}</td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-400">No items</td></tr>}
        </tbody>
        <tfoot>
          <tr className={`font-semibold border-t ${color}`}>
            <td colSpan={2} className="py-2">Total {title}</td>
            <td className="py-2 text-right font-mono">{fmt(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <>
      <h3 className="section-title">Balance Sheet</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <Section title="Assets" items={data.assets || []} total={data.totalAssets} color="text-blue-700" />
        </div>
        <div className="space-y-5">
          <Section title="Liabilities" items={data.liabilities || []} total={data.totalLiabilities} color="text-red-700" />
          <Section title="Equity" items={data.equity || []} total={data.totalEquity} color="text-purple-700" />
          {data.netIncome !== undefined && (
            <div className="card bg-gray-50">
              <div className="flex justify-between text-sm font-semibold">
                <span>Retained Earnings (Net Income)</span>
                <span className="font-mono">{fmt(data.netIncome)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-gray-50 mt-5">
        <div className="grid grid-cols-3 gap-4 text-center text-sm font-semibold">
          <div>
            <div className="text-gray-500">Total Assets</div>
            <div className="text-lg font-mono text-blue-700">{fmt(data.totalAssets)}</div>
          </div>
          <div>
            <div className="text-gray-500">Total Liabilities</div>
            <div className="text-lg font-mono text-red-700">{fmt(data.totalLiabilities)}</div>
          </div>
          <div>
            <div className="text-gray-500">Total Equity</div>
            <div className="text-lg font-mono text-purple-700">{fmt(data.totalEquity)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ===================== 6. General Ledger ===================== */
function GeneralLedger() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    accountingApi.accounts().then(r => setAccounts(r.data.accounts || [])).catch(console.error);
  }, []);

  const load = () => {
    if (!selectedAccount) return;
    setLoading(true);
    accountingApi.generalLedger({ accountId: selectedAccount, from, to })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [selectedAccount, from, to]);

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 items-center flex-wrap">
          <div>
            <label className="label">Account</label>
            <select className="select w-64" value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
              <option value="">Select an account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <DateInput className="input w-36" value={from} onChange={val => setFrom(val)} />
          </div>
          <div>
            <label className="label">To</label>
            <DateInput className="input w-36" value={to} onChange={val => setTo(val)} />
          </div>
        </div>
      </div>

      {!selectedAccount ? (
        <div className="text-center py-10 text-gray-400">Select an account to view its ledger</div>
      ) : loading ? (
        <div className="text-center py-10 text-gray-400">Loading...</div>
      ) : !data ? (
        <div className="text-center py-10 text-gray-400">No data</div>
      ) : (
        <>
          {data.account && (
            <div className="card bg-gray-50">
              <div className="flex gap-6 text-sm">
                <span><strong>Account:</strong> {data.account.code} - {data.account.name}</span>
                <span><strong>Category:</strong> <span className="capitalize">{data.account.category}</span></span>
                <span><strong>Type:</strong> <span className="capitalize">{data.account.type}</span></span>
              </div>
            </div>
          )}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Entry #</th>
                  <th className="th">Description</th>
                  <th className="th">Reference</th>
                  <th className="th text-right">Debit</th>
                  <th className="th text-right">Credit</th>
                  <th className="th text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(data.ledger || []).length === 0 ? (
                  <tr><td colSpan={7} className="td text-center py-10 text-gray-400">No transactions in this period</td></tr>
                ) : (data.ledger || []).map((row: any, i: number) => (
                  <tr key={i} className="tr">
                    <td className="td text-sm">{formatDualDate(row.date)}</td>
                    <td className="td font-mono text-sm">{row.entryNumber}</td>
                    <td className="td">{row.description}</td>
                    <td className="td text-sm text-gray-500">{row.reference || '-'}</td>
                    <td className="td text-right font-mono">{row.debit ? fmt(row.debit) : ''}</td>
                    <td className="td text-right font-mono">{row.credit ? fmt(row.credit) : ''}</td>
                    <td className="td text-right font-mono font-medium">{fmt(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* ===================== 7. Cash Book ===================== */
function CashBook() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);

  const load = () => {
    setLoading(true);
    accountingApi.cashBook({ from, to })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [from, to]);

  const sourceLabel = (type: string) => {
    const labels: any = { trip_revenue: 'Trip', fuel_purchase: 'Fuel', driver_advance: 'Advance', cash_transfer: 'Transfer', maintenance: 'Maintenance', shortage_deduction: 'Shortage' };
    return labels[type] || type || '';
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h3 className="section-title">Cash Book</h3>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-500">From:</label>
          <DateInput className="input w-36" value={from} onChange={val => setFrom(val)} />
          <label className="text-sm text-gray-500">To:</label>
          <DateInput className="input w-36" value={to} onChange={val => setTo(val)} />
        </div>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : !data ? (
        <div className="text-center py-10 text-gray-400">Failed to load cash book</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="text-xs text-gray-500">Opening Balance</div>
              <div className="text-lg font-semibold font-mono">{fmt(data.openingBalance)}</div>
            </div>
            <div className="card">
              <div className="text-xs text-gray-500">Total Cash In</div>
              <div className="text-lg font-semibold font-mono text-green-700">{fmt(data.totalCashIn)}</div>
            </div>
            <div className="card">
              <div className="text-xs text-gray-500">Total Cash Out</div>
              <div className="text-lg font-semibold font-mono text-red-700">{fmt(data.totalCashOut)}</div>
            </div>
            <div className="card">
              <div className="text-xs text-gray-500">Closing Balance</div>
              <div className="text-lg font-semibold font-mono">{fmt(data.closingBalance)}</div>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Entry #</th>
                  <th className="th">Description</th>
                  <th className="th">Source</th>
                  <th className="th">Reference</th>
                  <th className="th text-right">Cash In</th>
                  <th className="th text-right">Cash Out</th>
                  <th className="th text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening balance row */}
                <tr className="bg-gray-50">
                  <td className="td text-sm" colSpan={5}><em>Opening Balance</em></td>
                  <td className="td"></td>
                  <td className="td"></td>
                  <td className="td text-right font-mono font-medium">{fmt(data.openingBalance)}</td>
                </tr>
                {(data.entries || []).length === 0 ? (
                  <tr><td colSpan={8} className="td text-center py-10 text-gray-400">No cash transactions in this period</td></tr>
                ) : (data.entries || []).map((e: any, i: number) => (
                  <tr key={i} className="tr">
                    <td className="td text-sm">{formatDualDate(e.date)}</td>
                    <td className="td font-mono text-sm">{e.entryNumber}</td>
                    <td className="td text-sm">{e.description}</td>
                    <td className="td">
                      {e.sourceType && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          e.source === 'auto' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {e.source === 'auto' ? sourceLabel(e.sourceType) : 'Manual'}
                        </span>
                      )}
                    </td>
                    <td className="td text-sm text-gray-500">{e.reference || '-'}</td>
                    <td className="td text-right font-mono text-green-700">{e.cashIn ? fmt(e.cashIn) : ''}</td>
                    <td className="td text-right font-mono text-red-700">{e.cashOut ? fmt(e.cashOut) : ''}</td>
                    <td className="td text-right font-mono font-medium">{fmt(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td className="td" colSpan={5}>Totals</td>
                  <td className="td text-right font-mono text-green-700">{fmt(data.totalCashIn)}</td>
                  <td className="td text-right font-mono text-red-700">{fmt(data.totalCashOut)}</td>
                  <td className="td text-right font-mono">{fmt(data.closingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* ===================== 8. Accounting Config (Auto-Post Mappings) ===================== */
function AccountingConfigTab() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ transactionType: '', debitAccountId: '', creditAccountId: '', description: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const TRANSACTION_TYPES = [
    { value: 'trip_revenue', label: 'Trip Revenue' },
    { value: 'fuel_purchase', label: 'Fuel Purchase' },
    { value: 'driver_advance', label: 'Driver Advance' },
    { value: 'cash_transfer', label: 'Cash Transfer' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'depreciation', label: 'Depreciation' },
    { value: 'shortage_deduction', label: 'Shortage Deduction' },
  ];

  const load = () => {
    setLoading(true);
    Promise.all([
      accountingApi.configs(),
      accountingApi.accounts(),
    ]).then(([c, a]) => {
      setConfigs(c.data.configs || []);
      setAccounts(a.data.accounts || []);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ transactionType: '', debitAccountId: '', creditAccountId: '', description: '', isActive: true });
    setError('');
    setModal(true);
  };

  const openEdit = (cfg: any) => {
    setForm({
      transactionType: cfg.transactionType,
      debitAccountId: cfg.debitAccountId,
      creditAccountId: cfg.creditAccountId,
      description: cfg.description || '',
      isActive: cfg.isActive,
    });
    setError('');
    setModal(true);
  };

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setError('');
    try {
      await accountingApi.upsertConfig(form);
      setModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cfg: any) => {
    try {
      await accountingApi.updateConfig(cfg.id, { isActive: !cfg.isActive });
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Update failed');
    }
  };

  const seedDefaults = async () => {
    if (!confirm('This will seed default accounting config mappings based on your chart of accounts. Continue?')) return;
    try {
      const r = await accountingApi.seedConfig();
      alert(`Seeded ${r.data.count} mappings`);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Seed failed');
    }
  };

  const detailAccounts = accounts.filter((a: any) => a.type === 'detail' && a.isActive !== false);

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h3 className="section-title">Auto-Post Configuration</h3>
          <p className="text-sm text-gray-500 mt-1">Map transaction types to debit/credit accounts for automatic journal entry posting.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={seedDefaults} className="btn-secondary"><Sprout className="w-4 h-4" /> Seed Defaults</button>
          <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add Mapping</button>
        </div>
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Transaction Type</th>
                <th className="th">Debit Account</th>
                <th className="th">Credit Account</th>
                <th className="th">Description</th>
                <th className="th text-center">Active</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.length === 0 ? (
                <tr><td colSpan={6} className="td text-center py-10 text-gray-400">No mappings configured. Use "Seed Defaults" to create standard mappings.</td></tr>
              ) : configs.map((cfg: any) => (
                <tr key={cfg.id} className="tr">
                  <td className="td font-medium">
                    {TRANSACTION_TYPES.find(t => t.value === cfg.transactionType)?.label || cfg.transactionType}
                  </td>
                  <td className="td text-sm font-mono">{cfg.debitAccountName}</td>
                  <td className="td text-sm font-mono">{cfg.creditAccountName}</td>
                  <td className="td text-sm text-gray-500">{cfg.description || '-'}</td>
                  <td className="td text-center">
                    <button onClick={() => toggleActive(cfg)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${cfg.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${cfg.isActive ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="td">
                    <button onClick={() => openEdit(cfg)} className="btn-ghost text-sm"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title="Accounting Mapping" onClose={() => setModal(false)}>
          <form onSubmit={save} className="space-y-4">
            {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            <div>
              <label className="label">Transaction Type</label>
              <select className="select" required value={form.transactionType} onChange={e => setForm({ ...form, transactionType: e.target.value })}>
                <option value="">Select type</option>
                {TRANSACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Debit Account</label>
                <select className="select" required value={form.debitAccountId} onChange={e => setForm({ ...form, debitAccountId: e.target.value })}>
                  <option value="">Select account</option>
                  {detailAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Credit Account</label>
                <select className="select" required value={form.creditAccountId} onChange={e => setForm({ ...form, creditAccountId: e.target.value })}>
                  <option value="">Select account</option>
                  {detailAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Trip completed - DR Receivable, CR Revenue" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <label className="text-sm text-gray-700">Active (auto-posting enabled)</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
