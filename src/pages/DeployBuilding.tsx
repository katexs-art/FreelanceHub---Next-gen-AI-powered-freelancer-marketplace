import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import {
  CheckCircle2, Loader2, Globe, Building2, Briefcase, Phone, Zap,
  AlertCircle,
} from "lucide-react";

const BUILD_STEPS = [
  { label: "Scanning website", icon: Globe, field: null },
  { label: "Extracting business details", icon: Building2, field: "business_name" },
  { label: "Building AI receptionist", icon: Briefcase, field: "services" },
  { label: "Training on your services", icon: Phone, field: "phones" },
  { label: "Deploying agent", icon: Zap, field: null },
] as const;

interface ScrapedData {
  business_name?: string | null;
  services?: string[];
  phones?: string[];
  niche?: string | null;
}

export default function DeployBuilding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const configId = searchParams.get("id");

  const [step, setStep] = useState(0);
  const [scraped, setScraped] = useState<ScrapedData>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!configId) {
      navigate("/deploy", { replace: true });
      return;
    }

    let pollingTimer: ReturnType<typeof setInterval>;
    let stepTimer: ReturnType<typeof setInterval>;
    let resolved = false;

    // Animate steps
    stepTimer = setInterval(() => {
      setStep((prev) => {
        if (prev >= BUILD_STEPS.length - 1) {
          clearInterval(stepTimer);
          return prev;
        }
        return prev + 1;
      });
    }, 900);

    // Poll for config status
    pollingTimer = setInterval(async () => {
      if (resolved) return;
      const { data } = await supabase
        .from("deploy_configs")
        .select("status, business_name, services, phones, niche")
        .eq("id", configId)
        .single();

      if (!data) return;

      setScraped({
        business_name: data.business_name,
        services: (data.services as string[]) || [],
        phones: (data.phones as string[]) || [],
        niche: data.niche,
      });

      if (data.status === "ready") {
        resolved = true;
        clearInterval(pollingTimer);
        // Let animation finish then redirect
        setTimeout(() => {
          setStep(BUILD_STEPS.length);
          setTimeout(() => navigate(`/deploy/${configId}`, { replace: true }), 800);
        }, 1500);
      } else if (data.status === "failed") {
        resolved = true;
        clearInterval(pollingTimer);
        setFailed(true);
      }
    }, 2000);

    return () => {
      clearInterval(stepTimer);
      clearInterval(pollingTimer);
    };
  }, [configId, navigate]);

  if (failed) {
    return (
      <>
        <SEO title="Scan Failed — Katexs" />
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-5">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold text-white">Couldn't scan that site</h2>
            <p className="mt-3 text-[14px] text-white/40">
              The website may be blocking our scanner. Try a different URL or contact us for manual setup.
            </p>
            <button
              onClick={() => navigate("/deploy", { replace: true })}
              className="mt-6 rounded-xl bg-white px-6 py-2.5 text-[13px] font-semibold text-black transition-all hover:bg-white/90"
            >
              Try again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="Building Your AI Agent — Katexs" />
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        </div>

        <div className="relative mx-auto max-w-lg px-5">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06]">
              <Zap className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Building your AI receptionist
            </h2>
            {scraped.business_name && (
              <p className="mt-2 text-[13px] text-white/30">{scraped.business_name}</p>
            )}
          </div>

          <div className="space-y-3">
            {BUILD_STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              const fieldVal = s.field ? scraped[s.field as keyof ScrapedData] : null;

              return (
                <div key={s.label} className={`rounded-xl border px-4 py-3 transition-all duration-500 ${
                  done ? "border-green-500/20 bg-green-500/[0.04]"
                    : active ? "border-white/[0.1] bg-white/[0.03]"
                      : "border-white/[0.04] bg-transparent opacity-30"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-500 ${
                      done ? "bg-green-500/15" : active ? "bg-white/[0.06]" : "bg-white/[0.03]"
                    }`}>
                      {done ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                        : active ? <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                          : <Icon className="h-4 w-4 text-white/20" />}
                    </div>
                    <span className={`text-[13px] font-medium transition-colors duration-500 ${
                      done ? "text-green-400" : active ? "text-white/80" : "text-white/30"
                    }`}>{s.label}</span>
                  </div>

                  {/* Show scraped data as it loads */}
                  {done && fieldVal && (
                    <div className="mt-2 ml-11 animate-in fade-in duration-300">
                      {Array.isArray(fieldVal) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(fieldVal as string[]).slice(0, 5).map((v, j) => (
                            <span key={j} className="rounded-md bg-green-500/[0.08] px-2 py-0.5 text-[11px] text-green-400/70">
                              {typeof v === "string" ? v : String(v)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] text-green-400/60">{String(fieldVal)}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
