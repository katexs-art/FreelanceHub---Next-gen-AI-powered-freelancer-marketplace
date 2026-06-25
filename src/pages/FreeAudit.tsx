import { useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { FileUploadZone, UploadedFile } from "@/components/ui/FileUploadZone";

const AUDIT_TYPES = [
  "AI Automation Audit",
  "GoHighLevel CRM Audit",
  "Voice AI Audit",
  "Chat AI / Chatbot Audit",
  "Content & Copy Audit",
  "Lead Gen & Ads Audit",
];

export default function FreeAudit() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [form, setForm] = useState({ name: "", email: "", website: "", auditType: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);

  const field: React.CSSProperties = {
    width: "100%", padding: "11px 14px",
    background: "#111111", border: "1px solid #2a2a2a",
    borderRadius: 8, color: "#ffffff", fontSize: 14, outline: "none",
    boxSizing: "border-box",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <>
        <SEO title="Audit Requested — Katexs" />
        <SiteHeader />
        <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Audit Requested!</h1>
            <p style={{ color: "#888", fontSize: 15 }}>We'll send your free audit report to {form.email} within 24 hours.</p>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SEO title="Free Audit — Katexs" description="Get a free AI audit of your business from Katexs specialists." />
      <SiteHeader />
      <div style={{ background: "#0a0a0a", minHeight: "100vh", padding: "60px 24px 80px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{
            display: "inline-block", padding: "4px 12px",
            background: "#0d1f13", border: "1px solid #22c55e",
            borderRadius: 20, fontSize: 12, color: "#22c55e", marginBottom: 16,
          }}>
            Free · No credit card required
          </div>
          <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Get Your Free AI Audit</h1>
          <p style={{ color: "#888", fontSize: 15, marginBottom: 40 }}>We'll review your current setup and show you exactly where AI can save you time and money.</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Full Name</label>
                <input required style={field} placeholder="Jane Smith" value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#22c55e")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Email</label>
                <input required type="email" style={field} placeholder="you@company.com" value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#22c55e")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Website or App URL</label>
              <input style={field} placeholder="https://yoursite.com" value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#22c55e")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Audit Type</label>
              <select required style={{ ...field, cursor: "pointer" }} value={form.auditType}
                onChange={(e) => setForm((p) => ({ ...p, auditType: e.target.value }))}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#22c55e")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}>
                <option value="">Select an audit type…</option>
                {AUDIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Additional Notes (optional)</label>
              <textarea rows={4} style={{ ...field, resize: "vertical" }}
                placeholder="Tell us more about your business and what you want to improve…"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#22c55e")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Supporting Files (optional)</label>
              <FileUploadZone files={files} onChange={setFiles}
                label="Upload screenshots, reports, or any relevant files" maxFiles={8} />
            </div>
            <button type="submit" style={{
              padding: "13px 0", borderRadius: 8, background: "#22c55e",
              color: "#000", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
            }}>
              Get My Free Audit →
            </button>
          </form>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
