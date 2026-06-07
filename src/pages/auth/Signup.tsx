import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

type Role = "client" | "seller";

export default function Signup() {
  const nav = useNavigate();
  const [role, setRole] = useState<Role>("client");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    username: "",
    country: "",
  });
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");

  const sendSignupVerification = (email: string) =>
    supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: "https://katexs.com/services" },
    });

  useEffect(() => {
    if (role !== "seller" || !form.username) {
      setUsernameStatus("idle");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(form.username)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles").select("id").eq("username", form.username).maybeSingle();
      setUsernameStatus(data ? "taken" : "ok");
    }, 350);
    return () => clearTimeout(t);
  }, [form.username, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (role === "seller" && usernameStatus !== "ok") {
      const m = "Pick a valid, available username";
      setErrorMsg(m);
      return toast.error(m);
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: "https://katexs.com/services",
        data: {
          full_name: form.full_name,
          role,
          username: role === "seller" ? form.username : null,
          country: form.country || null,
        },
      },
    });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      toast.error(error.message);
      return;
    }
    // Supabase returns a user with empty `identities` when the email is already registered
    // (anti-enumeration: no error, no email re-sent). Detect and tell the user clearly.
    const identities = (data?.user as { identities?: unknown[] } | null)?.identities;
    if (data?.user && Array.isArray(identities) && identities.length === 0) {
      const { error: resendError } = await sendSignupVerification(form.email);
      if (!resendError) {
        setSuccessEmail(form.email);
        toast.success("Verification email sent again");
        return;
      }

      setErrorMsg(
        `An account with ${form.email} already exists. Try signing in, or reset your password if you've forgotten it.`,
      );
      return;
    }
    setSuccessEmail(form.email);
    toast.success("Check your email to confirm your account");
  };

  const handleResendVerification = async () => {
    if (!successEmail) return;
    setResendLoading(true);
    const { error } = await sendSignupVerification(successEmail);
    setResendLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Verification email sent again");
  };


  const handleGoogle = async () => {
    sessionStorage.setItem("pending_role", role);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error("Google sign-in failed");
  };

  const submitTone = role === "seller" ? "green" : "black";

  if (successEmail) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="One quick step to activate your account"
        footer={<>Already verified? <Link to="/login">Sign in</Link></>}
      >
        <KxAuthStyles />
        <div
          style={{
            background: "#F0FDF4",
            border: "1px solid #16A34A",
            borderRadius: 12,
            padding: 20,
            color: "#0a0a0a",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          Check your email at <strong>{successEmail}</strong> — click the link to verify your account.
        </div>
        <button
          type="button"
          onClick={handleResendVerification}
          disabled={resendLoading}
          className="kx-submit-btn kx-submit-black"
          style={{ marginTop: 18 }}
        >
          {resendLoading ? "Sending…" : "Resend verification email"}
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join 2,400+ experts and partners on Katexs"
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <KxAuthStyles />



      <div className="kx-toggle">
        <button
          type="button"
          onClick={() => setRole("client")}
          className={role === "client" ? "on-black" : ""}
        >
          I'm a Partner
        </button>
        <button
          type="button"
          onClick={() => setRole("seller")}
          className={role === "seller" ? "on-green" : ""}
        >
          I'm an Expert
        </button>
      </div>

      <KxGoogleButton onClick={handleGoogle} />

      <KxDivider />

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <KxField
          label="Full name"
          required
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />

        {role === "seller" && (
          <div>
            <KxField
              label="Username"
              required
              value={form.username}
              placeholder="3-20 chars, a-z 0-9 _"
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
            />
            {form.username && (
              <p
                style={{
                  fontSize: 12,
                  marginTop: 6,
                  color:
                    usernameStatus === "ok"
                      ? "#16a34a"
                      : usernameStatus === "checking"
                      ? "#888"
                      : "#dc2626",
                }}
              >
                {usernameStatus === "checking" && "Checking…"}
                {usernameStatus === "ok" && "✓ Available"}
                {usernameStatus === "taken" && "Username is taken"}
                {usernameStatus === "invalid" && "3-20 chars, lowercase, numbers, underscores only"}
              </p>
            )}
          </div>
        )}

        <KxField
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <KxPassword
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
          required
          minLength={8}
        />
        <p style={{ fontSize: 12, color: "#bbb", marginTop: -8 }}>At least 8 characters</p>

        {errorMsg && (
          <div
            role="alert"
            style={{
              background: "#FEF2F2",
              border: "1px solid #DC2626",
              color: "#B91C1C",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {errorMsg}
          </div>
        )}

        <KxSubmit loading={loading} tone={submitTone}>
          {loading ? "Creating account…" : "Create account"}
        </KxSubmit>


        <KxTrustBadges />

        <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 4 }}>
          By joining you agree to our{" "}
          <Link to="/terms" style={{ color: "#888", textDecoration: "underline" }}>Terms</Link>{" "}
          and{" "}
          <Link to="/privacy" style={{ color: "#888", textDecoration: "underline" }}>Privacy Policy</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}
