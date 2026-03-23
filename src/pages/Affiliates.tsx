import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, ChevronUp, DollarSign, Link2, BarChart3, FileText, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/* ── Hero ── */
function Hero({ onScrollToSignup }: { onScrollToSignup: () => void }) {
  return (
    <section className="relative flex flex-col items-center justify-center px-6 py-20 md:py-[80px] overflow-hidden" style={{ background: "hsl(var(--background))" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
        mask: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
        WebkitMask: "radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%)",
      }} />

      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-[hsl(240,8%,7%)] border border-border-subtle rounded-full px-4 py-1.5 mb-8">
          <div className="w-2 h-2 rounded-full bg-accent-green" />
          <span className="text-[11px] text-foreground-secondary uppercase tracking-[0.08em] font-medium">
            Affiliate Program — Earn 50% Forever
          </span>
        </div>

        <h1 className="font-heading text-foreground leading-[1.05]" style={{ fontSize: "clamp(36px,5vw,60px)", fontWeight: 700, letterSpacing: "-0.04em" }}>
          Earn $50 every month for every business you refer.
        </h1>

        <p className="text-[16px] text-foreground-secondary mt-6 max-w-[500px] leading-relaxed">
          No cap. No limits. No expiry. Refer one client on our Starter plan and earn $50/mo recurring. Forever.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mt-10">
          {[
            { value: "$50/mo", label: "per Starter referral" },
            { value: "$148/mo", label: "per Growth referral" },
            { value: "∞", label: "No maximum earnings" },
          ].map(s => (
            <div key={s.label} className="bg-background-card border border-border rounded-[10px] px-6 py-4 text-center">
              <div className="text-[24px] font-bold text-foreground tracking-tight">{s.value}</div>
              <div className="text-[11px] text-foreground-secondary mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 mt-10">
          <Button onClick={onScrollToSignup} size="lg" className="rounded-md">Become an affiliate →</Button>
          <Link to="/login" className="text-[12px] text-foreground-secondary hover:text-foreground transition-colors">
            Already an affiliate? Sign in to your dashboard →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ── */
function HowItWorks() {
  const steps = [
    { num: "01", title: "Sign up as an affiliate", desc: "Create your free affiliate account. Get your unique referral link instantly. No approval needed.", pill: "Free to join" },
    { num: "02", title: "Share your link", desc: "Share with service business owners — HVAC, plumbers, med spas, realtors, contractors. Anyone who needs AI.", pill: "We provide all materials" },
    { num: "03", title: "Earn forever", desc: "Every time someone signs up using your link you earn 50% of their monthly plan. Every month. Forever.", pill: "Auto Stripe payouts" },
  ];
  return (
    <section className="px-6 md:px-8 py-20 bg-background-secondary border-t border-border">
      <div className="max-w-4xl mx-auto">
        <p className="text-label text-foreground-secondary tracking-[0.12em] mb-3">// how it works</p>
        <h2 className="font-heading text-[28px] font-bold text-foreground tracking-tight mb-10">Three steps to recurring income.</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {steps.map(s => (
            <div key={s.num} className="bg-background-card border border-border rounded-[12px] p-7 relative overflow-hidden">
              <span className="absolute top-4 right-4 text-[48px] font-bold text-foreground-muted/30 leading-none tracking-tight">{s.num}</span>
              <h3 className="text-[14px] font-semibold text-foreground mt-8 mb-2">{s.title}</h3>
              <p className="text-[12px] text-foreground-secondary leading-relaxed mb-4">{s.desc}</p>
              <span className="inline-flex items-center gap-1.5 bg-accent-green/10 text-accent-green text-[10px] font-medium px-2.5 py-1 rounded-full border border-accent-green/20">
                <Check className="w-3 h-3" />{s.pill}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Calculator ── */
function Calculator() {
  const [starter, setStarter] = useState(5);
  const [growth, setGrowth] = useState(2);
  const starterEarnings = starter * 50;
  const growthEarnings = growth * 148.5;
  const monthly = starterEarnings + growthEarnings;
  const annual = monthly * 12;

  const milestones = [
    { amount: 500, label: "Side income" },
    { amount: 2000, label: "Replace a job" },
    { amount: 5000, label: "Full time income" },
    { amount: 10000, label: "Life changing" },
  ];

  return (
    <section className="px-6 md:px-8 py-20 bg-background border-t border-border">
      <div className="max-w-4xl mx-auto">
        <p className="text-label text-foreground-secondary tracking-[0.12em] mb-3">// earnings calculator</p>
        <h2 className="font-heading text-[28px] font-bold text-foreground tracking-tight mb-10">See exactly what you could earn.</h2>

        <div className="bg-background-card border border-border-subtle rounded-[16px] p-8 md:p-10 max-w-[680px] mx-auto">
          <div className="space-y-8">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-[13px] text-foreground">Starter referrals per month</span>
                <span className="text-[13px] font-semibold text-foreground">{starter}</span>
              </div>
              <input type="range" min={0} max={50} value={starter} onChange={e => setStarter(+e.target.value)}
                className="w-full h-1 bg-background-elevated rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-[13px] text-foreground">Growth referrals per month</span>
                <span className="text-[13px] font-semibold text-foreground">{growth}</span>
              </div>
              <input type="range" min={0} max={20} value={growth} onChange={e => setGrowth(+e.target.value)}
                className="w-full h-1 bg-background-elevated rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background" />
            </div>
          </div>

          <div className="text-center mt-10">
            <div className="text-[48px] font-bold text-foreground tracking-tight leading-none">${monthly.toLocaleString()}<span className="text-[20px] text-foreground-secondary font-normal">/mo</span></div>
            <div className="text-[20px] text-foreground-secondary mt-2">${annual.toLocaleString()}/yr</div>
            <p className="text-[11px] text-foreground-secondary mt-2">After 12 months of referring {starter + growth} clients per month</p>
          </div>

          <p className="text-[11px] text-foreground-secondary text-center mt-4">
            Starter: {starter} × $50/mo = ${starterEarnings}/mo &nbsp;|&nbsp; Growth: {growth} × $148.50/mo = ${growthEarnings.toFixed(0)}/mo
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {milestones.map(m => (
              <div key={m.amount} className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${monthly >= m.amount ? "bg-accent-green/10 text-accent-green border-accent-green/20" : "bg-background-elevated text-foreground-secondary border-border"}`}>
                ${m.amount.toLocaleString()}/mo — {m.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── What You Get ── */
function WhatYouGet() {
  const items = [
    { icon: Link2, title: "Your unique referral link", desc: "A trackable link that follows every click, signup, and payment back to you. Works forever." },
    { icon: BarChart3, title: "Real-time dashboard", desc: "See clicks, signups, active clients, and earnings updated live. Know exactly what's working." },
    { icon: FileText, title: "Marketing materials", desc: "Email templates, social media posts, ad copy, and talking points. Ready to use immediately." },
    { icon: CreditCard, title: "Monthly Stripe payouts", desc: "Earnings deposited automatically to your bank account every month. No chasing invoices." },
  ];
  return (
    <section className="px-6 md:px-8 py-20 bg-background-secondary border-t border-border">
      <div className="max-w-4xl mx-auto">
        <p className="text-label text-foreground-secondary tracking-[0.12em] mb-3">// your affiliate toolkit</p>
        <h2 className="font-heading text-[28px] font-bold text-foreground tracking-tight mb-10">Everything you need to start earning today.</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {items.map(i => (
            <div key={i.title} className="bg-background-card border border-border rounded-[12px] p-6 flex gap-4">
              <div className="w-9 h-9 rounded-lg bg-background-elevated border border-border-subtle flex items-center justify-center flex-shrink-0">
                <i.icon className="w-4 h-4 text-accent-green" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-foreground mb-1">{i.title}</h3>
                <p className="text-[12px] text-foreground-secondary leading-relaxed">{i.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Commission Table ── */
function CommissionTable() {
  return (
    <section className="px-6 md:px-8 py-20 bg-background border-t border-border">
      <div className="max-w-4xl mx-auto">
        <p className="text-label text-foreground-secondary tracking-[0.12em] mb-3">// commission structure</p>
        <h2 className="font-heading text-[28px] font-bold text-foreground tracking-tight mb-10">Simple. Transparent. Generous.</h2>
        <div className="bg-background-card border border-border rounded-[12px] overflow-hidden max-w-[680px] mx-auto">
          <div className="grid grid-cols-4 bg-background-elevated text-[11px] text-foreground-secondary uppercase tracking-[0.08em] font-medium">
            <div className="px-5 py-3">Plan</div>
            <div className="px-5 py-3 text-right">Monthly price</div>
            <div className="px-5 py-3 text-right">Your commission</div>
            <div className="px-5 py-3 text-right">Annual per referral</div>
          </div>
          {[
            { plan: "Starter", price: "$100/mo", commission: "$50/mo (50%)", annual: "$600/yr" },
            { plan: "Growth", price: "$297/mo", commission: "$148.50/mo (50%)", annual: "$1,782/yr" },
            { plan: "Enterprise", price: "Custom", commission: "50% of first year", annual: "Custom" },
          ].map((r, i) => (
            <div key={r.plan} className={`grid grid-cols-4 text-[13px] border-t border-border ${i % 2 === 0 ? "bg-background-card" : "bg-background-secondary"}`}>
              <div className="px-5 py-3.5 text-foreground font-medium">{r.plan}</div>
              <div className="px-5 py-3.5 text-foreground-secondary text-right">{r.price}</div>
              <div className="px-5 py-3.5 text-accent-green font-semibold text-right">{r.commission}</div>
              <div className="px-5 py-3.5 text-foreground-secondary text-right">{r.annual}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-foreground-secondary mt-4 max-w-[680px] mx-auto leading-relaxed">
          Commissions paid on net revenue after payment processing fees. 30-day cookie window. Lifetime attribution — if your referral upgrades you earn the higher commission automatically.
        </p>
      </div>
    </section>
  );
}

/* ── FAQ ── */
function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const items = [
    { q: "When do I get paid?", a: "Commissions are paid on the 1st of every month via Stripe for all earnings from the previous month. Minimum payout is $50." },
    { q: "How long does the cookie last?", a: "30 days. If someone clicks your link and signs up within 30 days you get the commission." },
    { q: "What if my referral upgrades their plan?", a: "You automatically earn the higher commission. If they go from Starter to Growth your monthly earnings increase from $50 to $148.50." },
    { q: "Is there a limit to how much I can earn?", a: "Zero limits. No cap. Refer 1 client or 1,000 clients — you earn 50% on all of them forever." },
    { q: "What if my referral cancels?", a: "Commissions stop when the client cancels. If they come back and sign up again through your link you earn again." },
    { q: "Can I be a client and an affiliate?", a: "Yes. Many of our best affiliates are also clients. Use the platform, love it, refer others, earn from both." },
  ];
  return (
    <section className="px-6 md:px-8 py-20 bg-background-secondary border-t border-border">
      <div className="max-w-4xl mx-auto">
        <p className="text-label text-foreground-secondary tracking-[0.12em] mb-3">// questions</p>
        <h2 className="font-heading text-[28px] font-bold text-foreground tracking-tight mb-10">Everything you need to know.</h2>
        <div className="bg-background-card border border-border rounded-[12px] overflow-hidden max-w-[680px] mx-auto">
          {items.map((item, i) => (
            <div key={i} className="border-b border-border last:border-b-0">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-6 py-[18px] text-left group">
                <span className="text-[14px] font-medium text-foreground group-hover:text-foreground/90">{item.q}</span>
                {open === i ? <ChevronUp className="w-4 h-4 text-foreground-secondary flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-foreground-secondary flex-shrink-0" />}
              </button>
              {open === i && (
                <div className="px-6 pb-5 -mt-1">
                  <p className="text-[13px] text-foreground-secondary leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Signup Form ── */
function SignupForm({ formRef }: { formRef: React.RefObject<HTMLDivElement> }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    promotion: "", audienceSize: "", website: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email) { toast.error("First name and email are required"); return; }
    setLoading(true);
    try {
      const userId = user?.id || crypto.randomUUID();
      const referralCode = userId.slice(0, 8) + Math.random().toString(36).slice(2, 6);
      const { error } = await supabase.from("affiliates").insert({
        user_id: userId,
        referral_code: referralCode,
        referred_count: 0,
        earnings: 0,
        payout_status: "pending" as const,
      });
      if (error) throw error;
      toast.success("Welcome to the affiliate program!");
      navigate("/affiliate-dashboard");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section ref={formRef} className="px-6 md:px-8 py-20 bg-background border-t border-border">
      <div className="max-w-4xl mx-auto">
        <p className="text-label text-foreground-secondary tracking-[0.12em] mb-3">// join now</p>
        <h2 className="font-heading text-[28px] font-bold text-foreground tracking-tight mb-10 text-center">Start earning today. It's free.</h2>

        <form onSubmit={handleSubmit} className="bg-background-card border border-border-subtle rounded-[16px] p-8 md:p-10 max-w-[560px] mx-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="First name *" value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required />
            <Input placeholder="Last name" value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
          </div>
          <Input type="email" placeholder="Email address *" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          <Input placeholder="Phone number" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />

          <select value={form.promotion} onChange={e => setForm(p => ({ ...p, promotion: e.target.value }))}
            className="w-full h-10 rounded-md bg-background-elevated border border-input px-3 text-[14px] text-foreground">
            <option value="">How will you promote Katexs?</option>
            <option>Social media</option><option>Email list</option><option>YouTube/Content</option>
            <option>Paid ads</option><option>Referrals/network</option><option>Agency clients</option><option>Other</option>
          </select>

          <select value={form.audienceSize} onChange={e => setForm(p => ({ ...p, audienceSize: e.target.value }))}
            className="w-full h-10 rounded-md bg-background-elevated border border-input px-3 text-[14px] text-foreground">
            <option value="">Your audience size</option>
            <option>Under 500</option><option>500-2,000</option><option>2,000-10,000</option><option>10,000+</option>
          </select>

          <Input placeholder="Website or social profile URL (optional)" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} />

          <Button type="submit" disabled={loading} className="w-full rounded-md mt-2">
            {loading ? "Creating account..." : "Create my affiliate account →"}
          </Button>
        </form>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="border-t border-border py-10 px-6 bg-background-secondary text-center">
      <p className="text-[12px] text-foreground-secondary">© 2026 Katexs. All rights reserved.</p>
    </footer>
  );
}

/* ── Page ── */
const Affiliates = () => {
  const formRef = useRef<HTMLDivElement>(null);
  const scrollToSignup = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background">
      <Hero onScrollToSignup={scrollToSignup} />
      <HowItWorks />
      <Calculator />
      <WhatYouGet />
      <CommissionTable />
      <FAQ />
      <SignupForm formRef={formRef} />
      <Footer />
    </div>
  );
};
export default Affiliates;
