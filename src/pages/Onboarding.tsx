import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { riverOnboardingGuide, buildBusinessContext, type RiverContext } from "@/services/river";
import { RiverThinking } from "@/components/river/RiverThinking";
import { Check, ArrowRight, Sparkles, Zap, Phone, MessageSquare } from "lucide-react";

const STEPS = ["Welcome", "Profile", "Integrations", "River Setup", "Launch"];

const RECOMMENDED_WORKFLOWS = [
  { name: "Missed call text-back", trigger: "missed_call", desc: "Instantly text back missed calls" },
  { name: "New lead speed dial", trigger: "new_lead", desc: "River calls new leads in 60 seconds" },
  { name: "Appointment reminder", trigger: "time_delay", desc: "SMS reminder 24hrs before" },
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [riverTip, setRiverTip] = useState("");
  const [riverLoading, setRiverLoading] = useState(false);
  const [activated, setActivated] = useState<Set<number>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      setLoading(false);
    });
  }, [user]);

  const goNext = () => {
    if (step === STEPS.length - 1) {
      setShowConfetti(true);
      setTimeout(() => navigate("/dashboard"), 2000);
      return;
    }
    const next = step + 1;
    setStep(next);

    // River analyzes at step 3
    if (next === 3 && profile) {
      setRiverLoading(true);
      riverOnboardingGuide(buildBusinessContext(profile))
        .then(setRiverTip)
        .catch(() => setRiverTip("Start by connecting Twilio for SMS and voice capabilities."))
        .finally(() => setRiverLoading(false));
    }
  };

  const toggleWorkflow = (idx: number) => {
    setActivated((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RiverThinking text="River is setting up your workspace..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                i <= step ? "bg-foreground text-background" : "bg-background-elevated text-foreground-muted border border-border"
              }`}
            >
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px ${i < step ? "bg-foreground" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="w-full max-w-lg">
        {step === 0 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent-purple/20 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-accent-purple" />
            </div>
            <h1 className="text-[28px] font-bold text-foreground tracking-[-0.03em]">
              Welcome to Katexs
            </h1>
            <p className="text-[15px] text-foreground-secondary max-w-sm mx-auto">
              River is setting up your workspace. Let's get your business running on autopilot in under 5 minutes.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-[20px] font-bold text-foreground text-center">Confirm your business</h2>
            <div className="bg-background-card border border-border rounded-xl p-5 space-y-3">
              {[
                { label: "Name", value: profile?.full_name || user?.email },
                { label: "Business", value: profile?.business_name || "Not set" },
                { label: "Industry", value: profile?.industry || "Not set" },
                { label: "Email", value: profile?.email || user?.email },
              ].map((f) => (
                <div key={f.label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-[12px] text-foreground-muted">{f.label}</span>
                  <span className="text-[12px] text-foreground">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-[20px] font-bold text-foreground text-center">Connect your first integration</h2>
            <p className="text-[13px] text-foreground-secondary text-center">These power the core of your platform.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Twilio", desc: "Voice + SMS", icon: Phone, color: "#f09595" },
                { name: "Vapi", desc: "AI Voice Agent", icon: Zap, color: "#7F77DD" },
                { name: "SendGrid", desc: "Email", icon: MessageSquare, color: "#85B7EB" },
                { name: "Google Calendar", desc: "Appointments", icon: Check, color: "#4ade80" },
              ].map((int) => (
                <button
                  key={int.name}
                  onClick={() => navigate("/integrations")}
                  className="bg-background-card border border-border rounded-xl p-4 text-left hover:border-border-strong transition-colors"
                >
                  <int.icon className="w-5 h-5 mb-2" style={{ color: int.color }} />
                  <p className="text-[13px] font-semibold text-foreground">{int.name}</p>
                  <p className="text-[11px] text-foreground-muted">{int.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-foreground-muted text-center">You can connect these later in Settings → Integrations</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-[20px] font-bold text-foreground text-center">River recommends</h2>
            {riverLoading ? (
              <div className="text-center py-8"><RiverThinking text="River is analyzing your business..." /></div>
            ) : (
              <>
                {riverTip && (
                  <div
                    className="rounded-xl p-4 text-[13px] text-foreground-secondary leading-relaxed"
                    style={{ background: "rgba(127,119,221,0.06)", border: "1px solid rgba(127,119,221,0.15)", borderTop: "2px solid #7F77DD" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-accent-purple" />
                      <span className="text-[11px] font-semibold" style={{ color: "#AFA9EC" }}>River AI</span>
                    </div>
                    {riverTip}
                  </div>
                )}
                <div className="space-y-2">
                  {RECOMMENDED_WORKFLOWS.map((wf, i) => (
                    <button
                      key={wf.name}
                      onClick={() => toggleWorkflow(i)}
                      className={`w-full flex items-center gap-3 rounded-xl p-4 text-left transition-colors ${
                        activated.has(i)
                          ? "bg-accent-green/10 border border-accent-green/30"
                          : "bg-background-card border border-border hover:border-border-strong"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        activated.has(i) ? "bg-accent-green" : "bg-background-elevated border border-border"
                      }`}>
                        {activated.has(i) && <Check className="w-3.5 h-3.5 text-background" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-foreground">{wf.name}</p>
                        <p className="text-[11px] text-foreground-muted">{wf.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-4">
            {showConfetti && (
              <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      background: ["#4ade80", "#7F77DD", "#f8f7f4", "#EF9F27"][Math.floor(Math.random() * 4)],
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random() * 2}s`,
                    }}
                  />
                ))}
              </div>
            )}
            <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-accent-green" />
            </div>
            <h2 className="text-[24px] font-bold text-foreground">You're live. River is active.</h2>
            <p className="text-[14px] text-foreground-secondary">
              Your workspace is ready. River is monitoring your business 24/7.
            </p>
          </div>
        )}

        {/* Nav button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-foreground text-background text-[13px] font-semibold hover:opacity-90"
          >
            {step === STEPS.length - 1 ? "Go to Dashboard" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
