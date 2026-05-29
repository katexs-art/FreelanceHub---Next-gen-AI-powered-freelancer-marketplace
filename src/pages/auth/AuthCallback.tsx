import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      // Sign out any session created by the verification link so the user must log in.
      await supabase.auth.signOut().catch(() => {});
      navigate("/login?verified=1", { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-foreground-muted">
      Verifying your account…
    </div>
  );
}
