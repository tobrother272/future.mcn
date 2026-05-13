import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AdminRoute, DefaultRedirect } from "./AdminRoute";
import { PartnerRoute } from "./PartnerRoute";
import { RoleGuard } from "./RoleGuard";
import { PortalLayout } from "@/components/layout/PortalLayout";

// Lazy-loaded pages
const AuthPage         = lazy(() => import("@/features/auth/pages/AuthPage"));
const DashboardPage    = lazy(() => import("@/features/analytics/pages/DashboardPage"));
const CmsListPage      = lazy(() => import("@/features/cms/pages/CmsListPage"));
const CmsDetailPage    = lazy(() => import("@/features/cms/pages/CmsDetailPage"));
const CmsHistoryPage   = lazy(() => import("@/features/cms/pages/CmsHistoryPage"));
const ChannelListPage  = lazy(() => import("@/features/channels/pages/ChannelListPage"));
const ChannelDetailPage = lazy(() => import("@/features/channels/pages/ChannelDetailPage"));
const PartnerWorkflowPage = lazy(() => import("@/features/partners/pages/PartnerWorkflowPage"));
const PartnerDetailPage   = lazy(() => import("@/features/partners/pages/PartnerDetailPage"));
const EmployeesPage       = lazy(() => import("@/features/employees/pages/EmployeesPage"));
const ContractListPage = lazy(() => import("@/features/contracts/pages/ContractListPage"));
const PoliciesPage     = lazy(() => import("@/features/policies/pages/PoliciesPage"));
const RevenueDashboard = lazy(() => import("@/features/revenue/pages/RevenueDashboardPage"));
const CompliancePage   = lazy(() => import("@/features/compliance/pages/CompliancePage"));
const QcQueuePage      = lazy(() => import("@/features/workflow/pages/QcQueuePage"));
const ProvisioningQueuePage = lazy(() => import("@/features/workflow/pages/ProvisioningQueuePage"));
const AiAgentPage      = lazy(() => import("@/features/ai/pages/AiAgentPage"));
const AiStrategyPage   = lazy(() => import("@/features/ai/pages/AiStrategyPage"));
const SettingsPage     = lazy(() => import("@/features/settings/pages/SettingsPage"));
const ImportPage       = lazy(() => import("@/features/import/pages/ImportPage"));
const InboxPage        = lazy(() => import("@/features/inbox/pages/InboxPage"));
const RbacAuditPage    = lazy(() => import("@/features/rbac/pages/RbacAuditPage"));
// Partner Portal
const PortalHomePage          = lazy(() => import("@/features/partner-portal/pages/PortalHomePage"));
const PortalChannelsPage      = lazy(() => import("@/features/partner-portal/pages/PortalChannelsPage"));
const PortalChannelDetailPage = lazy(() => import("@/features/partner-portal/pages/PortalChannelDetailPage"));
const PortalSubmitPage    = lazy(() => import("@/features/partner-portal/pages/PortalSubmitPage"));
const PortalContractsPage = lazy(() => import("@/features/partner-portal/pages/PortalContractsPage"));
const PortalAlertsPage    = lazy(() => import("@/features/partner-portal/pages/PortalAlertsPage"));
const PortalPolicyPage    = lazy(() => import("@/features/partner-portal/pages/PortalPolicyPage"));
const PortalProfilePage   = lazy(() => import("@/features/partner-portal/pages/PortalProfilePage"));
const PortalSubAccountsPage = lazy(() => import("@/features/partner-portal/pages/PortalSubAccountsPage"));

const Loading = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
    <span>Loading…</span>
  </div>
);

