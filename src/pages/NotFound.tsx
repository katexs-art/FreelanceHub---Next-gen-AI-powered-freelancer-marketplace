import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Home, Search, FileText } from "lucide-react";

const NotFound = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-lg">
          <p
            className="font-heading font-bold text-foreground-muted select-none"
            style={{ fontSize: "120px", letterSpacing: "-0.06em", lineHeight: 1 }}
          >
            404
          </p>
          <h1 className="text-foreground font-bold mt-4" style={{ fontSize: "22px" }}>
            This page doesn't exist.
          </h1>
          <p className="text-foreground-muted mt-2" style={{ fontSize: "14px" }}>
            But River knows where everything is. Try one of these instead:
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/"
              className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-border hover:border-foreground/30 hover:bg-[#F7F7F7] transition-colors"
            >
              <Home className="h-5 w-5 text-foreground-muted" />
              <span className="text-sm font-medium">Homepage</span>
            </Link>
            <Link
              to="/services"
              className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-border hover:border-foreground/30 hover:bg-[#F7F7F7] transition-colors"
            >
              <Search className="h-5 w-5 text-foreground-muted" />
              <span className="text-sm font-medium">Find Experts</span>
            </Link>
            <Link
              to="/post-job"
              className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-border hover:border-foreground/30 hover:bg-[#F7F7F7] transition-colors"
            >
              <FileText className="h-5 w-5 text-foreground-muted" />
              <span className="text-sm font-medium">Post a Project</span>
            </Link>
          </div>

          <div className="mt-8">
            <Link to={user ? "/buyer/dashboard" : "/"}>
              <Button className="rounded-full px-6">
                {user ? "Go to dashboard →" : "Go home →"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
};

export default NotFound;
