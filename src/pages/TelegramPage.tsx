import { useState, useEffect, useCallback } from 'react';
import {
  Send, Settings, TestTube, Power, PowerOff,
  ShieldAlert, Package, CheckCircle, XCircle, Bell, AlertTriangle,
  RefreshCw, History, Users, Link, Unlink
} from 'lucide-react';
import { telegramApi } from '../services/api';
import { formatDualDate } from '../utils/ethCalendar';

interface UserRow {
  id: string; name: string; email: string; role: string; telegramChatId: string | null;
}
interface LogEntry {
  id: string; level: string; category: string; title: string; message: string;
  chatId: string; success: boolean; errorMessage: string | null; createdAt: string;
}

const LEVELS = ['critical', 'urgent', 'warning', 'info'] as const;
const CATEGORIES = ['compliance', 'maintenance', 'trip', 'order', 'breakdown', 'inventory', 'payroll', 'system'] as const;

const LEVEL_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  urgent: 'bg-orange-100 text-orange-800 border-orange-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};
const LEVEL_DOT: Record<string, string> = {
  critical: 'bg-red-500', urgent: 'bg-orange-500', warning: 'bg-yellow-500', info: 'bg-blue-500',
};
const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner / GM', admin: 'Admin', dispatcher: 'Dispatcher', driver: 'Driver',
  technical_manager: 'Technical Mgr', store_manager: 'Store Mgr',
  cashier: 'Cashier', hr: 'HR', customer: 'Customer',
};
const ROLE_DESCRIPTION: Record<string, string> = {
  owner: 'Gets everything — full visibility across all operations',
  admin: 'Gets everything — system-wide notifications',
  dispatcher: 'Trips, orders, breakdowns, compliance',
  driver: 'Trip assignments and completions',
  technical_manager: 'Breakdowns, maintenance, compliance, inventory',
  store_manager: 'Inventory and maintenance alerts',
  cashier: 'Trip info and payroll warnings',
  hr: 'Payroll and system alerts',
  customer: 'Order and trip updates',
};

