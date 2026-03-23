import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";

import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import InboxPage from "./pages/InboxPage";
import Contacts from "./pages/Contacts";
import Pipeline from "./pages/Pipeline";
import Workflows from "./pages/Workflows";
import Integrations from "./pages/Integrations";
import Messenger from "./pages/Messenger";
import SettingsPage from "./pages/SettingsPage";
import Admin from "./pages/Admin";
import Affiliates from "./pages/Affiliates";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/affiliates" element={<Affiliates />} />

          {/* Protected routes (wrapped in AppShell) */}
          <Route path="/dashboard" element={<AppShell><Dashboard /></AppShell>} />
          <Route path="/inbox" element={<AppShell noPadding><InboxPage /></AppShell>} />
          <Route path="/contacts" element={<AppShell><Contacts /></AppShell>} />
          <Route path="/pipeline" element={<AppShell><Pipeline /></AppShell>} />
          <Route path="/workflows" element={<AppShell><Workflows /></AppShell>} />
          <Route path="/integrations" element={<AppShell><Integrations /></AppShell>} />
          <Route path="/messenger" element={<AppShell><Messenger /></AppShell>} />
          <Route path="/settings" element={<AppShell><SettingsPage /></AppShell>} />
          <Route path="/admin" element={<AppShell><Admin /></AppShell>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
