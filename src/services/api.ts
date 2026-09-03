import axios from 'axios';
const rawBase = (import.meta.env.VITE_API_URL || '').trim();
const cleanBase = rawBase.replace(/\/+$/, '');
const baseURL = cleanBase ? (cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`) : '/api';
const api = axios.create({ baseURL });


api.interceptors.request.use(cfg => {
  const raw = localStorage.getItem('wonde-erp-auth');
  if (raw) {
    try {
      const { state } = JSON.parse(raw);
      if (state?.token) cfg.headers.Authorization = `Bearer ${state.token}`;
    } catch {}
  }
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wonde-erp-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Global reference search ───────────────────────────────
export const searchApi = {
  refs: (q: string) => api.get('/search', { params: { q } }),
};

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  setup: (email: string, password: string, name: string) => api.post('/auth/setup', { email, password, name }),
  createUser: (data: any) => api.post('/auth/users', data),
  changePassword: (data: any) => api.put('/auth/change-password', data),
  updateUser: (id: string, data: any) => api.put(`/auth/users/${id}`, data),
  listUsers: () => api.get('/auth/users'),
};

// ── Dashboard ─────────────────────────────────────────────
export const dashboardApi = { get: () => api.get('/dashboard') };

// ── Vehicles ─────────────────────────────────────────────
export const vehicleApi = {
  list: (params?: any) => api.get('/vehicles', { params }),
  get: (id: string) => api.get(`/vehicles/${id}`),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string, data: any) => api.put(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
  trips: (id: string, params?: any) => api.get(`/vehicles/${id}/trips`, { params }),
  maintenance: (id: string, params?: any) => api.get(`/vehicles/${id}/maintenance`, { params }),
  kmLog: (id: string, data: any) => api.post(`/vehicles/${id}/km-log`, data),
  stats: () => api.get('/vehicles/stats/overview'),
  depreciationOverview: () => api.get('/vehicles/stats/depreciation'),
  depreciationHistory: (id: string) => api.get(`/vehicles/${id}/depreciation/history`),
  runDepreciation: (id: string, data: any) => api.post(`/vehicles/${id}/depreciation/run-month`, data),
  runAllDepreciation: (data: any) => api.post('/vehicles/depreciation/run-all', data),
  gpsImportPreview: () => api.get('/tracking/import-preview'),
  gpsImport: (imeis: string[]) => api.post('/tracking/import', { imeis }),
  fleetBoard: () => api.get('/vehicles/fleet-board'),
};

// ── Employees ────────────────────────────────────────────
export const employeeApi = {
  list: (params?: any) => api.get('/employees', { params }),
  get: (id: string) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  payroll: (id: string) => api.get(`/employees/${id}/payroll`),
  trips: (id: string) => api.get(`/employees/${id}/trips`),
  attendance: (id: string, params?: any) => api.get(`/employees/${id}/attendance`, { params }),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

// ── Customers ────────────────────────────────────────────
export const customerApi = {
  list: (params?: any) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  orders: (id: string) => api.get(`/customers/${id}/orders`),
  invoices: (id: string) => api.get(`/customers/${id}/invoices`),
  creditStatus: (id: string) => api.get(`/customers/${id}/credit-status`),
};

// ── Orders ───────────────────────────────────────────────
export const orderApi = {
  list: (params?: any) => api.get('/customers/orders', { params }),
  get: (id: string) => api.get(`/customers/orders/${id}`),
  create: (data: any) => api.post('/customers/orders', data),
  updateStatus: (id: string, data: any) => api.put(`/customers/orders/${id}/status`, data),
  message: (id: string, message: string) => api.post(`/customers/orders/${id}/message`, { message }),
  messages: (id: string) => api.get(`/customers/orders/${id}/messages`),
  lifecycle: (orderNumber: string) => api.get(`/customers/orders/lifecycle/${orderNumber}`),
};

// ── Trips ────────────────────────────────────────────────
export const tripApi = {
  list: (params?: any) => api.get('/trips', { params }),
  get: (id: string) => api.get(`/trips/${id}`),
  create: (data: any) => api.post('/trips', data),
  update: (id: string, data: any) => api.put(`/trips/${id}`, data),
  updateStatus: (id: string, status: string, data?: any) => api.put(`/trips/${id}/status`, { status, ...data }),
  close: (id: string, data: any) => api.put(`/trips/${id}/close`, data),
  uploadPod: (id: string, data: any) => {
    if (data instanceof FormData) {
      return api.post(`/trips/${id}/pod`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.post(`/trips/${id}/pod`, data);
  },
  uploadWeighbridge: (id: string, data: any) => {
    if (data instanceof FormData) {
      return api.post(`/trips/${id}/weighbridge`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    return api.post(`/trips/${id}/weighbridge`, data);
  },
  confirmDelivery: (id: string, data: any) => api.put(`/trips/${id}/delivery-confirmation`, data),
  statusHistory: (id: string) => api.get(`/trips/${id}/status-history`),
  podAging: () => api.get('/trips/reports/pod-aging'),
  unconfirmedAging: () => api.get('/trips/reports/unconfirmed-aging'),
  swapVehicle: (id: string, data: any) => api.put(`/trips/${id}/swap-vehicle`, data),
  kpis: (params?: any) => api.get('/trips/stats/kpis', { params }),
  timeAnalytics: (params?: any) => api.get('/trips/stats/time-analytics', { params }),
  suggestAssignment: (params?: any) => api.get('/trips/suggest-assignment', { params }),
  calculateCost: (id: string) => api.post(`/trips/${id}/calculate-cost`),
  costAnalysis: (params?: any) => api.get('/trips/stats/cost-analysis', { params }),
};

// ── Maintenance ──────────────────────────────────────────
export const maintenanceApi = {
  breakdowns: (params?: any) => api.get('/maintenance/breakdowns', { params }),
  createBreakdown: (data: any) => api.post('/maintenance/breakdowns', data),
  approveBreakdown: (id: string, data: any) => api.put(`/maintenance/breakdowns/${id}/approve`, data),
  workOrders: (params?: any) => api.get('/maintenance/work-orders', { params }),
  getWorkOrder: (id: string) => api.get(`/maintenance/work-orders/${id}`),
  createWorkOrder: (data: any) => api.post('/maintenance/work-orders', data),
  updateWorkOrder: (id: string, data: any) => api.put(`/maintenance/work-orders/${id}`, data),
  deleteWorkOrder: (id: string) => api.delete(`/maintenance/work-orders/${id}`),
  completeWorkOrder: (id: string, data: any) => api.put(`/maintenance/work-orders/${id}/complete`, data),
  handover: (id: string, data: any) => api.post(`/maintenance/work-orders/${id}/handover`, data),
  schedules: (params?: any) => api.get('/maintenance/schedules', { params }),
  updateSchedule: (id: string, data: any) => api.put(`/maintenance/schedules/${id}`, data),
  garages: () => api.get('/maintenance/garages'),
  createGarage: (data: any) => api.post('/maintenance/garages', data),
  garagePerformance: (params?: any) => api.get('/maintenance/analytics/garage-performance', { params }),
};

// ── Inventory ────────────────────────────────────────────
export const inventoryApi = {
  list: (params?: any) => api.get('/inventory', { params }),
  get: (id: string) => api.get(`/inventory/${id}`),
  create: (data: any) => api.post('/inventory', data),
  update: (id: string, data: any) => api.put(`/inventory/${id}`, data),
  issue: (id: string, data: any) => api.post(`/inventory/${id}/issue`, data),
  receive: (id: string, data: any) => api.post(`/inventory/${id}/receive`, data),
  spareRequests: (params?: any) => api.get('/inventory/spare-part-requests', { params }),
  createSpareRequest: (data: any) => api.post('/inventory/spare-part-requests', data),
  approveSpareRequest: (id: string, data: any) => api.put(`/inventory/spare-part-requests/${id}/approve`, data),
};

// ── Procurement ──────────────────────────────────────────
export const procurementApi = {
  suppliers: (params?: any) => api.get('/procurement/suppliers', { params }),
  createSupplier: (data: any) => api.post('/procurement/suppliers', data),
  listRequests: (params?: any) => api.get('/procurement/purchase-requests', { params }),
  createRequest: (data: any) => api.post('/procurement/purchase-requests', data),
  approveRequest: (id: string) => api.put(`/procurement/purchase-requests/${id}/approve`),
  updateRequestStatus: (id: string, data: any) => {
    if (data.status === 'approved') return api.put(`/procurement/purchase-requests/${id}/approve`);
    return api.put(`/procurement/purchase-requests/${id}/reject`, data);
  },
  quotations: (prId: string) => api.get(`/procurement/purchase-requests/${prId}/quotations`),
  addQuotation: (prId: string, data: any) => api.post(`/procurement/purchase-requests/${prId}/quotations`, data),
  selectQuotation: (qId: string) => api.put(`/procurement/quotations/${qId}/select`),
  listOrders: (params?: any) => api.get('/procurement/purchase-orders', { params }),
  receivePO: (id: string, data: any) => api.put(`/procurement/purchase-orders/${id}/receive`, data),
  shipPO: (id: string) => api.put(`/procurement/purchase-orders/${id}/ship`),
  createPOPayment: (id: string) => api.post(`/procurement/purchase-orders/${id}/payment-request`),
  quotationComparison: (prId: string) => api.get(`/procurement/quotation-comparison/${prId}`),
  supplierDetail: (id: string) => api.get(`/procurement/suppliers/${id}`),
  updateSupplier: (id: string, data: any) => api.put(`/procurement/suppliers/${id}`, data),
  // GRN
  createGRN: (poId: string, data: any) => api.post(`/procurement/purchase-orders/${poId}/grn`, data),
  listGRNsForPO: (poId: string) => api.get(`/procurement/purchase-orders/${poId}/grn`),
  listAllGRNs: (params?: any) => api.get('/procurement/grn', { params }),
  getGRN: (id: string) => api.get(`/procurement/grn/${id}`),
  // Procurement report
  procurementReport: (params: any) => api.get('/reports/procurement-summary', { params }),
  getProcurementNote: (params: any) => api.get('/reports/procurement-note', { params }),
  saveProcurementNote: (data: any) => api.put('/reports/procurement-note', data),
  // Backward compat
  prList: (params?: any) => api.get('/procurement/purchase-requests', { params }),
  createPR: (data: any) => api.post('/procurement/purchase-requests', data),
  approvePR: (id: string) => api.put(`/procurement/purchase-requests/${id}/approve`),
  poList: (params?: any) => api.get('/procurement/purchase-orders', { params }),
};

// ── Cashier ──────────────────────────────────────────────
export const cashierApi = {
  getMyCashier: () => api.get('/cashier/me'),
  list: () => api.get('/cashier'),
  get: (id: string) => api.get(`/cashier/${id}`),
  create: (data: any) => api.post('/cashier', data),
  transaction: (id: string, data: any) => api.post(`/cashier/${id}/transaction`, data),
  receivePayment: (cashierId: string, data: any) =>
    api.post(`/cashier/${cashierId}/transaction`, { ...data, type: 'in', category: data.category || 'income' }),
  makePayment: (cashierId: string, data: any) =>
    api.post(`/cashier/${cashierId}/transaction`, { ...data, type: 'out', category: data.category || 'expense' }),
  listTransactions: (params?: any) => api.get('/cashier/transactions', { params }),
  listAdvances: (params?: any) => api.get('/cashier/driver-advances', { params }),
  createAdvance: (data: any) => api.post('/cashier/driver-advances', data),
  approveAdvance: (id: string) => api.put(`/cashier/driver-advances/${id}/approve`),
  settleAdvance: (id: string, data: any) => api.put(`/cashier/driver-advances/${id}/pay`, data),
  listFuelLogs: (params?: any) => api.get('/cashier/fuel-logs', { params }),
  createFuelLog: (data: any) => api.post('/cashier/fuel-logs', data),
  // Backward compat
  transactions: (params?: any) => api.get('/cashier/transactions', { params }),
  advances: (params?: any) => api.get('/cashier/driver-advances', { params }),
  fuelLogs: (params?: any) => api.get('/cashier/fuel-logs', { params }),
  payAdvance: (id: string, cashierId: string) => api.put(`/cashier/driver-advances/${id}/pay`, { cashierId }),
  fuelAnalytics: (params?: any) => api.get('/cashier/fuel-analytics', { params }),
  // Phase 3: Session management
  openSession: (id: string) => api.post(`/cashier/${id}/open-session`),
  closeSession: (id: string, data: any) => api.post(`/cashier/${id}/close-session`, data),
  getSessions: (id: string, params?: any) => api.get(`/cashier/${id}/sessions`, { params }),
  reconcileSession: (sessionId: string) => api.put(`/cashier/sessions/${sessionId}/reconcile`),
  dailyReconciliation: (params?: any) => api.get('/cashier/sessions/daily-reconciliation', { params }),
  updateCashier: (id: string, data: any) => api.put(`/cashier/${id}`, data),
  // Delete & Clear endpoints
  deleteTransaction: (id: string) => api.delete(`/cashier/transactions/${id}`),
  clearTransactions: (params?: any) => api.delete('/cashier/transactions', { params }),
  deleteAdvance: (id: string) => api.delete(`/cashier/driver-advances/${id}`),
  clearAdvances: (params?: any) => api.delete('/cashier/driver-advances', { params }),
  deleteFuelLog: (id: string) => api.delete(`/cashier/fuel-logs/${id}`),
  clearFuelLogs: (params?: any) => api.delete('/cashier/fuel-logs', { params }),
  deleteSession: (sessionId: string) => api.delete(`/cashier/sessions/${sessionId}`),
  clearSessions: (params?: any) => api.delete('/cashier/sessions', { params }),
  deleteCashier: (id: string) => api.delete(`/cashier/${id}`),
  clearCashierData: (id: string) => api.post(`/cashier/${id}/clear`),
};

export const cashTransferApi = {
  list: (params?: any) => api.get('/cash-transfers', { params }),
  get: (id: string) => api.get(`/cash-transfers/${id}`),
  create: (data: any) => api.post('/cash-transfers', data),
  approve: (id: string) => api.put(`/cash-transfers/${id}/approve`),
  complete: (id: string) => api.put(`/cash-transfers/${id}/complete`),
  reject: (id: string, data?: any) => api.put(`/cash-transfers/${id}/reject`, data),
  delete: (id: string) => api.delete(`/cash-transfers/${id}`),
  clear: () => api.delete('/cash-transfers'),
};

// ── Rental ───────────────────────────────────────────────
export const rentalApi = {
  listOwners: () => api.get('/rental/owners'),
  owners: () => api.get('/rental/owners'),
  createOwner: (data: any) => api.post('/rental/owners', data),
  ownerVehicles: (id: string) => api.get(`/rental/owners/${id}/vehicles`),
  ownerLedger: (id: string) => api.get(`/rental/owners/${id}/ledger`),
  listVehicles: () => api.get('/rental/vehicles'),
  vehicles: () => api.get('/rental/vehicles'),
  ensureDriver: (rentalVehicleId: string) => api.get(`/rental/vehicles/${rentalVehicleId}/ensure-driver`),
  createVehicle: (data: any) => api.post('/rental/owners/vehicles', data),
  listTrips: (params?: any) => api.get('/rental/trips', { params }),
  trips: (params?: any) => api.get('/rental/trips', { params }),
  createTrip: (data: any) => api.post('/rental/trips', data),
  closeTrip: (id: string, data: any) => api.put(`/rental/trips/${id}/close`, data),
  pay: (data: any) => api.post('/rental/payments', data),
};

// ── Revenue Share ───────────────────────────────────
export const revenueShareApi = {
  listContracts: () => api.get('/revenue-share/contracts'),
  getContract: (id: string) => api.get(`/revenue-share/contracts/${id}`),
  createContract: (data: any) => api.post('/revenue-share/contracts', data),
  addTrip: (data: any) => api.post('/revenue-share/trips', data),
  listSettlements: () => api.get('/revenue-share/settlements'),
  generateSettlement: (data: any) => api.post('/revenue-share/settlements/generate', data),
  approveSettlement: (id: string) => api.put(`/revenue-share/settlements/${id}/approve`),
  paySettlement: (id: string) => api.put(`/revenue-share/settlements/${id}/pay`),
};

// ── HR ───────────────────────────────────────────────────
export const hrApi = {
  // Attendance
  listAttendance: (params?: any) => api.get('/hr/attendance', { params }),
  attendance: (params?: any) => api.get('/hr/attendance', { params }),
  markAttendance: (record: any) => api.post('/hr/attendance', { records: [record] }),
  submitAttendance: (data: any) => api.post('/hr/attendance', data),
  updateAttendance: (id: string, data: any) => api.put(`/hr/attendance/${id}`, data),
  // Leaves
  listLeaves: (params?: any) => api.get('/hr/leaves', { params }),
  createLeave: (data: any) => api.post('/hr/leaves', data),
  updateLeave: (id: string, data: any) => api.put(`/hr/leaves/${id}`, data),
  // Overtime (using attendance with overtimeHours)
  listOvertime: (params?: any) => api.get('/hr/attendance', { params: { ...params } }),
  logOvertime: (data: any) =>
    api.post('/hr/attendance', { records: [{ ...data, date: data.date || new Date().toISOString().split('T')[0], status: 'present', overtimeHours: Number(data.hours) }] }),
  // Payroll
  listPayrolls: (params?: any) => {
    const p: any = { ...params };
    if (p.month && typeof p.month === 'string' && p.month.includes('-')) {
      const [y, m] = p.month.split('-');
      p.year = Number(y); p.month = Number(m);
    }
    return api.get('/hr/payroll', { params: p });
  },
  payroll: (params?: any) => api.get('/hr/payroll', { params }),
  generatePayroll: (data: any) => {
    const d: any = { ...data };
    if (d.month && typeof d.month === 'string' && d.month.includes('-')) {
      const [y, m] = d.month.split('-');
      d.year = Number(y); d.month = Number(m);
    }
    return api.post('/hr/payroll/generate', d);
  },
  getPayroll: (id: string) => api.get(`/hr/payroll/${id}`),
  approvePayroll: (id: string) => api.put(`/hr/payroll/${id}/approve`),
  markPayrollPaid: (id: string, data: any) => api.put(`/hr/payroll/${id}/pay`, data),
  payPayroll: (id: string, data: any) => api.put(`/hr/payroll/${id}/pay`, data),
};

// ── Reports ──────────────────────────────────────────────
export const reportApi = {
  financial: (params?: any) => api.get('/reports/financial', { params }),
  trips: (params?: any) => api.get('/reports/trips', { params }),
  fleet: (params?: any) => api.get('/reports/fleet', { params }),
  kpis: (params?: any) => api.get('/reports/kpis', { params }),
  profitPerVehicle: (params?: any) => api.get('/reports/profit-per-vehicle', { params }),
  fleetUtilization: (params?: any) => api.get('/reports/fleet-utilization', { params }),
  cashierSummary: () => api.get('/reports/cashier-summary'),
  payrollSummary: (params?: any) => api.get('/reports/payroll-summary', { params }),
  maintenanceCost: (params?: any) => api.get('/reports/maintenance-cost', { params }),
  customerPerformance: (params?: any) => api.get('/reports/customer-performance', { params }),
  tonnageDaily: (params?: any) => api.get('/reports/tonnage-daily', { params }),
  // Phase 9: Operational reports
  tripSummary: (params?: any) => api.get('/reports/trip-summary', { params }),
  orderFulfillment: (params?: any) => api.get('/reports/order-fulfillment', { params }),
  podStatus: (params?: any) => api.get('/reports/pod-status', { params }),
  delayedTrips: () => api.get('/reports/delayed-trips'),
  vehicleSwapHistory: (params?: any) => api.get('/reports/vehicle-swap-history', { params }),
  // Phase 9: Financial reports
  cashierDaily: (params?: any) => api.get('/reports/cashier-daily', { params }),
  cashFlow: (params?: any) => api.get('/reports/cash-flow', { params }),
  settlementSummary: (params?: any) => api.get('/reports/settlement-summary', { params }),
  receivablesAging: () => api.get('/reports/receivables-aging'),
  // Phase 9: Control reports
  penaltySummary: (params?: any) => api.get('/reports/penalty-summary', { params }),
  approvalTurnaround: (params?: any) => api.get('/reports/approval-turnaround', { params }),
  alertResolution: (params?: any) => api.get('/reports/alert-resolution', { params }),
  complianceStatus: () => api.get('/reports/compliance-status'),
};

// ── Notifications ────────────────────────────────────────
export const notifApi = {
  list: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ── Handovers ────────────────────────────────────────────
export const handoverApi = {
  list: (params?: any) => api.get('/handovers', { params }),
  get: (id: string) => api.get(`/handovers/${id}`),
  create: (data: any) => api.post('/handovers', data),
  accept: (id: string) => api.put(`/handovers/${id}/accept`),
  reject: (id: string, reason: string) => api.put(`/handovers/${id}/reject`, { reason }),
  updateChecklist: (itemId: string, data: any) => api.put(`/handovers/checklist/${itemId}`, data),
};

// ── Driver Ledger ────────────────────────────────────────
export const driverLedgerApi = {
  list: () => api.get('/driver-ledger'),
  get: (driverId: string) => api.get(`/driver-ledger/${driverId}`),
  addEntry: (driverId: string, data: any) => api.post(`/driver-ledger/${driverId}`, data),
  sync: (driverId: string) => api.post(`/driver-ledger/${driverId}/sync`),
  deleteEntry: (entryId: string) => api.delete(`/driver-ledger/entry/${entryId}`),
  clearLedger: (driverId: string) => api.delete(`/driver-ledger/${driverId}`),
};

// ── Approvals ───────────────────────────────────────────
export const approvalApi = {
  list: (params?: any) => api.get('/approvals', { params }),
  get: (id: string) => api.get(`/approvals/${id}`),
  create: (data: any) => api.post('/approvals', data),
  approve: (id: string) => api.put(`/approvals/${id}/approve`),
  reject: (id: string, reason?: string) => api.put(`/approvals/${id}/reject`, { reason }),
  pendingCount: () => api.get('/approvals/pending-count'),
  rules: () => api.get('/approvals/rules/list'),
  upsertRule: (data: any) => api.post('/approvals/rules', data),
  updateRule: (id: string, data: any) => api.put(`/approvals/rules/${id}`, data),
  seedRules: () => api.post('/approvals/rules/seed'),
};

// ── Compliance ───────────────────────────────────────────
export const complianceApi = {
  alerts: () => api.get('/compliance/alerts'),
  updateVehicle: (id: string, data: any) => api.put(`/compliance/vehicle/${id}`, data),
  unlockVehicle: (id: string, reason?: string) => api.put(`/compliance/vehicle/${id}/unlock`, { reason }),
  complianceScanAll: () => api.post('/vehicles/compliance-check-all'),
  complianceCheck: (id: string) => api.post(`/vehicles/${id}/compliance-check`),
};

// ── Profitability ────────────────────────────────────────
export const profitabilityApi = {
  vehicles: (params?: any) => api.get('/profitability/vehicles', { params }),
  byCategory: (params?: any) => api.get('/profitability/by-category', { params }),
  vehicleDetail: (id: string, params?: any) => api.get(`/profitability/vehicles/${id}`, { params }),
  byRoute: (params?: any) => api.get('/profitability/by-route', { params }),
  byCustomer: (params?: any) => api.get('/profitability/by-customer', { params }),
  byCargo: (params?: any) => api.get('/profitability/by-cargo-type', { params }),
  // Phase 8
  byOrder: (params?: any) => api.get('/profitability/by-order', { params }),
  byOrderDetail: (orderId: string) => api.get(`/profitability/by-order/${orderId}`),
  byDriver: (params?: any) => api.get('/profitability/by-driver', { params }),
  byPeriod: (params?: any) => api.get('/profitability/by-period', { params }),
  marginAnalysis: (params?: any) => api.get('/profitability/margin-analysis', { params }),
  costDrivers: (params?: any) => api.get('/profitability/cost-drivers', { params }),
};

// ── Audit ────────────────────────────────────────────────
export const auditApi = {
  list: (params?: any) => api.get('/audit', { params }),
  entity: (type: string, id: string) => api.get(`/audit/entity/${type}/${id}`),
  summary: () => api.get('/audit/summary'),
};

// ── Main Cash ────────────────────────────────────────────
export const mainCashApi = {
  get: () => api.get('/main-cash'),
  allocate: (data: any) => api.post('/main-cash/allocate', data),
  returnFunds: (data: any) => api.post('/main-cash/return', data),
  deposit: (data: any) => api.post('/main-cash/deposit', data),
  settlement: (params?: any) => api.get('/main-cash/settlement', { params }),
  balances: () => api.get('/main-cash/balances'),
  customerCollection: (data: any) => api.post('/main-cash/customer-collection', data),
};

// ── Driver Scoring ──────────────────────────────────────
export const driverScoringApi = {
  config: () => api.get('/driver-scoring/config'),
  updateConfig: (data: any) => api.put('/driver-scoring/config', data),
  calculate: (data: any) => api.post('/driver-scoring/calculate', data),
  leaderboard: (params?: any) => api.get('/driver-scoring/leaderboard', { params }),
  history: (driverId: string) => api.get(`/driver-scoring/${driverId}/history`),
};

// ── Driver Rewards ──────────────────────────────────────
export const driverRewardsApi = {
  rules: () => api.get('/driver-rewards/rules'),
  createRule: (data: any) => api.post('/driver-rewards/rules', data),
  updateRule: (id: string, data: any) => api.put(`/driver-rewards/rules/${id}`, data),
  list: (params?: any) => api.get('/driver-rewards', { params }),
  generate: (data: any) => api.post('/driver-rewards/generate', data),
  create: (data: any) => api.post('/driver-rewards', data),
  approve: (id: string) => api.put(`/driver-rewards/${id}/approve`),
  apply: (id: string) => api.put(`/driver-rewards/${id}/apply`),
};

// ── Dispatch ────────────────────────────────────────────
export const dispatchApi = {
  board: (params?: any) => api.get('/dispatch/board', { params }),
  quickAssign: (data: any) => api.post('/dispatch/quick-assign', data),
};

// ── Documents ───────────────────────────────────────────
export const documentApi = {
  list: (params?: any) => api.get('/documents', { params }),
  upload: (data: FormData) => api.post('/documents', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  expiring: (params?: any) => api.get('/documents/expiring', { params }),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// ── Alerts ──────────────────────────────────────────────
export const alertApi = {
  list: (params?: any) => api.get('/alerts', { params }),
  summary: () => api.get('/alerts/summary'),
  get: (id: string) => api.get(`/alerts/${id}`),
  create: (data: any) => api.post('/alerts', data),
  resolve: (id: string, note?: string) => api.put(`/alerts/${id}/resolve`, { note }),
  assign: (id: string, data: any) => api.put(`/alerts/${id}/assign`, data),
  bulkResolve: (ids: string[], note?: string) => api.put('/alerts/bulk-resolve', { ids, note }),
  scan: () => api.post('/alerts/scan'),
  rules: () => api.get('/alerts/rules/list'),
  updateRule: (id: string, data: any) => api.put(`/alerts/rules/${id}`, data),
  seedRules: () => api.post('/alerts/rules/seed'),
};

// ── Accounting ──────────────────────────────────────────
export const accountingApi = {
  accounts: (params?: any) => api.get('/accounting/accounts', { params }),
  createAccount: (data: any) => api.post('/accounting/accounts', data),
  updateAccount: (id: string, data: any) => api.put(`/accounting/accounts/${id}`, data),
  seed: () => api.post('/accounting/seed'),
  journalEntries: (params?: any) => api.get('/accounting/journal-entries', { params }),
  createJournalEntry: (data: any) => api.post('/accounting/journal-entries', data),
  trialBalance: () => api.get('/accounting/trial-balance'),
  profitLoss: (params?: any) => api.get('/accounting/profit-loss', { params }),
  balanceSheet: () => api.get('/accounting/balance-sheet'),
  generalLedger: (params?: any) => api.get('/accounting/general-ledger', { params }),
  fiscalPeriods: () => api.get('/accounting/fiscal-periods'),
  cashBook: (params?: any) => api.get('/accounting/cash-book', { params }),
  configs: () => api.get('/accounting/config'),
  upsertConfig: (data: any) => api.post('/accounting/config', data),
  updateConfig: (id: string, data: any) => api.put(`/accounting/config/${id}`, data),
  seedConfig: () => api.post('/accounting/config/seed'),
};

// ── Portal ──────────────────────────────────────────────
export const portalApi = {
  dashboard: () => api.get('/portal/dashboard'),
  orders: (params?: any) => api.get('/portal/orders', { params }),
  createOrder: (data: any) => api.post('/portal/orders', data),
  orderDetail: (id: string) => api.get(`/portal/orders/${id}`),
  sendMessage: (id: string, message: string) => api.post(`/portal/orders/${id}/message`, { message }),
  invoices: () => api.get('/portal/invoices'),
  profile: () => api.get('/portal/profile'),
};

// ── Settlements ────────────────────────────────────────────
export const settlementApi = {
  list: (params?: any) => api.get('/settlements', { params }),
  get: (id: string) => api.get(`/settlements/${id}`),
  generate: (orderId: string, data?: any) => api.post(`/settlements/generate/${orderId}`, data || {}),
  review: (id: string) => api.put(`/settlements/${id}/review`),
  approve: (id: string) => api.put(`/settlements/${id}/approve`),
  generateInvoice: (id: string) => api.post(`/settlements/${id}/generate-invoice`),
  addLine: (id: string, data: any) => api.post(`/settlements/${id}/lines`, data),
  deleteLine: (lineId: string) => api.delete(`/settlements/lines/${lineId}`),
  recordCollection: (id: string, data: any) => api.put(`/settlements/${id}/record-collection`, data),
};

// ── Order Revisions ────────────────────────────────────────
export const orderRevisionApi = {
  list: (params?: any) => api.get('/order-revisions', { params }),
  create: (data: any) => api.post('/order-revisions', data),
  approve: (id: string) => api.put(`/order-revisions/${id}/approve`),
  reject: (id: string) => api.put(`/order-revisions/${id}/reject`),
};

// ── Penalties ──────────────────────────────────────────────
export const penaltyApi = {
  list: (params?: any) => api.get('/penalties', { params }),
  create: (data: any) => api.post('/penalties', data),
  approve: (id: string) => api.put(`/penalties/${id}/approve`),
  apply: (id: string) => api.put(`/penalties/${id}/apply`),
  waive: (id: string, reason: string) => api.put(`/penalties/${id}/waive`, { reason }),
  summary: (orderId: string) => api.get(`/penalties/summary/${orderId}`),
};

// ── Accidents ──────────────────────────────────────────
export const accidentApi = {
  list: (params?: any) => api.get('/accidents', { params }),
  get: (id: string) => api.get(`/accidents/${id}`),
  create: (data: any) => api.post('/accidents', data),
  update: (id: string, data: any) => api.put(`/accidents/${id}`, data),
};

export const telegramApi = {
  getConfig: () => api.get('/telegram/config'),
  saveConfig: (data: any) => api.post('/telegram/config', data),
  updateRoleRules: (roleRules: any) => api.put('/telegram/config/roles', { roleRules }),
  toggleActive: () => api.put('/telegram/config/toggle'),
  getUsers: () => api.get('/telegram/users'),
  linkUser: (userId: string, telegramChatId: string) => api.put(`/telegram/users/${userId}/link`, { telegramChatId }),
  bulkLink: (links: any[]) => api.put('/telegram/users/bulk-link', { links }),
  test: (botToken: string, chatId: string) => api.post('/telegram/test', { botToken, chatId }),
  send: (data: any) => api.post('/telegram/send', data),
  scanCompliance: () => api.post('/telegram/scan/compliance'),
  scanInventory: () => api.post('/telegram/scan/inventory'),
  getLogs: (params?: any) => api.get('/telegram/logs', { params }),
  clearLogs: (olderThanDays?: number) => api.delete('/telegram/logs', { params: { olderThanDays } }),
};

// ── Brokers ─────────────────────────────────────────────
export const brokerApi = {
  list: (params?: any) => api.get('/brokers', { params }),
  get: (id: string) => api.get(`/brokers/${id}`),
  create: (data: any) => api.post('/brokers', data),
  update: (id: string, data: any) => api.put(`/brokers/${id}`, data),
  listCommissions: (params?: any) => api.get('/brokers/commissions', { params }),
  createCommission: (data: any) => api.post('/brokers/commissions', data),
  approveCommission: (id: string) => api.put(`/brokers/commissions/${id}/approve`),
  payCommission: (id: string) => api.put(`/brokers/commissions/${id}/pay`),
};

// ── Fuel Control ────────────────────────────────────────
export const fuelControlApi = {
  listStandards: (params?: any) => api.get('/fuel-control/standards', { params }),
  createStandard: (data: any) => api.post('/fuel-control/standards', data),
  updateStandard: (id: string, data: any) => api.put(`/fuel-control/standards/${id}`, data),
  deactivateStandard: (id: string) => api.put(`/fuel-control/standards/${id}/deactivate`),
  variance: (params?: any) => api.get('/fuel-control/variance', { params }),
};

// ── Company Documents ────────────────────────────────────
export const companyDocsApi = {
  list: () => api.get('/company-docs'),
  create: (data: any) => api.post('/company-docs', data),
  update: (id: string, data: any) => api.put(`/company-docs/${id}`, data),
  expiring: () => api.get('/company-docs/expiring'),
  contractExpiry: () => api.get('/company-docs/contract-expiry'),
  createContract: (data: any) => api.post('/company-docs/contract-expiry', data),
  updateContract: (id: string, data: any) => api.put(`/company-docs/contract-expiry/${id}`, data),
};

// ── Payment Requests ──────────────────────────────────────
export const paymentRequestApi = {
  stats: () => api.get('/payment-requests/stats'),
  list: (params?: any) => api.get('/payment-requests', { params }),
  create: (data: any) => api.post('/payment-requests', data),
  submit: (id: string) => api.put(`/payment-requests/${id}/submit`),
  approve: (id: string) => api.put(`/payment-requests/${id}/approve`),
  reject: (id: string, data: any) => api.put(`/payment-requests/${id}/reject`, data),
  pay: (id: string, data: any) => api.put(`/payment-requests/${id}/pay`, data),
};