export default function TelegramPage() {
  const [tab, setTab] = useState<'users' | 'roles' | 'config' | 'test' | 'logs'>('users');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Config
  const [botToken, setBotToken] = useState('');
  const [maskedToken, setMaskedToken] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [configExists, setConfigExists] = useState(false);

  // Role rules
  const [roleRules, setRoleRules] = useState<Record<string, { levels: string[]; categories: string[] }>>({});
  const [defaultRoleRules, setDefaultRoleRules] = useState<Record<string, any>>({});

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editChatId, setEditChatId] = useState('');

  // Test
  const [testToken, setTestToken] = useState('');
  const [testChatId, setTestChatId] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Manual send
  const [sendForm, setSendForm] = useState({ level: 'info', category: 'system', title: '', message: '' });
  const [sendLoading, setSendLoading] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState({ level: '', category: '' });
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [scanLoading, setScanLoading] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      const { data } = await telegramApi.getConfig();
      if (data.config) {
        setConfigExists(true);
        setMaskedToken(data.config.botToken);
        setRoleRules(data.config.roleRules);
        setIsActive(data.config.isActive);
      }
      if (data.defaultRoleRules) setDefaultRoleRules(data.defaultRoleRules);
    } catch { }
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await telegramApi.getUsers();
      setUsers(data.users);
    } catch { }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const params: any = {};
      if (logFilter.level) params.level = logFilter.level;
      if (logFilter.category) params.category = logFilter.category;
      const { data } = await telegramApi.getLogs(params);
      setLogs(data.logs);
      setLogTotal(data.total);
      setWeeklyStats(data.weeklyStats);
    } catch { }
  }, [logFilter]);

  useEffect(() => { loadConfig(); loadUsers(); }, [loadConfig, loadUsers]);
  useEffect(() => { if (tab === 'logs') loadLogs(); }, [tab, loadLogs]);

  // ── Handlers ──
  const handleSaveConfig = async () => {
    if (!botToken) return alert('Enter the full bot token');
    setSaving(true);
    try {
      const { data } = await telegramApi.saveConfig({ botToken, roleRules, manualTargets: [] });
      alert(`Saved! Bot: ${data.botName}`);
      setBotToken('');
      loadConfig();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    setSaving(false);
  };

  const handleSaveRoles = async () => {
    setSaving(true);
    try {
      await telegramApi.updateRoleRules(roleRules);
      alert('Role rules updated!');
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    setSaving(false);
  };

  const handleToggle = async () => {
    try { const { data } = await telegramApi.toggleActive(); setIsActive(data.isActive); } catch { }
  };

  const handleLinkUser = async (userId: string, chatId: string) => {
    try {
      await telegramApi.linkUser(userId, chatId);
      setEditingUser(null);
      setEditChatId('');
      loadUsers();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  const handleTest = async () => {
    if (!testToken || !testChatId) return;
    setTestLoading(true); setTestResult(null);
    try { const { data } = await telegramApi.test(testToken, testChatId); setTestResult(data); }
    catch (e: any) { setTestResult({ ok: false, error: e.response?.data?.error || 'Error' }); }
    setTestLoading(false);
  };

  const handleSend = async () => {
    if (!sendForm.title || !sendForm.message) return;
    setSendLoading(true); setSendResult(null);
    try { const { data } = await telegramApi.send(sendForm); setSendResult(`Sent: ${data.sent} | Failed: ${data.failed}`); }
    catch (e: any) { setSendResult(e.response?.data?.error || 'Error'); }
    setSendLoading(false);
  };

  const handleScan = async (type: 'compliance' | 'inventory') => {
    setScanLoading(type);
    try {
      if (type === 'compliance') await telegramApi.scanCompliance();
      else await telegramApi.scanInventory();
      alert(`${type} scan complete`); loadLogs();
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    setScanLoading('');
  };

  const toggleRoleLevel = (role: string, level: string) => {
    const r = { ...roleRules };
    if (!r[role]) r[role] = { levels: [], categories: [] };
    const levels = r[role].levels.includes(level) ? r[role].levels.filter(l => l !== level) : [...r[role].levels, level];
    r[role] = { ...r[role], levels };
    setRoleRules(r);
  };

  const toggleRoleCategory = (role: string, cat: string) => {
    const r = { ...roleRules };
    if (!r[role]) r[role] = { levels: [], categories: [] };
    const categories = r[role].categories.includes(cat) ? r[role].categories.filter(c => c !== cat) : [...r[role].categories, cat];
    r[role] = { ...r[role], categories };
    setRoleRules(r);
  };

  const linkedCount = users.filter(u => u.telegramChatId).length;

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Send className="w-6 h-6 text-blue-600" /> Telegram Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">Role-based Telegram alerts — each role receives relevant notifications</p>
        </div>
        {configExists && (
          <button onClick={handleToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
            {isActive ? 'Active' : 'Paused'}
          </button>
        )}
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        {LEVELS.map(l => (
          <div key={l} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${LEVEL_COLORS[l]}`}>
            <span className={`w-2 h-2 rounded-full ${LEVEL_DOT[l]}`} />{l.charAt(0).toUpperCase() + l.slice(1)}
          </div>
        ))}
        <span className="text-xs text-gray-400 ml-2">{linkedCount}/{users.length} users linked</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { id: 'users' as const, label: 'Users', icon: Users },
          { id: 'roles' as const, label: 'Role Rules', icon: Settings },
          { id: 'config' as const, label: 'Bot Setup', icon: Settings },
          { id: 'test' as const, label: 'Test & Send', icon: TestTube },
          { id: 'logs' as const, label: 'History', icon: History },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition
              ${tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ═══════ USERS TAB ═══════ */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-1">How it works:</p>
            <p>Link each user's <strong>Telegram Chat ID</strong> below. They will automatically receive notifications based on their <strong>role</strong>. Go to <strong>Role Rules</strong> tab to customize what each role receives.</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Receives</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Telegram Chat ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => {
                  const rules = roleRules[user.role] || defaultRoleRules[user.role];
                  const isEditing = editingUser === user.id;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {rules?.levels?.map((l: string) => (
                            <span key={l} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${LEVEL_COLORS[l]}`}>{l}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <input value={editChatId} onChange={e => setEditChatId(e.target.value)}
                              placeholder="e.g. 123456789"
                              className="border border-gray-300 rounded px-2 py-1 text-xs w-40" autoFocus />
                            <button onClick={() => handleLinkUser(user.id, editChatId)}
                              className="text-green-600 hover:text-green-800 p-1"><CheckCircle className="w-4 h-4" /></button>
                            <button onClick={() => { setEditingUser(null); setEditChatId(''); }}
                              className="text-gray-400 hover:text-gray-600 p-1"><XCircle className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 font-mono">{user.telegramChatId || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.telegramChatId
                          ? <span className="flex items-center gap-1 text-green-600 text-xs"><Link className="w-3 h-3" /> Linked</span>
                          : <span className="flex items-center gap-1 text-gray-400 text-xs"><Unlink className="w-3 h-3" /> Not linked</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isEditing && (
                          <button
                            onClick={() => { setEditingUser(user.id); setEditChatId(user.telegramChatId || ''); }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            {user.telegramChatId ? 'Edit' : 'Link'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* How to get Chat ID */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-800 mb-2">How to get a user's Chat ID:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>User opens Telegram and searches for your bot</li>
              <li>User sends <code className="bg-gray-200 px-1 rounded">/start</code> to the bot</li>
              <li>Visit <code className="bg-gray-200 px-1 rounded text-xs">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code></li>
              <li>Find the user's <code className="bg-gray-200 px-1 rounded">chat.id</code> in the response</li>
              <li>For groups: add the bot to the group, then check getUpdates (group IDs are negative)</li>
            </ol>
          </div>
        </div>
      )}

      {/* ═══════ ROLE RULES TAB ═══════ */}
      {tab === 'roles' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Configure what notification levels and categories each role receives. Changes apply to all users with that role.</p>

          <div className="space-y-3">
            {Object.keys(ROLE_LABELS).map(role => {
              const rules = roleRules[role] || { levels: [], categories: [] };
              return (
                <div key={role} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{ROLE_LABELS[role]}</h3>
                      <p className="text-xs text-gray-400">{ROLE_DESCRIPTION[role]}</p>
                    </div>
                    <button onClick={() => {
                      const def = defaultRoleRules[role];
                      if (def) { const r = { ...roleRules }; r[role] = { ...def }; setRoleRules(r); }
                    }} className="text-xs text-blue-500 hover:text-blue-700">Reset default</button>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Levels</label>
                    <div className="flex gap-2 flex-wrap">
                      {LEVELS.map(l => (
                        <button key={l} onClick={() => toggleRoleLevel(role, l)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition
                            ${rules.levels.includes(l) ? `${LEVEL_COLORS[l]}` : 'bg-gray-50 text-gray-300 border-gray-200'}`}>
                          {l.charAt(0).toUpperCase() + l.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Categories</label>
                    <div className="flex gap-2 flex-wrap">
                      {CATEGORIES.map(c => (
                        <button key={c} onClick={() => toggleRoleCategory(role, c)}
                          className={`px-2.5 py-1 rounded text-xs font-medium border transition
                            ${rules.categories.includes(c) ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-300 border-gray-200'}`}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={handleSaveRoles} disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Role Rules'}
          </button>
        </div>
      )}

      {/* ═══════ BOT CONFIG TAB ═══════ */}
      {tab === 'config' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bot Configuration</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
              <input type="password" value={botToken} onChange={e => setBotToken(e.target.value)}
                placeholder={configExists ? `Current: ${maskedToken}` : 'Paste your Telegram bot token from @BotFather'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              <p className="text-xs text-gray-500 mt-1">
                Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@BotFather</a> on Telegram.
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">Quick Setup:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Open Telegram &rarr; search <strong>@BotFather</strong> &rarr; send <code>/newbot</code></li>
                <li>Copy the token and paste it above</li>
                <li>Each user sends <code>/start</code> to the bot</li>
                <li>Go to <strong>Users</strong> tab to link each user's Chat ID</li>
              </ol>
            </div>
          </div>
          <button onClick={handleSaveConfig} disabled={saving || !botToken}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Bot Token'}
          </button>
        </div>
      )}

      {/* ═══════ TEST TAB ═══════ */}
      {tab === 'test' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Connection</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bot Token</label>
                <input type="password" value={testToken} onChange={e => setTestToken(e.target.value)}
                  placeholder="Bot token" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chat ID</label>
                <input value={testChatId} onChange={e => setTestChatId(e.target.value)}
                  placeholder="Chat ID" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={handleTest} disabled={testLoading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              {testLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              Send Test Message
            </button>
            {testResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.ok ? <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Success! Check Telegram.</span>
                  : <span className="flex items-center gap-1"><XCircle className="w-4 h-4" /> {testResult.error}</span>}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Manual Notification</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
                <select value={sendForm.level} onChange={e => setSendForm({ ...sendForm, level: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={sendForm.category} onChange={e => setSendForm({ ...sendForm, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <input value={sendForm.title} onChange={e => setSendForm({ ...sendForm, title: e.target.value })}
                placeholder="Notification title" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
              <textarea value={sendForm.message} onChange={e => setSendForm({ ...sendForm, message: e.target.value })}
                placeholder="Notification body" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={handleSend} disabled={sendLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {sendLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Notification
            </button>
            {sendResult && <p className="mt-3 text-sm text-gray-600">{sendResult}</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trigger Alert Scans</h2>
            <p className="text-sm text-gray-500 mb-4">Run scans to send notifications for current compliance issues or low inventory.</p>
            <div className="flex gap-3">
              <button onClick={() => handleScan('compliance')} disabled={scanLoading === 'compliance'}
                className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-100 disabled:opacity-50">
                {scanLoading === 'compliance' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                Scan Compliance
              </button>
              <button onClick={() => handleScan('inventory')} disabled={scanLoading === 'inventory'}
                className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50">
                {scanLoading === 'inventory' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Scan Inventory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ LOGS TAB ═══════ */}
      {tab === 'logs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {LEVELS.map(level => {
              const stat = weeklyStats.find((s: any) => s.level === level);
              const count = stat?._count?.id || 0;
              return (
                <div key={level} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${LEVEL_DOT[level]}`} />
                    <span className="text-xs font-medium text-gray-500 uppercase">{level}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-400">past 7 days</p>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
              <select value={logFilter.level} onChange={e => setLogFilter({ ...logFilter, level: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">All Levels</option>
                {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={logFilter.category} onChange={e => setLogFilter({ ...logFilter, category: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <button onClick={loadLogs} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 py-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <span className="text-xs text-gray-400 py-2">Total: {logTotal}</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Level</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />No notification logs yet
                  </td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDualDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[log.level]}`}>{log.level}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 capitalize">{log.category}</td>
                    <td className="px-4 py-3 text-xs text-gray-900 font-medium max-w-xs truncate">{log.title}</td>
                    <td className="px-4 py-3">
                      {log.success
                        ? <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Sent</span>
                        : <span className="flex items-center gap-1 text-red-600 text-xs" title={log.errorMessage || ''}><AlertTriangle className="w-3.5 h-3.5" /> Failed</span>}
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
