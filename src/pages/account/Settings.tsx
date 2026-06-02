import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eyebrow } from "@/components/ui/mono";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkillsTagInput } from "@/components/postjob/SkillsTagInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppearanceTab } from "@/components/settings/AppearanceTab";
import { ExpertRecommendationsRail } from "@/components/settings/ExpertRecommendationsRail";
import { RecommendationsBlock } from "@/components/hq/RecommendationsBlock";
import { SearchableSelect, SearchableMultiSelect } from "@/components/ui/searchable-select";
import { COUNTRIES } from "@/lib/countries";
import { LANGUAGES } from "@/lib/languages";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, Camera, Check, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Cert = { name: string; organization: string; year: string };
type PortfolioLink = { label: string; url: string };

type Form = {
  full_name: string;
  username: string;
  bio: string;
  country: string;
  languages: string[];
  avatar_url: string;
  seller_skills: string[];
  years_experience: number | null;
  certifications: Cert[];
  portfolio_links: PortfolioLink[];
};

const EMPTY: Form = {
  full_name: "", username: "", bio: "", country: "",
  languages: [], avatar_url: "", seller_skills: [],
  years_experience: null, certifications: [], portfolio_links: [],
};

const YEARS_OPTS = [
  { v: 1, label: "Less than 1 year" },
  { v: 2, label: "1–3 years" },
  { v: 4, label: "3–5 years" },
  { v: 7, label: "5–10 years" },
  { v: 11, label: "10+ years" },
];

const COUNTRY_OPTS = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));
const LANGUAGE_OPTS = LANGUAGES.map((l) => ({ value: l, label: l }));

