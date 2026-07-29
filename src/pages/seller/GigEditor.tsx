import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Edit2, Plus, Trash2, Upload, X } from "lucide-react";

/* ─── types ──────────────────────────────────────────── */
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

type FieldType = "text" | "multiple_choice" | "file";
interface Requirement {
  id?: string;
  question: string;
  field_type: FieldType;
  is_required: boolean;
  sort_order: number;
}
const EMPTY_REQ = (): Requirement => ({ question: "", field_type: "text", is_required: true, sort_order: 0 });
const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Free text", multiple_choice: "Multiple choice", file: "File attachment",
};

const STEPS = ["Overview", "Pricing", "Description", "Gallery", "Requirements", "Publish"];

/* ─── shared input styles ────────────────────────────── */
const GI_STYLES = `
  .gi-input, .gi-textarea, .gi-select {
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    padding: 12px 16px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    font-family: inherit;
  }
  .gi-input::placeholder, .gi-textarea::placeholder { color: #555; }
  .gi-input:hover, .gi-textarea:hover, .gi-select:hover { border-color: #444; }
  .gi-input:focus, .gi-textarea:focus, .gi-select:focus {
    border-color: #22c55e;
    background: #1e1e1e;
    box-shadow: 0 0 0 3px rgba(34,197,94,0.15);
  }
  .gi-textarea { resize: vertical; }
  .gi-select { cursor: pointer; }
  .gi-select option { background: #1a1a1a; color: #fff; }
  .gi-label {
    display: block;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 6px;
  }
  .gi-hint { font-size: 11px; color: #555; margin-top: 5px; }
  .gi-prefix-wrap { position: relative; display: flex; align-items: center; }
  .gi-prefix {
    position: absolute; left: 12px;
    font-size: 13px; color: #666; pointer-events: none; z-index: 1;
  }
  .gi-suffix {
    position: absolute; right: 12px;
    font-size: 11px; color: #555; pointer-events: none;
  }
  .gi-prefix-wrap .gi-input { padding-left: 26px; }
  .gi-suffix-wrap .gi-input { padding-right: 40px; }
  .gi-btn-back {
    background: #1a1a1a; border: 1px solid #333; color: #fff;
    border-radius: 8px; padding: 10px 20px; font-size: 14px;
    cursor: pointer; transition: border-color 0.15s;
  }
  .gi-btn-back:hover { border-color: #555; }
  .gi-btn-back:disabled { opacity: 0.4; cursor: not-allowed; }
  .gi-btn-draft {
    background: #1a1a1a; border: 1px solid #333; color: #fff;
    border-radius: 8px; padding: 10px 20px; font-size: 14px;
    cursor: pointer; transition: border-color 0.15s;
  }
  .gi-btn-draft:hover { border-color: #555; }
  .gi-btn-draft:disabled { opacity: 0.4; cursor: not-allowed; }
  .gi-btn-next {
    background: #22c55e; border: none; color: #000;
    border-radius: 8px; padding: 10px 24px; font-size: 14px; font-weight: 600;
    cursor: pointer; transition: background 0.15s;
  }
  .gi-btn-next:hover { background: #16a34a; }
  .gi-btn-next:disabled { opacity: 0.5; cursor: not-allowed; }
  .gi-btn-outline {
    background: transparent; border: 1px solid #333; color: #aaa;
    border-radius: 8px; padding: 7px 14px; font-size: 13px;
    cursor: pointer; transition: border-color 0.15s, color 0.15s; display: inline-flex; align-items: center; gap: 6px;
  }
  .gi-btn-outline:hover { border-color: #555; color: #fff; }
  .gi-btn-sm {
    background: #22c55e; border: none; color: #000;
    border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 600;
    cursor: pointer;
  }
  .gi-btn-ghost {
    background: transparent; border: 1px solid #2a2a2a; color: #777;
    border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer;
  }
  .gi-btn-ghost:hover { color: #fff; }
`;

/* ─── package accent config ──────────────────────────── */
const PKG_CONFIG: Record<PkgType, { label: string; accent: string }> = {
  basic:    { label: "Basic",    accent: "#3b82f6" },
  standard: { label: "Standard", accent: "#22c55e" },
  premium:  { label: "Premium",  accent: "#eab308" },
};

