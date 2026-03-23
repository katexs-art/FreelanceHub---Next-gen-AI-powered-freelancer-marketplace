import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PublicNav } from "@/components/layout/PublicNav";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  Check,
  PhoneOff,
  Clock,
  Layers,
  BarChart3,
  Phone,
  MessageSquare,
  Users,
  Workflow,
  Inbox,
  Zap,
  Bot,
  Webhook,
  CalendarCheck,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  HERO                                                               */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          mask: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
          WebkitMask:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl">
        {/* top badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border"
          style={{
            background: "#111114",
            borderColor: "rgba(255,255,255,0.10)",
            fontSize: "11px",
            color: "hsl(var(--foreground-secondary))",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "hsl(var(--accent-green))" }}
          />
          RIVER AI — THE OPERATING SYSTEM FOR SERVICE BUSINESSES
        </div>

        {/* headline */}
        <h1
          className="font-heading text-foreground"
          style={{
            fontSize: "clamp(40px,6vw,72px)",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
          }}
        >
          Run your entire business
          <br />
          on one{" "}
          <span
            className="relative inline-block"
            style={{
              textDecorationLine: "underline",
              textDecorationColor: "hsl(var(--accent-green))",
              textUnderlineOffset: "6px",
              textDecorationThickness: "3px",
            }}
          >
            platform
          </span>
          .
        </h1>

        {/* subheadline */}
        <p
          className="text-foreground-secondary mt-6 mx-auto"
          style={{ fontSize: "16px", maxWidth: "500px", lineHeight: 1.7 }}
        >
          Voice AI, Chat AI, CRM, workflows, automations, and a unified inbox —
          all in one place. River handles everything. You focus on the work.
        </p>

        {/* price strip */}
        <div
          className="mt-8 inline-flex items-center gap-4 rounded-[10px] border"
          style={{
            background: "#111114",
            borderColor: "rgba(255,255,255,0.10)",
            padding: "14px 24px",
          }}
        >
          <span
            className="font-semibold uppercase"
            style={{
              fontSize: "11px",
              letterSpacing: "0.08em",
              color: "hsl(var(--accent-green))",
            }}
          >
            FREE SETUP
          </span>
          <span
            className="h-5"
            style={{
              width: "1px",
              background: "rgba(255,255,255,0.12)",
            }}
          />
          <span className="text-foreground font-bold" style={{ fontSize: "20px" }}>
            $50/mo
          </span>
          <span
            className="h-5"
            style={{
              width: "1px",
              background: "rgba(255,255,255,0.12)",
            }}
          />
          <span className="text-foreground-secondary" style={{ fontSize: "12px" }}>
            14-day free trial / Cancel anytime
          </span>
        </div>

        {/* cta buttons */}
        <div className="mt-8 flex items-center gap-3">
          <Link to="/signup">
            <Button size="lg">Start free trial →</Button>
          </Link>
          <Link to="/pricing">
            <Button variant="ghost" size="lg">
              See how it works
            </Button>
          </Link>
        </div>

        {/* proof row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {[
            "24/7 AI call answering",
            "Live in 24 hours",
            "No tech skills needed",
            "30-day money back",
          ].map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5"
              style={{ fontSize: "12px", color: "hsl(var(--foreground-secondary))" }}
            >
              <Check
                className="h-3.5 w-3.5"
                style={{ color: "hsl(var(--accent-green))" }}
              />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  DASHBOARD PREVIEW                                                  */
/* ------------------------------------------------------------------ */
function DashboardPreview() {
  const metrics = [
    { label: "Calls today", value: "12", delta: "+4" },
    { label: "New leads", value: "8", delta: "+3" },
    { label: "Booked", value: "6", delta: "+2" },
    { label: "Won this week", value: "$4.2k", delta: "+$1.1k" },
  ];

  return (
    <section className="pb-20" style={{ background: "hsl(var(--background))" }}>
      <div className="mx-auto" style={{ maxWidth: "860px", padding: "0 32px" }}>
        <div
          className="border rounded-[10px] overflow-hidden"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        >
          {/* browser chrome */}
          <div
            className="flex items-center gap-2 px-4"
            style={{
              background: "#08080a",
              height: "32px",
              borderRadius: "10px 10px 0 0",
            }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "#f09595" }}
            />
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "#EF9F27" }}
            />
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "hsl(var(--accent-green))" }}
            />
            <span
              className="ml-3 text-foreground-muted"
              style={{ fontSize: "11px" }}
            >
              katexs.com/dashboard
            </span>
          </div>

          {/* preview body */}
          <div
            className="p-4"
            style={{
              background: "hsl(var(--background-card))",
            }}
          >
            {/* metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg border p-3"
                  style={{
                    background: "hsl(var(--background-elevated))",
                    borderColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <p
                    className="text-foreground-secondary"
                    style={{ fontSize: "11px" }}
                  >
                    {m.label}
                  </p>
                  <p
                    className="text-foreground font-bold mt-1"
                    style={{ fontSize: "20px" }}
                  >
                    {m.value}
                  </p>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "hsl(var(--accent-green))",
                    }}
                  >
                    {m.delta}
                  </span>
                </div>
              ))}
            </div>

            {/* River AI widget */}
            <div
              className="mt-4 rounded-lg p-3 flex items-start gap-3"
              style={{
                background: "rgba(127,119,221,0.08)",
                borderTop: "2px solid hsl(var(--accent-purple))",
              }}
            >
              <span
                className="font-semibold shrink-0"
                style={{
                  fontSize: "11px",
                  color: "hsl(var(--accent-purple))",
                  letterSpacing: "0.04em",
                }}
              >
                River AI
              </span>
              <p className="text-foreground-secondary" style={{ fontSize: "12px" }}>
                You missed 3 calls last night. River sent SMS callbacks to all 3
                within 60 seconds — 2 booked. $1,800 recovered while you slept.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SCROLLING MARQUEE                                                  */
