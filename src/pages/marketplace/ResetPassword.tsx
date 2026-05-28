import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthShell, inputStyle, labelStyle, btnNeon } from "@/components/marketplace/AuthShell";

export default function ResetPassword() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pw, setPw] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    nav("/login");
  };

  return (
    <AuthShell title="Set a new password" subtitle="Enter your new password below.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div><label style={labelStyle}>New password</label><input type="password" style={inputStyle} required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <button type="submit" disabled={loading} style={{ ...btnNeon, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}
