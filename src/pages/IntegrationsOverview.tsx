import { PublicNav } from "@/components/layout/PublicNav";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const categories = ["All", "Communication", "Voice AI", "Calendar", "Payments", "Marketing", "Automation", "Industry"];

const integrations = [
  { name: "Twilio", desc: "SMS, voice calls, phone numbers", cat: "Communication" },
  { name: "SendGrid", desc: "Email delivery and sequences", cat: "Communication" },
  { name: "ManyChat", desc: "Facebook & Instagram automation", cat: "Communication" },
  { name: "WhatsApp", desc: "WhatsApp Business messaging", cat: "Communication" },
  { name: "Vapi", desc: "AI voice agents for calls", cat: "Voice AI" },
  { name: "ElevenLabs", desc: "Ultra-realistic voice cloning", cat: "Voice AI", soon: true },
  { name: "Google Calendar", desc: "Sync appointments & bookings", cat: "Calendar" },
  { name: "Outlook", desc: "Microsoft 365 calendar sync", cat: "Calendar" },
  { name: "Calendly", desc: "Appointment scheduling", cat: "Calendar" },
  { name: "Stripe", desc: "Payments and subscriptions", cat: "Payments" },
  { name: "Square", desc: "Point of sale payments", cat: "Payments" },
  { name: "PayPal", desc: "Online payment processing", cat: "Payments" },
  { name: "Facebook Ads", desc: "Lead ads sync + auto-call", cat: "Marketing" },
  { name: "Google Ads", desc: "Conversion tracking", cat: "Marketing" },
  { name: "TikTok Ads", desc: "Lead generation", cat: "Marketing", soon: true },
  { name: "Zapier", desc: "Connect to 6,000+ apps", cat: "Automation" },
  { name: "Make", desc: "Advanced automation scenarios", cat: "Automation" },
  { name: "n8n", desc: "Self-hosted workflow automation", cat: "Automation" },
  { name: "Jobber", desc: "Home services management", cat: "Industry" },
  { name: "ServiceTitan", desc: "HVAC & plumbing enterprise", cat: "Industry" },
  { name: "QuickBooks", desc: "Accounting & invoicing", cat: "Industry" },
  { name: "Mindbody", desc: "Wellness & fitness studios", cat: "Industry", soon: true },
];

const IntegrationsOverview = () => {
  const [cat, setCat] = useState("All");
  const filtered = cat === "All" ? integrations : integrations.filter((i) => i.cat === cat);

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <PublicNav />

      <section className="pt-28 pb-16 px-8 text-center">
        <h1 className="font-heading text-foreground mx-auto" style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 700, letterSpacing: "-0.04em", maxWidth: "600px", lineHeight: 1.1 }}>
          Connect everything. Miss nothing.
        </h1>
        <p className="text-foreground-secondary mt-4 mx-auto" style={{ fontSize: "15px", maxWidth: "460px" }}>
          Katexs connects to the tools you already use. No migration. No switching. Just connection.
        </p>
      </section>

      {/* Categories */}
      <div className="max-w-5xl mx-auto px-8 flex flex-wrap gap-2 mb-8">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className="rounded-full px-4 py-1.5 transition-colors"
            style={{
              fontSize: "12px",
              fontWeight: 500,
              background: cat === c ? "hsl(var(--foreground))" : "hsl(var(--background-elevated))",
              color: cat === c ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground-secondary))",
              border: cat === c ? "none" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-8 pb-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((int) => (
          <div
            key={int.name}
            className="rounded-xl border p-5"
            style={{ background: "hsl(var(--background-card))", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-foreground" style={{ background: "hsl(var(--background-elevated))", fontSize: "13px" }}>
                {int.name.slice(0, 2)}
              </div>
              {int.soon ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(239,159,39,0.15)", color: "#EF9F27" }}>Coming soon</span>
              ) : (
                <span className="text-[10px] text-foreground-secondary">Connected via Katexs</span>
              )}
            </div>
            <p className="text-foreground font-semibold" style={{ fontSize: "14px" }}>{int.name}</p>
            <p className="text-foreground-secondary mt-1" style={{ fontSize: "12px" }}>{int.desc}</p>
            <span className="inline-block mt-3 text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsl(var(--background-elevated))", color: "hsl(var(--foreground-secondary))" }}>
              {int.cat}
            </span>
          </div>
        ))}
      </div>

      {/* Zapier/Make/n8n callout */}
      <section className="border-t" style={{ background: "#08080a", borderColor: "rgba(255,255,255,0.06)", padding: "80px 32px" }}>
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="font-heading text-foreground" style={{ fontSize: "24px", fontWeight: 700 }}>
            Already using Zapier, Make, or n8n? Perfect.
          </h2>
          <p className="text-foreground-secondary" style={{ fontSize: "14px", maxWidth: "500px", margin: "0 auto" }}>
            Connect Katexs to any of the 6,000+ apps in the Zapier ecosystem. Or use our native webhooks to connect anything else. If it has an API, it works with Katexs.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            {["Zapier", "Make", "n8n"].map((p) => (
              <div key={p} className="rounded-xl border p-5 w-40 text-center" style={{ background: "hsl(var(--background-card))", borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="w-10 h-10 rounded-lg mx-auto flex items-center justify-center font-bold text-foreground mb-2" style={{ background: "hsl(var(--background-elevated))", fontSize: "14px" }}>
                  {p[0]}
                </div>
                <p className="text-foreground font-semibold" style={{ fontSize: "13px" }}>{p}</p>
                <p className="text-foreground-muted mt-1" style={{ fontSize: "11px" }}>Connect via {p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default IntegrationsOverview;
