import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Check, CheckCircle2, Eye, EyeOff, Loader2, Star } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

/* ─── types ──────────────────────────────────────────── */
type Role = "buyer" | "seller";
type Errs = Partial<Record<"full_name" | "email" | "password" | "confirm" | "role" | "terms", string>>;

/* ─── helpers ────────────────────────────────────────── */
function KatexsLogo({ color = "#fff", size = 18 }: { color?: string; size?: number }) {
  return (
    <span style={{ fontSize: size, fontWeight: 700, letterSpacing: "0.1em", color, fontFamily: "Syne, system-ui, sans-serif", display: "inline-flex", alignItems: "flex-start", lineHeight: 1 }}>
      KATEXS
      <span style={{ color: "#22c55e", fontSize: Math.round(size * 0.45), marginLeft: 2, lineHeight: 1, transform: "translateY(-2px)" }}>●</span>
    </span>
  );
}

const INPUT_BASE: React.CSSProperties = {
  width: "100%", height: 44, borderRadius: 10, border: "1px solid #2a2a2a",
  background: "#111", color: "#fff", padding: "0 14px", fontSize: 14,
  outline: "none", boxSizing: "border-box",
};
const INPUT_ERR: React.CSSProperties = { ...INPUT_BASE, borderColor: "#ef4444" };
const LABEL: React.CSSProperties = { fontSize: 13, color: "#aaa", marginBottom: 4, display: "block" };

