import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SiteFooter } from "@/components/layout/SiteFooter";

const NotFound = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="font-heading font-bold text-foreground-muted select-none" style={{ fontSize: "120px", letterSpacing: "-0.06em", lineHeight: 1 }}>
            404
          </p>
          <h1 className="text-foreground font-bold mt-4" style={{ fontSize: "20px" }}>
            This page doesn't exist.
          </h1>
          <p className="text-foreground-secondary mt-2" style={{ fontSize: "14px" }}>
            But River knows where everything is.
          </p>
          <div className="mt-6">
            <Link to={user ? "/dashboard" : "/"}>
              <Button>{user ? "Go to dashboard →" : "Go home →"}</Button>
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
};

export default NotFound;
