import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight, Check, Mic, MessageSquare, Cpu, Bot, PenTool,
  Video, Target, BarChart3, Globe, Briefcase, DollarSign,
  CalendarDays,
} from "lucide-react";

const rotatingExamples = [
  "Build an AI receptionist",
  "Automate our business",
  "Create a website",
  "Generate leads",
  "Build a mobile app",
  "Launch Google Ads",
];

const serviceCategories = [
  {
    icon: Mic,
    title: "AI Voice",
    items: ["AI Receptionists", "Outbound Call Agents", "Appointment Setters", "After Hours", "Voice Cloning", "IVR", "Call Summaries"],
    href: "/services?category=ai-voice",
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    items: ["Website Chat", "SMS", "WhatsApp", "Instagram", "Facebook", "Support Agents"],
    href: "/services?category=ai-chat",
  },
  {
    icon: Cpu,
    title: "AI Automations",
    items: ["n8n", "Make", "Zapier", "CRM Automation", "API Integrations", "Document Processing"],
    href: "/services?category=ai-automations",
  },
  {
    icon: Bot,
    title: "Custom AI & LLMs",
    items: ["Claude", "GPT", "Gemini", "Llama", "RAG", "Private AI", "Fine-tuning"],
    href: "/services?category=custom-ai",
  },
  {
    icon: PenTool,
    title: "AI Content",
    items: ["SEO", "Blogs", "Email", "Social Media", "Ad Copy", "Newsletters"],
    href: "/services?category=ai-content",
  },
  {
    icon: Video,
    title: "AI Video & Media",
    items: ["UGC", "Avatars", "Short Form", "Voiceovers", "AI Images", "Product Photography"],
    href: "/services?category=ai-video",
  },
  {
    icon: Target,
    title: "Lead Generation",
    items: ["Cold Email", "LinkedIn", "Data Enrichment", "Database Reactivation", "Scrapers"],
    href: "/services?category=lead-gen",
  },
  {
    icon: BarChart3,
    title: "Paid Ads",
    items: ["Google Ads", "Meta Ads", "YouTube Ads", "Tracking", "Creative"],
    href: "/services?category=paid-ads",
  },
  {
    icon: Globe,
    title: "Websites & Funnels",
    items: ["Websites", "Landing Pages", "Funnels", "Booking Pages", "Hosting", "A/B Testing"],
    href: "/services?category=websites",
  },
  {
    icon: Briefcase,
    title: "Business Systems",
    items: ["GoHighLevel", "CRM", "Dashboards", "Payments", "Reviews", "Workflows"],
    href: "/services?category=business-systems",
  },
];

