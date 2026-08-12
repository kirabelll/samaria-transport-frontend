import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import {
  Package, TrendingUp, AlertTriangle, FileText, Printer, Download,
  CheckCircle, Clock, DollarSign, Truck, ChevronDown, ChevronRight, Save, Star,
} from 'lucide-react';
import { procurementApi } from '../services/api';
import DateInput from '../components/ui/DateInput';
import { formatDualDate } from '../utils/ethCalendar';

type Period = 'weekly' | 'monthly' | 'quarterly' | 'custom';

function fmtMoney(n: number | null | undefined): string {
  const v = Number(n || 0);
  return `ETB ${v.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNum(n: number | null | undefined): string {
  const v = Number(n || 0);
  return v.toLocaleString('en');
}
function safeStr(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

function csvEscape(v: any): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
function rowsToCsv(rows: any[]): string {
  if (!rows?.length) return '';
  const keys = Object.keys(rows[0]);
  return [keys.join(','), ...rows.map(r => keys.map(k => csvEscape(r[k])).join(','))].join('\n');
}

function periodDefaults(period: Period): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const start = new Date(today);
  if (period === 'weekly') {
    start.setDate(start.getDate() - 6);
  } else if (period === 'monthly') {
    start.setDate(1);
  } else if (period === 'quarterly') {
    const q = Math.floor(start.getMonth() / 3);
    start.setMonth(q * 3, 1);
  }
  return { from: start.toISOString().slice(0, 10), to };
}

function severityClass(sev: string): string {
  const s = (sev || '').toLowerCase();
  if (s === 'high') return 'border-l-4 border-red-500 bg-red-50 text-red-900';
  if (s === 'medium') return 'border-l-4 border-amber-500 bg-amber-50 text-amber-900';
  return 'border-l-4 border-blue-500 bg-blue-50 text-blue-900';
}
function severityBadge(sev: string): string {
  const s = (sev || '').toLowerCase();
  if (s === 'high') return 'badge-red';
  if (s === 'medium') return 'badge-yellow';
  return 'badge-blue';
}
function statusBadge(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'critical') return 'badge-red';
  if (s === 'reorder') return 'badge-yellow';
  if (s === 'healthy') return 'badge-green';
  return 'badge-gray';
}

function StarRating({ value }: { value: number | null | undefined }) {
  const v = Math.max(0, Math.min(5, Math.round(Number(value || 0))));
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= v ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{(Number(value || 0)).toFixed(1)}</span>
    </span>
  );
}

export default function ProcurementReportPage() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [from, setFrom] = useState<string>(() => periodDefaults('monthly').from);
  const [to, setTo] = useState<string>(() => periodDefaults('monthly').to);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Manager note local state
  const [keyAchievement, setKeyAchievement] = useState('');
  const [marketAnalysisNote, setMarketAnalysisNote] = useState('');
  const [strategicSourcingNote, setStrategicSourcingNote] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (p !== 'custom') {
      const def = periodDefaults(p);
      setFrom(def.from);
      setTo(def.to);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await procurementApi.procurementReport({ period, from, to });
      setReport(data);
      // Load saved manager note
      try {
        const noteRes = await procurementApi.getProcurementNote({ period, from, to });
        const n = noteRes.data?.note;
        setKeyAchievement(n?.keyAchievement || '');
        setMarketAnalysisNote(n?.marketAnalysisNote || '');
        setStrategicSourcingNote(n?.strategicSourcingNote || '');
        setGeneralNotes(n?.generalNotes || '');
      } catch {
        setKeyAchievement('');
        setMarketAnalysisNote('');
        setStrategicSourcingNote('');
        setGeneralNotes('');
      }
    } catch (e) {
      console.error('Failed to load procurement report', e);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [period, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await procurementApi.saveProcurementNote({
        period, from, to,
        keyAchievement, marketAnalysisNote, strategicSourcingNote, generalNotes,
      });
      alert('Note saved successfully');
    } catch (e: any) {
      alert('Failed to save note: ' + (e?.response?.data?.error || e?.message || 'Unknown error'));
    } finally {
      setSavingNote(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;
    const lines: string[] = [];
    const periodLabel = `${period} | ${from} -> ${to}`;
    lines.push(`Procurement Report,${periodLabel}`);
    lines.push('');

    // Section 1
    const exec = report.executiveSummary || {};
    lines.push('=== Section 1: Executive Summary ===');
    lines.push(`Total Spend (ETB),${exec.totalSpend ?? 0}`);
    lines.push(`POs Issued,${exec.ordersIssued ?? 0}`);
    lines.push(`Avg Internal Approval Days,${exec.avgInternalApprovalDays ?? 0}`);
    lines.push('Orders By Status:');
    Object.entries(exec.ordersByStatus || {}).forEach(([k, v]) => lines.push(`,${k},${v}`));
    lines.push('Top Spend Items:');
    if ((exec.topSpendItems || []).length) {
      lines.push(rowsToCsv(exec.topSpendItems));
    }
    lines.push('');

    // Section 2
    lines.push('=== Section 2: Inventory & Stock Status ===');
    const stock = (report.stockStatus || []).map((s: any) => ({
      reportGroup: s.reportGroup,
      itemCount: s.itemCount,
      openingQty: s.openingQty,
      openingValue: s.openingValue,
      receivedQty: s.receivedQty,
      receivedValue: s.receivedValue,
      issuedQty: s.issuedQty,
      issuedValue: s.issuedValue,
      closingQty: s.closingQty,
      closingValue: s.closingValue,
      status: s.status,
    }));
    if (stock.length) lines.push(rowsToCsv(stock));
    lines.push('');

    // Section 3
    lines.push('=== Section 3: Vendor Performance ===');
    if ((report.vendorPerformance || []).length) {
      lines.push(rowsToCsv(report.vendorPerformance.map((v: any) => ({
        supplierId: v.supplierId,
        supplierName: v.supplierName,
        suppliedCategory: v.suppliedCategory,
        ordersCount: v.ordersCount,
        periodSpend: v.periodSpend,
        totalSpendAllTime: v.totalSpendAllTime,
        avgLeadTimeDays: v.avgLeadTimeDays,
        qualityPassRate: v.qualityPassRate,
        rating: v.rating,
      }))));
    }
    lines.push('');

    // Section 4
    lines.push('=== Section 4: Pending Pipeline ===');
    const pipe = report.pipeline || {};
    lines.push('Open Purchase Requests:');
    if ((pipe.openPurchaseRequests || []).length) lines.push(rowsToCsv(pipe.openPurchaseRequests));
    lines.push(`Pending PR Approvals,${pipe.pendingPRApprovals ?? 0}`);
    lines.push(`Pending Payment Approvals,${pipe.pendingPaymentApprovals ?? 0}`);
    lines.push('Goods In Transit:');
    if ((pipe.goodsInTransit || []).length) lines.push(rowsToCsv(pipe.goodsInTransit));
    lines.push('');

    // Section 5
    lines.push('=== Section 5: Financial Reconciliation ===');
    const fin = report.financialReconciliation || {};
    lines.push(`Accounts Payable Total,${fin.accountsPayableTotal ?? 0}`);
    lines.push(`Accounts Payable Count,${fin.accountsPayableCount ?? 0}`);
    lines.push('Supplier Balances:');
    if ((fin.supplierBalances || []).length) lines.push(rowsToCsv(fin.supplierBalances));
    lines.push('');

    // Section 6
    lines.push('=== Section 6: Action Plan & Risk Mitigation ===');
    lines.push('Auto Risks:');
    if ((report.actionPlan?.autoRisks || []).length) lines.push(rowsToCsv(report.actionPlan.autoRisks));
    if (report.actionPlan?.managerNote) {
      lines.push('Manager Note:');
      lines.push(rowsToCsv([report.actionPlan.managerNote]));
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-report-${period}-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exec = report?.executiveSummary;
  const stockStatus: any[] = report?.stockStatus || [];
  const vendors: any[] = useMemo(
    () => [...(report?.vendorPerformance || [])].sort((a, b) => Number(b.periodSpend || 0) - Number(a.periodSpend || 0)),
    [report]
  );
  const pipeline = report?.pipeline;
  const finRec = report?.financialReconciliation;
  const actionPlan = report?.actionPlan;

  return (
    <div className="space-y-6 print:p-0">
      {/* Header / Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Procurement Report
          </h1>
          <p className="text-sm text-gray-500">
            {formatDualDate(from)} &nbsp;→&nbsp; {formatDualDate(to)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handlePrint} className="btn-secondary">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleExportCSV} className="btn-secondary">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="card print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Period</label>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              {(['weekly', 'monthly', 'quarterly', 'custom'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-3 py-1.5 text-sm rounded-md transition ${
                    period === p ? 'bg-white text-blue-700 shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {period === 'custom' && (
            <>
              <div>
                <label className="label">From</label>
                <DateInput value={from} onChange={setFrom} />
              </div>
              <div>
                <label className="label">To</label>
                <DateInput value={to} onChange={setTo} />
              </div>
              <button onClick={load} className="btn-primary self-start mt-6">Apply</button>
            </>
          )}
          {loading && <span className="text-sm text-gray-500 ml-auto">Loading…</span>}
        </div>
      </div>

      {/* Loading */}
      {loading && !report && (
        <div className="card flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {!loading && !report && (
        <div className="card text-center py-12 text-gray-500">No data available for the selected period.</div>
      )}

      {report && (
        <>
          {/* SECTION 1: Executive Summary */}
          <section className="space-y-3">
            <h2 className="section-title flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              1. Executive Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Spend</p>
                    <p className="text-lg font-semibold text-gray-900">{fmtMoney(exec?.totalSpend)}</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">POs Issued</p>
                    <p className="text-lg font-semibold text-gray-900">{fmtNum(exec?.ordersIssued)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(exec?.ordersByStatus || {}).map(([k, v]) => (
                    <span key={k} className="badge-gray">
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Avg Internal Approval Days</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {Number(exec?.avgInternalApprovalDays || 0).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  Top 5 Spend Items
                </p>
                <div className="space-y-1">
                  {(exec?.topSpendItems || []).slice(0, 5).map((it: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs border-b border-gray-100 pb-1 last:border-0">
                      <span className="truncate pr-2">{safeStr(it.itemName || it.name)}</span>
                      <span className="font-medium text-gray-700 whitespace-nowrap">{fmtMoney(it.amount || it.spend)}</span>
                    </div>
                  ))}
                  {!(exec?.topSpendItems || []).length && (
                    <p className="text-xs text-gray-400">No spend recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: Inventory & Stock Status */}
          <section className="space-y-3">
            <h2 className="section-title flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              2. Inventory &amp; Stock Status
            </h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th"></th>
                    <th className="th">Report Group</th>
                    <th className="th text-right">Items</th>
                    <th className="th text-right" colSpan={2}>Opening</th>
                    <th className="th text-right" colSpan={2}>Received</th>
                    <th className="th text-right" colSpan={2}>Issued</th>
                    <th className="th text-right" colSpan={2}>Closing</th>
                    <th className="th text-center">Status</th>
                  </tr>
                  <tr>
                    <th className="th"></th>
                    <th className="th"></th>
                    <th className="th"></th>
                    <th className="th text-right text-[10px]">Qty</th>
                    <th className="th text-right text-[10px]">Value</th>
                    <th className="th text-right text-[10px]">Qty</th>
                    <th className="th text-right text-[10px]">Value</th>
                    <th className="th text-right text-[10px]">Qty</th>
                    <th className="th text-right text-[10px]">Value</th>
                    <th className="th text-right text-[10px]">Qty</th>
                    <th className="th text-right text-[10px]">Value</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody>
                  {stockStatus.map((s: any, i: number) => {
                    const key = s.reportGroup || `g-${i}`;
                    const isOpen = !!expandedGroups[key];
                    return (
                      <Fragment key={key}>
                        <tr className="tr">
                          <td className="td">
                            <button onClick={() => toggleGroup(key)} className="text-gray-400 hover:text-gray-700">
                              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="td font-medium">{safeStr(s.reportGroup)}</td>
                          <td className="td text-right">{fmtNum(s.itemCount)}</td>
                          <td className="td text-right">{fmtNum(s.openingQty)}</td>
                          <td className="td text-right">{fmtMoney(s.openingValue)}</td>
                          <td className="td text-right">{fmtNum(s.receivedQty)}</td>
                          <td className="td text-right">{fmtMoney(s.receivedValue)}</td>
                          <td className="td text-right">{fmtNum(s.issuedQty)}</td>
                          <td className="td text-right">{fmtMoney(s.issuedValue)}</td>
                          <td className="td text-right font-semibold">{fmtNum(s.closingQty)}</td>
                          <td className="td text-right font-semibold">{fmtMoney(s.closingValue)}</td>
                          <td className="td text-center">
                            <span className={statusBadge(s.status)}>{safeStr(s.status) || '—'}</span>
                          </td>
                        </tr>
                        {isOpen && (s.items || []).length > 0 && (
                          <tr>
                            <td colSpan={12} className="bg-gray-50 px-6 py-3">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="text-left text-gray-500">
                                    <th className="px-2 py-1">Item</th>
                                    <th className="px-2 py-1 text-right">Open Qty</th>
                                    <th className="px-2 py-1 text-right">Recv Qty</th>
                                    <th className="px-2 py-1 text-right">Issued Qty</th>
                                    <th className="px-2 py-1 text-right">Close Qty</th>
                                    <th className="px-2 py-1 text-right">Close Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(s.items || []).map((it: any, j: number) => (
                                    <tr key={j} className="border-t border-gray-200">
                                      <td className="px-2 py-1">{safeStr(it.itemName || it.name)}</td>
                                      <td className="px-2 py-1 text-right">{fmtNum(it.openingQty)}</td>
                                      <td className="px-2 py-1 text-right">{fmtNum(it.receivedQty)}</td>
                                      <td className="px-2 py-1 text-right">{fmtNum(it.issuedQty)}</td>
                                      <td className="px-2 py-1 text-right">{fmtNum(it.closingQty)}</td>
                                      <td className="px-2 py-1 text-right">{fmtMoney(it.closingValue)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {!stockStatus.length && (
                    <tr>
                      <td colSpan={12} className="td text-center text-gray-400 py-6">
                        No stock movement recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 3: Vendor Performance */}
          <section className="space-y-3">
            <h2 className="section-title flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              3. Vendor Performance
            </h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Supplier</th>
                    <th className="th">Category</th>
                    <th className="th text-right">Orders</th>
                    <th className="th text-right">Period Spend</th>
                    <th className="th text-right">All-Time Spend</th>
                    <th className="th text-right">Avg Lead Time (d)</th>
                    <th className="th text-right">Quality Pass %</th>
                    <th className="th text-center">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v: any, i: number) => (
                    <tr key={v.supplierId || i} className="tr">
                      <td className="td font-medium">{safeStr(v.supplierName)}</td>
                      <td className="td">{safeStr(v.suppliedCategory)}</td>
                      <td className="td text-right">{fmtNum(v.ordersCount)}</td>
                      <td className="td text-right">{fmtMoney(v.periodSpend)}</td>
                      <td className="td text-right text-gray-500">{fmtMoney(v.totalSpendAllTime)}</td>
                      <td className="td text-right">{Number(v.avgLeadTimeDays || 0).toFixed(1)}</td>
                      <td className="td text-right">
                        {Number(v.qualityPassRate || 0).toFixed(1)}%
                      </td>
                      <td className="td text-center">
                        <StarRating value={v.rating} />
                      </td>
                    </tr>
                  ))}
                  {!vendors.length && (
                    <tr>
                      <td colSpan={8} className="td text-center text-gray-400 py-6">No vendor activity.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 4: Pending Pipeline */}
          <section className="space-y-3">
            <h2 className="section-title flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              4. Pending Pipeline
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Open PRs */}
              <div className="card">
                <h3 className="font-semibold text-sm text-gray-800 mb-3">Open Purchase Requests</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-1.5 pr-2">PR #</th>
                        <th className="py-1.5 pr-2">Dept</th>
                        <th className="py-1.5 pr-2 text-right">Days</th>
                        <th className="py-1.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pipeline?.openPurchaseRequests || []).map((pr: any, i: number) => (
                        <tr key={pr.id || i} className="border-b border-gray-100 last:border-0">
                          <td className="py-1.5 pr-2 font-medium">{safeStr(pr.prNumber || pr.number || pr.id)}</td>
                          <td className="py-1.5 pr-2">{safeStr(pr.department || pr.dept)}</td>
                          <td className="py-1.5 pr-2 text-right">{fmtNum(pr.daysWaiting)}</td>
                          <td className="py-1.5">
                            {pr.emergency ? <span className="badge-red">Emergency</span> : null}
                          </td>
                        </tr>
                      ))}
                      {!(pipeline?.openPurchaseRequests || []).length && (
                        <tr>
                          <td colSpan={4} className="py-3 text-center text-gray-400">No open PRs.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="card">
                <h3 className="font-semibold text-sm text-gray-800 mb-3">Pending Approvals</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-blue-50 p-4 text-center">
                    <p className="text-xs text-blue-700 mb-1">PR Approvals</p>
                    <p className="text-2xl font-bold text-blue-900">{fmtNum(pipeline?.pendingPRApprovals)}</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-4 text-center">
                    <p className="text-xs text-purple-700 mb-1">Payment Request Approvals</p>
                    <p className="text-2xl font-bold text-purple-900">{fmtNum(pipeline?.pendingPaymentApprovals)}</p>
                  </div>
                </div>
              </div>

              {/* Goods in Transit */}
              <div className="card">
                <h3 className="font-semibold text-sm text-gray-800 mb-3">Goods in Transit</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-1.5 pr-2">PO #</th>
                        <th className="py-1.5 pr-2">Supplier</th>
                        <th className="py-1.5 pr-2">Shipped</th>
                        <th className="py-1.5 pr-2 text-right">Days</th>
                        <th className="py-1.5 pr-2">Expected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pipeline?.goodsInTransit || []).map((g: any, i: number) => (
                        <tr key={g.id || i} className="border-b border-gray-100 last:border-0">
                          <td className="py-1.5 pr-2 font-medium">{safeStr(g.poNumber || g.number || g.id)}</td>
                          <td className="py-1.5 pr-2">{safeStr(g.supplier || g.supplierName)}</td>
                          <td className="py-1.5 pr-2">{safeStr(g.shippedOn)?.slice(0, 10)}</td>
                          <td className="py-1.5 pr-2 text-right">{fmtNum(g.daysInTransit)}</td>
                          <td className="py-1.5 pr-2">{safeStr(g.expectedDelivery)?.slice(0, 10)}</td>
                        </tr>
                      ))}
                      {!(pipeline?.goodsInTransit || []).length && (
                        <tr>
                          <td colSpan={5} className="py-3 text-center text-gray-400">Nothing in transit.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 5: Financial Reconciliation */}
          <section className="space-y-3">
            <h2 className="section-title flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-rose-600" />
              5. Financial Reconciliation
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card">
                <p className="text-xs text-gray-500">Accounts Payable Outstanding</p>
                <p className="text-2xl font-bold text-rose-700 mt-1">
                  {fmtMoney(finRec?.accountsPayableTotal)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  across {fmtNum(finRec?.accountsPayableCount)} invoices
                </p>
              </div>
              <div className="card lg:col-span-2">
                <h3 className="font-semibold text-sm text-gray-800 mb-3">Top Supplier Balances</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-1.5 pr-2">Supplier</th>
                        <th className="py-1.5 pr-2 text-right">Balance</th>
                        <th className="py-1.5 pr-2 text-right">Credit Limit</th>
                        <th className="py-1.5 pr-2">Terms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(finRec?.supplierBalances || []).map((b: any, i: number) => (
                        <tr key={b.supplierId || i} className="border-b border-gray-100 last:border-0">
                          <td className="py-1.5 pr-2 font-medium">{safeStr(b.supplierName)}</td>
                          <td className="py-1.5 pr-2 text-right">{fmtMoney(b.balance)}</td>
                          <td className="py-1.5 pr-2 text-right text-gray-500">
                            {b.creditLimit ? fmtMoney(b.creditLimit) : '—'}
                          </td>
                          <td className="py-1.5 pr-2">{safeStr(b.terms || b.paymentTerms)}</td>
                        </tr>
                      ))}
                      {!(finRec?.supplierBalances || []).length && (
                        <tr>
                          <td colSpan={4} className="py-3 text-center text-gray-400">No outstanding supplier balances.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 6: Action Plan & Risk Mitigation */}
          <section className="space-y-3">
            <h2 className="section-title flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              6. Action Plan &amp; Risk Mitigation
            </h2>

            {/* Auto risks */}
            <div className="card">
              <h3 className="font-semibold text-sm text-gray-800 mb-3">Auto-detected Risks</h3>
              <div className="space-y-2">
                {(actionPlan?.autoRisks || []).map((r: any, i: number) => (
                  <div key={i} className={`p-3 rounded ${severityClass(r.severity)}`}>
                    <div className="flex items-start gap-2">
                      <span className={severityBadge(r.severity)}>{safeStr(r.severity).toUpperCase() || 'INFO'}</span>
                      <span className="badge-gray">{safeStr(r.category)}</span>
                      <span className="flex-1 text-sm">{safeStr(r.message)}</span>
                    </div>
                  </div>
                ))}
                {!(actionPlan?.autoRisks || []).length && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle className="w-4 h-4" />
                    No risks detected for this period.
                  </div>
                )}
              </div>
            </div>

            {/* Manager note */}
            <div className="card">
              <h3 className="font-semibold text-sm text-gray-800 mb-3">Manager's Note</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Key Achievement (1-2 sentences)</label>
                  <textarea
                    value={keyAchievement}
                    onChange={e => setKeyAchievement(e.target.value)}
                    rows={2}
                    className="input"
                    placeholder="Briefly summarize the period's key procurement win…"
                  />
                </div>
                <div>
                  <label className="label">Market Analysis</label>
                  <textarea
                    value={marketAnalysisNote}
                    onChange={e => setMarketAnalysisNote(e.target.value)}
                    rows={2}
                    className="input"
                    placeholder="Notable price movements, shortages, supply chain changes…"
                  />
                </div>
                <div>
                  <label className="label">Strategic Sourcing</label>
                  <textarea
                    value={strategicSourcingNote}
                    onChange={e => setStrategicSourcingNote(e.target.value)}
                    rows={2}
                    className="input"
                    placeholder="Long-term sourcing plans, vendor consolidation, contract negotiations…"
                  />
                </div>
                <div>
                  <label className="label">General Notes</label>
                  <textarea
                    value={generalNotes}
                    onChange={e => setGeneralNotes(e.target.value)}
                    rows={2}
                    className="input"
                    placeholder="Anything else worth flagging…"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={saveNote} disabled={savingNote} className="btn-primary">
                  <Save className="w-4 h-4" />
                  {savingNote ? 'Saving…' : 'Save Note'}
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
