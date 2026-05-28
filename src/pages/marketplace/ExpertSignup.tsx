import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuthShell, inputStyle, labelStyle, btnNeon, btnOutline } from "@/components/marketplace/AuthShell";

const SPECIALTIES = ["AI Services", "GHL Builds", "Consulting", "Education", "Integrations", "AI Tools", "Funnels and Pages", "Reporting"];
const EXPERIENCE = ["1-2", "3-5", "5-10", "10+"];
const DELIVERY = ["1 day", "2-3 days", "1 week", "2 weeks", "custom"];
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Italian", "Mandarin", "Arabic"];

export default function ExpertSignup() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [basic, setBasic] = useState({
    full_name: "",
    email: "",
    password: "",
    specialty: "",
    years_experience: "",
    bio: "",
  });

  const [profile, setProfile] = useState({
    portfolio: ["", "", ""],
    starting_price: 50,
    delivery_time: "2-3 days",
    languages: [] as string[],
  });

  const upBasic = (k: string, v: string) => setBasic((s) => ({ ...s, [k]: v }));

  const submitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (basic.password.length < 8) return toast.error("Password must be at least 8 characters");
    if (basic.bio.length > 300) return toast.error("Bio must be 300 characters or less");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: basic.email,
      password: basic.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard/expert`,
        data: { full_name: basic.full_name, role: "expert" },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (!data.user) return toast.error("Signup failed");
    setUserId(data.user.id);
    setStep(2);
  };

  const submitStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase.from("experts" as any).insert({
      id: userId,
      bio: basic.bio,
      specialty: basic.specialty,
      years_experience: basic.years_experience,
      starting_price: profile.starting_price,
      delivery_time: profile.delivery_time,
      languages: profile.languages,
      portfolio_links: profile.portfolio.filter((p) => p.trim()),
      status: "pending",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Application submitted. We'll review it shortly.");
    nav("/expert/pending");
  };

  const toggleLang = (lang: string) =>
    setProfile((p) => ({
      ...p,
      languages: p.languages.includes(lang) ? p.languages.filter((l) => l !== lang) : [...p.languages, lang],
    }));

  if (step === 1) {
    return (
      <AuthShell
        title="Apply as an expert"
        subtitle="Step 1 of 2 — Basic info"
        footer={<>Already on Katexs? <Link to="/login" style={{ color: "#caff00" }}>Log in</Link></>}
      >
        <form onSubmit={submitStep1} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label style={labelStyle}>Full name</label><input style={inputStyle} required value={basic.full_name} onChange={(e) => upBasic("full_name", e.target.value)} /></div>
          <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} required value={basic.email} onChange={(e) => upBasic("email", e.target.value)} /></div>
          <div><label style={labelStyle}>Password</label><input type="password" style={inputStyle} required minLength={8} value={basic.password} onChange={(e) => upBasic("password", e.target.value)} /></div>
          <div>
            <label style={labelStyle}>Primary specialty</label>
            <select style={inputStyle} required value={basic.specialty} onChange={(e) => upBasic("specialty", e.target.value)}>
              <option value="">Select…</option>
              {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Years of experience</label>
            <select style={inputStyle} required value={basic.years_experience} onChange={(e) => upBasic("years_experience", e.target.value)}>
              <option value="">Select…</option>
              {EXPERIENCE.map((y) => <option key={y} value={y}>{y} years</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Brief bio ({basic.bio.length}/300)</label>
            <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} maxLength={300} value={basic.bio} onChange={(e) => upBasic("bio", e.target.value)} />
          </div>
          <button type="submit" disabled={loading} style={{ ...btnNeon, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Saving…" : "Continue to profile setup"}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Profile setup" subtitle="Step 2 of 2 — Tell clients about your service">
      <form onSubmit={submitStep2} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Portfolio links (up to 3)</label>
          {profile.portfolio.map((url, i) => (
            <input key={i} placeholder="https://…" style={{ ...inputStyle, marginBottom: 8 }} value={url}
              onChange={(e) => setProfile((p) => ({ ...p, portfolio: p.portfolio.map((u, j) => j === i ? e.target.value : u) }))} />
          ))}
        </div>
        <div>
          <label style={labelStyle}>Starting price for base service ($)</label>
          <input type="number" min={50} style={inputStyle} value={profile.starting_price}
            onChange={(e) => setProfile((p) => ({ ...p, starting_price: Math.max(50, parseInt(e.target.value) || 50) }))} />
        </div>
        <div>
          <label style={labelStyle}>Delivery time</label>
          <select style={inputStyle} value={profile.delivery_time}
            onChange={(e) => setProfile((p) => ({ ...p, delivery_time: e.target.value }))}>
            {DELIVERY.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Languages spoken</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {LANGUAGES.map((lang) => {
              const active = profile.languages.includes(lang);
              return (
                <button type="button" key={lang} onClick={() => toggleLang(lang)}
                  style={{
                    background: active ? "#caff00" : "transparent",
                    color: active ? "#000" : "#fff",
                    border: `1px solid ${active ? "#caff00" : "#2a2a2a"}`,
                    borderRadius: 999, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  }}>
                  {lang}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={() => setStep(1)} style={btnOutline}>Back</button>
          <button type="submit" disabled={loading} style={{ ...btnNeon, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Submitting…" : "Submit application"}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
