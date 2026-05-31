import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useAuth } from "@/hooks/useAuth";
import { useCategories, Category } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Plus, X } from "lucide-react";

/* ---------- shared styles ---------- */
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#333333",
  marginBottom: 8,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#FFFFFF",
  border: "1.5px solid #CCCCCC",
  borderRadius: 12,
  height: 52,
  padding: "0 16px",
  fontSize: 15,
  color: "#0A0A0A",
  outline: "none",
  transition: "border-color 0.15s",
};
const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: "auto",
  minHeight: 120,
  padding: "14px 16px",
  resize: "vertical" as const,
};
const onFocus = (e: React.FocusEvent<any>) => (e.currentTarget.style.borderColor = "#0A0A0A");
const onBlur = (e: React.FocusEvent<any>) => (e.currentTarget.style.borderColor = "#CCCCCC");

const LANGUAGES = ["English", "Spanish", "French", "Portuguese", "Arabic", "Mandarin", "Hindi", "Other"];
const EXPERIENCE_OPTIONS = ["Less than 1 year", "1 to 3 years", "3 to 5 years", "5+ years"];
const SUGGESTED_SKILLS = [
  "Voice AI", "GoHighLevel", "ChatGPT", "Claude API", "Zapier", "Make", "Python",
  "React", "Midjourney", "Stable Diffusion", "VAPI", "Bland AI", "ElevenLabs", "n8n", "Webflow",
];

type PkgState = {
  name: string;
  description: string;
  price: string;
  delivery_days: string;
  revisions: string;
  deliverables: string[];
};

const initialPkg = (name: string): PkgState => ({
  name,
  description: "",
  price: "",
  delivery_days: "",
  revisions: "1",
  deliverables: [],
});

