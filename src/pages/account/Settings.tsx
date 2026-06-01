import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eyebrow, HairlineDivider } from "@/components/ui/mono";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function Settings() {
  const { user, profile, refresh } = useAuth();
  const [form, setForm] = useState({
    full_name: "", username: "", bio: "", country: "", avatar_url: "",
  });
  const [busy, setBusy] = useState(false);
  const [pwd, setPwd] = useState({ next: "", confirm: "" });

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      username: profile.username ?? "",
      bio: profile.bio ?? "",
      country: profile.country ?? "",
      avatar_url: profile.avatar_url ?? "",
    });
  }, [profile?.id]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    refresh();
  };

  const changePassword = async () => {
    if (pwd.next.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwd.next !== pwd.confirm) return toast.error("Passwords don't match");
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    if (error) return toast.error(error.message);
    setPwd({ next: "", confirm: "" });
    toast.success("Password updated");
  };

  return (
    <AppShell>
      <div className="max-w-2xl space-y-10">
        <div>
          <Eyebrow>Account</Eyebrow>
          <h1 className="display-md mt-2">Settings</h1>
        </div>

        <section className="space-y-4">
          <Eyebrow>Profile</Eyebrow>
          <Field label="Full name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Username"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
          <Field label="Country"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></Field>
          <Field label="Bio"><Textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
          <Field label="Avatar URL"><Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} /></Field>
          <Button onClick={save} disabled={busy}>Save profile</Button>
        </section>

        <HairlineDivider />

        <section className="space-y-4">
          <Eyebrow>Security</Eyebrow>
          <Field label="New password"><Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></Field>
          <Field label="Confirm new password"><Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></Field>
          <Button onClick={changePassword} variant="outline">Update password</Button>
        </section>

        <HairlineDivider />

        <section className="space-y-2 text-sm">
          <Eyebrow className="mb-3">Preferences</Eyebrow>
          <p><Link className="underline" to="/settings/notifications">Notification preferences →</Link></p>
          <p><Link className="underline" to="/saved">Saved services →</Link></p>
          {(profile?.role === "seller" || profile?.role === "admin") && (
            <p><Link className="underline" to="/seller/verification">Identity verification →</Link></p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-mono uppercase tracking-[0.14em] text-foreground-muted">{label}</span>
      {children}
    </label>
  );
}
