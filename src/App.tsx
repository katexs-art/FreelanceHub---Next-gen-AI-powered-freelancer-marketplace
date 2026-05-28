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
            <Route path="/become-a-seller" element={<Placeholder title="Become a seller" />} />

            {/* Buyer */}
            <Route path="/buyer/dashboard" element={<ProtectedRoute roles={["client","admin"]}><Placeholder title="Buyer dashboard" /></ProtectedRoute>} />
            <Route path="/buyer/orders" element={<ProtectedRoute roles={["client","admin"]}><Placeholder title="My orders" /></ProtectedRoute>} />

            {/* Seller */}
            <Route path="/seller/dashboard" element={<ProtectedRoute roles={["seller","admin"]}><Placeholder title="Seller dashboard" /></ProtectedRoute>} />
            <Route path="/seller/gigs" element={<ProtectedRoute roles={["seller","admin"]}><Placeholder title="My gigs" /></ProtectedRoute>} />
            <Route path="/seller/gigs/new" element={<ProtectedRoute roles={["seller","admin"]}><Placeholder title="Create a gig" /></ProtectedRoute>} />
            <Route path="/seller/orders" element={<ProtectedRoute roles={["seller","admin"]}><Placeholder title="Active orders" /></ProtectedRoute>} />
            <Route path="/seller/earnings" element={<ProtectedRoute roles={["seller","admin"]}><Placeholder title="Earnings & withdrawals" /></ProtectedRoute>} />

            {/* Shared (any signed-in user) */}
            <Route path="/orders/:id" element={<ProtectedRoute><Placeholder title="Order workspace" /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Placeholder title="Inbox" /></ProtectedRoute>} />
            <Route path="/inbox/:conversationId" element={<ProtectedRoute><Placeholder title="Conversation" /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Placeholder title="Account settings" /></ProtectedRoute>} />

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
