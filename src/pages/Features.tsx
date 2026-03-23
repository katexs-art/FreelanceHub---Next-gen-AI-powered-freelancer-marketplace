import { PublicNav } from "@/components/layout/PublicNav";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Phone, Inbox, Workflow, Users, Zap, Bot } from "lucide-react";

const sections = [
  {
    tag: "// voice ai",
    title: "River answers every call. Even at 3am.",
    body: "Missed calls are missed revenue. River picks up every single call, qualifies the lead using your script, and books them straight onto your calendar — while you sleep, while you're on a job, while you're with family.",
    stats: ["Average response time: under 3 seconds", "Booking rate: 68% of answered calls"],
    features: ["24/7 call answering", "Lead qualification", "Calendar booking", "Call transcripts", "Custom voice scripts"],
    icon: Phone,
    color: "#4ade80",
  },
  {
    tag: "// unified inbox",
    title: "Every conversation. One inbox. River handles the replies.",
    body: "SMS, calls, website chat, Facebook DMs, Instagram — all flowing into one place. River reads every message and responds intelligently. You jump in when it matters.",
    stats: ["All channels unified", "AI-powered auto-responses"],
    features: ["SMS", "Email", "Facebook DMs", "Instagram DMs", "Website chat", "Call logs"],
    icon: Inbox,
    color: "#85B7EB",
  },
  {
    tag: "// workflow builder",
    title: "Describe it. River builds it.",
    body: "Type 'when a lead doesn't book within 24 hours send a follow-up SMS then call them tomorrow' — River turns that into a live automation in seconds. No technical knowledge. No drag and drop required unless you want it.",
    stats: ["Plain English → Live automation", "10+ pre-built templates"],
    features: ["Visual canvas editor", "Plain English input", "Pre-built templates", "Conditions & branching", "Multi-step sequences"],
    icon: Workflow,
    color: "#EF9F27",
  },
  {
    tag: "// crm + pipeline",
    title: "Know exactly where every lead stands. Always.",
    body: "Every contact scored by River. Every deal tracked. Every follow-up scheduled automatically. Your pipeline is always full, always current, always moving.",
    stats: ["AI lead scoring", "Drag-and-drop pipeline"],
    features: ["Contact management", "Deal tracking", "Kanban pipeline", "Activity feed", "Conversion analytics"],
    icon: Users,
    color: "#f8f7f4",
  },
  {
    tag: "// integrations",
    title: "Connect everything you already use.",
    body: "Vapi, Twilio, SendGrid, Stripe, Google Calendar, Jobber, ServiceTitan, QuickBooks, Facebook Ads, Google Ads, Zapier, Make, n8n. If you use it, Katexs connects to it.",
    stats: ["25+ native integrations", "Webhook API for anything else"],
    features: ["Twilio", "Vapi", "SendGrid", "Stripe", "Google Calendar", "Zapier", "Make", "n8n"],
    icon: Zap,
    color: "#4ade80",
  },
];

const Features = () => (
  <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
    <PublicNav />

    {/* Hero */}
    <section className="pt-28 pb-16 px-8 text-center" style={{ background: "hsl(var(--background))" }}>
      <p className="uppercase text-foreground-secondary mb-3" style={{ fontSize: "10px", letterSpacing: "0.12em" }}>
        {"// everything you need"}
      </p>
      <h1 className="font-heading text-foreground mx-auto" style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 700, letterSpacing: "-0.04em", maxWidth: "700px", lineHeight: 1.1 }}>
        One platform. Every tool. River inside everything.
      </h1>
      <p className="text-foreground-secondary mt-4 mx-auto" style={{ fontSize: "15px", maxWidth: "520px" }}>
        Built specifically for service businesses. Not adapted. Built from scratch for HVAC, plumbers, med spas, realtors, and every service business in between.
      </p>
    </section>

    {/* Feature sections */}
    {sections.map((s, i) => (
      <section
        key={s.tag}
        className="border-t"
        style={{ background: i % 2 === 0 ? "hsl(var(--background))" : "#08080a", borderColor: "rgba(255,255,255,0.06)", padding: "80px 32px" }}
      >
        <div className={`max-w-5xl mx-auto flex flex-col ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-12 items-center`}>
          <div className="flex-1 space-y-5">
            <p className="uppercase text-foreground-secondary" style={{ fontSize: "10px", letterSpacing: "0.12em" }}>{s.tag}</p>
            <h2 className="font-heading text-foreground" style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{s.title}</h2>
            <p className="text-foreground-secondary" style={{ fontSize: "14px", lineHeight: 1.7 }}>{s.body}</p>
            <div className="flex flex-wrap gap-2">
              {s.stats.map((st) => (
                <span key={st} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 border" style={{ fontSize: "11px", color: "hsl(var(--accent-green))", background: "rgba(74,222,128,0.05)", borderColor: "rgba(74,222,128,0.15)" }}>
                  <Check className="w-3 h-3" /> {st}
                </span>
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {s.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-foreground-secondary" style={{ fontSize: "12px" }}>
                  <Check className="w-3 h-3 text-accent-green shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-xs aspect-square rounded-2xl border flex items-center justify-center" style={{ background: "hsl(var(--background-card))", borderColor: "rgba(255,255,255,0.08)" }}>
              <s.icon className="w-16 h-16" style={{ color: s.color, opacity: 0.3 }} />
            </div>
          </div>
        </div>
      </section>
    ))}

    {/* River AI section */}
    <section className="border-t" style={{ background: "rgba(127,119,221,0.04)", borderColor: "rgba(127,119,221,0.15)", padding: "80px 32px" }}>
      <div className="max-w-3xl mx-auto text-center space-y-5">
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(127,119,221,0.15)" }}>
          <Bot className="w-6 h-6 text-accent-purple" />
        </div>
        <h2 className="font-heading text-foreground" style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em" }}>
          River isn't a feature. River is your business partner.
        </h2>
        <p className="text-foreground-secondary mx-auto" style={{ fontSize: "14px", maxWidth: "500px", lineHeight: 1.7 }}>
          River learns your business. River analyzes your data. River tells you what to do next. River runs while you sleep. River is the reason Katexs feels different from every other platform you've tried.
        </p>
        <Link to="/signup"><Button size="lg">Start free trial →</Button></Link>
      </div>
    </section>

    <PublicFooter />
  </div>
);

export default Features;
