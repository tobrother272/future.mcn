import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AdminRoute } from "./AdminRoute";
import { PartnerRoute } from "./PartnerRoute";
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
const PortalHomePage      = lazy(() => import("@/features/partner-portal/pages/PortalHomePage"));
const PortalChannelsPage  = lazy(() => import("@/features/partner-portal/pages/PortalChannelsPage"));
const PortalSubmitPage    = lazy(() => import("@/features/partner-portal/pages/PortalSubmitPage"));
const PortalContractsPage = lazy(() => import("@/features/partner-portal/pages/PortalContractsPage"));
const PortalAlertsPage    = lazy(() => import("@/features/partner-portal/pages/PortalAlertsPage"));
const PortalPolicyPage    = lazy(() => import("@/features/partner-portal/pages/PortalPolicyPage"));
const PortalProfilePage   = lazy(() => import("@/features/partner-portal/pages/PortalProfilePage"));

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
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <Suspense fallback={<Loading />}><DashboardPage /></Suspense> },
      { path: "cms", element: <Suspense fallback={<Loading />}><CmsListPage /></Suspense> },
      { path: "cms/:id", element: <Suspense fallback={<Loading />}><CmsDetailPage /></Suspense> },
      { path: "cms/:id/history", element: <Suspense fallback={<Loading />}><CmsHistoryPage /></Suspense> },
      { path: "channels", element: <Suspense fallback={<Loading />}><ChannelListPage /></Suspense> },
      { path: "channels/:id", element: <Suspense fallback={<Loading />}><ChannelDetailPage /></Suspense> },
      { path: "partners", element: <Suspense fallback={<Loading />}><PartnerWorkflowPage /></Suspense> },
      { path: "partners/:id", element: <Suspense fallback={<Loading />}><PartnerDetailPage /></Suspense> },
      { path: "employees", element: <Suspense fallback={<Loading />}><EmployeesPage /></Suspense> },
      { path: "contracts", element: <Suspense fallback={<Loading />}><ContractListPage /></Suspense> },
      { path: "policies",  element: <Suspense fallback={<Loading />}><PoliciesPage /></Suspense> },
      { path: "revenue", element: <Suspense fallback={<Loading />}><RevenueDashboard /></Suspense> },
      { path: "compliance", element: <Suspense fallback={<Loading />}><CompliancePage /></Suspense> },
      { path: "workflow/qc", element: <Suspense fallback={<Loading />}><QcQueuePage /></Suspense> },
      { path: "workflow/provisioning", element: <Suspense fallback={<Loading />}><ProvisioningQueuePage /></Suspense> },
      { path: "ai", element: <Suspense fallback={<Loading />}><AiAgentPage /></Suspense> },
      { path: "ai/strategy", element: <Suspense fallback={<Loading />}><AiStrategyPage /></Suspense> },
      { path: "settings", element: <Suspense fallback={<Loading />}><SettingsPage /></Suspense> },
      { path: "import", element: <Suspense fallback={<Loading />}><ImportPage /></Suspense> },
      { path: "inbox", element: <Suspense fallback={<Loading />}><InboxPage /></Suspense> },
      { path: "rbac", element: <Suspense fallback={<Loading />}><RbacAuditPage /></Suspense> },
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
          { path: "home",      element: <Suspense fallback={<Loading />}><PortalHomePage /></Suspense> },
          { path: "channels",  element: <Suspense fallback={<Loading />}><PortalChannelsPage /></Suspense> },
          { path: "submit",    element: <Suspense fallback={<Loading />}><PortalSubmitPage /></Suspense> },
          { path: "contracts", element: <Suspense fallback={<Loading />}><PortalContractsPage /></Suspense> },
          { path: "alerts",    element: <Suspense fallback={<Loading />}><PortalAlertsPage /></Suspense> },
          { path: "policy",    element: <Suspense fallback={<Loading />}><PortalPolicyPage /></Suspense> },
          { path: "profile",   element: <Suspense fallback={<Loading />}><PortalProfilePage /></Suspense> },
        ],
      },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);
