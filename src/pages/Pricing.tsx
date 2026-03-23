import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "STARTER",
    monthly: 100,
    annual: 80,
    tagline: "Perfect for solo operators and small teams getting started with AI.",
    featured: false,
    features: [
      "Up to 3 client accounts",
      "Voice AI agent (connect your Vapi key)",
      "Chat AI — SMS + website widget",
      "Free CRM — fully configured",
      "Workflow builder — 10 pre-built templates",
      "Missed call text-back automation",
      "Unified inbox — all channels",
      "Basic webhooks + automations",
      "River AI co-pilot",
      "Email support",
    ],
    nudge: {
      text: "Need more than 3 clients? Growth plan includes unlimited.",
      link: "Upgrade →",
    },
    cta: "Start 14-day free trial",
    ctaVariant: "default" as const,
  },
  {
    name: "GROWTH",
    monthly: 297,
    annual: 237,
    tagline: "For agencies and service businesses managing unlimited clients.",
    featured: true,
    features: [
      "Unlimited client accounts",
      "Everything in Starter",
      "Done-for-you SMS + email workflows",
      "Paid ads setup + management",
      "Website or landing page build",
      "Lead generation system",
      "Reputation management automation",
      "Pipeline tracker + reporting dashboard",
      "Priority support — dedicated Slack channel",
      "River AI — advanced mode",
      "API access",
      "Remove Katexs branding",
    ],
    nudge: {
      text: "Need white-label for your agency brand? Enterprise plan.",
      link: "Learn more →",
    },
    cta: "Start 14-day free trial",
    ctaVariant: "default" as const,
  },
  {
    name: "ENTERPRISE",
    monthly: null,
    annual: null,
    tagline: "Full white-label platform. Your brand. Your pricing. Your clients.",
    featured: false,
    features: [
      "Everything in Growth",
      "Full white-label — your domain + branding",
      "Resell to unlimited clients",
      "Custom AI agent training",
      "Dedicated account manager",
      "SLA support guarantee",
      "Custom integrations",
      "Team member logins",
      "Advanced analytics + reporting",
      "Investor-ready data exports",
    ],
    nudge: null,
    cta: "Contact us",
    ctaVariant: "ghost" as const,
  },
];

type CompareValue = boolean | string;
interface CompareRow {
  feature: string;
  starter: CompareValue;
  growth: CompareValue;
  enterprise: CompareValue;
}

const compareData: CompareRow[] = [
  { feature: "Client accounts", starter: "3", growth: "Unlimited", enterprise: "Unlimited" },
  { feature: "Voice AI agent", starter: true, growth: true, enterprise: true },
  { feature: "Chat AI", starter: true, growth: true, enterprise: true },
  { feature: "Free CRM", starter: true, growth: true, enterprise: true },
  { feature: "Workflow builder", starter: "10 templates", growth: "Unlimited", enterprise: "Unlimited" },
  { feature: "Webhooks", starter: "Basic", growth: "Advanced", enterprise: "Advanced" },
  { feature: "Unified inbox", starter: true, growth: true, enterprise: true },
  { feature: "River AI co-pilot", starter: true, growth: "Advanced", enterprise: "Advanced" },
  { feature: "Paid ads management", starter: false, growth: true, enterprise: true },
  { feature: "Website build", starter: false, growth: true, enterprise: true },
  { feature: "API access", starter: false, growth: true, enterprise: true },
  { feature: "Remove branding", starter: false, growth: true, enterprise: true },
  { feature: "White-label", starter: false, growth: false, enterprise: true },
  { feature: "Dedicated support", starter: "Email", growth: "Slack", enterprise: "Account manager" },
  { feature: "Team logins", starter: "1", growth: "5", enterprise: "Unlimited" },
];

function CellValue({ value }: { value: CompareValue }) {
  if (value === true) return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-green/20"><Check className="w-3 h-3 text-accent-green" /></span>;
  if (value === false) return <X className="w-4 h-4 text-foreground-muted mx-auto" />;
  return <span className="text-foreground text-small">{value}</span>;
}

