import { useEffect, useMemo, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload } from "lucide-react";
import { toast } from "sonner";

type Pkg = { title: string; description: string; price: string; delivery_days: string };

const EMPTY_PKGS: Record<"basic" | "standard" | "premium", Pkg> = {
  basic: { title: "", description: "", price: "", delivery_days: "" },
  standard: { title: "", description: "", price: "", delivery_days: "" },
  premium: { title: "", description: "", price: "", delivery_days: "" },
};

const STEP_LABELS = ["Profile", "Skills", "Category", "Packages", "Submit"];

export default function SellerOnboarding() {
  const { user, profile, refresh, loading } = useAuth();
  const nav = useNavigate();
  const { data: categories } = useCategories();
  const topCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("");

  // Step 2
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);

  // Step 3
  const [primaryCat, setPrimaryCat] = useState("");
  const [secondaryCat, setSecondaryCat] = useState("");
  const [experience, setExperience] = useState("");

  // Step 4
  const [packages, setPackages] = useState(EMPTY_PKGS);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setAvatarUrl(profile.avatar_url || "");
    setBio(profile.bio || "");
  }, [profile]);

  // Load top 10 common skills from approved seller profiles
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("seller_skills")
        .eq("seller_status", "approved")
        .limit(500);
      const counts = new Map<string, number>();
      (data ?? []).forEach((p: any) => {
        (p.seller_skills ?? []).forEach((s: string) => {
          const k = s.trim();
          if (!k) return;
          counts.set(k, (counts.get(k) ?? 0) + 1);
        });
      });
      const top = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([s]) => s);
      setSuggestedSkills(top);
    })();
  }, []);

  if (loading) return <AppShell><div className="text-sm text-foreground-muted">Loading…</div></AppShell>;
  if (!user) return <Navigate to="/login?redirect=/seller-onboarding" replace />;
  if (profile?.seller_status === "approved") return <Navigate to="/seller/dashboard" replace />;
  if (profile?.seller_status === "pending_approval") return <Navigate to="/seller/dashboard" replace />;

  const addSkill = (raw?: string) => {
    const v = (raw ?? skillInput).trim();
    if (!v) return;
    if (skills.includes(v)) { setSkillInput(""); return; }
    setSkills([...skills, v]);
    setSkillInput("");
  };
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
  };

  const pkgFilled = (p: Pkg) =>
    p.title.trim() || p.description.trim() || p.price.trim() || p.delivery_days.trim();
  const pkgValid = (p: Pkg) =>
    p.title.trim() && p.description.trim() && Number(p.price) > 0 && Number(p.delivery_days) > 0;

  const canNext = () => {
    if (step === 1) return fullName.trim() && bio.trim() && location.trim() && language.trim();
    if (step === 2) return skills.length >= 3;
    if (step === 3) return !!primaryCat && experience.trim().length >= 80;
    if (step === 4) {
      if (!pkgValid(packages.basic)) return false;
      if (pkgFilled(packages.standard) && !pkgValid(packages.standard)) return false;
      if (pkgFilled(packages.premium) && !pkgValid(packages.premium)) return false;
      return true;
    }
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    const tiers: ("basic" | "standard" | "premium")[] = ["basic"];
    if (pkgFilled(packages.standard)) tiers.push("standard");
    if (pkgFilled(packages.premium)) tiers.push("premium");
    const pkgArr = tiers.map((tier) => ({
      tier,
      title: packages[tier].title,
      description: packages[tier].description,
      price: Math.round(Number(packages[tier].price) * 100),
      delivery_days: Number(packages[tier].delivery_days),
    }));
    const { error } = await supabase.rpc("submit_seller_application" as any, {
      _full_name: fullName,
      _avatar_url: avatarUrl,
      _bio: bio,
      _location: location,
      _languages: [language],
      _skills: skills,
      _primary_category: primaryCat,
      _secondary_category: secondaryCat || null,
      _packages: pkgArr as any,
      _portfolio_urls: [],
      _experience_description: experience,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted");
    await refresh();
    nav("/seller/dashboard");
  };

  const setPkg = (tier: keyof typeof packages, field: keyof Pkg, value: string) =>
    setPackages({ ...packages, [tier]: { ...packages[tier], [field]: value } });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto py-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              return (
                <div key={label} className="flex-1 flex flex-col items-center">
                  <div className={`text-[11px] font-medium uppercase tracking-wider ${active ? "text-foreground" : "text-foreground-muted"}`}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-1">
            {STEP_LABELS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i + 1 <= step ? "bg-foreground" : "bg-border"}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">Profile</h1>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Profile photo (optional)</label>
              <div className="flex items-center gap-3">
                {avatarUrl && <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover border border-border" />}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                  <span className="inline-flex items-center gap-2 text-sm border border-border rounded-md px-3 py-2 hover:bg-background-elevated">
                    <Upload className="h-4 w-4" /> Upload photo
                  </span>
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Specialty bio</label>
              <Input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={140} placeholder="One-line summary of what you do" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">City and country</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lisbon, Portugal" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Primary language</label>
              <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. English" />
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">Skills</h1>
            <p className="text-sm text-foreground-muted">Add at least 3 skills. Press Enter to add each one.</p>
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
              placeholder="Type a skill and press Enter"
            />
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-background-elevated border border-border">
                  {s}
                  <button onClick={() => removeSkill(s)} className="text-foreground-muted hover:text-foreground"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <p className="text-xs text-foreground-muted">{skills.length} added · minimum 3 required</p>

            {suggestedSkills.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-medium text-foreground-muted mb-2 uppercase tracking-wider">Suggested skills</div>
                <div className="flex flex-wrap gap-2">
                  {suggestedSkills.filter((s) => !skills.includes(s)).map((s) => (
                    <button
                      key={s}
                      onClick={() => addSkill(s)}
                      className="text-sm px-3 py-1.5 rounded-full border border-dashed border-border text-foreground-muted hover:text-foreground hover:border-foreground"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">Category</h1>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Primary category</label>
              <select value={primaryCat} onChange={(e) => setPrimaryCat(e.target.value)}
                className="w-full h-10 rounded-md bg-background border border-border px-3 text-sm">
                <option value="">Select a category</option>
                {topCategories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Secondary category (optional)</label>
              <select value={secondaryCat} onChange={(e) => setSecondaryCat(e.target.value)}
                className="w-full h-10 rounded-md bg-background border border-border px-3 text-sm">
                <option value="">None</option>
                {topCategories.filter((c) => c.slug !== primaryCat).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Describe your experience</label>
              <Textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Tell buyers what you have built, what tools you use, and what results you deliver."
                rows={6}
              />
              <p className="text-xs text-foreground-muted">
                {experience.trim().length} / 80 minimum characters
              </p>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">Packages</h1>
            <p className="text-sm text-foreground-muted">Basic is required. Standard and Premium are optional.</p>
            <div className="grid md:grid-cols-3 gap-4">
              {(["basic","standard","premium"] as const).map((tier) => (
                <div key={tier} className="p-4 rounded-xl border border-border bg-background space-y-3">
                  <div className="text-sm font-semibold capitalize">
                    {tier}
                    {tier === "basic" && <span className="ml-1 text-xs font-normal text-foreground-muted">(required)</span>}
                    {tier !== "basic" && <span className="ml-1 text-xs font-normal text-foreground-muted">(optional)</span>}
                  </div>
                  <Input placeholder="Package title" value={packages[tier].title} onChange={(e) => setPkg(tier, "title", e.target.value)} />
                  <Textarea placeholder="Description" value={packages[tier].description} onChange={(e) => setPkg(tier, "description", e.target.value)} rows={3} />
                  <Input type="number" min={1} placeholder="Price ($)" value={packages[tier].price} onChange={(e) => setPkg(tier, "price", e.target.value)} />
                  <Input type="number" min={1} placeholder="Delivery days" value={packages[tier].delivery_days} onChange={(e) => setPkg(tier, "delivery_days", e.target.value)} />
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">Submit</h1>
            <p className="text-sm text-foreground-muted">Review your application before submitting.</p>
            <div className="space-y-3 text-sm border border-border rounded-xl p-5 bg-background">
              <Row label="Full name" value={fullName} />
              <Row label="Specialty bio" value={bio} />
              <Row label="City and country" value={location} />
              <Row label="Primary language" value={language} />
              <Row label="Skills" value={skills.join(", ")} />
              <Row label="Primary category" value={primaryCat} />
              <Row label="Secondary category" value={secondaryCat || "—"} />
              <Row label="Experience" value={experience} />
              <Row
                label="Packages"
                value={(["basic","standard","premium"] as const)
                  .filter((t) => pkgFilled(packages[t]))
                  .map((t) => `${t}: $${packages[t].price} / ${packages[t].delivery_days}d`)
                  .join("  ·  ")}
              />
            </div>
            <button
              onClick={submit}
              disabled={submitting}
              style={{ borderRadius: 999 }}
              className="w-full h-12 bg-black text-white text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit My Application"}
            </button>
          </section>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>Back</Button>
          {step < 5 && (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <div className="w-40 shrink-0 text-foreground-muted">{label}</div>
      <div className="flex-1 break-words whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}
