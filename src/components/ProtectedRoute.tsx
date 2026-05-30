import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: AppRole[] }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  const isAdminOnly = roles?.length === 1 && roles[0] === "admin";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground-muted text-sm">
        Loading…
      </div>
    );
  }

  if (!user) {
    if (isAdminOnly) return <Navigate to="/admin/login" replace />;
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to={isAdminOnly ? "/admin/login" : "/"} replace />;
  }

  return <>{children}</>;
}
