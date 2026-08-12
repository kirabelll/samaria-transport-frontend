import { useState, useEffect, useCallback } from 'react';
import { Shield, Save, RefreshCw, RotateCcw, CheckCircle, User } from 'lucide-react';
import { authApi } from '../services/api';
import { ALL_PAGES, PAGE_LABELS, ROLE_DEFAULTS, PageKey } from '../config/permissions';

interface UserRow {
  id: string; name: string; email: string; role: string;
  isActive: boolean; permissions: string[] | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner / GM', admin: 'Admin', dispatcher: 'Dispatcher', driver: 'Driver',
  technical_manager: 'Technical Mgr', store_manager: 'Store Mgr',
  cashier: 'Cashier', hr: 'HR', customer: 'Customer',
};

export default function PermissionsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<string, string[]>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await authApi.listUsers();
      setUsers(data.users.filter((u: UserRow) => u.isActive));
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const getEffectivePages = (user: UserRow): string[] => {
    if (edited[user.id]) return edited[user.id];
    if (user.permissions && user.permissions.length > 0) return user.permissions;
    return ROLE_DEFAULTS[user.role] || ['dashboard'];
  };

  const isCustom = (user: UserRow): boolean => {
    return !!(edited[user.id] || (user.permissions && user.permissions.length > 0));
  };

  const togglePage = (userId: string, page: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const current = getEffectivePages(user);
    if (page === 'dashboard') return; // Always keep dashboard

    let updated: string[];
    if (current.includes(page)) {
      updated = current.filter(p => p !== page);
    } else {
      updated = [...current, page];
    }
    setEdited({ ...edited, [userId]: updated });
  };

  const resetToDefault = (userId: string) => {
    const newEdited = { ...edited };
    delete newEdited[userId];
    setEdited(newEdited);
    // Also save null to backend to clear custom permissions
    handleSave(userId, null);
  };

  const handleSave = async (userId: string, perms?: string[] | null) => {
    setSaving(userId);
    try {
      const permissions = perms === undefined ? (edited[userId] || null) : perms;
      await authApi.updateUser(userId, { permissions });
      const newEdited = { ...edited };
      delete newEdited[userId];
      setEdited(newEdited);
      loadUsers();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to save');
    }
    setSaving(null);
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" /> Page Permissions
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Control which pages each user can see. By default, users see pages based on their role.
          You can customize access per user by toggling pages on/off.
        </p>
      </div>

      {/* Role defaults reference */}
      <div className="bg-indigo-50 rounded-lg p-4 mb-6">
        <p className="text-sm font-semibold text-indigo-800 mb-2">Default Access by Role:</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-indigo-700">
          {Object.entries(ROLE_DEFAULTS).filter(([r]) => r !== 'admin').map(([role, pages]) => (
            <div key={role}>
              <span className="font-medium">{ROLE_LABELS[role] || role}:</span>{' '}
              {pages.map(p => PAGE_LABELS[p]).join(', ')}
            </div>
          ))}
        </div>
      </div>

      {/* Users list */}
      <div className="space-y-3">
        {users.map(user => {
          const effectivePages = getEffectivePages(user);
          const hasCustom = isCustom(user);
          const hasEdits = !!edited[user.id];
          const isExpanded = expandedUser === user.id;

          return (
            <div key={user.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* User header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedUser(isExpanded ? null : user.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                  {hasCustom && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                      Custom
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{effectivePages.length} pages</span>
                  <svg className={`w-4 h-4 text-gray-400 transition ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-gray-500">Toggle pages this user can access:</p>
                    <div className="flex gap-2">
                      {hasCustom && (
                        <button onClick={() => resetToDefault(user.id)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                          <RotateCcw className="w-3 h-3" /> Reset to role default
                        </button>
                      )}
                      {hasEdits && (
                        <button onClick={() => handleSave(user.id)} disabled={saving === user.id}
                          className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50">
                          {saving === user.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Save
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ALL_PAGES.map(page => {
                      const isOn = effectivePages.includes(page);
                      const isDashboard = page === 'dashboard';
                      const isDefault = (ROLE_DEFAULTS[user.role] || []).includes(page);
                      return (
                        <button
                          key={page}
                          onClick={() => !isDashboard && togglePage(user.id, page)}
                          disabled={isDashboard}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                            ${isDashboard
                              ? 'bg-blue-100 text-blue-700 border-blue-200 cursor-not-allowed'
                              : isOn
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-gray-50 text-gray-300 border-gray-200 hover:bg-gray-100 hover:text-gray-500'
                            }`}
                        >
                          {isOn && <span className="mr-1">&#10003;</span>}
                          {PAGE_LABELS[page]}
                          {!hasCustom && isDefault && isOn && (
                            <span className="ml-1 text-[9px] opacity-50">(default)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