/* ---------- Smart category search ---------- */
function SmartCategorySearch({
  value,
  slug,
  onChange,
  placeholder,
  categories,
}: {
  value: string;
  slug: string;
  onChange: (text: string, slug: string) => void;
  placeholder: string;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(() => {
    const m = new Map<string, Category>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return categories.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8);
  }, [categories, value]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        style={inputStyle}
        value={value}
        onChange={(e) => { onChange(e.target.value, ""); setOpen(true); }}
        onFocus={(e) => { onFocus(e); setOpen(true); }}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      <input type="hidden" value={slug} readOnly />
      {open && value.trim().length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#FFFFFF", border: "1px solid #EBEBEB", borderRadius: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)", maxHeight: 280, overflowY: "auto", zIndex: 50,
        }}>
          {suggestions.length === 0 ? (
            <div style={{ padding: "12px 16px", fontSize: 13, color: "#AAAAAA" }}>
              No category found — your application will still be reviewed
            </div>
          ) : suggestions.map((c) => {
            const parent = c.parent_id ? byId.get(c.parent_id) : null;
            const isHover = hover === c.id;
            return (
              <div
                key={c.id}
                onMouseDown={(e) => { e.preventDefault(); onChange(c.name, c.slug); setOpen(false); }}
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover((h) => (h === c.id ? null : h))}
                style={{ padding: "12px 16px", cursor: "pointer", background: isHover ? "#F7F7F7" : "transparent" }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: "#0A0A0A" }}>{c.name}</div>
                {parent && <div style={{ fontSize: 11, color: "#AAAAAA", marginTop: 2 }}>{parent.name}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Tag input ---------- */
function TagInput({
  tags, setTags, placeholder,
}: { tags: string[]; setTags: (t: string[]) => void; placeholder: string }) {
  const [val, setVal] = useState("");
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t || tags.includes(t)) { setVal(""); return; }
    setTags([...tags, t]);
    setVal("");
  };
  const remove = (t: string) => setTags(tags.filter((x) => x !== t));
  return (
    <div>
      <input
        style={inputStyle}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") { e.preventDefault(); add(val); }
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
      />
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {tags.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => remove(t)}
              style={{
                background: "#0A0A0A", color: "#FFFFFF", border: "none",
                borderRadius: 999, padding: "6px 12px", fontSize: 13,
                display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
              }}
            >
              {t} <X size={12} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Page ---------- */
export default function BecomeSeller() {
  const { user, profile, loading, refresh } = useAuth();
  const nav = useNavigate();
  const { data: categories } = useCategories();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("English");

  // Step 2
  const [primaryCatName, setPrimaryCatName] = useState("");
  const [primaryCatSlug, setPrimaryCatSlug] = useState("");
  const [secondaryCatName, setSecondaryCatName] = useState("");
  const [secondaryCatSlug, setSecondaryCatSlug] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [years, setYears] = useState("");
  const [portfolioFiles, setPortfolioFiles] = useState<string[]>([]);
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([""]);

  // Step 3
  const [pkgBasic, setPkgBasic] = useState<PkgState>(initialPkg("Basic"));
  const [pkgStandard, setPkgStandard] = useState<PkgState>(initialPkg("Standard"));
  const [pkgPremium, setPkgPremium] = useState<PkgState>(initialPkg("Premium"));

  // Step 4
  const [confirmChecked, setConfirmChecked] = useState(false);

  // Prefill name from profile
  useEffect(() => {
    if (profile && !fullName) setFullName(profile.full_name || "");
    if (profile?.avatar_url && !avatarUrl) setAvatarUrl(profile.avatar_url);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null;
  if (!user) return <Navigate to="/login?redirect=/become-a-seller" replace />;
  if (profile?.seller_status === "approved") return <Navigate to="/seller/dashboard" replace />;
  if (profile?.seller_status === "pending_approval") return <Navigate to="/seller/dashboard" replace />;

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    if (!["image/jpeg", "image/png"].includes(file.type)) return toast.error("JPG or PNG only");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
  };

  const uploadPortfolio = async (files: FileList | null) => {
    if (!files || !user) return;
    const remaining = 4 - portfolioFiles.length;
    const arr = Array.from(files).slice(0, remaining);
    const urls: string[] = [];
    for (const f of arr) {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} exceeds 10MB`); continue; }
      const path = `${user.id}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from("seller-portfolio").upload(path, f);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("seller-portfolio").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setPortfolioFiles([...portfolioFiles, ...urls]);
  };

  const canNext1 = fullName.trim() && headline.trim() && bio.trim().length >= 100 && location.trim() && language;
  const canNext2 = primaryCatName.trim() && skills.length >= 3 && years;
  const canNext3 = pkgBasic.name.trim() && pkgBasic.description.trim() && Number(pkgBasic.price) > 0 && Number(pkgBasic.delivery_days) > 0;
  const canSubmit = confirmChecked && !submitting;

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    const pkgs = [pkgBasic, pkgStandard, pkgPremium]
      .filter((p, i) => i === 0 || (p.description.trim() && Number(p.price) > 0))
      .map((p, i) => ({
        tier: ["basic", "standard", "premium"][i],
        title: p.name,
        description: p.description,
        price: Math.round(Number(p.price) * 100),
        delivery_days: Number(p.delivery_days) || 7,
        revisions: Number(p.revisions) || 1,
        deliverables: p.deliverables,
      }));
    const cleanLinks = portfolioLinks.map((l) => l.trim()).filter(Boolean);
    const experienceDescription =
      `${headline.trim()}\n\nExperience: ${years}\n\n${bio.trim()}`;

    const { error } = await supabase.rpc("submit_seller_application" as any, {
      _full_name: fullName,
      _avatar_url: avatarUrl,
      _bio: `${headline.trim()}\n\n${bio.trim()}`,
      _location: location,
      _languages: [language],
      _skills: skills,
      _primary_category: primaryCatSlug || primaryCatName,
      _secondary_category: secondaryCatSlug || secondaryCatName || null,
      _packages: pkgs as any,
      _portfolio_urls: [...portfolioFiles, ...cleanLinks],
      _experience_description: experienceDescription,
    });
    if (error) { setSubmitting(false); return toast.error(error.message); }

    // In-app notification to applicant
    try {
      await supabase.rpc("create_notification" as any, {
        _user: user.id,
        _type: "system",
        _title: "Your Expert application has been received. We will review it within 24 hours and notify you by email.",
        _body: null,
        _link: "/seller/dashboard",
      });
    } catch { /* non-blocking */ }

    setSubmitting(false);
    setSubmitted(true);
    await refresh();
  };

  /* ---------- Success view ---------- */
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0A0A0A" }}>
        <SiteHeader />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 520, background: "#FFFFFF", borderRadius: 20, padding: 48, textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", background: "#16A34A",
              display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
            }}>
              <Check color="#fff" size={36} strokeWidth={3} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 600, color: "#0A0A0A", marginBottom: 12 }}>Application submitted</h1>
            <p style={{ fontSize: 15, color: "#666666", marginBottom: 28 }}>We will be in touch within 24 hours.</p>
            <button
              onClick={() => nav("/")}
              style={{
                background: "#0A0A0A", color: "#FFF", border: "none", borderRadius: 12,
                height: 48, padding: "0 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >Back to Katexs</button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  /* ---------- Progress ---------- */
  const stepLabels = ["About You", "Your Skills", "Your Packages", "Submit"];
  const Progress = () => (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 36 }}>
      {stepLabels.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <div key={label} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {done ? (
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%", background: "#16A34A",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}><Check size={12} color="#fff" strokeWidth={3} /></span>
                ) : (
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: `1.5px solid ${active ? "#0A0A0A" : "#DDDDDD"}`,
                    background: active ? "#0A0A0A" : "#FFF",
                    color: active ? "#FFF" : "#AAA",
                    fontSize: 10, fontWeight: 700,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>{n}</span>
                )}
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: done ? "#16A34A" : active ? "#0A0A0A" : "#AAAAAA",
                  borderBottom: active ? "2px solid #0A0A0A" : "none",
                  paddingBottom: 2,
                }}>{label}</span>
              </div>
              <div style={{
                height: 2, background: n <= step ? "#16A34A" : "#EBEBEB",
                borderRadius: 2,
              }} />
            </div>
            {i < stepLabels.length - 1 && <div style={{ width: 8 }} />}
          </div>
        );
      })}
    </div>
  );

  const NextButton = ({ disabled, label, onClick }: { disabled: boolean; label: string; onClick: () => void }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: "100%", height: 52, background: "#0A0A0A", color: "#FFF",
        border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, marginTop: 24,
      }}
    >{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#0A0A0A" }}>
      <SiteHeader />
      <style>{`.bs-input::placeholder{color:#AAA}`}</style>

      <main style={{ flex: 1, width: "100%" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px" }}>
          {/* Hero */}
          <div style={{ textAlign: "center", paddingBottom: 48 }}>
            <div style={{
              display: "inline-block", border: "1px solid #1E1E1E", background: "#111111",
              color: "#AAAAAA", fontSize: 11, letterSpacing: "0.12em",
              padding: "6px 16px", borderRadius: 999, marginBottom: 20,
            }}>APPLY TO BECOME AN EXPERT ON KATEXS</div>
            <h1 style={{
              fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 500, color: "#FFFFFF",
              lineHeight: 1.1, marginBottom: 16,
            }}>Turn your AI skills into income.</h1>
            <p style={{
              fontSize: 16, color: "#777777", maxWidth: 520,
              margin: "0 auto 32px",
            }}>
              Join our vetted community of AI experts. Get matched to Partners who need exactly what you offer. Get paid within 3 days.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
              {[
                { n: "3 days", l: "Average payout time" },
                { n: "Free", l: "To apply and join" },
                { n: "90%", l: "You keep per project" },
              ].map((s) => (
                <div key={s.l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: "#FFF" }}>{s.n}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Form card */}
          <div style={{
            background: "#FFFFFF", borderRadius: 20, padding: 48,
            maxWidth: 680, margin: "0 auto",
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: "#0A0A0A", marginBottom: 6 }}>
              Your Expert Application
            </h2>
            <p style={{ fontSize: 14, color: "#888888", marginBottom: 32 }}>
              Takes about 5 minutes. We review within 24 hours.
            </p>

            <Progress />

            {/* STEP 1 */}
            {step === 1 && (
              <div className="bs-input" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input className="bs-input" style={inputStyle} value={fullName}
                    onChange={(e) => setFullName(e.target.value)} onFocus={onFocus} onBlur={onBlur}
                    placeholder="Your legal first and last name" />
                </div>

                <div>
                  <label style={labelStyle}>Profile Photo</label>
                  <label style={{ display: "inline-block", cursor: "pointer" }}>
                    <input type="file" accept="image/jpeg,image/png" style={{ display: "none" }}
                      onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                    <div style={{
                      width: 80, height: 80, borderRadius: "50%",
                      background: avatarUrl ? `url(${avatarUrl}) center/cover` : "#F7F7F7",
                      border: "1.5px dashed #CCCCCC",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {!avatarUrl && <Plus color="#888" size={22} />}
                    </div>
                  </label>
                </div>

                <div>
                  <label style={labelStyle}>Your Headline</label>
                  <input className="bs-input" style={inputStyle} value={headline}
                    onChange={(e) => setHeadline(e.target.value.slice(0, 80))}
                    onFocus={onFocus} onBlur={onBlur}
                    placeholder="Example: Voice AI specialist — I build GHL callers and conversational agents" />
                  <div style={{ fontSize: 12, color: "#888", marginTop: 6, textAlign: "right" }}>{headline.length}/80</div>
                </div>

                <div>
                  <label style={labelStyle}>Tell Partners about yourself</label>
                  <textarea className="bs-input" style={textareaStyle} value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 500))}
                    onFocus={onFocus} onBlur={onBlur}
                    placeholder="Describe your background, what you specialize in, what you have built, and what results you deliver for clients. Be specific." />
                  <div style={{ fontSize: 12, color: bio.length < 100 ? "#C44" : "#888", marginTop: 6, textAlign: "right" }}>
                    {bio.length}/500 (min 100)
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Location</label>
                  <input className="bs-input" style={inputStyle} value={location}
                    onChange={(e) => setLocation(e.target.value)} onFocus={onFocus} onBlur={onBlur}
                    placeholder="City, Country" />
                </div>

                <div>
                  <label style={labelStyle}>Primary Language</label>
                  <select style={{ ...inputStyle, appearance: "none", paddingRight: 44 }} value={language}
                    onChange={(e) => setLanguage(e.target.value)} onFocus={onFocus} onBlur={onBlur}>
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <NextButton disabled={!canNext1} label="Next — Your Skills →" onClick={() => setStep(2)} />
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="bs-input" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <div>
                  <label style={labelStyle}>Primary Service Category</label>
                  <SmartCategorySearch
                    value={primaryCatName}
                    slug={primaryCatSlug}
                    onChange={(t, s) => { setPrimaryCatName(t); setPrimaryCatSlug(s); }}
                    placeholder="Type to search — example: Voice AI, GHL, Automation..."
                    categories={categories}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Secondary Category (optional)</label>
                  <SmartCategorySearch
                    value={secondaryCatName}
                    slug={secondaryCatSlug}
                    onChange={(t, s) => { setSecondaryCatName(t); setSecondaryCatSlug(s); }}
                    placeholder="Type to search — example: Voice AI, GHL, Automation..."
                    categories={categories}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Your Skills and Tools</label>
                  <TagInput tags={skills} setTags={setSkills} placeholder="Type a skill and press Enter" />
                  <div style={{ fontSize: 12, color: skills.length < 3 ? "#C44" : "#888", marginTop: 6 }}>
                    {skills.length} added · minimum 3 required
                  </div>
                  <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).map((s) => (
                      <button type="button" key={s} onClick={() => setSkills([...skills, s])}
                        style={{
                          background: "#F7F7F7", border: "1px solid #EBEBEB", color: "#0A0A0A",
                          borderRadius: 999, padding: "6px 12px", fontSize: 13, cursor: "pointer",
                        }}>+ {s}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Years of Experience</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {EXPERIENCE_OPTIONS.map((opt) => {
                      const sel = years === opt;
                      return (
                        <button type="button" key={opt} onClick={() => setYears(opt)}
                          style={{
                            background: sel ? "#0A0A0A" : "#FFF",
                            color: sel ? "#FFF" : "#0A0A0A",
                            border: `1.5px solid ${sel ? "#0A0A0A" : "#CCCCCC"}`,
                            borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 500,
                            cursor: "pointer",
                          }}>{opt}</button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Portfolio Samples (optional but recommended)</label>
                  <label style={{ display: "block", cursor: "pointer" }}>
                    <input type="file" multiple accept="image/*,application/pdf" style={{ display: "none" }}
                      onChange={(e) => uploadPortfolio(e.target.files)} />
                    <div style={{
                      border: "2px dashed #DDDDDD", borderRadius: 12, padding: 32,
                      textAlign: "center", fontSize: 14, color: "#888", background: "#FFF",
                    }}>Upload up to 4 samples of your work. Images or PDFs.</div>
                  </label>
                  {portfolioFiles.length > 0 && (
                    <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>{portfolioFiles.length} file(s) uploaded</div>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Portfolio Links (optional)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {portfolioLinks.map((link, i) => (
                      <input key={i} className="bs-input" style={inputStyle} value={link}
                        onChange={(e) => {
                          const copy = [...portfolioLinks]; copy[i] = e.target.value; setPortfolioLinks(copy);
                        }}
                        onFocus={onFocus} onBlur={onBlur}
                        placeholder="https://yourportfolio.com or link to past work" />
                    ))}
                    {portfolioLinks.length < 3 && (
                      <button type="button" onClick={() => setPortfolioLinks([...portfolioLinks, ""])}
                        style={{
                          alignSelf: "flex-start", background: "transparent", border: "none",
                          color: "#0A0A0A", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0,
                        }}>+ Add another link</button>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button type="button" onClick={() => setStep(1)}
                    style={{
                      flex: "0 0 auto", height: 52, padding: "0 24px", background: "#FFF",
                      color: "#0A0A0A", border: "1.5px solid #CCCCCC", borderRadius: 12,
                      fontSize: 15, fontWeight: 600, cursor: "pointer",
                    }}>← Back</button>
                  <button type="button" disabled={!canNext2} onClick={() => setStep(3)}
                    style={{
                      flex: 1, height: 52, background: "#0A0A0A", color: "#FFF", border: "none",
                      borderRadius: 12, fontSize: 15, fontWeight: 600,
                      cursor: canNext2 ? "pointer" : "not-allowed", opacity: canNext2 ? 1 : 0.4,
                    }}>Next — Your Packages →</button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 6 }}>
                  Set up to 3 service packages. Partners will choose from these when hiring you. Basic is required.
                </p>
                {[
                  { state: pkgBasic, set: setPkgBasic, required: true },
                  { state: pkgStandard, set: setPkgStandard, required: false },
                  { state: pkgPremium, set: setPkgPremium, required: false },
                ].map(({ state, set, required }) => (
                  <PackageCard key={state.name} state={state} set={set} required={required} />
                ))}

                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={() => setStep(2)}
                    style={{
                      flex: "0 0 auto", height: 52, padding: "0 24px", background: "#FFF",
                      color: "#0A0A0A", border: "1.5px solid #CCCCCC", borderRadius: 12,
                      fontSize: 15, fontWeight: 600, cursor: "pointer",
                    }}>← Back</button>
                  <button type="button" disabled={!canNext3} onClick={() => setStep(4)}
                    style={{
                      flex: 1, height: 52, background: "#0A0A0A", color: "#FFF", border: "none",
                      borderRadius: 12, fontSize: 15, fontWeight: 600,
                      cursor: canNext3 ? "pointer" : "not-allowed", opacity: canNext3 ? 1 : 0.4,
                    }}>Next — Submit →</button>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{
                  background: "#FFF", border: "1px solid #EBEBEB", borderRadius: 16, padding: 32,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: "50%",
                      background: avatarUrl ? `url(${avatarUrl}) center/cover` : "#F7F7F7",
                      border: "1px solid #EBEBEB",
                    }} />
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 600, color: "#0A0A0A" }}>{fullName || "—"}</div>
                      <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>{headline}</div>
                    </div>
                  </div>
                  <SummaryRow label="Primary category" value={primaryCatName || "—"} />
                  <SummaryRow label="Location" value={location} />
                  <SummaryRow label="Language" value={language} />
                  <SummaryRow label="Experience" value={years} />
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Skills</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {skills.map((s) => (
                        <span key={s} style={{
                          background: "#F7F7F7", border: "1px solid #EBEBEB",
                          borderRadius: 999, padding: "4px 10px", fontSize: 12, color: "#0A0A0A",
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {[pkgBasic, pkgStandard, pkgPremium].filter((p) => Number(p.price) > 0).map((p) => (
                      <div key={p.name} style={{
                        border: "1px solid #EBEBEB", borderRadius: 12, padding: "10px 14px", minWidth: 120,
                      }}>
                        <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{p.name}</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: "#0A0A0A" }}>${p.price}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#0A0A0A", cursor: "pointer" }}>
                  <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)}
                    style={{ marginTop: 3 }} />
                  <span>I confirm all information is accurate and I agree to the Katexs Expert Terms</span>
                </label>

                <div style={{ display: "flex", gap: 12 }}>
                  <button type="button" onClick={() => setStep(3)}
                    style={{
                      flex: "0 0 auto", height: 56, padding: "0 24px", background: "#FFF",
                      color: "#0A0A0A", border: "1.5px solid #CCCCCC", borderRadius: 12,
                      fontSize: 15, fontWeight: 600, cursor: "pointer",
                    }}>← Back</button>
                  <button type="button" disabled={!canSubmit} onClick={submit}
                    style={{
                      flex: 1, height: 56,
                      background: canSubmit ? "#16A34A" : "#CCCCCC",
                      color: "#FFFFFF", border: "none", borderRadius: 12,
                      fontSize: 16, fontWeight: 600,
                      cursor: canSubmit ? "pointer" : "not-allowed",
                    }}>{submitting ? "Submitting…" : "Submit My Application"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #F0F0F0", fontSize: 13 }}>
      <span style={{ color: "#888" }}>{label}</span>
      <span style={{ color: "#0A0A0A", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{value || "—"}</span>
    </div>
  );
}

function PackageCard({
  state, set, required,
}: { state: PkgState; set: (p: PkgState) => void; required: boolean }) {
  return (
    <div style={{
      background: "#FFF",
      border: `1.5px solid ${required ? "#0A0A0A" : "#EBEBEB"}`,
      borderRadius: 16, padding: 24, position: "relative",
    }}>
      {!required && (
        <span style={{
          position: "absolute", top: 16, right: 16,
          background: "#F7F7F7", color: "#888", fontSize: 11,
          padding: "4px 10px", borderRadius: 999, fontWeight: 500,
        }}>Optional</span>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Package name</label>
          <input style={inputStyle} value={state.name}
            onChange={(e) => set({ ...state, name: e.target.value })}
            onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea style={textareaStyle} value={state.description}
            onChange={(e) => set({ ...state, description: e.target.value })}
            onFocus={onFocus} onBlur={onBlur}
            placeholder="Describe exactly what is included in this package." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label style={labelStyle}>Price</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: 15 }}>$</span>
              <input type="number" min={1} style={{ ...inputStyle, paddingLeft: 28 }} value={state.price}
                onChange={(e) => set({ ...state, price: e.target.value })}
                onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Delivery</label>
            <div style={{ position: "relative" }}>
              <input type="number" min={1} style={{ ...inputStyle, paddingRight: 52 }} value={state.delivery_days}
                onChange={(e) => set({ ...state, delivery_days: e.target.value })}
                onFocus={onFocus} onBlur={onBlur} />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#888", fontSize: 13 }}>days</span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Revisions</label>
            <input type="number" min={0} style={inputStyle} value={state.revisions}
              onChange={(e) => set({ ...state, revisions: e.target.value })}
              onFocus={onFocus} onBlur={onBlur} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Deliverables</label>
          <TagInput
            tags={state.deliverables}
            setTags={(t) => set({ ...state, deliverables: t })}
            placeholder="Type a deliverable and press Enter"
          />
        </div>
      </div>
    </div>
  );
}
