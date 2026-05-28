import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthShell, inputStyle, labelStyle, btnNeon } from "@/components/marketplace/AuthShell";

const INDUSTRIES = ["HVAC", "Dental", "Med Spa", "Law Firm", "Real Estate", "Roofing", "Contractors", "Gym", "Salon", "Agency", "Other"];

export default function ClientSignup() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    business_name: "",
    industry: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard/client`,
        data: {
          full_name: form.full_name,
          role: "client",
          business_name: form.business_name || null,
          industry: form.industry || null,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Check your email to verify.");
    nav("/dashboard/client");
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Hire verified AI and GHL experts."
      footer={<>Already have an account? <Link to="/login" style={{ color: "#caff00" }}>Log in</Link></>}
    >
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Full name</label>
          <input style={inputStyle} required value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" style={inputStyle} required value={form.email} onChange={(e) => update("email", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" style={inputStyle} required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Business name (optional)</label>
          <input style={inputStyle} value={form.business_name} onChange={(e) => update("business_name", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Industry</label>
          <select style={inputStyle} value={form.industry} onChange={(e) => update("industry", e.target.value)}>
            <option value="">Select…</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <button type="submit" disabled={loading} style={{ ...btnNeon, opacity: loading ? 0.6 : 1, marginTop: 8 }}>
          {loading ? "Creating…" : "Create my account"}
        </button>
        <p style={{ fontSize: 12, color: "#666", textAlign: "center" }}>
          Are you an expert? <Link to="/signup/expert" style={{ color: "#caff00" }}>Apply here</Link>
        </p>
      </form>
    </AuthShell>
  );
}