export default function Landing() {
  const { user, profile } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetFlexible, setBudgetFlexible] = useState(false);
  const [timeline, setTimeline] = useState("");
  const [timelineFlexible, setTimelineFlexible] = useState(false);
  const [currentExample, setCurrentExample] = useState(0);
  const [exampleFading, setExampleFading] = useState(false);
  const navigate = useNavigate();
  const promptRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setExampleFading(true);
      setTimeout(() => {
        setCurrentExample((prev) => (prev + 1) % rotatingExamples.length);
        setExampleFading(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  function formatBudgetDisplay(value: string) {
    const num = value.replace(/[^0-9]/g, "");
    if (!num) return "";
    return Number(num).toLocaleString("en-US");
  }

  function handleBudgetChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setBudget(raw);
    if (raw) setBudgetFlexible(false);
  }

  function handleTimelineChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setTimeline(raw);
    if (raw) setTimelineFlexible(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (prompt.trim()) {
      const params = new URLSearchParams({ q: prompt.trim() });
      if (budgetFlexible) params.set("budget", "flexible");
      else if (budget) params.set("budget", budget);
      if (timelineFlexible) params.set("timeline", "flexible");
      else if (timeline) params.set("timeline", timeline);

      sessionStorage.setItem(
        "wegrow_plan_input",
        JSON.stringify({
          q: prompt.trim(),
          budget: budgetFlexible ? "flexible" : budget || null,
          timeline: timelineFlexible ? "flexible" : timeline || null,
        })
      );
      navigate(`/plan?${params.toString()}`);
    }
  }

  function handleExampleClick(example: string) {
    setPrompt(example);
    promptRef.current?.focus();
  }

  return (
    <>
      <SEO title="WeGrow — Build Anything With AI" description="Describe what you need. WeGrow scopes the project, builds the plan, finds the right specialists, and manages delivery." />
      <SiteHeader variant="transparent" />
      <main>
        {/* Hero */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(59,130,246,0.04),transparent)]" />
          </div>

          <div className="relative mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
            <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
              The AI-native way to get work done
            </p>

            <h1
              className="text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Build Anything <span className="text-white/40">With AI</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-white/40">
              Describe what you need. WeGrow scopes the project, builds the plan, finds the right
              specialists, and manages delivery from start to finish.
            </p>

            {/* Three-part request input */}
            <form onSubmit={handleSubmit} className="mx-auto mt-12 max-w-2xl" id="hero-prompt">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1.5 transition-all focus-within:border-white/[0.15] focus-within:bg-white/[0.05]">
                <div className="flex items-center">
                  <input
                    ref={promptRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="I need an AI website built"
                    className="flex-1 border-0 bg-transparent px-5 py-4 text-[15px] text-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2 border-t border-white/[0.06] px-3 py-3 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex flex-1 items-center gap-2">
                    <DollarSign className="h-4 w-4 shrink-0 text-white/20" />
                    {budgetFlexible ? (
                      <span className="flex-1 text-[13px] text-white/40">Flexible budget</span>
                    ) : (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={budget ? `$${formatBudgetDisplay(budget)}` : ""}
                        onChange={handleBudgetChange}
                        placeholder="$150"
                        className="flex-1 border-0 bg-transparent text-[13px] text-white placeholder:text-white/25 focus:outline-none"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetFlexible(!budgetFlexible);
                        if (!budgetFlexible) setBudget("");
                      }}
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] transition-all ${
                        budgetFlexible
                          ? "border-white/20 bg-white/10 text-white/60"
                          : "border-white/[0.06] text-white/25 hover:border-white/[0.12] hover:text-white/40"
                      }`}
                    >
                      Not sure
                    </button>
                  </div>

                  <div className="hidden h-5 w-px bg-white/[0.06] sm:block" />

                  <div className="flex flex-1 items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-white/20" />
                    {timelineFlexible ? (
                      <span className="flex-1 text-[13px] text-white/40">Flexible timeline</span>
                    ) : (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={timeline ? `${timeline} day${timeline === "1" ? "" : "s"}` : ""}
                        onChange={handleTimelineChange}
                        placeholder="3 days"
                        className="flex-1 border-0 bg-transparent text-[13px] text-white placeholder:text-white/25 focus:outline-none"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setTimelineFlexible(!timelineFlexible);
                        if (!timelineFlexible) setTimeline("");
                      }}
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] transition-all ${
                        timelineFlexible
                          ? "border-white/20 bg-white/10 text-white/60"
                          : "border-white/[0.06] text-white/25 hover:border-white/[0.12] hover:text-white/40"
                      }`}
                    >
                      Flexible
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-white px-6 py-3 text-[13px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.97]"
                  >
                    Generate My Plan
                  </button>
                </div>
              </div>
            </form>

            {/* Rotating examples */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="mr-1 text-[12px] text-white/20">Try:</span>
              {rotatingExamples.map((example, i) => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className={`rounded-full border px-3 py-1 text-[12px] transition-all hover:border-white/[0.15] hover:text-white/60 ${
                    i === currentExample
                      ? "border-white/[0.15] text-white/50"
                      : "border-white/[0.06] text-white/25"
                  } ${i === currentExample && exampleFading ? "opacity-50" : "opacity-100"}`}
                >
                  {example}
                </button>
              ))}
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {["Verified Specialists", "Managed Delivery", "Protected Payments"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-white/25">
                  <Check className="h-3.5 w-3.5 text-white/30" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Everything WeGrow Can Build */}
        <section id="solutions" className="relative border-t border-white/[0.06] py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Everything WeGrow Can Build
              </h2>
              <p className="mt-4 text-[15px] text-white/30">
                Start with the outcome.
                <br />
                We&rsquo;ll build the system.
              </p>
            </div>

            <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {serviceCategories.map((cat, index) => (
                <Link
                  key={cat.title}
                  to={cat.href}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="mb-4">
                    <cat.icon className="h-5 w-5 text-white/30 transition-colors group-hover:text-white/60" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-white">{cat.title}</h3>
                  <ul className="mt-3 space-y-1">
                    {cat.items.slice(0, 4).map((item) => (
                      <li
                        key={item}
                        className="text-[12px] text-white/25 transition-colors group-hover:text-white/35"
                      >
                        {item}
                      </li>
                    ))}
                    {cat.items.length > 4 && (
                      <li className="text-[12px] text-white/15">+{cat.items.length - 4} more</li>
                    )}
                  </ul>
                  <div className="mt-4 flex items-center gap-1 text-[11px] font-medium text-white/20 transition-all group-hover:text-white/50">
                    Explore{" "}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