function FieldWrap({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {children}
      {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

function RoleCard({ icon, title, sub, selected, accent, onClick }: {
  icon: React.ReactNode; title: string; sub: string;
  selected: boolean; accent: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{ background: selected ? `${accent}12` : "#111", border: `2px solid ${selected ? accent : "#2a2a2a"}`, borderRadius: 12, padding: "16px 14px", cursor: "pointer", textAlign: "left", transition: "border-color 0.15s, background 0.15s" }}>
      <div style={{ color: selected ? accent : "#666", marginBottom: 8 }}>{icon}</div>
      <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{title}</div>
      <div style={{ color: "#666", fontSize: 12 }}>{sub}</div>
    </button>
  );
}

/* ─── main ───────────────────────────────────────────── */
export default function Signup() {
  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "", country: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [terms, setTerms] = useState(false);
  const [errs, setErrs] = useState<Errs>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  const patch = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = (): Errs => {
    const e: Errs = {};
    if (!role) e.role = "Please select a role to continue";
    if (!form.full_name.trim()) e.full_name = "Full name is required";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Enter a valid email address";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    if (!terms) e.terms = "You must accept the terms to continue";
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/services`,
        data: {
          full_name: form.full_name.trim(),
          role: role === "seller" ? "seller" : "buyer",
          country: form.country || null,
        },
      },
    });
    setLoading(false);

    if (error) { setErrs({ email: error.message }); return; }

    // Empty identities = email already registered (Supabase anti-enumeration)
    const identities = (data?.user as any)?.identities;
    if (data?.user && Array.isArray(identities) && identities.length === 0) {
      setErrs({ email: `An account with ${form.email} already exists. Try signing in instead.` });
      return;
    }

    setSuccessEmail(form.email);
    toast.success("Account created — check your email");
  };

  const handleGoogle = async () => {
    if (!role) { setErrs({ role: "Please select a role before continuing with Google" }); return; }
    setGoogleLoading(true);
    sessionStorage.setItem("pending_role", role);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/services` },
    });
    if (error) { toast.error("Google sign-in failed"); setGoogleLoading(false); }
  };

  const handleResend = async () => {
    if (!successEmail) return;
    setResendLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: successEmail, options: { emailRedirectTo: `${window.location.origin}/services` } });
    setResendLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email resent");
  };

  /* ── shared layout ────────────────────────────────── */
  const TRUST = ["Free to join", "Verified experts only", "Escrow protected payments"];

  const LeftPanel = (
    <aside style={{ width: "40%", minHeight: "100vh", background: "#111111", padding: "48px 40px", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }} className="signup-left-panel">
      <KatexsLogo size={18} />
      <div>
        <h2 style={{ color: "#fff", fontSize: 30, fontWeight: 600, lineHeight: 1.3, margin: "0 0 14px" }}>
          Join the AI productivity platform
        </h2>
        <p style={{ color: "#777", fontSize: 15, lineHeight: 1.6, margin: "0 0 32px" }}>
          Connect with top AI experts or get paid for your skills
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {TRUST.map((t) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={11} color="#22c55e" />
              </div>
              <span style={{ color: "#bbb", fontSize: 14 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ paddingTop: 28, borderTop: "1px solid #1e1e1e" }}>
        <p style={{ color: "#555", fontSize: 13, margin: 0 }}>
          <span style={{ color: "#999", fontWeight: 600 }}>2,400+ Experts</span>
          {"  ·  "}
          <span style={{ color: "#999", fontWeight: 600 }}>$2.1M Paid Out</span>
        </p>
      </div>
    </aside>
  );

  /* ── success screen ─────────────────────────────── */
  if (successEmail) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex" }} className="signup-shell">
        <GlobalStyles />
        {LeftPanel}
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", background: "#0a0a0a" }}>
          <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <CheckCircle2 size={30} color="#22c55e" />
            </div>
            <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 600, margin: "0 0 12px" }}>Check your email</h2>
            <p style={{ color: "#777", fontSize: 14, lineHeight: 1.6, maxWidth: 320, margin: "0 auto 32px" }}>
              We sent a verification link to{" "}
              <strong style={{ color: "#fff" }}>{successEmail}</strong>.
              Click it to activate your account.
            </p>
            <button onClick={handleResend} disabled={resendLoading} style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#aaa", borderRadius: 10, padding: "10px 20px", fontSize: 14, cursor: "pointer" }}>
              {resendLoading ? "Sending…" : "Resend verification email"}
            </button>
            <p style={{ marginTop: 24, fontSize: 13, color: "#555" }}>
              Already verified?{" "}
              <Link to="/login" style={{ color: "#22c55e", textDecoration: "none" }}>Sign in</Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  /* ── main form ─────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex" }} className="signup-shell">
      <GlobalStyles />
      {LeftPanel}

      <main style={{ flex: 1, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 24px", background: "#0a0a0a", boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          {/* mobile logo */}
          <div className="signup-mobile-logo" style={{ marginBottom: 32 }}>
            <KatexsLogo color="#fff" size={18} />
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 600, color: "#fff", margin: "0 0 6px" }}>Create your account</h1>
          <p style={{ fontSize: 14, color: "#666", margin: "0 0 28px" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#22c55e", textDecoration: "none", fontWeight: 500 }}>Sign in</Link>
          </p>

          {/* role selector */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: "#777", margin: "0 0 10px" }}>I want to…</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <RoleCard icon={<Briefcase size={20} />} title="I'm a Partner" sub="I need AI work done" selected={role === "buyer"} accent="#ffffff" onClick={() => { setRole("buyer"); setErrs((e) => ({ ...e, role: undefined })); }} />
              <RoleCard icon={<Star size={20} />} title="I'm an Expert" sub="I offer AI services" selected={role === "seller"} accent="#22c55e" onClick={() => { setRole("seller"); setErrs((e) => ({ ...e, role: undefined })); }} />
            </div>
            {errs.role && <p style={{ fontSize: 12, color: "#ef4444", margin: "8px 0 0" }}>{errs.role}</p>}
          </div>

          {/* google */}
          <button onClick={handleGoogle} disabled={googleLoading} style={{ width: "100%", height: 44, borderRadius: 10, border: "1px solid #2a2a2a", background: "#fff", color: "#111", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
            {googleLoading
              ? <Loader2 size={16} className="spin" />
              : <GoogleIcon />}
            Continue with Google
          </button>

          {/* divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "#222" }} />
            <span style={{ fontSize: 12, color: "#444" }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: "#222" }} />
          </div>

          {/* fields */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FieldWrap error={errs.full_name}>
              <label style={LABEL}>Full name</label>
              <input value={form.full_name} onChange={patch("full_name")} placeholder="Jane Smith" style={errs.full_name ? INPUT_ERR : INPUT_BASE} />
            </FieldWrap>

            <FieldWrap error={errs.email}>
              <label style={LABEL}>Email</label>
              <input type="email" value={form.email} onChange={patch("email")} placeholder="jane@company.com" style={errs.email ? INPUT_ERR : INPUT_BASE} />
            </FieldWrap>

            <FieldWrap error={errs.password}>
              <label style={LABEL}>Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPwd ? "text" : "password"} value={form.password} onChange={patch("password")} placeholder="Min 8 characters" style={{ ...(errs.password ? INPUT_ERR : INPUT_BASE), paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPwd((v) => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", padding: 0, display: "flex" }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FieldWrap>

            <FieldWrap error={errs.confirm}>
              <label style={LABEL}>Confirm password</label>
              <div style={{ position: "relative" }}>
                <input type={showConfirm ? "text" : "password"} value={form.confirm} onChange={patch("confirm")} placeholder="Repeat password" style={{ ...(errs.confirm ? INPUT_ERR : INPUT_BASE), paddingRight: 44 }} />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#555", cursor: "pointer", padding: 0, display: "flex" }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FieldWrap>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <label style={LABEL}>Country</label>
              <select value={form.country} onChange={patch("country")} style={{ ...INPUT_BASE, color: form.country ? "#fff" : "#555" }}>
                <option value="">Select your country</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>

            <FieldWrap error={errs.terms}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={terms} onChange={(e) => { setTerms(e.target.checked); setErrs((er) => ({ ...er, terms: undefined })); }} style={{ marginTop: 3, accentColor: "#22c55e", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>
                  I agree to the{" "}
                  <Link to="/terms" style={{ color: "#22c55e", textDecoration: "none" }}>Terms of Service</Link>
                  {" "}and{" "}
                  <Link to="/privacy" style={{ color: "#22c55e", textDecoration: "none" }}>Privacy Policy</Link>
                </span>
              </label>
            </FieldWrap>

            <button type="submit" disabled={loading} style={{ height: 46, borderRadius: 10, background: "#22c55e", color: "#000", fontSize: 15, fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.75 : 1, marginTop: 4 }}>
              {loading && <Loader2 size={16} className="spin" />}
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

/* ─── global styles injected once ───────────────────── */
function GlobalStyles() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      .spin { animation: spin 1s linear infinite; }
      .signup-left-panel { display: none !important; }
      .signup-mobile-logo { display: block; }
      @media (min-width: 1024px) {
        .signup-shell { flex-direction: row; }
        .signup-left-panel { display: flex !important; }
        .signup-mobile-logo { display: none !important; }
      }
    `}</style>
  );
}

/* ─── google icon ────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.215 17.64 11.907 17.64 9.2z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
