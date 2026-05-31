import { useState, KeyboardEvent, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { toast } from "@/hooks/use-toast";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#333333",
  marginBottom: 8,
};

const baseField: React.CSSProperties = {
  width: "100%",
  background: "#FFFFFF",
  border: "1.5px solid #CCCCCC",
  borderRadius: 12,
  fontSize: 15,
  color: "#0A0A0A",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

const inputStyle: React.CSSProperties = {
  ...baseField,
  height: 52,
  padding: "0 16px",
};

const textareaStyle: React.CSSProperties = {
  ...baseField,
  padding: "14px 16px",
  minHeight: 140,
  resize: "vertical",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%230A0A0A' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 16px center",
  paddingRight: 44,
};

export default function PostJob() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: categories } = useCategories();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"open" | "river">("open");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addSkill = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      const t = skillInput.trim();
      if (!skills.includes(t)) setSkills([...skills, t]);
      setSkillInput("");
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("message-attachments").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("message-attachments").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setAttachments([...attachments, ...urls]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !desc.trim()) {
      toast({ title: "Title and description are required" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("project_posts").insert({
      buyer_id: user.id,
      title: title.trim(),
      description: desc.trim(),
      category: category || null,
      skills,
      budget_min: min ? parseInt(min, 10) : null,
      budget_max: max ? parseInt(max, 10) : null,
      deadline: deadline || null,
      attachments,
      visibility,
      status: "open",
      bid_count: 0,
    }).select("id").maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: "Could not post Project", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Project posted" });
    nav(data?.id ? `/projects/${data.id}/bids` : "/projects");
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "#0A0A0A";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.06)";
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "#CCCCCC";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteHeader />
      <style>{`.pj-input::placeholder{color:#AAAAAA;}`}</style>
      <main className="flex-1 w-full" style={{ background: "#FFFFFF" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: "#0A0A0A", marginBottom: 8, lineHeight: 1.2 }}>
            Post a Project
          </h1>
          <p style={{ fontSize: 15, color: "#666666", marginBottom: 40 }}>
            Describe what you need — top Experts will submit Proposals within hours
          </p>

          <form onSubmit={submit} className="space-y-6">
            <div>
              <label style={labelStyle}>Project Title</label>
              <input
                className="pj-input"
                style={inputStyle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Example: Build me a Voice AI caller for my real estate business"
              />
            </div>

            <div>
              <label style={labelStyle}>Describe your project</label>
              <textarea
                className="pj-input"
                style={textareaStyle}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Tell Experts exactly what you need. Include your goals, tools you use, what you want delivered, and any specific requirements. The more detail you give the better Proposals you will receive."
              />
            </div>

            <div>
              <label style={labelStyle}>Service Category</label>
              <select
                className="pj-input"
                style={selectStyle}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
              >
                <option value="">Select a category</option>
                {categories.filter((c) => !c.parent_id).map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Required Skills</label>
              <input
                className="pj-input"
                style={inputStyle}
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={addSkill}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Type a skill and press Enter — example: Voice AI, GoHighLevel, Chatbot"
              />
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
                  {skills.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setSkills(skills.filter((x) => x !== s))}
                      style={{
                        background: "#F7F7F7",
                        border: "1px solid #EBEBEB",
                        borderRadius: 12,
                        padding: "6px 12px",
                        fontSize: 13,
                        color: "#0A0A0A",
                      }}
                    >
                      {s} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Your Budget</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="pj-input"
                  style={inputStyle}
                  type="number"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Min $"
                />
                <input
                  className="pj-input"
                  style={inputStyle}
                  type="number"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="Max $"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Delivery Deadline</label>
              <input
                className="pj-input"
                style={inputStyle}
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            <div>
              <label style={labelStyle}>Attachments (optional)</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: "2px dashed #CCCCCC",
                  borderRadius: 12,
                  padding: 32,
                  textAlign: "center",
                  color: "#888888",
                  fontSize: 14,
                  cursor: "pointer",
                  background: "#FFFFFF",
                }}
              >
                Drag files here or click to upload. Accepts PDF, images, and documents.
              </div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.txt"
                onChange={(e) => handleFiles(e.target.files)}
                style={{ display: "none" }}
              />
              {attachments.length > 0 && (
                <div style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
                  {attachments.length} file(s) attached
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Who can submit a Proposal?</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "open" as const, t: "Open to all Experts", s: "Any approved Expert can submit a Proposal" },
                  { v: "river" as const, t: "River matched only", s: "Only River's top matches get notified" },
                ].map((opt) => {
                  const selected = visibility === opt.v;
                  return (
                    <div
                      key={opt.v}
                      onClick={() => setVisibility(opt.v)}
                      style={{
                        border: `1.5px solid ${selected ? "#0A0A0A" : "#CCCCCC"}`,
                        background: selected ? "#F7F7F7" : "#FFFFFF",
                        borderRadius: 12,
                        padding: 16,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", marginBottom: 4 }}>{opt.t}</div>
                      <div style={{ fontSize: 13, color: "#666" }}>{opt.s}</div>
                      <input type="radio" checked={selected} onChange={() => setVisibility(opt.v)} style={{ display: "none" }} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 32 }}>
              <button
                type="submit"
                disabled={saving}
                onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = "#333333"; }}
                onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = "#0A0A0A"; }}
                style={{
                  width: "100%",
                  height: 56,
                  background: "#0A0A0A",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Posting…" : "Post My Project"}
              </button>
              <div style={{ fontSize: 12, color: "#AAAAAA", textAlign: "center", marginTop: 12 }}>
                Free to post · Experts will be notified immediately · You only pay when you accept a Proposal
              </div>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
