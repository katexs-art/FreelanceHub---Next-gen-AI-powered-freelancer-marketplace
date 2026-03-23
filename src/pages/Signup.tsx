import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const steps = ["Account", "Business", "Plan", "Launch"];
const plans = [
  { name: "Starter", price: "$100", annual: "$80", desc: "Solo operators and small teams", features: ["3 client accounts", "Voice + Chat AI", "Free CRM", "10 workflow templates"] },
  { name: "Growth", price: "$297", annual: "$237", desc: "Agencies managing unlimited clients", features: ["Unlimited clients", "Everything in Starter", "Paid ads management", "Priority Slack support"], popular: true },
  { name: "Enterprise", price: "Custom", annual: "Custom", desc: "White-label platform", features: ["Full white-label", "Custom AI training", "Dedicated account manager", "SLA guarantee"] },
];

const industries = ["HVAC", "Plumbing", "Electrical", "Med Spa", "Real Estate", "Roofing", "Landscaping", "Dental", "Fitness", "Legal", "Salon / Barbershop", "General Contractor", "Other"];
const sizes = ["Just me", "2-5", "6-15", "16-50", "50+"];

const Signup = () => {
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("Starter");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordStrength = (() => {
    if (password.length < 6) return 0;
    let s = 1;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabels = ["", "Weak", "Fair", "Strong", "Very strong"];
  const strengthColors = ["", "#f09595", "#EF9F27", "#4ade80", "#4ade80"];

  const canContinue = () => {
    if (step === 0) return fullName && email && password.length >= 6;
    if (step === 1) return businessName && industry;
    return true;
  };

  const handleSignup = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    if (data.user) {
      await supabase.from("users").insert({
        user_id: data.user.id,
        email,
        full_name: fullName,
        business_name: businessName,
        industry,
        phone,
        plan: selectedPlan.toLowerCase() as "starter" | "growth" | "enterprise",
        trial_end_date: new Date(Date.now() + 14 * 86400000).toISOString(),
      });
    }
    toast({ title: "Account created!", description: "Check your email to verify your account." });
    navigate("/onboarding");
    setLoading(false);
  };

  const next = () => {
    if (step === 3) {
      handleSignup();
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-border" style={{ background: "#08080a" }}>
        <Link to="/" className="font-heading font-[800] text-foreground" style={{ fontSize: "18px" }}>
          katexs<span style={{ color: "hsl(var(--accent-green))" }}>.</span>
        </Link>
        <div>
          <h2 className="text-h2 font-bold text-foreground tracking-[-0.03em] mb-3">
            Run your entire business<br />on one platform.
          </h2>
          <p className="text-body text-foreground-secondary max-w-sm mb-8">
            Voice AI, CRM, automations, and a unified inbox — powered by River AI.
          </p>
          <ul className="space-y-3">
            {["14-day free trial", "No setup fees", "Cancel anytime", "Live in 24 hours"].map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-small text-foreground-secondary">
                <span className="w-5 h-5 rounded-full bg-accent-green/15 flex items-center justify-center">
                  <Check className="w-3 h-3 text-accent-green" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-small text-foreground-muted">© 2026 Katexs</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                    i <= step ? "bg-foreground text-background" : "bg-background-elevated text-foreground-muted border border-border"
                  }`}
                >
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-6 h-px ${i < step ? "bg-foreground" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 0 && (
            <div>
              <h2 className="text-h2 font-bold text-foreground tracking-[-0.03em]">Create your account</h2>
              <p className="text-small text-foreground-secondary mt-2 mb-6">Start your 14-day free trial.</p>
              <div className="space-y-3">
                <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <div>
                  <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  {password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-background-elevated overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${passwordStrength * 25}%`, background: strengthColors[passwordStrength] }} />
                      </div>
                      <span style={{ fontSize: "10px", color: strengthColors[passwordStrength] }}>{strengthLabels[passwordStrength]}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 1 && (
            <div>
              <h2 className="text-h2 font-bold text-foreground tracking-[-0.03em]">Your business</h2>
              <p className="text-small text-foreground-secondary mt-2 mb-6">Tell us about your business so River can personalize.</p>
              <div className="space-y-3">
                <Input placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="flex h-10 w-full rounded-md bg-background-elevated border border-input px-3 py-2 text-body text-foreground"
                >
                  <option value="">Select industry</option>
                  {industries.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
                <Input placeholder="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="flex h-10 w-full rounded-md bg-background-elevated border border-input px-3 py-2 text-body text-foreground"
                >
                  <option value="">Company size</option>
                  {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 2 && (
            <div>
              <h2 className="text-h2 font-bold text-foreground tracking-[-0.03em]">Choose your plan</h2>
              <p className="text-small text-foreground-secondary mt-2 mb-6">All plans include a 14-day free trial.</p>
              <div className="space-y-3">
                {plans.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedPlan(p.name)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      selectedPlan === p.name ? "border-foreground" : "border-border hover:border-border-strong"
                    }`}
                    style={{ background: "hsl(var(--background-card))" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-semibold" style={{ fontSize: "14px" }}>{p.name}</span>
                        {p.popular && <span className="text-[9px] px-2 py-0.5 rounded-full bg-foreground text-background font-semibold">POPULAR</span>}
                      </div>
                      <span className="text-foreground font-bold" style={{ fontSize: "18px" }}>{p.price}<span className="text-foreground-muted font-normal" style={{ fontSize: "12px" }}>/mo</span></span>
                    </div>
                    <p className="text-foreground-muted" style={{ fontSize: "11px" }}>{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 3 && (
            <div>
              <h2 className="text-h2 font-bold text-foreground tracking-[-0.03em]">Start your trial</h2>
              <p className="text-small text-foreground-secondary mt-2 mb-6">14-day free trial — you won't be charged today.</p>
              <div className="rounded-xl border p-4 mb-4" style={{ background: "hsl(var(--background-card))", borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex justify-between text-[13px]">
                  <span className="text-foreground-secondary">Plan</span>
                  <span className="text-foreground font-semibold">{selectedPlan}</span>
                </div>
                <div className="flex justify-between text-[13px] mt-2">
                  <span className="text-foreground-secondary">Price</span>
                  <span className="text-foreground font-semibold">{plans.find((p) => p.name === selectedPlan)?.price}/mo</span>
                </div>
                <div className="flex justify-between text-[13px] mt-2">
                  <span className="text-foreground-secondary">Trial ends</span>
                  <span className="text-accent-green font-semibold">{new Date(Date.now() + 14 * 86400000).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="rounded-xl border p-4 mb-4 text-center" style={{ background: "hsl(var(--background-elevated))", borderColor: "rgba(255,255,255,0.08)" }}>
                <p className="text-foreground-muted" style={{ fontSize: "12px" }}>Stripe payment integration coming soon.</p>
                <p className="text-foreground-muted" style={{ fontSize: "11px" }}>You can start your trial now — no card required.</p>
              </div>

              {refCode && (
                <div className="rounded-lg border p-3 mb-4" style={{ background: "rgba(74,222,128,0.05)", borderColor: "rgba(74,222,128,0.15)" }}>
                  <p className="text-accent-green" style={{ fontSize: "11px" }}>Referral code applied: {refCode}</p>
                </div>
              )}

              <p className="text-foreground-muted text-center mb-4" style={{ fontSize: "10px" }}>
                By signing up you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {step > 0 ? (
              <button onClick={() => setStep((s) => s - 1)} className="flex items-center gap-1 text-foreground-secondary hover:text-foreground" style={{ fontSize: "13px" }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}
            <Button onClick={next} disabled={!canContinue() || loading} className="min-w-[140px]">
              {loading ? "Creating..." : step === 3 ? "Start free trial →" : "Continue →"}
            </Button>
          </div>

          {step === 0 && (
            <p className="text-small text-foreground-secondary text-center mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-foreground hover:underline">Log in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
