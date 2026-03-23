import { Routes, Route } from "react-router-dom";
import { AdminShell } from "@/components/admin/AdminShell";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminClients from "@/components/admin/AdminClients";
import AdminTeam from "@/components/admin/AdminTeam";
import AdminMonitor from "@/components/admin/AdminMonitor";
import AdminAffiliatePayouts from "@/components/admin/AdminAffiliatePayouts";
import AdminSupport from "@/components/admin/AdminSupport";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminPlaceholder from "@/components/admin/AdminPlaceholder";

const Admin = () => (
  <AdminShell>
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="analytics" element={<AdminPlaceholder title="Analytics" description="Deep analytics and reporting" />} />
      <Route path="monitor" element={<AdminMonitor />} />
      <Route path="clients" element={<AdminClients />} />
      <Route path="trials" element={<AdminPlaceholder title="Active Trials" description="Users currently in trial period" />} />
      <Route path="subscriptions" element={<AdminPlaceholder title="Subscriptions" description="Active subscription management" />} />
      <Route path="churned" element={<AdminPlaceholder title="Churned Clients" description="Clients who cancelled" />} />
      <Route path="mrr" element={<AdminPlaceholder title="MRR Tracker" description="Monthly recurring revenue breakdown" />} />
      <Route path="payments" element={<AdminPlaceholder title="Payments" description="All payment transactions" />} />
      <Route path="refunds" element={<AdminPlaceholder title="Refunds" description="Refund management" />} />
      <Route path="affiliate-payouts" element={<AdminAffiliatePayouts />} />
      <Route path="workflows-monitor" element={<AdminPlaceholder title="Workflows Monitor" description="Active workflow execution monitor" />} />
      <Route path="integration-health" element={<AdminPlaceholder title="Integration Health" description="Status of all client integrations" />} />
      <Route path="api-logs" element={<AdminPlaceholder title="API Logs" description="Platform API request logs" />} />
      <Route path="webhook-logs" element={<AdminPlaceholder title="Webhook Logs" description="Inbound and outbound webhook events" />} />
      <Route path="support" element={<AdminSupport />} />
      <Route path="admin-messenger" element={<AdminPlaceholder title="Admin Messenger" description="Admin-view messenger for all clients" />} />
      <Route path="feature-requests" element={<AdminPlaceholder title="Feature Requests" description="Client feature requests" />} />
      <Route path="team" element={<AdminTeam />} />
      <Route path="roles" element={<AdminPlaceholder title="Roles & Permissions" description="Configure team roles and access levels" />} />
      <Route path="activity-logs" element={<AdminPlaceholder title="Activity Logs" description="Platform audit trail" />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="emails" element={<AdminPlaceholder title="Email Templates" description="Manage transactional email templates" />} />
      <Route path="pricing-config" element={<AdminPlaceholder title="Pricing Config" description="Edit plan prices and features" />} />
      <Route path="river-config" element={<AdminPlaceholder title="River AI Config" description="Configure River AI behavior and prompts" />} />
    </Routes>
  </AdminShell>
);

export default Admin;
