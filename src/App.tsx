import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center text-sm text-foreground-muted">Loading…</div>
);

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Placeholder = lazy(() => import("./pages/Placeholder"));
const DashboardPlaceholder = lazy(() => import("./pages/DashboardPlaceholder"));
const BecomeSeller = lazy(() => import("./pages/BecomeSeller"));
const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const MyGigs = lazy(() => import("./pages/seller/MyGigs"));
const GigEditor = lazy(() => import("./pages/seller/GigEditor"));
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

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Public marketplace (placeholders, built in next phase) */}
            <Route path="/explore" element={<Placeholder title="Explore categories" />} />
            <Route path="/search" element={<Placeholder title="Search results" />} />
            <Route path="/gig/:slug" element={<Placeholder title="Gig detail" />} />
            <Route path="/u/:username" element={<Placeholder title="Seller profile" />} />
            <Route path="/become-a-seller" element={<BecomeSeller />} />

            {/* Buyer */}
            <Route path="/buyer/dashboard" element={<ProtectedRoute roles={["client","admin"]}><DashboardPlaceholder title="Buyer dashboard" /></ProtectedRoute>} />
            <Route path="/buyer/orders" element={<ProtectedRoute roles={["client","admin"]}><DashboardPlaceholder title="My orders" /></ProtectedRoute>} />

            {/* Seller */}
            <Route path="/seller/dashboard" element={<ProtectedRoute roles={["seller","admin"]}><SellerDashboard /></ProtectedRoute>} />
            <Route path="/seller/gigs" element={<ProtectedRoute roles={["seller","admin"]}><MyGigs /></ProtectedRoute>} />
            <Route path="/seller/gigs/new" element={<ProtectedRoute roles={["seller","admin"]}><GigEditor /></ProtectedRoute>} />
            <Route path="/seller/gigs/:id/edit" element={<ProtectedRoute roles={["seller","admin"]}><GigEditor /></ProtectedRoute>} />
            <Route path="/seller/orders" element={<ProtectedRoute roles={["seller","admin"]}><DashboardPlaceholder title="Active orders" /></ProtectedRoute>} />
            <Route path="/seller/earnings" element={<ProtectedRoute roles={["seller","admin"]}><DashboardPlaceholder title="Earnings & withdrawals" /></ProtectedRoute>} />

            {/* Shared (any signed-in user) */}
            <Route path="/orders/:id" element={<ProtectedRoute><DashboardPlaceholder title="Order workspace" /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><DashboardPlaceholder title="Inbox" /></ProtectedRoute>} />
            <Route path="/inbox/:conversationId" element={<ProtectedRoute><DashboardPlaceholder title="Conversation" /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><DashboardPlaceholder title="Account settings" /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><Placeholder title="Admin dashboard" /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