/* ------------------------------------------------------------------ */
function Marquee() {
  const items = [
    "Voice AI",
    "Chat AI",
    "Free CRM",
    "Missed call text-back",
    "Workflow builder",
    "Unified inbox",
    "Webhooks",
    "Automations",
    "River AI",
    "14-day free trial",
  ];
  const doubled = [...items, ...items];

  return (
    <section
      className="overflow-hidden border-y"
      style={{
        background: "#08080a",
        borderColor: "rgba(255,255,255,0.06)",
        padding: "12px 0",
      }}
    >
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-4 mx-4">
            <span
              className="uppercase"
              style={{
                fontSize: "11px",
                color: "hsl(var(--foreground-secondary))",
                letterSpacing: "0.1em",
              }}
            >
              {item}
            </span>
            <span
              className="h-[3px] w-[3px] rounded-full"
              style={{ background: "hsl(var(--foreground-muted))" }}
            />
          </span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PAIN POINTS                                                        */
/* ------------------------------------------------------------------ */
function PainPoints() {
  const cards = [
    {
      icon: PhoneOff,
      title: "Missing calls after hours",
      desc: "Every missed call is a job going to your competitor.",
      fix: "→ River answers every call 24/7",
    },
    {
      icon: Clock,
      title: "Slow lead follow-up",
      desc: "Leads go cold in 5 minutes. Speed wins.",
      fix: "→ River responds in under 60 seconds",
    },
    {
      icon: Layers,
      title: "Too many disconnected tools",
      desc: "7 apps you can't keep up with wastes hours daily.",
      fix: "→ Everything in one platform",
    },
    {
      icon: BarChart3,
      title: "No visibility into revenue",
      desc: "You don't know what's working or what River recovered.",
      fix: "→ Live ROI dashboard shows everything",
    },
  ];

  return (
    <section
      className="border-t"
      style={{
        background: "hsl(var(--background))",
        borderColor: "rgba(255,255,255,0.06)",
        padding: "80px 32px",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <p
          className="uppercase"
          style={{
            fontSize: "10px",
            color: "hsl(var(--foreground-secondary))",
            letterSpacing: "0.12em",
            marginBottom: "12px",
          }}
        >
          {"// the problem"}
        </p>
        <h2
          className="font-heading text-foreground"
          style={{
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            maxWidth: "520px",
            lineHeight: 1.2,
            marginBottom: "40px",
          }}
        >
          Service businesses lose money every day from the same 4 problems.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((c) => (
            <div
              key={c.title}
              className="rounded-[10px] border"
              style={{
                background: "hsl(var(--background-card))",
                borderColor: "rgba(255,255,255,0.06)",
                padding: "20px",
              }}
            >
              <div
                className="h-7 w-7 rounded-md flex items-center justify-center border mb-3"
                style={{
                  background: "hsl(var(--background-elevated))",
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <c.icon className="h-3.5 w-3.5 text-foreground-secondary" />
              </div>
              <p
                className="text-foreground font-semibold"
                style={{ fontSize: "13px", marginBottom: "4px" }}
              >
                {c.title}
              </p>
              <p
                className="text-foreground-secondary"
                style={{ fontSize: "12px", marginBottom: "10px" }}
              >
                {c.desc}
              </p>
              <p style={{ fontSize: "11px", color: "hsl(var(--accent-green))" }}>
                {c.fix}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FEATURES                                                           */
/* ------------------------------------------------------------------ */
function Features() {
  const features = [
    {
      icon: Phone,
      title: "Voice AI",
      desc: "AI answers calls 24/7, qualifies leads, and books appointments on your calendar.",
    },
    {
      icon: MessageSquare,
      title: "Chat AI",
      desc: "Respond to website visitors and social DMs instantly with AI-powered conversations.",
    },
    {
      icon: Users,
      title: "Free CRM",
      desc: "Track every contact, deal, and conversation in one place. No per-seat fees.",
    },
    {
      icon: Inbox,
      title: "Unified Inbox",
      desc: "SMS, email, Facebook, Instagram, and chat — every message in a single feed.",
    },
    {
      icon: Workflow,
      title: "Workflow Builder",
      desc: "Automate follow-ups, reminders, and sequences with a visual drag-and-drop builder.",
    },
    {
      icon: Zap,
      title: "Automations",
      desc: "Trigger actions based on events — missed calls, new leads, deal stage changes.",
    },
    {
      icon: CalendarCheck,
      title: "Appointment Booking",
      desc: "Let leads self-book from any channel. Syncs to your Google or Outlook calendar.",
    },
    {
      icon: Webhook,
      title: "Webhooks & API",
      desc: "Connect to any tool. Push data to Zapier, Make, or your own backend.",
    },
    {
      icon: Bot,
      title: "River AI",
      desc: "Your AI co-pilot that monitors your business, surfaces insights, and takes action.",
    },
  ];

  return (
    <section
      className="border-t"
      style={{
        background: "#08080a",
        borderColor: "rgba(255,255,255,0.06)",
        padding: "80px 32px",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <p
          className="uppercase"
          style={{
            fontSize: "10px",
            color: "hsl(var(--foreground-secondary))",
            letterSpacing: "0.12em",
            marginBottom: "12px",
          }}
        >
          {"// what you get"}
        </p>
        <h2
          className="font-heading text-foreground mb-10"
          style={{
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
          }}
        >
          Every tool your service business needs.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-[10px] border"
              style={{
                background: "hsl(var(--background-card))",
                borderColor: "rgba(255,255,255,0.06)",
                padding: "20px",
              }}
            >
              <div
                className="h-7 w-7 rounded-md flex items-center justify-center border mb-3"
                style={{
                  background: "hsl(var(--background-elevated))",
                  borderColor: "rgba(255,255,255,0.10)",
                }}
              >
                <f.icon
                  className="h-3.5 w-3.5"
                  style={{
                    color:
                      f.title === "River AI"
                        ? "hsl(var(--accent-purple))"
                        : "hsl(var(--foreground-secondary))",
                  }}
                />
              </div>
              <p
                className="text-foreground font-semibold"
                style={{ fontSize: "13px", marginBottom: "4px" }}
              >
                {f.title}
              </p>
              <p className="text-foreground-secondary" style={{ fontSize: "12px" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FOOTER                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer
      className="border-t"
      style={{
        background: "hsl(var(--background))",
        borderColor: "rgba(255,255,255,0.06)",
        padding: "40px 32px",
      }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-foreground font-heading font-semibold" style={{ fontSize: "16px" }}>
          Katex<span className="relative">s<span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--accent-green))" }} /></span>
        </span>
        <div className="flex items-center gap-6">
          <Link to="/pricing" className="text-foreground-secondary hover:text-foreground" style={{ fontSize: "12px" }}>Pricing</Link>
          <Link to="/affiliates" className="text-foreground-secondary hover:text-foreground" style={{ fontSize: "12px" }}>Affiliates</Link>
          <Link to="/login" className="text-foreground-secondary hover:text-foreground" style={{ fontSize: "12px" }}>Log in</Link>
        </div>
        <p className="text-foreground-muted" style={{ fontSize: "11px" }}>
          © {new Date().getFullYear()} Katexs. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  LANDING PAGE                                                       */
/* ------------------------------------------------------------------ */
const Landing = () => (
  <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
    {/* Navigation */}
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 border-b flex items-center justify-between px-6"
      style={{
        background: "rgba(2,2,3,0.85)",
        backdropFilter: "blur(12px)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <span className="font-heading font-semibold text-foreground" style={{ fontSize: "18px", letterSpacing: "-0.02em" }}>
        Katex<span className="relative">s<span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--accent-green))" }} /></span>
      </span>
      <nav className="flex items-center gap-4">
        <Link to="/pricing" className="text-foreground-secondary hover:text-foreground" style={{ fontSize: "12px" }}>Pricing</Link>
        <Link to="/affiliates" className="text-foreground-secondary hover:text-foreground" style={{ fontSize: "12px" }}>Affiliates</Link>
        <Link to="/login">
          <Button variant="ghost" size="sm">Log in</Button>
        </Link>
        <Link to="/signup">
          <Button size="sm">Get Started</Button>
        </Link>
      </nav>
    </header>

    <Hero />
    <DashboardPreview />
    <Marquee />
    <PainPoints />
    <Features />
    <Footer />
  </div>
);

export default Landing;
