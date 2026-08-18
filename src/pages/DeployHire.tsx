import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import {
  Check, ArrowRight, Calendar, Loader2, Star, Shield,
  Zap, Phone, MessageSquare, Globe, Building2,
} from "lucide-react";

const PLANS = [
  {
    key: "starter" as const,
    name: "Starter",
    price: "$497",
    period: "/mo",
    desc: "Perfect for small businesses getting started with AI",
    features: [
      "AI chat receptionist",
      "Website widget",
      "Up to 500 conversations/mo",
      "Business hours routing",
      "Email lead capture",
      "Basic analytics",
    ],
    cta: "Start now",
    popular: false,
  },
  {
    key: "professional" as const,
    name: "Professional",
    price: "$997",
    period: "/mo",
    desc: "For growing businesses that need voice + chat",
    features: [
      "Everything in Starter",
      "AI voice receptionist",
      "Unlimited conversations",
      "Appointment booking",
      "CRM integration",
      "Custom training data",
      "Priority support",
    ],
    cta: "Start now",
    popular: true,
  },
  {
    key: "enterprise" as const,
    name: "Enterprise",
    price: "$1,997",
    period: "/mo",
    desc: "Full AI workforce for high-volume operations",
    features: [
      "Everything in Professional",
      "Multi-agent workflows",
      "Outbound calling",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "White-label option",
      "API access",
    ],
    cta: "Book a call",
    popular: false,
  },
];

const TESTIMONIALS = [
  { name: "Sarah M.", role: "Owner, Dental Lab Direct", quote: "Our AI receptionist handles 400+ calls a month. We haven't missed a lead since." },
  { name: "James R.", role: "CEO, Outbound FX", quote: "3x more meetings booked. The AI cold-caller paid for itself in the first week." },
  { name: "Alex K.", role: "Founder, CreditFix Pro", quote: "Leads come in at 2am and our AI qualifies them instantly. Game changer." },
];

export default function DeployHire() {
  const { id } = useParams<{ id: string }>();
  const [bizName, setBizName] = useState("Your Business");
  const [loading, setLoading] = useState(true);

  const [leadForm, setLeadForm] = useState({ name: "", email: "", phone: "", business_type: "" });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    supabase.from("deploy_configs").select("business_name").eq("id", id).single()
      .then(({ data }) => {
        if (data?.business_name) setBizName(data.business_name);
        setLoading(false);
      });
  }, [id]);

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadForm.name.trim() || !leadForm.email.trim()) return;
    setLeadSubmitting(true);

    await supabase.from("deploy_leads").insert({
      deploy_config_id: id || null,
      name: leadForm.name.trim(),
      email: leadForm.email.trim(),
      phone: leadForm.phone.trim() || null,
      business_type: leadForm.business_type.trim() || null,
      plan: selectedPlan,
    });

    setLeadDone(true);
    setLeadSubmitting(false);
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#050505]"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;

  return (
    <>
      <SEO title={`Deploy ${bizName} AI Agent — Katexs`} />
      <div className="min-h-screen bg-[#050505]">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_20%,rgba(59,130,246,0.04),transparent)]" />
        </div>

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-[15px] font-semibold text-white/60 hover:text-white">Katexs</Link>
            <span className="text-white/10">/</span>
            <Link to={`/deploy/${id}`} className="text-[14px] text-white/40 hover:text-white/60">{bizName}</Link>
            <span className="text-white/10">/</span>
            <span className="text-[14px] font-medium text-white">Hire</span>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-5xl px-5 py-16 sm:px-8">
          {/* Hero */}
          <div className="mb-14 text-center">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-white/25">
              Deploy your AI receptionist
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Ready to hire your{" "}
              <span className="text-white/40">AI team?</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/35">
              You've seen what it can do. Now deploy it on your website, phone line, and CRM — and never miss a lead again.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="mb-16 grid gap-5 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  plan.popular
                    ? "border-white/[0.15] bg-white/[0.04] ring-1 ring-white/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-[10px] font-semibold text-black">
                    Most popular
                  </span>
                )}

                <div className="mb-6">
                  <p className="text-[14px] font-medium text-white/60">{plan.name}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold text-white">{plan.price}</span>
                    <span className="text-[13px] text-white/25">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-[12px] text-white/25">{plan.desc}</p>
                </div>

                <ul className="mb-8 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-white/40">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400/60" />
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.key === "enterprise" ? (
                  <a
                    href="https://calendly.com/katexs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-[13px] font-semibold text-white/60 transition-all hover:bg-white/[0.06] hover:text-white"
                  >
                    <Calendar className="h-4 w-4" />
                    {plan.cta}
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedPlan(plan.key);
                      document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-3 text-[13px] font-semibold transition-all active:scale-[0.97] ${
                      plan.popular
                        ? "bg-white text-black hover:bg-white/90"
                        : "border border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Book a call */}
          <div className="mb-16 text-center">
            <a
              href="https://calendly.com/katexs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-[13px] font-medium text-white/50 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white/70"
            >
              <Calendar className="h-4 w-4" />
              Not sure which plan? Book a free strategy call
            </a>
          </div>

          {/* Lead capture form */}
          <div id="lead-form" className="mx-auto mb-16 max-w-md">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              {leadDone ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                    <Check className="h-6 w-6 text-green-400" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-white">We'll be in touch!</h3>
                  <p className="mt-2 text-[13px] text-white/30">A team member will reach out within 24 hours.</p>
                </div>
              ) : (
                <>
                  <h3 className="mb-1 text-[16px] font-semibold text-white">Get started</h3>
                  <p className="mb-5 text-[12px] text-white/25">
                    {selectedPlan ? `Selected plan: ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}` : "Fill out the form and we'll get you set up"}
                  </p>
                  <form onSubmit={handleLeadSubmit} className="space-y-3">
                    <input
                      type="text" value={leadForm.name} onChange={(e) => setLeadForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Full name *" required
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none"
                    />
                    <input
                      type="email" value={leadForm.email} onChange={(e) => setLeadForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="Email *" required
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none"
                    />
                    <input
                      type="tel" value={leadForm.phone} onChange={(e) => setLeadForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="Phone number"
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none"
                    />
                    <input
                      type="text" value={leadForm.business_type} onChange={(e) => setLeadForm((p) => ({ ...p, business_type: e.target.value }))}
                      placeholder="Business type (e.g. Dental, Legal, SaaS)"
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:border-white/[0.15] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={leadSubmitting || !leadForm.name.trim() || !leadForm.email.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[13px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40"
                    >
                      {leadSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Get started <ArrowRight className="h-3.5 w-3.5" /></>}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Testimonials */}
          <section className="mb-16">
            <p className="mb-6 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/20">
              What our clients say
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="mb-3 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-amber-400/80 text-amber-400/80" />
                    ))}
                  </div>
                  <p className="text-[13px] leading-relaxed text-white/50">"{t.quote}"</p>
                  <div className="mt-4">
                    <p className="text-[13px] font-medium text-white/60">{t.name}</p>
                    <p className="text-[11px] text-white/20">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pb-16 text-[11px] text-white/15">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />SOC 2 Compliant</span>
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />99.9% Uptime</span>
            <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />GDPR Ready</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />24/7 Support</span>
            <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" />1,000+ Businesses</span>
          </div>
        </div>
      </div>
    </>
  );
}