/* ─── component ──────────────────────────────────────── */
export default function GigEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: categories } = useCategories();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gigId, setGigId] = useState<string | null>(id ?? null);

  const [overview, setOverview] = useState({ title: "", category: "", tags: "" });
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<string>("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([
    EMPTY_PKG("basic"), EMPTY_PKG("standard"), EMPTY_PKG("premium"),
  ]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [addingReq, setAddingReq] = useState(false);
  const [editingReqIdx, setEditingReqIdx] = useState<number | null>(null);
  const [reqDraft, setReqDraft] = useState<Requirement>(EMPTY_REQ());

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
      const { data: reqs } = await supabase.from("gig_requirements").select("*").eq("gig_id", id).order("sort_order");
      if (reqs && reqs.length) {
        setRequirements(reqs.map((r: any) => ({
          id: r.id, question: r.question,
          field_type: r.field_type as FieldType,
          is_required: r.is_required, sort_order: r.sort_order ?? 0,
        })));
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
    for (const f of Array.from(e.target.files ?? [])) {
      const url = await uploadImage(f);
      if (url) setGallery((g) => [...g, url].slice(0, 5));
    }
  };

  const upsertGig = async (status: "draft" | "pending_review" | "active"): Promise<string | null> => {
    if (!user) return null;
    const basic = packages[0];
    const payload = {
      seller_id: user.id, title: overview.title, description,
      category: overview.category,
      tags: overview.tags.split(",").map((t) => t.trim()).filter(Boolean),
      thumbnail_url: thumbnail || null, gallery_urls: gallery,
      starting_price: parseInt(basic.price || "0", 10) || 0, status,
    };
    let savedId = gigId;
    if (savedId) {
      const { error } = await supabase.from("gigs").update(payload).eq("id", savedId);
      if (error) { toast.error(error.message); return null; }
    } else {
      const { data, error } = await supabase.from("gigs").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return null; }
      savedId = data.id; setGigId(savedId);
    }
    await supabase.from("gig_packages").delete().eq("gig_id", savedId);
    const rows = packages.filter((p) => p.title && p.price).map((p) => ({
      gig_id: savedId, package_type: p.package_type, title: p.title, description: p.description,
      price: parseInt(p.price, 10) || 0, delivery_days: parseInt(p.delivery_days, 10) || 1,
      revisions: parseInt(p.revisions, 10) || 0,
      features: p.features.split("\n").map((s) => s.trim()).filter(Boolean),
    }));
    if (rows.length) {
      const { error } = await supabase.from("gig_packages").insert(rows);
      if (error) { toast.error(error.message); return null; }
    }
    await supabase.from("gig_requirements").delete().eq("gig_id", savedId);
    if (requirements.length) {
      const { error } = await supabase.from("gig_requirements").insert(
        requirements.map((r, i) => ({ gig_id: savedId, question: r.question, field_type: r.field_type, is_required: r.is_required, sort_order: i }))
      );
      if (error) { toast.error(error.message); return null; }
    }
    return savedId;
  };

  const saveDraft = async () => {
    setSaving(true);
    const saved = await upsertGig("draft");
    setSaving(false);
    if (saved) toast.success("Draft saved");
  };

  const submitForReview = async () => {
    if (!overview.title || !overview.category) return toast.error("Add a title and category first");
    if (!packages[0].price || !packages[0].title) return toast.error("Basic package needs a title and price");
    if (!description) return toast.error("Add a description");
    setSaving(true);
    const saved = await upsertGig("active");
    setSaving(false);
    if (saved) { toast.success("Service published"); nav("/seller/gigs"); }
  };

  const updatePkg = (idx: number, patch: Partial<Pkg>) =>
    setPackages((arr) => arr.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const saveReqDraft = () => {
    if (!reqDraft.question.trim()) { toast.error("Question is required"); return; }
    if (editingReqIdx !== null) {
      setRequirements((arr) => arr.map((r, i) => i === editingReqIdx ? { ...r, ...reqDraft } : r));
      setEditingReqIdx(null);
    } else {
      setRequirements((arr) => [...arr, { ...reqDraft, sort_order: arr.length }]);
    }
    setReqDraft(EMPTY_REQ()); setAddingReq(false);
  };

  const startEditReq = (idx: number) => {
    setReqDraft({ ...requirements[idx] }); setEditingReqIdx(idx); setAddingReq(true);
  };

  const cancelReqForm = () => {
    setAddingReq(false); setEditingReqIdx(null); setReqDraft(EMPTY_REQ());
  };

  return (
    <AppShell>
      <style>{GI_STYLES}</style>
      <div style={{ color: "#fff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>

          <h1 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 32px" }}>
            {id ? "Edit service" : "Create a new service"}
          </h1>

          {/* ── Stepper ────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 36, flexWrap: "wrap", gap: 0 }}>
            {STEPS.map((label, i) => (
              <div key={label} style={{ display: "flex", alignItems: "center" }}>
                <button
                  onClick={() => setStep(i)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                    background: i < step ? "#22c55e" : i === step ? "#22c55e" : "#1e1e1e",
                    border: `2px solid ${i <= step ? "#22c55e" : "#333"}`,
                    color: i <= step ? "#000" : "#555",
                    transition: "all 0.2s",
                  }}>
                    {i < step ? <Check size={14} strokeWidth={3} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 11, color: i === step ? "#22c55e" : i < step ? "#888" : "#444", whiteSpace: "nowrap", fontWeight: i === step ? 600 : 400 }}>
                    {label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 32, height: 2, background: i < step ? "#22c55e" : "#222", margin: "0 2px", marginBottom: 22, transition: "background 0.2s", flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          {/* ── Step panel ─────────────────────────────── */}
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "32px 28px" }}>

            {/* STEP 0 — Overview */}
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <GiField label="Service title" hint="A catchy, specific title gets more clicks.">
                  <input className="gi-input" value={overview.title} maxLength={80}
                    onChange={(e) => setOverview({ ...overview, title: e.target.value })}
                    placeholder="I will build a custom AI chatbot for your business" />
                </GiField>
                <GiField label="Category">
                  <select className="gi-select" value={overview.category}
                    onChange={(e) => setOverview({ ...overview, category: e.target.value })}>
                    <option value="">Choose a category</option>
                    {categories.filter((c) => !c.parent_id).map((c) => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </GiField>
                <GiField label="Search tags" hint="Up to 5 tags, comma-separated. Helps buyers find you.">
                  <input className="gi-input" value={overview.tags}
                    onChange={(e) => setOverview({ ...overview, tags: e.target.value })}
                    placeholder="chatbot, ai automation, customer support" />
                </GiField>
              </div>
            )}

            {/* STEP 1 — Pricing */}
            {step === 1 && (
              <div>
                <p style={{ fontSize: 14, color: "#888", margin: "0 0 24px" }}>
                  Define up to three packages. Buyers choose one when ordering.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                  {packages.map((p, idx) => {
                    const cfg = PKG_CONFIG[p.package_type];
                    return (
                      <div key={p.package_type} style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                        {/* package header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 14, borderBottom: "1px solid #1e1e1e" }}>
                          <div style={{ width: 3, height: 20, borderRadius: 2, background: cfg.accent, flexShrink: 0 }} />
                          <span style={{ fontSize: 16, fontWeight: 500, color: "#fff" }}>{cfg.label}</span>
                        </div>

                        <GiField label="Package title">
                          <input className="gi-input" placeholder="e.g. Starter Package" value={p.title}
                            onChange={(e) => updatePkg(idx, { title: e.target.value })} />
                        </GiField>

                        <GiField label="Description">
                          <textarea className="gi-textarea" rows={2} placeholder="What's included in this package?" value={p.description}
                            onChange={(e) => updatePkg(idx, { description: e.target.value })} />
                        </GiField>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <GiField label="Price ($)">
                            <div className="gi-prefix-wrap">
                              <span className="gi-prefix">$</span>
                              <input className="gi-input" type="number" min={5} placeholder="0" value={p.price}
                                onChange={(e) => updatePkg(idx, { price: e.target.value })} />
                            </div>
                          </GiField>
                          <GiField label="Delivery (days)">
                            <div style={{ position: "relative" }}>
                              <input className="gi-input" type="number" min={1} placeholder="7" value={p.delivery_days}
                                style={{ paddingRight: 42 }}
                                onChange={(e) => updatePkg(idx, { delivery_days: e.target.value })} />
                              <span className="gi-suffix" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#555" }}>days</span>
                            </div>
                          </GiField>
                        </div>

                        <GiField label="Revisions">
                          <input className="gi-input" type="number" min={0} placeholder="1" value={p.revisions}
                            onChange={(e) => updatePkg(idx, { revisions: e.target.value })} />
                        </GiField>

                        <GiField label="Features" hint="Enter one feature per line">
                          <textarea className="gi-textarea" rows={4} placeholder={"Fast delivery\nSource files included\nUnlimited edits"} value={p.features}
                            onChange={(e) => updatePkg(idx, { features: e.target.value })} />
                        </GiField>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2 — Description */}
            {step === 2 && (
              <GiField label="Service description" hint="Describe your process, what's included, and what you need to get started.">
                <textarea className="gi-textarea" rows={12} value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell buyers what you offer, your process, what's included, and what's not…" />
              </GiField>
            )}

            {/* STEP 3 — Gallery */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <GiField label="Thumbnail" hint="The main image buyers see in search results.">
                  <div>
                    {thumbnail ? (
                      <div style={{ position: "relative", width: 160, height: 112, borderRadius: 10, overflow: "hidden", border: "1px solid #333" }}>
                        <img src={thumbnail} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                        <button onClick={() => setThumbnail("")} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.75)", border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 160, height: 112, borderRadius: 10, border: "2px dashed #333", cursor: "pointer", color: "#555", gap: 6, transition: "border-color 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#22c55e")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}>
                        <Upload size={20} />
                        <span style={{ fontSize: 12 }}>Upload image</span>
                        <input type="file" accept="image/*" onChange={onPickThumb} style={{ display: "none" }} />
                      </label>
                    )}
                  </div>
                </GiField>

                <GiField label="Gallery" hint="Up to 5 supporting images.">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {gallery.map((url, i) => (
                      <div key={i} style={{ position: "relative", width: 112, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #333" }}>
                        <img src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                        <button onClick={() => setGallery((g) => g.filter((_, j) => j !== i))} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.75)", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {gallery.length < 5 && (
                      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 112, height: 80, borderRadius: 8, border: "2px dashed #333", cursor: "pointer", color: "#555", gap: 4, transition: "border-color 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#22c55e")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#333")}>
                        <Upload size={16} />
                        <span style={{ fontSize: 11 }}>Add image</span>
                        <input type="file" accept="image/*" multiple onChange={onPickGallery} style={{ display: "none" }} />
                      </label>
                    )}
                  </div>
                </GiField>
              </div>
            )}

            {/* STEP 4 — Requirements */}
            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>What do you need from buyers to get started?</h3>
                  <p style={{ fontSize: 14, color: "#888", margin: 0 }}>Add questions buyers must answer before you begin working.</p>
                </div>

                {requirements.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {requirements.map((r, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, borderRadius: 10, border: "1px solid #1e1e1e", background: "#0d0d0d", padding: "14px 16px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 8px" }}>{r.question}</p>
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#1e1e1e", color: "#888" }}>{FIELD_TYPE_LABELS[r.field_type]}</span>
                            {r.is_required && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>Required</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button onClick={() => startEditReq(i)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")} onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setRequirements((arr) => arr.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")} onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {requirements.length === 0 && !addingReq && (
                  <p style={{ fontSize: 14, color: "#555" }}>No requirements added yet. Buyers can start without providing extra info.</p>
                )}

                {addingReq ? (
                  <div style={{ border: "1px solid #1e1e1e", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{editingReqIdx !== null ? "Edit requirement" : "New requirement"}</h4>
                    <GiField label={<>Question <span style={{ color: "#ef4444" }}>*</span></>}>
                      <input className="gi-input" value={reqDraft.question}
                        onChange={(e) => setReqDraft((d) => ({ ...d, question: e.target.value }))}
                        placeholder="e.g. What colors do you prefer?" />
                    </GiField>
                    <GiField label="Answer type">
                      <select className="gi-select" value={reqDraft.field_type}
                        onChange={(e) => setReqDraft((d) => ({ ...d, field_type: e.target.value as FieldType }))}>
                        <option value="text">Free text</option>
                        <option value="multiple_choice">Multiple choice</option>
                        <option value="file">File attachment</option>
                      </select>
                    </GiField>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#aaa" }}>
                      <input type="checkbox" checked={reqDraft.is_required} onChange={(e) => setReqDraft((d) => ({ ...d, is_required: e.target.checked }))} style={{ accentColor: "#22c55e" }} />
                      Required
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="gi-btn-sm" onClick={saveReqDraft}>Save</button>
                      <button className="gi-btn-ghost" onClick={cancelReqForm}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="gi-btn-outline" onClick={() => { setReqDraft(EMPTY_REQ()); setAddingReq(true); }} style={{ alignSelf: "flex-start" }}>
                    <Plus size={14} /> Add requirement
                  </button>
                )}
              </div>
            )}

            {/* STEP 5 — Publish */}
            {step === 5 && (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Ready to publish?</h3>
                <p style={{ fontSize: 14, color: "#888", margin: "0 0 28px" }}>Review the details below. You can edit your service any time after publishing.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    ["Title", overview.title || "—"],
                    ["Category", overview.category || "—"],
                    ["Starting price", packages[0].price ? `$${packages[0].price}` : "—"],
                    ["Packages", String(packages.filter((p) => p.title && p.price).length)],
                    ["Gallery images", String(gallery.length)],
                    ["Requirements", String(requirements.length)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "13px 0", borderBottom: "1px solid #1a1a1a", fontSize: 14 }}>
                      <span style={{ color: "#777" }}>{k}</span>
                      <span style={{ color: "#fff", fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Nav buttons ────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
            <button className="gi-btn-back" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              Back
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="gi-btn-draft" onClick={saveDraft} disabled={saving}>
                {saving ? "Saving…" : "Save draft"}
              </button>
              {step < STEPS.length - 1 ? (
                <button className="gi-btn-next" onClick={() => setStep(step + 1)}>Next →</button>
              ) : (
                <button className="gi-btn-next" onClick={submitForReview} disabled={saving}>
                  {saving ? "Publishing…" : "Publish service"}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}

/* ─── helpers ────────────────────────────────────────── */
function GiField({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="gi-label">{label}</label>
      {children}
      {hint && <p className="gi-hint">{hint}</p>}
    </div>
  );
}
