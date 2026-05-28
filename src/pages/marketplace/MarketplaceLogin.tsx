import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthShell, inputStyle, labelStyle, btnNeon, btnOutline } from "@/components/marketplace/AuthShell";

export default function MarketplaceLogin() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword(form);
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    // Fetch profile to route by role
    const { data: profile } = await supabase
      .from("profiles" as any)
      .select("role")
      .eq("id", data.user!.id)
      .maybeSingle();
    setLoading(false);
    const role = (profile as any)?.role || "client";
    if (role === "admin") nav("/admin");
    else if (role === "expert") nav("/dashboard/expert");
    else nav("/dashboard/client");
  };

  const forgot = async () => {
    if (!form.email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Reset email sent");
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back to Katexs."
      footer={<>Don't have an account? <Link to="/signup/client" style={{ color: "#caff00" }}>Join free</Link></>}
    >
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" style={inputStyle} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="button" onClick={forgot} style={{ background: "none", border: "none", color: "#888", fontSize: 12, padding: 0, marginTop: 6, cursor: "pointer", fontFamily: "inherit" }}>
            Forgot password?
          </button>
        </div>
        <button type="submit" disabled={loading} style={{ ...btnNeon, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Signing in…" : "Log in"}
        </button>
        <div style={{ textAlign: "center", color: "#444", fontSize: 11, margin: "4px 0" }}>OR</div>
        <Link to="/signup/expert" style={{ ...btnOutline, textAlign: "center", textDecoration: "none", display: "block" }}>
          Apply as an expert
        </Link>
      </form>
    </AuthShell>
  );
}