const Pricing = () => {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-6 border-b border-border" style={{ background: "#08080a", backdropFilter: "blur(12px)" }}>
        <Link to="/" className="text-foreground font-heading font-bold text-[15px] tracking-[-0.03em]">
          Katex<span className="relative">s<span className="absolute -top-0.5 -right-1.5 w-[5px] h-[5px] rounded-full bg-accent-green" /></span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link to="/login" className="text-small text-foreground-secondary hover:text-foreground transition-colors">Log in</Link>
          <Link to="/signup">
            <Button size="sm">Start free trial</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-[128px] pb-12 px-8 text-center">
        <p className="text-label text-foreground-secondary tracking-[0.12em] uppercase mb-4">// simple pricing</p>
        <h1 className="font-heading font-bold text-foreground tracking-[-0.04em] mb-4" style={{ fontSize: "clamp(36px,5vw,56px)", lineHeight: 1.05 }}>
          Start free. Scale when ready.
        </h1>
        <p className="text-[15px] text-foreground-secondary max-w-[440px] mx-auto">
          14-day free trial on all plans. Card required — cancel anytime. No setup fees. No surprises.
        </p>
      </section>

      {/* Toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center rounded-full p-1" style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.10)" }}>
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-full text-small font-medium transition-colors ${!annual ? "bg-foreground text-background" : "text-foreground-secondary"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 rounded-full text-small font-medium transition-colors ${annual ? "bg-foreground text-background" : "text-foreground-secondary"}`}
          >
            Annual <span className="text-accent-green ml-1">save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <section className="max-w-[960px] mx-auto px-8 pb-20 grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-[16px] p-8 flex flex-col ${
              plan.featured
                ? "bg-background-elevated border-[1.5px] border-border-strong relative"
                : "bg-background-card border border-border"
            }`}
          >
            {plan.featured && (
              <div className="absolute top-0 left-0 right-0 bg-foreground text-background text-label font-semibold tracking-[0.1em] text-center py-2 rounded-t-[16px]">
                MOST POPULAR
              </div>
            )}

            <div className={plan.featured ? "mt-6" : ""}>
              <p className="text-label text-foreground-secondary tracking-[0.12em] mb-4">{plan.name}</p>

              {plan.monthly !== null ? (
                <p className="font-heading font-bold text-foreground tracking-[-0.04em] mb-1" style={{ fontSize: 52, lineHeight: 1 }}>
                  ${annual ? plan.annual : plan.monthly}<span className="text-[16px] font-normal text-foreground-secondary">/mo</span>
                </p>
              ) : (
                <p className="font-heading font-bold text-foreground tracking-[-0.04em] mb-1" style={{ fontSize: 40, lineHeight: 1 }}>
                  Custom
                </p>
              )}

              {plan.monthly !== null && (
                <p className="text-small font-medium text-accent-green mb-3">Free setup</p>
              )}

              <p className="text-small text-foreground-secondary mb-5">{plan.tagline}</p>

              <div className="w-full h-px bg-border mb-5" />

              <ul className="space-y-2.5 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-small text-foreground-secondary">
                    <Check className="w-3.5 h-3.5 text-accent-green mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.nudge && (
                <div className="bg-background-elevated border border-border rounded-md p-3 mb-6">
                  <p className="text-small text-foreground-secondary">
                    {plan.nudge.text}{" "}
                    <span className="text-foreground hover:underline cursor-pointer">{plan.nudge.link}</span>
                  </p>
                </div>
              )}

              <div className="mt-auto">
                <Link to={plan.ctaVariant === "ghost" ? "/contact" : "/signup"}>
                  <Button variant={plan.ctaVariant} className="w-full">
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Feature Comparison */}
      <section className="max-w-[860px] mx-auto px-8 pb-20">
        <h3 className="text-h3 font-semibold text-foreground mb-5">Compare all features</h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-small">
            <thead>
              <tr className="bg-background-elevated">
                <th className="text-left py-3 px-4 text-foreground-secondary font-medium">Feature</th>
                <th className="text-center py-3 px-4 text-foreground-secondary font-medium">Starter</th>
                <th className="text-center py-3 px-4 text-foreground-secondary font-medium">Growth</th>
                <th className="text-center py-3 px-4 text-foreground-secondary font-medium">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {compareData.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? "bg-background-card" : "bg-background-secondary"}>
                  <td className="py-3 px-4 text-foreground">{row.feature}</td>
                  <td className="py-3 px-4 text-center"><CellValue value={row.starter} /></td>
                  <td className="py-3 px-4 text-center"><CellValue value={row.growth} /></td>
                  <td className="py-3 px-4 text-center"><CellValue value={row.enterprise} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Guarantee */}
      <section className="max-w-[760px] mx-auto px-8 pb-20">
        <div className="bg-background-card border border-border-subtle rounded-[16px] p-10 flex flex-col md:flex-row items-start gap-8">
          <div className="shrink-0 w-16 h-16 rounded-[12px] bg-background-elevated border border-border-subtle flex items-center justify-center">
            <Shield className="w-7 h-7 text-accent-green" />
          </div>
          <div>
            <h3 className="text-h3 font-semibold text-foreground mb-2">30-day money-back guarantee</h3>
            <p className="text-body text-foreground-secondary mb-4">
              Try Katexs risk-free. If it doesn't work for your business within 30 days, we'll refund every penny — no questions asked, no hoops to jump through.
            </p>
            <p className="text-small text-foreground-muted">
              Cancel anytime from your dashboard. Your data stays yours.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-8 text-center">
        <p className="text-small text-foreground-muted">© 2026 Katexs. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Pricing;
