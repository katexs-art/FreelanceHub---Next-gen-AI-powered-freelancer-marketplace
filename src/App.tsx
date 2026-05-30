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
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const Placeholder = lazy(() => import("./pages/Placeholder"));
const DashboardPlaceholder = lazy(() => import("./pages/DashboardPlaceholder"));
const BecomeSeller = lazy(() => import("./pages/BecomeSeller"));
const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const MyGigs = lazy(() => import("./pages/seller/MyGigs"));
const GigEditor = lazy(() => import("./pages/seller/GigEditor"));
const Explore = lazy(() => import("./pages/Explore"));
const Search = lazy(() => import("./pages/Search"));
const RiverResults = lazy(() => import("./pages/RiverResults"));
const Pitch = lazy(() => import("./pages/Pitch"));
const PostJob = lazy(() => import("./pages/PostJob"));
const Projects = lazy(() => import("./pages/Projects"));
const PlaceBid = lazy(() => import("./pages/PlaceBid"));
const ProjectBids = lazy(() => import("./pages/ProjectBids"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const GigDetail = lazy(() => import("./pages/GigDetail"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const SellerIntelligenceProfile = lazy(() => import("./pages/SellerIntelligenceProfile"));
const CheckoutSuccess = lazy(() => import("./pages/orders/CheckoutSuccess"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrdersList = lazy(() => import("./pages/orders/OrdersList"));
const OrderWorkspace = lazy(() => import("./pages/orders/OrderWorkspace"));
const LeaveReviewPage = lazy(() => import("./pages/orders/LeaveReviewPage"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Earnings = lazy(() => import("./pages/seller/Earnings"));
const Admin = lazy(() => import("./pages/admin/Admin"));
const NotificationPreferences = lazy(() => import("./pages/account/NotificationPreferences"));
const Saved = lazy(() => import("./pages/account/Saved"));
const Verification = lazy(() => import("./pages/seller/Verification"));
const BuyerDashboard = lazy(() => import("./pages/buyer/BuyerDashboard"));
const Settings = lazy(() => import("./pages/account/Settings"));
const SellerAnalytics = lazy(() => import("./pages/seller/SellerAnalytics"));
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
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Public marketplace */}
            <Route path="/explore" element={<Explore />} />
            <Route path="/browse" element={<Explore />} />
            <Route path="/search" element={<Search />} />
            <Route path="/river-results" element={<RiverResults />} />
            <Route path="/pitch/:buyer_search_id" element={<ProtectedRoute><Pitch /></ProtectedRoute>} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/post-job" element={<ProtectedRoute roles={["client","admin"]}><PostJob /></ProtectedRoute>} />
            <Route path="/projects/:project_id/bid" element={<ProtectedRoute><PlaceBid /></ProtectedRoute>} />
            <Route path="/projects/:project_id/bids" element={<ProtectedRoute><ProjectBids /></ProtectedRoute>} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/gig/:slug" element={<GigDetail />} />
            <Route path="/u/:username" element={<SellerProfile />} />
            <Route path="/seller/:username" element={<SellerIntelligenceProfile />} />
            <Route path="/become-a-seller" element={<BecomeSeller />} />

            {/* Buyer */}
            <Route path="/buyer/dashboard" element={<ProtectedRoute roles={["client","admin"]}><BuyerDashboard /></ProtectedRoute>} />
            <Route path="/buyer/orders" element={<ProtectedRoute roles={["client","seller","admin"]}><OrdersList as="buyer" /></ProtectedRoute>} />

            {/* Seller */}
            <Route path="/seller/dashboard" element={<ProtectedRoute roles={["seller","admin"]}><SellerDashboard /></ProtectedRoute>} />
            <Route path="/seller/gigs" element={<ProtectedRoute roles={["seller","admin"]}><MyGigs /></ProtectedRoute>} />
            <Route path="/seller/gigs/new" element={<ProtectedRoute roles={["seller","admin"]}><GigEditor /></ProtectedRoute>} />
            <Route path="/seller/gigs/:id/edit" element={<ProtectedRoute roles={["seller","admin"]}><GigEditor /></ProtectedRoute>} />
            <Route path="/seller/orders" element={<ProtectedRoute roles={["seller","admin"]}><OrdersList as="seller" /></ProtectedRoute>} />
            <Route path="/seller/earnings" element={<ProtectedRoute roles={["seller","admin"]}><Earnings /></ProtectedRoute>} />
            <Route path="/seller/analytics" element={<ProtectedRoute roles={["seller","admin"]}><SellerAnalytics /></ProtectedRoute>} />
            <Route path="/seller/verification" element={<ProtectedRoute roles={["seller","admin"]}><Verification /></ProtectedRoute>} />
            <Route path="/saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />

            {/* Shared (any signed-in user) */}
            <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />
            <Route path="/checkout/:order_id" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderWorkspace /></ProtectedRoute>} />
            <Route path="/orders/:order_id/review" element={<ProtectedRoute><LeaveReviewPage /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="/inbox/:conversationId" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><Admin /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
