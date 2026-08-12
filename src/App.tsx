import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { canAccess } from './config/permissions';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import VehiclesPage from './pages/VehiclesPage';
import EmployeesPage from './pages/EmployeesPage';
import CustomersPage from './pages/CustomersPage';
import OrdersPage from './pages/OrdersPage';
import TripsPage from './pages/TripsPage';
import MaintenancePage from './pages/MaintenancePage';
import InventoryPage from './pages/InventoryPage';
import ProcurementPage from './pages/ProcurementPage';
import CashierPage from './pages/CashierPage';
import RentalPage from './pages/RentalPage';
import HRPage from './pages/HRPage';
import PayrollPage from './pages/PayrollPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import HandoverPage from './pages/HandoverPage';
import DriverLedgerPage from './pages/DriverLedgerPage';
import CompliancePage from './pages/CompliancePage';
import ProfitabilityPage from './pages/ProfitabilityPage';
import AuditPage from './pages/AuditPage';
import TelegramPage from './pages/TelegramPage';
import PermissionsPage from './pages/PermissionsPage';
import TrackingPage from './pages/TrackingPage';
import DriverScoringPage from './pages/DriverScoringPage';
import DispatchPage from './pages/DispatchPage';
import AccountingPage from './pages/AccountingPage';
import SettlementsPage from './pages/SettlementsPage';
import FleetBoardPage from './pages/FleetBoardPage';
import ApprovalsPage from './pages/ApprovalsPage';
import AlertsPage from './pages/AlertsPage';
import FuelControlPage from './pages/FuelControlPage';
import AccidentPage from './pages/AccidentPage';
import RevenueSharePage from './pages/RevenueSharePage';
import BrokerPage from './pages/BrokerPage';
import CompanyDocsPage from './pages/CompanyDocsPage';
import PaymentRequestsPage from './pages/PaymentRequestsPage';
import ProcurementReportPage from './pages/ProcurementReportPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

// Route guard: checks if user's role (or custom permissions) allow access to a page
function RoleGuard({ page, children }: { page: string; children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (canAccess(user.role, page, user.permissions)) return <>{children}</>;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="vehicles" element={<RoleGuard page="vehicles"><VehiclesPage /></RoleGuard>} />
          <Route path="employees" element={<RoleGuard page="employees"><EmployeesPage /></RoleGuard>} />
          <Route path="customers" element={<RoleGuard page="customers"><CustomersPage /></RoleGuard>} />
          <Route path="orders" element={<RoleGuard page="orders"><OrdersPage /></RoleGuard>} />
          <Route path="trips" element={<RoleGuard page="trips"><TripsPage /></RoleGuard>} />
          <Route path="maintenance" element={<RoleGuard page="maintenance"><MaintenancePage /></RoleGuard>} />
          <Route path="inventory" element={<RoleGuard page="inventory"><InventoryPage /></RoleGuard>} />
          <Route path="procurement" element={<RoleGuard page="procurement"><ProcurementPage /></RoleGuard>} />
          <Route path="cashier" element={<RoleGuard page="cashier"><CashierPage /></RoleGuard>} />
          <Route path="rental" element={<RoleGuard page="rental"><RentalPage /></RoleGuard>} />
          <Route path="hr" element={<RoleGuard page="hr"><HRPage /></RoleGuard>} />
          <Route path="payroll" element={<RoleGuard page="payroll"><PayrollPage /></RoleGuard>} />
          <Route path="reports" element={<RoleGuard page="reports"><ReportsPage /></RoleGuard>} />
          <Route path="users" element={<RoleGuard page="users"><UsersPage /></RoleGuard>} />
          <Route path="handovers" element={<RoleGuard page="handovers"><HandoverPage /></RoleGuard>} />
          <Route path="driver-ledger" element={<RoleGuard page="driver-ledger"><DriverLedgerPage /></RoleGuard>} />
          <Route path="compliance" element={<RoleGuard page="compliance"><CompliancePage /></RoleGuard>} />
          <Route path="profitability" element={<RoleGuard page="profitability"><ProfitabilityPage /></RoleGuard>} />
          <Route path="audit" element={<RoleGuard page="audit"><AuditPage /></RoleGuard>} />
          <Route path="telegram" element={<RoleGuard page="telegram"><TelegramPage /></RoleGuard>} />
          <Route path="tracking" element={<RoleGuard page="tracking"><TrackingPage /></RoleGuard>} />
          <Route path="driver-scoring" element={<RoleGuard page="driver-scoring"><DriverScoringPage /></RoleGuard>} />
          <Route path="dispatch" element={<RoleGuard page="dispatch"><DispatchPage /></RoleGuard>} />
          <Route path="settlements" element={<RoleGuard page="settlements"><SettlementsPage /></RoleGuard>} />
          <Route path="fleet-board" element={<RoleGuard page="fleet-board"><FleetBoardPage /></RoleGuard>} />
          <Route path="approvals" element={<RoleGuard page="approvals"><ApprovalsPage /></RoleGuard>} />
          <Route path="alerts" element={<RoleGuard page="alerts"><AlertsPage /></RoleGuard>} />
          <Route path="accounting" element={<RoleGuard page="accounting"><AccountingPage /></RoleGuard>} />
          <Route path="fuel-control" element={<RoleGuard page="fuel-control"><FuelControlPage /></RoleGuard>} />
          <Route path="accidents" element={<RoleGuard page="accidents"><AccidentPage /></RoleGuard>} />
          <Route path="revenue-share" element={<RoleGuard page="revenue-share"><RevenueSharePage /></RoleGuard>} />
          <Route path="brokers" element={<RoleGuard page="brokers"><BrokerPage /></RoleGuard>} />
          <Route path="company-docs" element={<RoleGuard page="company-docs"><CompanyDocsPage /></RoleGuard>} />
          <Route path="payment-requests" element={<RoleGuard page="payment-requests"><PaymentRequestsPage /></RoleGuard>} />
          <Route path="procurement-report" element={<RoleGuard page="procurement-report"><ProcurementReportPage /></RoleGuard>} />
          <Route path="permissions" element={<RoleGuard page="users"><PermissionsPage /></RoleGuard>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
