import { useEffect, useState } from 'react';
import { companyDocsApi } from '../services/api';
import DateInput from '../components/ui/DateInput';

const DOC_TYPES: Record<string, string> = {
  business_license: 'Business License',
  tin_certificate: 'TIN Certificate',
  insurance_policy: 'Insurance Policy',
  trade_license: 'Trade License',
  vat_registration: 'VAT Registration',
  other: 'Other',
};

const CONTRACT_TYPES = ['supplier', 'customer', 'rental', 'service', 'insurance'];

const statusColor = (s: string) => {
  if (s === 'active') return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
  if (s === 'expired') return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
  return { background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' };
};

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const fmtType = (t: string) => DOC_TYPES[t] || t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const emptyDoc = { documentType: 'business_license', documentName: '', documentNumber: '', issueDate: '', expiryDate: '', issuingAuthority: '', alertBeforeDays: 30, notes: '' };
const emptyContract = { contractType: 'supplier', entityName: '', contractRef: '', startDate: '', expiryDate: '', alertBeforeDays: 30 };

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 20px', cursor: 'pointer', fontWeight: active ? 600 : 400,
  borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
  color: active ? '#2563eb' : '#6b7280', background: 'none', border: 'none',
  borderBottomWidth: 2, borderBottomStyle: 'solid',
  borderBottomColor: active ? '#2563eb' : 'transparent',
  fontSize: 14,
});

