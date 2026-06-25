import { useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { FileUploadZone, UploadedFile } from "@/components/ui/FileUploadZone";

export default function Submit() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [form, setForm] = useState({ name: "", email: "", description: "" });
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
        <SEO title="Project Submitted — Katexs" />
        <SiteHeader />
        <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Project Submitted!</h1>
            <p style={{ color: "#888", fontSize: 15 }}>Your AI specialist starts tomorrow. We'll reach out to {form.email} within 24 hours.</p>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SEO title="Submit Your Project — Katexs" description="Submit your project and your AI specialist starts tomorrow." />
      <SiteHeader />
      <div style={{ background: "#0a0a0a", minHeight: "100vh", padding: "60px 24px 80px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Submit Your Project</h1>
          <p style={{ color: "#888", fontSize: 15, marginBottom: 40 }}>Your AI specialist starts tomorrow.</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Project Description</label>
              <textarea required rows={5} style={{ ...field, resize: "vertical" }}
                placeholder="Describe your project, goals, and any specific requirements…"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#22c55e")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Attachments (optional)</label>
              <FileUploadZone files={files} onChange={setFiles}
                label="Drag & drop files here, or click to browse" maxFiles={10} />
            </div>
            <button type="submit" style={{
              padding: "13px 0", borderRadius: 8, background: "#22c55e",
              color: "#000", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
            }}>
              Submit Your Project →
            </button>
          </form>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
