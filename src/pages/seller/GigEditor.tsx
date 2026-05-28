import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, Upload, X } from "lucide-react";

type PkgType = "basic" | "standard" | "premium";
interface Pkg {
  package_type: PkgType;
  title: string;
  description: string;
  price: string;
  delivery_days: string;
  revisions: string;
  features: string;
}
const EMPTY_PKG = (t: PkgType): Pkg => ({
  package_type: t, title: "", description: "", price: "", delivery_days: "", revisions: "1", features: "",
});

const STEPS = ["Overview", "Pricing", "Description", "Gallery", "Publish"];

export default function GigEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: categories } = useCategories();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gigId, setGigId] = useState<string | null>(id ?? null);
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("seller_accounts").select("payouts_enabled").eq("seller_id", user.id).maybeSingle()
      .then(({ data }) => setPayoutsEnabled(!!data?.payouts_enabled));
  }, [user]);

  const [overview, setOverview] = useState({
    title: "",
    category: "",
    tags: "",
  });
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<string>("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([
    EMPTY_PKG("basic"), EMPTY_PKG("standard"), EMPTY_PKG("premium"),
  ]);

  // Load existing gig if editing
  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data } = await supabase.from("gigs").select("*").eq("id", id).maybeSingle();
      if (data) {
        setOverview({ title: data.title || "", category: data.category || "", tags: (data.tags ?? []).join(", ") });
        setDescription(data.description || "");
        setThumbnail(data.thumbnail_url || "");
        setGallery(data.gallery_urls ?? []);
      }
      const { data: pkgs } = await supabase.from("gig_packages").select("*").eq("gig_id", id);
      if (pkgs && pkgs.length) {
        setPackages(["basic","standard","premium"].map((t) => {
          const p = pkgs.find((x: any) => x.package_type === t);
          if (!p) return EMPTY_PKG(t as PkgType);
          return {
            package_type: t as PkgType,
            title: p.title || "",
            description: p.description || "",
            price: String(p.price ?? ""),
            delivery_days: String(p.delivery_days ?? ""),
            revisions: String(p.revisions ?? "1"),
            features: (p.features ?? []).join("\n"),
          };
        }));
      }
    })();
  }, [id, user]);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g,"_")}`;
    const { error } = await supabase.storage.from("gig-images").upload(path, file);
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from("gig-images").getPublicUrl(path).data.publicUrl;
  };

  const onPickThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadImage(file); if (url) setThumbnail(url);
  };
  const onPickGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) {
      const url = await uploadImage(f);
      if (url) setGallery((g) => [...g, url].slice(0, 5));
    }
  };

  const upsertGig = async (status: "draft" | "pending_review" | "active"): Promise<string | null> => {
    if (!user) return null;
    const basic = packages[0];
    const startingPrice = parseInt(basic.price || "0", 10) || 0;
    const payload = {
      seller_id: user.id,
      title: overview.title,
      description,
      category: overview.category,
      tags: overview.tags.split(",").map((t) => t.trim()).filter(Boolean),
      thumbnail_url: thumbnail || null,
      gallery_urls: gallery,
      starting_price: startingPrice,
      status,
    };
    let savedId = gigId;
    if (savedId) {
      const { error } = await supabase.from("gigs").update(payload).eq("id", savedId);
      if (error) { toast.error(error.message); return null; }
    } else {
      const { data, error } = await supabase.from("gigs").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return null; }
      savedId = data.id;
      setGigId(savedId);
    }
    // Replace packages
    await supabase.from("gig_packages").delete().eq("gig_id", savedId);
    const rows = packages
      .filter((p) => p.title && p.price)
      .map((p) => ({
        gig_id: savedId,
        package_type: p.package_type,
        title: p.title,
        description: p.description,
        price: parseInt(p.price, 10) || 0,
        delivery_days: parseInt(p.delivery_days, 10) || 1,
        revisions: parseInt(p.revisions, 10) || 0,
        features: p.features.split("\n").map((s) => s.trim()).filter(Boolean),
      }));
    if (rows.length) {
      const { error } = await supabase.from("gig_packages").insert(rows);
      if (error) { toast.error(error.message); return null; }
    }
    return savedId;
  };

  const saveDraft = async () => {
    setSaving(true);
    const id = await upsertGig("draft");
    setSaving(false);
    if (id) toast.success("Draft saved");
  };

  const submitForReview = async () => {
    if (!overview.title || !overview.category) return toast.error("Add a title and category first");
    if (!packages[0].price || !packages[0].title) return toast.error("Basic package needs a title and price");
    if (!description) return toast.error("Add a description");
    if (!payoutsEnabled) return toast.error("Finish payout setup in Earnings before publishing");
    setSaving(true);
    const id = await upsertGig("active"); // auto-approve for now
    setSaving(false);
    if (id) { toast.success("Gig published"); nav("/seller/gigs"); }
  };

  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold">{id ? "Edit gig" : "Create a new gig"}</h1>

        {/* Stepper */}
        <div className="mt-8 mb-10 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <button key={label} onClick={() => setStep(i)} className="flex items-center gap-2 group">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium border",
                i === step ? "bg-primary text-primary-foreground border-primary"
                : i < step ? "bg-primary/10 text-primary border-primary/20"
                : "bg-background text-foreground-muted border-border"
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn("text-sm", i === step ? "font-medium" : "text-foreground-muted")}>{label}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border ml-1" />}
            </button>
          ))}
        </div>

        <div className="bg-background border border-border rounded-xl p-8 space-y-6">
          {step === 0 && (
            <>
              <Field label="Gig title" hint="A catchy title gets more clicks.">
                <Input value={overview.title} maxLength={80}
                  onChange={(e) => setOverview({ ...overview, title: e.target.value })}
                  placeholder="I will design a modern logo for your brand" />
              </Field>
              <Field label="Category">
                <select value={overview.category}
                  onChange={(e) => setOverview({ ...overview, category: e.target.value })}
                  className="w-full h-11 rounded-lg border border-input bg-background px-3.5 text-sm">
                  <option value="">Choose a category</option>
                  {categories.filter((c) => !c.parent_id).map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Search tags" hint="Up to 5 tags separated by commas.">
                <Input value={overview.tags}
                  onChange={(e) => setOverview({ ...overview, tags: e.target.value })}
                  placeholder="logo, branding, modern" />
              </Field>
            </>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm text-foreground-muted mb-4">
                Define up to three packages. Buyers pick one when they order.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                {packages.map((p, idx) => (
                  <div key={p.package_type} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="font-semibold capitalize">{p.package_type}</div>
                    <Input placeholder="Package title" value={p.title}
                      onChange={(e) => updatePkg(idx, { title: e.target.value })} />
                    <Textarea rows={2} placeholder="Short description" value={p.description}
                      onChange={(e) => updatePkg(idx, { description: e.target.value })} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" min={5} placeholder="$" value={p.price}
                        onChange={(e) => updatePkg(idx, { price: e.target.value })} />
                      <Input type="number" min={1} placeholder="Days" value={p.delivery_days}
                        onChange={(e) => updatePkg(idx, { delivery_days: e.target.value })} />
                    </div>
                    <Input type="number" min={0} placeholder="Revisions" value={p.revisions}
                      onChange={(e) => updatePkg(idx, { revisions: e.target.value })} />
                    <Textarea rows={4} placeholder="Features (one per line)" value={p.features}
                      onChange={(e) => updatePkg(idx, { features: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <Field label="Gig description" hint="Describe your service in detail. Markdown supported soon.">
              <Textarea rows={10} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="What you offer, your process, what's included, what's not..." />
            </Field>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <Field label="Thumbnail" hint="The main image buyers see in search results.">
                <div className="flex items-center gap-4">
                  {thumbnail ? (
                    <div className="relative w-40 h-28 rounded-lg overflow-hidden border border-border">
                      <img src={thumbnail} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => setThumbnail("")} className="absolute top-1 right-1 bg-background/90 rounded-full p-1">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-40 h-28 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary text-foreground-muted">
                      <Upload className="h-5 w-5" />
                      <input type="file" accept="image/*" onChange={onPickThumb} className="hidden" />
                    </label>
                  )}
                </div>
              </Field>
              <Field label="Gallery" hint="Up to 5 supporting images.">
                <div className="flex flex-wrap gap-3">
                  {gallery.map((url, i) => (
                    <div key={i} className="relative w-28 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => setGallery((g) => g.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-background/90 rounded-full p-1">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {gallery.length < 5 && (
                    <label className="w-28 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary text-foreground-muted">
                      <Upload className="h-4 w-4" />
                      <input type="file" accept="image/*" multiple onChange={onPickGallery} className="hidden" />
                    </label>
                  )}
                </div>
              </Field>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="font-semibold mb-2">Ready to publish?</h3>
              <p className="text-sm text-foreground-muted mb-6">
                Double-check the basics. You can edit your gig any time after publishing.
              </p>
              <div className="space-y-2 text-sm">
                <Row k="Title" v={overview.title || "—"} />
                <Row k="Category" v={overview.category || "—"} />
                <Row k="Starting price" v={packages[0].price ? `$${packages[0].price}` : "—"} />
                <Row k="Packages" v={packages.filter((p) => p.title && p.price).length} />
                <Row k="Gallery images" v={gallery.length} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={saveDraft} disabled={saving}>Save draft</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>Next</Button>
            ) : (
              <Button onClick={submitForReview} disabled={saving}>
                {saving ? "Publishing…" : "Publish gig"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );

  function updatePkg(idx: number, patch: Partial<Pkg>) {
    setPackages((arr) => arr.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-foreground-subtle">{hint}</p>}
    </div>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-foreground-muted">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
