import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  KxField,
  KxPassword,
  KxGoogleButton,
  KxDivider,
  KxSubmit,
  KxTrustBadges,
  KxAuthStyles,
} from "@/components/auth/KxAuthControls";

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "";
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    if (params.get("verified") === "1") {
      toast.success("Email verified! Please sign in.");
    }
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(form);
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", data.user!.id).maybeSingle();
    setLoading(false);
    if (redirect) return nav(redirect);
    const role = profile?.role || "client";
    nav(role === "admin" ? "/admin" : role === "seller" ? "/seller/dashboard" : "/buyer/dashboard");
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error("Google sign-in failed");
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Katexs account"
      footer={<>New here? <Link to="/signup">Join now</Link></>}
    >
      <KxAuthStyles />

      <KxGoogleButton onClick={handleGoogle} />

      <KxDivider />

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <KxField
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <div>
          <KxPassword
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            required
          />
          <div style={{ textAlign: "right", marginTop: 6 }}>
            <Link to="/forgot-password" style={{ fontSize: 12, color: "#888" }}>Forgot password?</Link>
          </div>
        </div>

        <KxSubmit loading={loading} tone="black">
          {loading ? "Signing in…" : "Sign in"}
        </KxSubmit>

        <KxTrustBadges />
      </form>
    </AuthLayout>
  );
}
