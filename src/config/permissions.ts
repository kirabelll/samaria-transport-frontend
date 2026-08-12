// ─── All page keys (must match route paths) ────────────────────────────────
export const ALL_PAGES = [
  'dashboard', 'trips', 'orders', 'vehicles', 'maintenance',
  'inventory', 'procurement', 'cashier', 'rental', 'customers',
  'employees', 'hr', 'payroll', 'handovers', 'driver-ledger',
  'profitability', 'compliance', 'reports', 'audit', 'telegram', 'tracking',
  'driver-scoring', 'dispatch', 'accounting', 'settlements', 'fleet-board', 'approvals', 'alerts', 'users',
  'fuel-control', 'accidents', 'revenue-share', 'brokers', 'company-docs', 'payment-requests',
  'procurement-report',
] as const;

export type PageKey = (typeof ALL_PAGES)[number];

// ─── Labels for display ─────────────────────────────────────────────────────
export const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  trips: 'Trips',
  orders: 'Orders',
  vehicles: 'Fleet',
  maintenance: 'Maintenance',
  inventory: 'Inventory',
  procurement: 'Procurement',
  cashier: 'Cashier',
  rental: 'Rental',
  customers: 'Customers',
  employees: 'Employees',
  hr: 'Attendance',
  payroll: 'Payroll',
  handovers: 'Handovers',
  'driver-ledger': 'Driver Ledger',
  profitability: 'Profitability',
  compliance: 'Compliance',
  reports: 'Reports',
  audit: 'Audit Trail',
  telegram: 'Telegram',
  tracking: 'Live Tracking',
  'driver-scoring': 'Driver Scoring',
  dispatch: 'Dispatch Board',
  accounting: 'Accounting',
  settlements: 'Settlements',
  'fleet-board': 'Fleet Board',
  approvals: 'Approvals',
  alerts: 'Alerts',
  users: 'Users',
  'fuel-control': 'Fuel Control',
  accidents: 'Accidents',
  'revenue-share': 'Revenue Share',
  brokers: 'Brokers',
  'company-docs': 'Company Docs',
  'payment-requests': 'Payment Requests',
  'procurement-report': 'Procurement Report',
};

// ─── Default permissions per role ────────────────────────────────────────────
// If a user has NO custom permissions (permissions = null), these defaults apply.
// Admin can override per user from the Permissions page.
export const ROLE_DEFAULTS: Record<string, PageKey[]> = {
  owner: [...ALL_PAGES],
  admin: [...ALL_PAGES],

  dispatcher: [
    'dashboard', 'trips', 'orders', 'vehicles', 'customers',
    'handovers', 'compliance', 'rental', 'tracking', 'dispatch',
  ],

  driver: [
    'dashboard', 'trips', 'handovers',
  ],

  technical_manager: [
    'dashboard', 'vehicles', 'maintenance', 'inventory',
    'procurement', 'procurement-report', 'compliance', 'handovers',
  ],

  store_manager: [
    'dashboard', 'inventory', 'procurement', 'procurement-report', 'maintenance',
  ],

  cashier: [
    'dashboard', 'cashier', 'trips', 'driver-ledger',
  ],

  hr: [
    'dashboard', 'employees', 'hr', 'payroll',
  ],

  customer: [
    'dashboard', 'orders',
  ],
};

// ─── Get allowed pages for a user ────────────────────────────────────────────
export function getUserPages(role: string, customPermissions?: string[] | null): PageKey[] {
  // Custom permissions override role defaults
  if (customPermissions && customPermissions.length > 0) {
    // Always include dashboard
    const pages = customPermissions.filter(p => ALL_PAGES.includes(p as PageKey)) as PageKey[];
    if (!pages.includes('dashboard')) pages.unshift('dashboard');
    return pages;
  }
  // Fall back to role defaults
  return ROLE_DEFAULTS[role] || ['dashboard'];
}

// ─── Check if a user can access a page ───────────────────────────────────────
export function canAccess(role: string, page: string, customPermissions?: string[] | null): boolean {
  const allowed = getUserPages(role, customPermissions);
  return allowed.includes(page as PageKey);
}
