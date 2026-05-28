import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { lazy, Suspense } from "react";

// Loading fallback
const Loading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-3">
      <span className="font-heading font-[800] text-foreground" style={{ fontSize: "20px" }}>
        katexs<span style={{ color: "hsl(var(--accent-green))" }}>.</span>
      </span>
      <div className="flex items-center justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
        ))}
      </div>
    </div>
  </div>
);

// Lazy loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Features = lazy(() => import("./pages/Features"));
const IntegrationsOverview = lazy(() => import("./pages/IntegrationsOverview"));
const WeGrow = lazy(() => import("./pages/WeGrow"));
const Docs = lazy(() => import("./pages/Docs"));
const Signup = lazy(() => import("./pages/Signup"));
const ClientSignup = lazy(() => import("./pages/marketplace/ClientSignup"));
const ExpertSignup = lazy(() => import("./pages/marketplace/ExpertSignup"));
const MarketplaceLogin = lazy(() => import("./pages/marketplace/MarketplaceLogin"));
const ResetPassword = lazy(() => import("./pages/marketplace/ResetPassword"));
const ExpertPending = lazy(() => import("./pages/marketplace/ExpertPending"));
const DashboardClient = lazy(() => import("./pages/marketplace/DashboardClient"));
const DashboardExpert = lazy(() => import("./pages/marketplace/DashboardExpert"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const InboxPage = lazy(() => import("./pages/InboxPage"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Workflows = lazy(() => import("./pages/Workflows"));
const AIStudio = lazy(() => import("./pages/AIStudio"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Messenger = lazy(() => import("./pages/Messenger"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Admin = lazy(() => import("./pages/Admin"));
const Affiliates = lazy(() => import("./pages/Affiliates"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/integrations-overview" element={<IntegrationsOverview />} />
            <Route path="/wegrow" element={<WeGrow />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/affiliates" element={<Affiliates />} />

            {/* Protected routes (wrapped in AppShell) */}
            <Route path="/dashboard" element={<AppShell><Dashboard /></AppShell>} />
            <Route path="/inbox" element={<AppShell noPadding><InboxPage /></AppShell>} />
            <Route path="/contacts" element={<AppShell><Contacts /></AppShell>} />
            <Route path="/pipeline" element={<AppShell><Pipeline /></AppShell>} />
            <Route path="/workflows" element={<AppShell><Workflows /></AppShell>} />
            <Route path="/ai-studio" element={<AppShell><AIStudio /></AppShell>} />
            <Route path="/integrations" element={<AppShell><Integrations /></AppShell>} />
            <Route path="/messenger" element={<AppShell noPadding><Messenger /></AppShell>} />
            <Route path="/settings" element={<AppShell><SettingsPage /></AppShell>} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/affiliate-dashboard" element={<AppShell><AffiliateDashboard /></AppShell>} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
