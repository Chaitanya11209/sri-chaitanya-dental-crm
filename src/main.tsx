import { createRoot } from "react-dom/client";
import { Router as WouterRouter, Switch, Route, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LandingApp from "./App";
import AdminLogin from "./pages/AdminLogin";
import ResetPassword from "./pages/ResetPassword";
import CRMLayout from "./pages/crm/CRMLayout";
import CRMDashboard from "./pages/crm/Dashboard";
import Patients from "./pages/crm/Patients";
import Appointments from "./pages/crm/Appointments";
import Treatments from "./pages/crm/Treatments";
import Billing from "./pages/crm/Billing";
import RevenueCycle from "./pages/crm/RevenueCycle";
import Collections from "./pages/crm/Collections";
import Followups from "./pages/crm/Followups";
import Users from "./pages/crm/Users";
import Analytics from "./pages/crm/Analytics";
import Reports from "./pages/crm/Reports";
import Export from "./pages/crm/Export";
import Settings from "./pages/crm/Settings";
import Doctors from "./pages/crm/Doctors";
import AuditLogs from "./pages/crm/AuditLogs";
import LabWork from "./pages/crm/LabWork";
import Letters from "./pages/crm/Letters";
import Expenses from "./pages/crm/Expenses";
import Inventory from "./pages/crm/Inventory";
import Profile from "./pages/crm/Profile";
import Setup from "./pages/crm/Setup";
import ThreeDModel from "./pages/crm/ThreeDModel";
import ImagingDocuments from "./pages/crm/ImagingDocuments";
import Operations from "./pages/crm/Operations";
import Compliance from "./pages/crm/Compliance";
import Endodontics from "./pages/crm/Endodontics";
import Cases from "./pages/crm/Cases";
import TreatmentExecution from "./pages/crm/TreatmentExecution";
import Copilot from "./pages/crm/Copilot";
import Tasks from "./pages/crm/Tasks";
import Automation from "./pages/crm/Automation";
import DocumentStudio from "./pages/crm/DocumentStudio";
import Knowledge from "./pages/crm/Knowledge";
import { PatientCareLanding, ClinicalLanding, FinanceLanding, OperationsLanding, AdministrationLanding } from "./pages/crm/WorkspaceLandingPages";
import PatientPortal from "./pages/PatientPortal";
import QueueDisplay from "./pages/QueueDisplay";
import ErrorBoundary from "./components/ErrorBoundary";
import RoleGuard from "./components/RoleGuard";
import { NotificationProvider } from "./components/NotificationProvider";
import { AppointmentsProvider } from "./components/AppointmentsContext";
import { isAdmin, isDoctor, getRole, hasAccessToRoute } from "./lib/auth";
import "./index.css";

const queryClient = new QueryClient();

function ProtectedRoute({ path, component: Component }: { path: string; component: React.ComponentType<any> }) {
  const role = getRole();
  const authorized = hasAccessToRoute(path, role);
  return (
    <Route path={path}>
      {authorized ? <Component /> : <Redirect to="/crm/dashboard" />}
    </Route>
  );
}

function CRMRoutes() {
  return (
    <CRMLayout>
      <Switch>
        <ProtectedRoute path="/crm/dashboard" component={CRMDashboard} />
        <ProtectedRoute path="/crm/patient-care" component={PatientCareLanding} />
        <ProtectedRoute path="/crm/clinical" component={ClinicalLanding} />
        <ProtectedRoute path="/crm/finance" component={FinanceLanding} />
        <ProtectedRoute path="/crm/operations" component={OperationsLanding} />
        <ProtectedRoute path="/crm/administration" component={AdministrationLanding} />
        <ProtectedRoute path="/crm/copilot" component={Copilot} />
        <ProtectedRoute path="/crm/tasks" component={Tasks} />
        <ProtectedRoute path="/crm/automation" component={Automation} />
        <ProtectedRoute path="/crm/document-studio" component={DocumentStudio} />
        <ProtectedRoute path="/crm/patients" component={Patients} />
        <ProtectedRoute path="/crm/appointments" component={Appointments} />
        <ProtectedRoute path="/crm/treatments" component={Treatments} />
        <ProtectedRoute path="/crm/doctors" component={Doctors} />
        <ProtectedRoute path="/crm/reports" component={Reports} />
        <ProtectedRoute path="/crm/billing" component={Billing} />
        <ProtectedRoute path="/crm/revenue" component={RevenueCycle} />
        <ProtectedRoute path="/crm/collections" component={Collections} />
        <ProtectedRoute path="/crm/followups" component={Followups} />
        <Route path="/crm/treatment-coordinator"><Redirect to="/crm/patients" /></Route>
        <ProtectedRoute path="/crm/users" component={Users} />
        <ProtectedRoute path="/crm/export" component={Export} />
        <ProtectedRoute path="/crm/audit" component={AuditLogs} />
        <ProtectedRoute path="/crm/settings" component={Settings} />
        <ProtectedRoute path="/crm/labwork" component={LabWork} />
        <ProtectedRoute path="/crm/letters" component={Letters} />
        <ProtectedRoute path="/crm/expenses" component={Expenses} />
        <ProtectedRoute path="/crm/inventory" component={Inventory} />
        <ProtectedRoute path="/crm/profile" component={Profile} />
        <ProtectedRoute path="/crm/3d-model" component={ThreeDModel} />
        <ProtectedRoute path="/crm/imaging" component={ImagingDocuments} />
        <ProtectedRoute path="/crm/operations" component={Operations} />
        <ProtectedRoute path="/crm/compliance" component={Compliance} />
        <ProtectedRoute path="/crm/endodontics" component={Endodontics} />
        <ProtectedRoute path="/crm/cases" component={Cases} />
        <ProtectedRoute path="/crm/execution" component={TreatmentExecution} />
        <ProtectedRoute path="/crm/knowledge" component={Knowledge} />
        <ProtectedRoute path="/crm/setup" component={Setup} />
        <Route>
          <Redirect to="/crm/dashboard" />
        </Route>
      </Switch>
    </CRMLayout>
  );
}

function AppRouter() {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={base}>
        <Switch>
          {/* Legacy /dashboard redirect → new CRM */}
          <Route path="/dashboard">
            <Redirect to="/crm/dashboard" />
          </Route>
          <Route path="/admin" component={AdminLogin} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/patient-portal" component={PatientPortal} />
          <Route path="/queue-display" component={QueueDisplay} />
          <Route path="/crm/:rest*">
            <RoleGuard>
              <CRMRoutes />
            </RoleGuard>
          </Route>
          <Route path="/" component={LandingApp} />
        </Switch>
      </WouterRouter>
    </QueryClientProvider>
  );
}

const rootElement = document.getElementById("root")!;
let root = (window as any).__reactRoot;
if (!root) {
  root = createRoot(rootElement);
  (window as any).__reactRoot = root;
}

root.render(
  <ErrorBoundary>
    <NotificationProvider>
      <AppointmentsProvider>
        <AppRouter />
      </AppointmentsProvider>
    </NotificationProvider>
  </ErrorBoundary>
);

// Register Service Worker for Offline clinical tracking
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[Service Worker] Registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[Service Worker] Registration failed:', err);
      });
  });
}

