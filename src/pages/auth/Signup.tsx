import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "client" | "seller";

export default function Signup() {
  const nav = useNavigate();
  const [role, setRole] = useState<Role>("client");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    username: "",
    country: "",
  });
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");

  // live username check (sellers only)
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
    if (role === "seller" && usernameStatus !== "ok") {
      return toast.error("Pick a valid, available username");
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: form.full_name,
          role,
          username: role === "seller" ? form.username : null,
          country: form.country || null,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email to confirm your account");
    nav("/login");
  };

  const handleGoogle = async () => {
    sessionStorage.setItem("pending_role", role);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error("Google sign-in failed");
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Buy services or start selling on katexs"
      footer={<>Already have an account? <Link to="/login" className="text-primary font-medium">Sign in</Link></>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 p-1 bg-background-elevated rounded-full">
          {(["client", "seller"] as Role[]).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={cn(
              "py-2 rounded-full text-sm font-medium transition-colors",
              role === r ? "bg-background text-foreground shadow-sm" : "text-foreground-muted"
            )}>
              {r === "client" ? "I'm buying" : "I'm selling"}
            </button>
          ))}
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle}>
          Continue with Google
        </Button>

        <div className="relative text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <span className="relative bg-background px-3 text-xs text-foreground-muted uppercase tracking-wider">or</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full name</label>
            <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>

          {role === "seller" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Username</label>
              <Input
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                placeholder="3-20 chars, a-z 0-9 _"
              />
              {form.username && (
                <p className={cn("text-xs",
                  usernameStatus === "ok" && "text-success",
                  usernameStatus === "taken" && "text-destructive",
                  usernameStatus === "invalid" && "text-destructive",
                  usernameStatus === "checking" && "text-foreground-muted"
                )}>
                  {usernameStatus === "checking" && "Checking…"}
                  {usernameStatus === "ok" && "✓ Available"}
                  {usernameStatus === "taken" && "Username is taken"}
                  {usernameStatus === "invalid" && "3-20 chars, lowercase, numbers, underscores only"}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <p className="text-xs text-foreground-subtle">At least 8 characters</p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-xs text-foreground-subtle text-center">
            By joining you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
