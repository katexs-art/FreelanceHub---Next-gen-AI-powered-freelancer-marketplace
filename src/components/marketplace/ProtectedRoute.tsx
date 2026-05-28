import { Navigate } from "react-router-dom";
import { useMarketplaceAuth, type MarketplaceRole } from "@/hooks/useMarketplaceAuth";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: MarketplaceRole[];
}) {
  const { user, profile, loading } = useMarketplaceAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
