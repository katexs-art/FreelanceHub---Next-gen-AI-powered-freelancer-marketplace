import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/marketplace/ProtectedRoute";
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
const ClientSignup = lazy(() => import("./pages/marketplace/ClientSignup"));
const ExpertSignup = lazy(() => import("./pages/marketplace/ExpertSignup"));
const MarketplaceLogin = lazy(() => import("./pages/marketplace/MarketplaceLogin"));
const ResetPassword = lazy(() => import("./pages/marketplace/ResetPassword"));
const ExpertPending = lazy(() => import("./pages/marketplace/ExpertPending"));
const DashboardClient = lazy(() => import("./pages/marketplace/DashboardClient"));
const DashboardExpert = lazy(() => import("./pages/marketplace/DashboardExpert"));
const Browse = lazy(() => import("./pages/marketplace/Browse"));
const ExpertProfile = lazy(() => import("./pages/marketplace/ExpertProfile"));
const CategoryPage = lazy(() => import("./pages/marketplace/CategoryPage"));
const ProjectDetail = lazy(() => import("./pages/marketplace/ProjectDetail"));
const CheckoutSuccess = lazy(() => import("./pages/marketplace/CheckoutSuccess"));
const MarketplaceAdmin = lazy(() => import("./pages/marketplace/AdminDashboard"));
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
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<ClientSignup />} />
            <Route path="/signup/client" element={<ClientSignup />} />
            <Route path="/signup/expert" element={<ExpertSignup />} />
            <Route path="/login" element={<MarketplaceLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/expert/pending" element={<ExpertPending />} />
            <Route path="/dashboard/client" element={<ProtectedRoute roles={["client","admin"]}><DashboardClient /></ProtectedRoute>} />
            <Route path="/dashboard/expert" element={<ProtectedRoute roles={["expert","admin"]}><DashboardExpert /></ProtectedRoute>} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/expert/:id" element={<ExpertProfile />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/project/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />
            <Route path="/marketplace/admin" element={<ProtectedRoute><MarketplaceAdmin /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