export default function Settings() {
  const { user, profile, refresh } = useAuth();
  const [form, setForm] = useState<Form>(EMPTY);
  const [baseline, setBaseline] = useState<Form>(EMPTY);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [nameSaveState, setNameSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [verifStatus, setVerifStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ full_name?: boolean; country?: boolean; languages?: boolean }>({});

  useEffect(() => {
    if (!profile || !user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("years_experience, certifications, portfolio_links, country")
        .eq("id", user.id)
        .maybeSingle();
      const ext = (data as any) ?? {};
      const next: Form = {
        full_name: profile.full_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        country: ext.country ?? "",
        languages: ((profile as any).languages as string[]) ?? [],
        avatar_url: profile.avatar_url ?? "",
        seller_skills: ((profile as any).seller_skills as string[]) ?? [],
        years_experience: ext.years_experience ?? null,
        certifications: Array.isArray(ext.certifications) ? ext.certifications : [],
        portfolio_links: Array.isArray(ext.portfolio_links) ? ext.portfolio_links : [],
      };
      setForm(next);
      setBaseline(next);
    })();
  }, [profile?.id, user?.id]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_seller_verification_status", { _seller: user.id })
      .then(({ data }) => setVerifStatus((data as any) ?? null));
  }, [user?.id]);

  // Debounced auto-save for display name
  useEffect(() => {
    if (!user) return;
    if (form.full_name === baseline.full_name) return;
    if (!form.full_name.trim()) return;
    setNameSaveState("saving");
    const t = setTimeout(async () => {
      const { error } = await supabase.from("profiles").update({ full_name: form.full_name }).eq("id", user.id);
      if (error) { setNameSaveState("idle"); return; }
      setBaseline((b) => ({ ...b, full_name: form.full_name }));
      setNameSaveState("saved");
      refresh();
      setTimeout(() => setNameSaveState("idle"), 1500);
    }, 600);
    return () => clearTimeout(t);
  }, [form.full_name, baseline.full_name, user?.id]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

  const patch = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));

  const save = async () => {
    if (!user) return;
    const next: typeof errors = {};
    if (!form.full_name.trim()) next.full_name = true;
    if (!form.country) next.country = true;
    if (!form.languages.length) next.languages = true;
    setErrors(next);
    if (Object.keys(next).length) { toast.error("Please fill required fields"); return; }
    if (form.bio.length > 250) { toast.error("Bio must be 250 characters or fewer"); return; }
    for (const l of form.portfolio_links) {
      if (l.url && !/^https?:\/\//i.test(l.url)) {
        toast.error("Portfolio URLs must start with http(s)://"); return;
      }
    }
    setSaveState("saving");
    const payload = {
      full_name: form.full_name || null,
      bio: form.bio || null,
      country: form.country || null,
      languages: form.languages,
      avatar_url: form.avatar_url || null,
      seller_skills: form.seller_skills,
      years_experience: form.years_experience,
      certifications: form.certifications,
      portfolio_links: form.portfolio_links,
    };
    const { error } = await supabase.from("profiles").update(payload as any).eq("id", user.id);
    if (error) {
      setSaveState("idle");
      return toast.error(error.message);
    }
    setBaseline(form);
    setSaveState("saved");
    refresh();
    setTimeout(() => setSaveState("idle"), 2000);
  };

  const discard = () => { setForm(baseline); setErrors({}); };

  const changePassword = async () => {
    if (pwd.next.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwd.next !== pwd.confirm) return toast.error("Passwords don't match");
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    if (error) return toast.error(error.message);
    setPwd({ next: "", confirm: "" });
    toast.success("Password updated");
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "appearance" ? "appearance" : "profile";

  return (
    <AppShell>
      <div className="max-w-6xl pb-32">
        <div className="mb-8">
          <Eyebrow>Account</Eyebrow>
          <h1 className="display-md mt-2">Settings</h1>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_220px] gap-8 items-start">
          <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v })} className="min-w-0">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
            </TabsList>

            <TabsContent value="appearance" className="mt-8">
              <AppearanceTab />
            </TabsContent>

            <TabsContent value="profile" className="mt-8 space-y-6">
              {/* PROFILE PHOTO */}
              <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
                <SectionLabel>Profile photo</SectionLabel>
                <AvatarSection
                  userId={user?.id ?? ""}
                  avatarUrl={form.avatar_url}
                  name={form.full_name || form.username || profile?.email || "?"}
                  onChange={(url) => patch({ avatar_url: url })}
                />
              </section>

              {/* BASIC INFO */}
              <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <SectionLabel>Basic info</SectionLabel>

                <Field label="Display name" required error={errors.full_name} hint={
                  nameSaveState === "saving" ? "Saving…" : nameSaveState === "saved" ? "Saved" : undefined
                }>
                  <Input
                    value={form.full_name}
                    onChange={(e) => patch({ full_name: e.target.value })}
                    className={cn("max-w-full sm:max-w-[60%]", errors.full_name && "border-destructive")}
                  />
                </Field>

                <Field label="Username">
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative max-w-full sm:max-w-[60%]">
                          <Input value={form.username} readOnly disabled className="pr-9 cursor-not-allowed" />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Username cannot be changed</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Field>

                <Field label={`Bio (${form.bio.length}/250)`}>
                  <Textarea
                    rows={4}
                    maxLength={250}
                    value={form.bio}
                    onChange={(e) => patch({ bio: e.target.value.slice(0, 250) })}
                    className="max-w-full sm:max-w-[60%]"
                  />
                </Field>

                <Field label="Country" required error={errors.country}>
                  <div className="max-w-full sm:max-w-[60%]">
                    <SearchableSelect
                      options={COUNTRY_OPTS}
                      value={form.country}
                      onChange={(v) => { patch({ country: v }); setErrors((e) => ({ ...e, country: false })); }}
                      placeholder="Select your country"
                      error={errors.country}
                    />
                  </div>
                </Field>

                <Field label="Languages" required error={errors.languages}>
                  <div className="max-w-full sm:max-w-[60%]">
                    <SearchableMultiSelect
                      options={LANGUAGE_OPTS}
                      value={form.languages}
                      onChange={(v) => { patch({ languages: v }); setErrors((e) => ({ ...e, languages: false })); }}
                      placeholder="Add languages you speak"
                      error={errors.languages}
                    />
                  </div>
                </Field>
              </section>

              {/* CREDENTIALS */}
              <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
                <SectionLabel>Credentials & expertise</SectionLabel>

                <SkillsTagInput
                  value={form.seller_skills}
                  onChange={(v) => patch({ seller_skills: v })}
                  max={10}
                />

                <Field label="Years of experience">
                  <div className="max-w-full sm:max-w-[60%]">
                    <Select
                      value={form.years_experience ? String(form.years_experience) : ""}
                      onValueChange={(v) => patch({ years_experience: Number(v) })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {YEARS_OPTS.map((o) => (
                          <SelectItem key={o.v} value={String(o.v)}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Field>

                <CertificationsEditor
                  value={form.certifications}
                  onChange={(v) => patch({ certifications: v })}
                />

                <PortfolioLinksEditor
                  value={form.portfolio_links}
                  onChange={(v) => patch({ portfolio_links: v })}
                />

                <VerifyMeCard status={verifStatus} />
              </section>

              {/* SECURITY */}
              <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <SectionLabel>Security</SectionLabel>
                <Field label="New password">
                  <Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} className="max-w-full sm:max-w-[60%]" />
                </Field>
                <Field label="Confirm new password">
                  <Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} className="max-w-full sm:max-w-[60%]" />
                </Field>
                <Button onClick={changePassword} variant="outline">Update password</Button>
              </section>

              <section className="rounded-2xl border border-border bg-card p-6 space-y-2 text-sm">
                <SectionLabel>Preferences</SectionLabel>
                <p><Link className="underline" to="/settings/notifications">Notification preferences →</Link></p>
                <p><Link className="underline" to="/saved">Saved services →</Link></p>
              </section>
            </TabsContent>
          </Tabs>

          {tab === "profile" && <ExpertRecommendationsRail />}
        </div>
      </div>

      {(dirty || saveState !== "idle") && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <span className="text-sm text-foreground-muted">
              {saveState === "saved" ? "All changes saved" : "You have unsaved changes"}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={discard} disabled={saveState === "saving" || !dirty}>Discard</Button>
              <Button variant="green" onClick={save} disabled={saveState === "saving"}>
                {saveState === "saving" && <Loader2 className="animate-spin" />}
                {saveState === "saved" && <Check />}
                {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <RecommendationsBlock />
    </AppShell>
  );
}

/* ----------------------------- helpers ----------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-mono uppercase tracking-[0.14em] text-[#6B7280]">{children}</div>
  );
}

function Field({
  label, children, required, error, hint,
}: { label: string; children: React.ReactNode; required?: boolean; error?: boolean; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-mono uppercase tracking-[0.14em] text-[#6B7280] flex items-center gap-2">
        {label}
        {required && <span className="text-destructive normal-case tracking-normal">*</span>}
        {hint && <span className="text-foreground-muted normal-case tracking-normal">· {hint}</span>}
        {error && <span className="text-destructive normal-case tracking-normal">· Required</span>}
      </span>
      {children}
    </label>
  );
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
function colorFromName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 55%)`;
}

function AvatarSection({
  userId, avatarUrl, name, onChange,
}: { userId: string; avatarUrl: string; name: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return toast.error("Use JPG, PNG, or WEBP");
    }
    if (file.size > 5 * 1024 * 1024) return toast.error("Max file size is 5MB");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: e2 } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
      if (e2) throw e2;
      onChange(url);
      toast.success("Photo updated");
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
      if (error) throw error;
      onChange("");
      toast.success("Photo removed");
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-6">
      <button
        type="button"
        onClick={pick}
        className="relative h-[120px] w-[120px] rounded-full overflow-hidden group shrink-0"
        style={{ background: colorFromName(name) }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-white text-4xl font-semibold">
            {initials(name)}
          </span>
        )}
        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
          <Camera className="h-6 w-6" />
        </span>
      </button>
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={pick} disabled={busy} size="sm">
          {busy ? <Loader2 className="animate-spin" /> : null}
          Upload photo
        </Button>
        {avatarUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={busy}>
            Remove photo
          </Button>
        )}
        <p className="text-xs text-foreground-muted">JPG, PNG, or WEBP. Max 5MB.</p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
      </div>
    </div>
  );
}

function CertificationsEditor({
  value, onChange,
}: { value: Cert[]; onChange: (v: Cert[]) => void }) {
  const add = () => onChange([...value, { name: "", organization: "", year: "" }]);
  const update = (i: number, patch: Partial<Cert>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-[0.14em] text-[#6B7280]">Certifications</span>
        <Button type="button" variant="ghost" size="sm" onClick={add}><Plus /> Add</Button>
      </div>
      {value.length === 0 && <p className="text-sm text-foreground-muted">No certifications added yet.</p>}
      {value.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_100px_auto] gap-2">
          <Input placeholder="Certification name" value={c.name} onChange={(e) => update(i, { name: e.target.value })} />
          <Input placeholder="Issuing organization" value={c.organization} onChange={(e) => update(i, { organization: e.target.value })} />
          <Input placeholder="Year" value={c.year} onChange={(e) => update(i, { year: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 /></Button>
        </div>
      ))}
    </div>
  );
}

function PortfolioLinksEditor({
  value, onChange,
}: { value: PortfolioLink[]; onChange: (v: PortfolioLink[]) => void }) {
  const max = 5;
  const add = () => value.length < max && onChange([...value, { label: "", url: "" }]);
  const update = (i: number, patch: Partial<PortfolioLink>) =>
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-[0.14em] text-[#6B7280]">
          Portfolio links ({value.length}/{max})
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={add} disabled={value.length >= max}>
          <Plus /> Add
        </Button>
      </div>
      {value.length === 0 && <p className="text-sm text-foreground-muted">Add up to 5 links to showcase your work.</p>}
      {value.map((c, i) => (
        <div key={i} className="grid grid-cols-[200px_1fr_auto] gap-2">
          <Input placeholder="Label" value={c.label} onChange={(e) => update(i, { label: e.target.value })} />
          <Input placeholder="https://…" value={c.url} onChange={(e) => update(i, { url: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 /></Button>
        </div>
      ))}
    </div>
  );
}

function VerifyMeCard({ status }: { status: string | null }) {
  const s = status ?? "unverified";
  return (
    <div className="rounded-2xl border border-border p-5 flex items-start gap-4">
      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
        <BadgeCheck className={s === "verified" ? "text-success" : "text-foreground-muted"} />
      </div>
      <div className="flex-1">
        <div className="font-semibold flex items-center gap-2">
          {s === "verified" ? "Verified Expert" : "Get verified"}
          {s === "verified" && <span className="text-xs font-mono uppercase tracking-wider text-success">approved</span>}
          {s === "pending" && <span className="text-xs font-mono uppercase tracking-wider text-warning">in review</span>}
          {s === "rejected" && <span className="text-xs font-mono uppercase tracking-wider text-destructive">rejected</span>}
        </div>
        <p className="text-sm text-foreground-muted mt-1">
          {s === "verified"
            ? "Your Verified Expert badge is live on your profile."
            : "Upload your ID or certification to earn a Verified Expert badge after admin review."}
        </p>
      </div>
      {s !== "verified" && (
        <Button asChild variant="outline" size="sm">
          <Link to="/seller/verification">{s === "pending" ? "View status" : "Verify me"}</Link>
        </Button>
      )}
    </div>
  );
}
