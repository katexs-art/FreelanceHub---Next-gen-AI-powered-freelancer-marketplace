import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Skeleton } from "@/components/ui/skeleton";

import { lazy, Suspense } from "react";

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center p-6">
    <div className="w-full max-w-md space-y-3">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  </div>
);

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/auth/AuthCallback"));
const Placeholder = lazy(() => import("./pages/Placeholder"));
const DashboardPlaceholder = lazy(() => import("./pages/DashboardPlaceholder"));

const SellerOnboarding = lazy(() => import("./pages/SellerOnboarding"));
const SellerDashboard = lazy(() => import("./pages/seller/SellerDashboard"));
const MyGigs = lazy(() => import("./pages/seller/MyGigs"));
const GigEditor = lazy(() => import("./pages/seller/GigEditor"));
const Explore = lazy(() => import("./pages/Explore"));
function BrowseRedirect() {
  const loc = useLocation();
  return <Navigate to={`/services${loc.search}${loc.hash}`} replace />;
}
const Services = lazy(() => import("./pages/Services"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Search = lazy(() => import("./pages/Search"));
const FindExperts = lazy(() => import("./pages/FindExperts"));

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
const OrderConfirmed = lazy(() => import("./pages/orders/OrderConfirmed"));
const LeaveReviewPage = lazy(() => import("./pages/orders/LeaveReviewPage"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Earnings = lazy(() => import("./pages/seller/Earnings"));
const Admin = lazy(() => import("./pages/admin/Admin"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));

const RiverOps = lazy(() => import("./pages/admin/RiverOps"));
const NotificationPreferences = lazy(() => import("./pages/account/NotificationPreferences"));
const Saved = lazy(() => import("./pages/account/Saved"));
const Verification = lazy(() => import("./pages/seller/Verification"));
const BuyerDashboard = lazy(() => import("./pages/buyer/BuyerDashboard"));
const Settings = lazy(() => import("./pages/account/Settings"));
const SellerAnalytics = lazy(() => import("./pages/seller/SellerAnalytics"));
const NotFound = lazy(() => import("./pages/NotFound"));
const RiverWidget = lazy(() => import("./components/layout/RiverWidget"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/sign-in" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/sign-up" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Public marketplace */}
            <Route path="/explore" element={<Explore />} />
            <Route path="/browse" element={<BrowseRedirect />} />
            <Route path="/services" element={<Services />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/search" element={<Search />} />
            <Route path="/find-experts" element={<FindExperts />} />
            
            <Route path="/pitch/:buyer_search_id" element={<ProtectedRoute><Pitch /></ProtectedRoute>} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/post-job" element={<ProtectedRoute roles={["client","admin"]}><PostJob /></ProtectedRoute>} />
            <Route path="/projects/:project_id/bid" element={<ProtectedRoute roles={["seller","admin"]}><PlaceBid /></ProtectedRoute>} />
            <Route path="/projects/:project_id/bids" element={<ProtectedRoute><ProjectBids /></ProtectedRoute>} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/gig/:slug" element={<GigDetail />} />
            <Route path="/u/:username" element={<SellerProfile />} />
            <Route path="/seller/:username" element={<SellerIntelligenceProfile />} />
            
            <Route path="/seller-onboarding" element={<ProtectedRoute><SellerOnboarding /></ProtectedRoute>} />

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
            <Route path="/orders/:order_id/confirmed" element={<ProtectedRoute><OrderConfirmed /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderWorkspace /></ProtectedRoute>} />
            <Route path="/orders/:order_id/review" element={<ProtectedRoute><LeaveReviewPage /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="/inbox/:conversationId" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute><NotificationPreferences /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/river-ops" element={<ProtectedRoute roles={["admin"]}><RiverOps /></ProtectedRoute>} />
            
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><Admin /></ProtectedRoute>} />
            <Route path="/admin/:section" element={<ProtectedRoute roles={["admin"]}><Admin /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Suspense fallback={null}>
          <RiverWidget />
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
