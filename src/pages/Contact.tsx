import { useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { FileUploadZone, UploadedFile } from "@/components/ui/FileUploadZone";
import { Mail, MessageSquare, Zap } from "lucide-react";

const SUBJECTS = [
  "General Enquiry",
  "Partnership / Collaboration",
  "Press & Media",
  "Billing Support",
  "Technical Issue",
  "Other",
];

export default function Contact() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
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
        <SEO title="Message Sent — Katexs" />
        <SiteHeader />
        <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📨</div>
            <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Message Sent!</h1>
            <p style={{ color: "#888", fontSize: 15 }}>We'll get back to {form.email} within 24 hours.</p>
          </div>
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SEO title="Contact — Katexs" description="Get in touch with the Katexs team." />
      <SiteHeader />
      <div style={{ background: "#0a0a0a", minHeight: "100vh", padding: "60px 24px 80px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 340px", gap: 48, alignItems: "start" }}>

          <div>
            <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Contact Us</h1>
            <p style={{ color: "#888", fontSize: 15, marginBottom: 40 }}>We usually respond within a few hours.</p>

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
                <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Subject</label>
                <select required style={{ ...field, cursor: "pointer" }} value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#22c55e")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}>
                  <option value="">Select a subject…</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Message</label>
                <textarea required rows={5} style={{ ...field, resize: "vertical" }}
                  placeholder="Tell us what's on your mind…"
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#22c55e")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "#aaa", marginBottom: 6 }}>Attachments (optional)</label>
                <FileUploadZone files={files} onChange={setFiles}
                  label="Attach screenshots, docs, or any relevant files" maxFiles={5} />
              </div>
              <button type="submit" style={{
                padding: "13px 0", borderRadius: 8, background: "#22c55e",
                color: "#000", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
              }}>
                Send Message →
              </button>
            </form>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 72 }}>
            {[
              { icon: <Mail size={18} />, title: "Email", body: "support@katexs.co" },
              { icon: <MessageSquare size={18} />, title: "Live Chat", body: "Available Mon–Fri, 9am–6pm GMT" },
              { icon: <Zap size={18} />, title: "Response Time", body: "We reply within 24 hours" },
            ].map((item) => (
              <div key={item.title} style={{
                background: "#111111", border: "1px solid #1e1e1e",
                borderRadius: 12, padding: "18px 20px",
                display: "flex", gap: 14, alignItems: "flex-start",
              }}>
                <div style={{ color: "#22c55e", marginTop: 2, flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{item.body}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
      <SiteFooter />
    </>
  );
}