const inputStyle: React.CSSProperties = { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: '100%' };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 2 };
const btnPrimary: React.CSSProperties = { padding: '7px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 };
const btnSecondary: React.CSSProperties = { padding: '7px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 16 };

export default function CompanyDocsPage() {
  const [tab, setTab] = useState<'docs' | 'contracts'>('docs');
  const [docs, setDocs] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDocForm, setShowDocForm] = useState(false);
  const [showContractForm, setShowContractForm] = useState(false);
  const [docForm, setDocForm] = useState<any>({ ...emptyDoc });
  const [contractForm, setContractForm] = useState<any>({ ...emptyContract });
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const [docsRes, expiringRes] = await Promise.all([companyDocsApi.list(), companyDocsApi.expiring()]);
      setDocs(docsRes.data?.documents || docsRes.data || []);
      setExpiring(expiringRes.data?.documents || expiringRes.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadContracts = async () => {
    setLoading(true);
    try {
      const res = await companyDocsApi.contractExpiry();
      setContracts(res.data?.contracts || res.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadDocs(); loadContracts(); }, []);

  const handleDocSubmit = async () => {
    try {
      if (editingDocId) {
        await companyDocsApi.update(editingDocId, docForm);
      } else {
        await companyDocsApi.create(docForm);
      }
      setShowDocForm(false);
      setDocForm({ ...emptyDoc });
      setEditingDocId(null);
      loadDocs();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed to save document'); }
  };

  const handleContractSubmit = async () => {
    try {
      if (editingContractId) {
        await companyDocsApi.updateContract(editingContractId, contractForm);
      } else {
        await companyDocsApi.createContract(contractForm);
      }
      setShowContractForm(false);
      setContractForm({ ...emptyContract });
      setEditingContractId(null);
      loadContracts();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed to save contract'); }
  };

  const editDoc = (doc: any) => {
    setDocForm({
      documentType: doc.documentType || 'other',
      documentName: doc.documentName || '',
      documentNumber: doc.documentNumber || '',
      issueDate: doc.issueDate ? doc.issueDate.slice(0, 10) : '',
      expiryDate: doc.expiryDate ? doc.expiryDate.slice(0, 10) : '',
      issuingAuthority: doc.issuingAuthority || '',
      alertBeforeDays: doc.alertBeforeDays || 30,
      notes: doc.notes || '',
    });
    setEditingDocId(doc._id || doc.id);
    setShowDocForm(true);
  };

  const editContract = (c: any) => {
    setContractForm({
      contractType: c.contractType || 'supplier',
      entityName: c.entityName || '',
      contractRef: c.contractRef || '',
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      expiryDate: c.expiryDate ? c.expiryDate.slice(0, 10) : '',
      alertBeforeDays: c.alertBeforeDays || 30,
    });
    setEditingContractId(c._id || c.id);
    setShowContractForm(true);
  };

  if (loading && docs.length === 0 && contracts.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Company Documents & Contracts</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
        <button style={tabStyle(tab === 'docs')} onClick={() => setTab('docs')}>Company Documents</button>
        <button style={tabStyle(tab === 'contracts')} onClick={() => setTab('contracts')}>Contract Expiry</button>
      </div>

      {/* ── Tab 1: Company Documents ── */}
      {tab === 'docs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Expiring Alert Section */}
          {expiring.length > 0 && (
            <div style={{ ...cardStyle, background: '#fffbeb', borderColor: '#fde68a' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#92400e', marginTop: 0, marginBottom: 8 }}>
                Expiring Soon ({expiring.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {expiring.map((d: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #fde68a' }}>
                    <span><strong>{fmtType(d.documentType)}</strong> - {d.documentName}</span>
                    <span style={{ color: '#dc2626', fontWeight: 500 }}>
                      Expires {fmtDate(d.expiryDate)} ({d.daysUntilExpiry ?? '?'} days)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add / Edit Form */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button style={btnPrimary} onClick={() => { setShowDocForm(!showDocForm); setEditingDocId(null); setDocForm({ ...emptyDoc }); }}>
              {showDocForm ? 'Cancel' : '+ Add Document'}
            </button>
          </div>

          {showDocForm && (
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>
                {editingDocId ? 'Edit Document' : 'Add New Document'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <div style={labelStyle}>Document Type</div>
                  <select style={inputStyle} value={docForm.documentType} onChange={e => setDocForm({ ...docForm, documentType: e.target.value })}>
                    {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>Document Name</div>
                  <input style={inputStyle} value={docForm.documentName} onChange={e => setDocForm({ ...docForm, documentName: e.target.value })} placeholder="e.g. Trade License 2025" />
                </div>
                <div>
                  <div style={labelStyle}>Document Number</div>
                  <input style={inputStyle} value={docForm.documentNumber} onChange={e => setDocForm({ ...docForm, documentNumber: e.target.value })} placeholder="License/Cert number" />
                </div>
                <div>
                  <div style={labelStyle}>Issue Date</div>
                  <DateInput value={docForm.issueDate} onChange={val => setDocForm({ ...docForm, issueDate: val })} />
                </div>
                <div>
                  <div style={labelStyle}>Expiry Date</div>
                  <DateInput value={docForm.expiryDate} onChange={val => setDocForm({ ...docForm, expiryDate: val })} />
                </div>
                <div>
                  <div style={labelStyle}>Issuing Authority</div>
                  <input style={inputStyle} value={docForm.issuingAuthority} onChange={e => setDocForm({ ...docForm, issuingAuthority: e.target.value })} placeholder="e.g. Ministry of Trade" />
                </div>
                <div>
                  <div style={labelStyle}>Alert Before (Days)</div>
                  <input style={inputStyle} type="number" value={docForm.alertBeforeDays} onChange={e => setDocForm({ ...docForm, alertBeforeDays: Number(e.target.value) })} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={labelStyle}>Notes</div>
                  <input style={inputStyle} value={docForm.notes} onChange={e => setDocForm({ ...docForm, notes: e.target.value })} placeholder="Optional notes" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={btnPrimary} onClick={handleDocSubmit}>{editingDocId ? 'Update' : 'Save'}</button>
                <button style={btnSecondary} onClick={() => { setShowDocForm(false); setEditingDocId(null); }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Documents Table */}
          <div style={cardStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Type</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Document Name</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Number</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Expiry Date</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Days Left</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No documents found</td></tr>
                )}
                {docs.map((d: any, i: number) => (
                  <tr key={d._id || d.id || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 6px' }}>{fmtType(d.documentType)}</td>
                    <td style={{ padding: '8px 6px', fontWeight: 500 }}>{d.documentName}</td>
                    <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontSize: 12 }}>{d.documentNumber || '-'}</td>
                    <td style={{ padding: '8px 6px' }}>{fmtDate(d.expiryDate)}</td>
                    <td style={{ padding: '8px 6px', fontWeight: 500 }}>{d.daysUntilExpiry ?? '-'}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{ ...statusColor(d.status || 'active'), padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                        {(d.status || 'active').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <button style={{ ...btnSecondary, padding: '3px 10px', fontSize: 12 }} onClick={() => editDoc(d)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 2: Contract Expiry ── */}
      {tab === 'contracts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button style={btnPrimary} onClick={() => { setShowContractForm(!showContractForm); setEditingContractId(null); setContractForm({ ...emptyContract }); }}>
              {showContractForm ? 'Cancel' : '+ Add Contract'}
            </button>
          </div>

          {showContractForm && (
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>
                {editingContractId ? 'Edit Contract' : 'Add Contract Expiry'}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <div style={labelStyle}>Contract Type</div>
                  <select style={inputStyle} value={contractForm.contractType} onChange={e => setContractForm({ ...contractForm, contractType: e.target.value })}>
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>Entity Name</div>
                  <input style={inputStyle} value={contractForm.entityName} onChange={e => setContractForm({ ...contractForm, entityName: e.target.value })} placeholder="Company/Person name" />
                </div>
                <div>
                  <div style={labelStyle}>Contract Reference</div>
                  <input style={inputStyle} value={contractForm.contractRef} onChange={e => setContractForm({ ...contractForm, contractRef: e.target.value })} placeholder="Contract ref number" />
                </div>
                <div>
                  <div style={labelStyle}>Start Date</div>
                  <DateInput value={contractForm.startDate} onChange={val => setContractForm({ ...contractForm, startDate: val })} />
                </div>
                <div>
                  <div style={labelStyle}>Expiry Date</div>
                  <DateInput value={contractForm.expiryDate} onChange={val => setContractForm({ ...contractForm, expiryDate: val })} />
                </div>
                <div>
                  <div style={labelStyle}>Alert Before (Days)</div>
                  <input style={inputStyle} type="number" value={contractForm.alertBeforeDays} onChange={e => setContractForm({ ...contractForm, alertBeforeDays: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={btnPrimary} onClick={handleContractSubmit}>{editingContractId ? 'Update' : 'Save'}</button>
                <button style={btnSecondary} onClick={() => { setShowContractForm(false); setEditingContractId(null); }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Contracts Table */}
          <div style={cardStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Contract Type</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Entity Name</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Contract Ref</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Expiry Date</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Days Left</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '8px 6px', color: '#6b7280', fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>No contracts found</td></tr>
                )}
                {contracts.map((c: any, i: number) => (
                  <tr key={c._id || c.id || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 6px' }}>{c.contractType ? c.contractType.charAt(0).toUpperCase() + c.contractType.slice(1) : '-'}</td>
                    <td style={{ padding: '8px 6px', fontWeight: 500 }}>{c.entityName}</td>
                    <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontSize: 12 }}>{c.contractRef || '-'}</td>
                    <td style={{ padding: '8px 6px' }}>{fmtDate(c.expiryDate)}</td>
                    <td style={{ padding: '8px 6px', fontWeight: 500 }}>{c.daysUntilExpiry ?? '-'}</td>
                    <td style={{ padding: '8px 6px' }}>
                      <span style={{ ...statusColor(c.status || 'active'), padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                        {(c.status || 'active').replace(/_/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase())}
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <button style={{ ...btnSecondary, padding: '3px 10px', fontSize: 12 }} onClick={() => editContract(c)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