export const router = createBrowserRouter([
  { path: "/login", element: <Suspense fallback={<Loading />}><AuthPage /></Suspense> },

  // ── Admin / Internal routes ──────────────────────────────
  {
    path: "/",
    element: <ProtectedRoute><AdminRoute /></ProtectedRoute>,
    children: [
      { index: true, element: <RoleGuard><DefaultRedirect /></RoleGuard> },
      { path: "dashboard",              element: <RoleGuard><Suspense fallback={<Loading />}><DashboardPage /></Suspense></RoleGuard> },
      { path: "cms",                    element: <RoleGuard><Suspense fallback={<Loading />}><CmsListPage /></Suspense></RoleGuard> },
      { path: "cms/:id",               element: <RoleGuard><Suspense fallback={<Loading />}><CmsDetailPage /></Suspense></RoleGuard> },
      { path: "cms/:id/history",       element: <RoleGuard><Suspense fallback={<Loading />}><CmsHistoryPage /></Suspense></RoleGuard> },
      { path: "channels",              element: <RoleGuard><Suspense fallback={<Loading />}><ChannelListPage /></Suspense></RoleGuard> },
      { path: "channels/:id",          element: <RoleGuard><Suspense fallback={<Loading />}><ChannelDetailPage /></Suspense></RoleGuard> },
      { path: "partners",              element: <RoleGuard><Suspense fallback={<Loading />}><PartnerWorkflowPage /></Suspense></RoleGuard> },
      { path: "partners/:id",          element: <RoleGuard><Suspense fallback={<Loading />}><PartnerDetailPage /></Suspense></RoleGuard> },
      { path: "employees",             element: <RoleGuard><Suspense fallback={<Loading />}><EmployeesPage /></Suspense></RoleGuard> },
      { path: "contracts",             element: <RoleGuard><Suspense fallback={<Loading />}><ContractListPage /></Suspense></RoleGuard> },
      { path: "policies",              element: <RoleGuard><Suspense fallback={<Loading />}><PoliciesPage /></Suspense></RoleGuard> },
      { path: "revenue",               element: <RoleGuard><Suspense fallback={<Loading />}><RevenueDashboard /></Suspense></RoleGuard> },
      { path: "compliance",            element: <RoleGuard><Suspense fallback={<Loading />}><CompliancePage /></Suspense></RoleGuard> },
      { path: "workflow/qc",           element: <RoleGuard><Suspense fallback={<Loading />}><QcQueuePage /></Suspense></RoleGuard> },
      { path: "workflow/provisioning", element: <RoleGuard><Suspense fallback={<Loading />}><ProvisioningQueuePage /></Suspense></RoleGuard> },
      { path: "ai",                    element: <RoleGuard><Suspense fallback={<Loading />}><AiAgentPage /></Suspense></RoleGuard> },
      { path: "ai/strategy",           element: <RoleGuard><Suspense fallback={<Loading />}><AiStrategyPage /></Suspense></RoleGuard> },
      { path: "settings",              element: <RoleGuard><Suspense fallback={<Loading />}><SettingsPage /></Suspense></RoleGuard> },
      { path: "import",                element: <RoleGuard><Suspense fallback={<Loading />}><ImportPage /></Suspense></RoleGuard> },
      { path: "inbox",                 element: <RoleGuard><Suspense fallback={<Loading />}><InboxPage /></Suspense></RoleGuard> },
      { path: "rbac",                  element: <RoleGuard><Suspense fallback={<Loading />}><RbacAuditPage /></Suspense></RoleGuard> },
    ],
  },

  // ── Partner Portal routes ────────────────────────────────
  {
    path: "/portal",
    element: <ProtectedRoute><PartnerRoute /></ProtectedRoute>,
    children: [
      {
        element: <PortalLayout />,
        children: [
          { index: true, element: <Navigate to="/portal/home" replace /> },
          { path: "home",          element: <Suspense fallback={<Loading />}><PortalHomePage /></Suspense> },
          { path: "channels",      element: <Suspense fallback={<Loading />}><PortalChannelsPage /></Suspense> },
          { path: "channels/:id",  element: <Suspense fallback={<Loading />}><PortalChannelDetailPage /></Suspense> },
          { path: "submit",    element: <Suspense fallback={<Loading />}><PortalSubmitPage /></Suspense> },
          { path: "contracts", element: <Suspense fallback={<Loading />}><PortalContractsPage /></Suspense> },
          { path: "alerts",    element: <Suspense fallback={<Loading />}><PortalAlertsPage /></Suspense> },
          { path: "policy",    element: <Suspense fallback={<Loading />}><PortalPolicyPage /></Suspense> },
          { path: "profile",   element: <Suspense fallback={<Loading />}><PortalProfilePage /></Suspense> },
          { path: "sub-accounts", element: <Suspense fallback={<Loading />}><PortalSubAccountsPage /></Suspense> },
        ],
      },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);
