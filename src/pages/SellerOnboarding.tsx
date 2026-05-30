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
  const [languages, setLanguages] = useState("");

  // Step 2
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  // Step 3
  const [primaryCat, setPrimaryCat] = useState("");
  const [secondaryCat, setSecondaryCat] = useState("");

  // Step 4
  const [packages, setPackages] = useState(EMPTY_PKGS);

  // Step 5
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setAvatarUrl(profile.avatar_url || "");
    setBio(profile.bio || "");
  }, [profile]);

  if (loading) return <AppShell><div className="text-sm text-foreground-muted">Loading…</div></AppShell>;
  if (!user) return <Navigate to="/login?redirect=/seller-onboarding" replace />;
  if (profile?.seller_status === "approved") return <Navigate to="/seller/dashboard" replace />;
  if (profile?.seller_status === "pending_approval") return <Navigate to="/seller/dashboard" replace />;

  const addSkill = () => {
    const v = skillInput.trim();
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

  const uploadPortfolio = async (files: FileList) => {
    if (!user) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 6 - portfolio.length)) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/portfolio-${Date.now()}-${Math.random().toString(36).slice(2,7)}.${ext}`;
      const { error } = await supabase.storage.from("seller-portfolio").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("seller-portfolio").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setPortfolio([...portfolio, ...urls]);
    setUploading(false);
  };

  const removePortfolio = (url: string) => setPortfolio(portfolio.filter((u) => u !== url));

  const canNext = () => {
    if (step === 1) return fullName.trim() && bio.trim() && location.trim();
    if (step === 2) return skills.length >= 3;
    if (step === 3) return !!primaryCat;
    if (step === 4) {
      return (["basic","standard","premium"] as const).every((k) => {
        const p = packages[k];
        return p.title.trim() && p.description.trim() && Number(p.price) > 0 && Number(p.delivery_days) > 0;
      });
    }
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    const pkgArr = (["basic","standard","premium"] as const).map((tier) => ({
      tier,
      title: packages[tier].title,
      description: packages[tier].description,
      price: Math.round(Number(packages[tier].price) * 100),
      delivery_days: Number(packages[tier].delivery_days),
    }));
    const { error } = await supabase.rpc("submit_seller_application", {
      _full_name: fullName,
      _avatar_url: avatarUrl,
      _bio: bio,
      _location: location,
      _languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
      _skills: skills,
      _primary_category: primaryCat,
      _secondary_category: secondaryCat || null,
      _packages: pkgArr as any,
      _portfolio_urls: portfolio,
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
      <div className="max-w-2xl mx-auto py-4">
        <div className="mb-6">
          <div className="text-xs text-foreground-muted uppercase tracking-wider">Step {step} of 6</div>
          <div className="mt-2 flex gap-1">
            {[1,2,3,4,5,6].map((n) => (
              <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? "bg-foreground" : "bg-border"}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">Profile setup</h1>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Profile photo</label>
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
              <label className="text-sm font-medium">One-line bio</label>
              <Input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={140} placeholder="What do you do?" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Languages</label>
              <Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, Spanish" />
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">Skills and tags</h1>
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
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">Service category</h1>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Primary category</label>
              <select value={primaryCat} onChange={(e) => setPrimaryCat(e.target.value)}
                className="w-full h-10 rounded-[4px] bg-white/[0.03] border border-white/10 px-3.5 text-sm">
                <option value="">Select a category</option>
                {topCategories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Secondary category (optional)</label>
              <select value={secondaryCat} onChange={(e) => setSecondaryCat(e.target.value)}
                className="w-full h-10 rounded-[4px] bg-white/[0.03] border border-white/10 px-3.5 text-sm">
                <option value="">None</option>
                {topCategories.filter((c) => c.slug !== primaryCat).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">Packages</h1>
            <div className="grid md:grid-cols-3 gap-4">
              {(["basic","standard","premium"] as const).map((tier) => (
                <div key={tier} className="p-4 rounded-xl border border-border bg-background space-y-3">
                  <div className="text-sm font-semibold capitalize">{tier}</div>
                  <Input placeholder="Title" value={packages[tier].title} onChange={(e) => setPkg(tier, "title", e.target.value)} />
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
            <h1 className="text-2xl font-bold">Portfolio</h1>
            <p className="text-sm text-foreground-muted">Optional. Upload up to 6 samples (images or PDFs).</p>
            <label className="block cursor-pointer">
              <input type="file" multiple accept="image/*,application/pdf" className="hidden"
                onChange={(e) => e.target.files && uploadPortfolio(e.target.files)} disabled={portfolio.length >= 6} />
              <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-foreground-muted hover:bg-background-elevated">
                <Upload className="h-6 w-6 mx-auto mb-2" />
                {uploading ? "Uploading…" : portfolio.length >= 6 ? "Maximum reached" : "Click to upload"}
              </div>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {portfolio.map((url) => (
                <div key={url} className="relative aspect-square rounded-md overflow-hidden border border-border bg-background-elevated">
                  {url.match(/\.pdf$/i) ? (
                    <div className="flex items-center justify-center h-full text-xs text-foreground-muted">PDF</div>
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button onClick={() => removePortfolio(url)} className="absolute top-1 right-1 bg-background rounded-full p-1 border border-border">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 6 && (
          <section className="space-y-5">
            <h1 className="text-2xl font-bold">Submit for approval</h1>
            <div className="space-y-4 text-sm">
              <Row label="Full name" value={fullName} />
              <Row label="Bio" value={bio} />
              <Row label="Location" value={location} />
              <Row label="Languages" value={languages || "—"} />
              <Row label="Skills" value={skills.join(", ")} />
              <Row label="Primary category" value={primaryCat} />
              <Row label="Secondary category" value={secondaryCat || "—"} />
              <Row label="Packages" value={(["basic","standard","premium"] as const).map((t) => `${t}: $${packages[t].price} / ${packages[t].delivery_days}d`).join("  ·  ")} />
              <Row label="Portfolio" value={`${portfolio.length} samples`} />
            </div>
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full h-12 rounded-md bg-black text-white text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit My Application"}
            </button>
          </section>
        )}

        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>Back</Button>
          {step < 6 && (
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
    <div className="flex gap-4 border-b border-border pb-2">
      <div className="w-40 text-foreground-muted">{label}</div>
      <div className="flex-1 break-words">{value}</div>
    </div>
  );
}
