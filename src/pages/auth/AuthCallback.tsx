import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        const role = session.user.user_metadata?.role;
        if (role === "seller") navigate("/seller/dashboard", { replace: true });
        else if (role === "admin") navigate("/admin", { replace: true });
        else navigate("/buyer/dashboard", { replace: true });
      }
    });

    // Fallback: if no session arrives shortly, send to login
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) navigate("/login", { replace: true });
    }, 4000);

    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-foreground-muted">
      Verifying your account…
    </div>
  );
}
