import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setAdminRole(null);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(true);
        setAdminRole(data.role);
      } else {
        setIsAdmin(false);
        setAdminRole(null);
      }
      setLoading(false);
    };

    checkAdmin();
  }, [user, authLoading]);

  return { isAdmin, adminRole, loading, user };
}
