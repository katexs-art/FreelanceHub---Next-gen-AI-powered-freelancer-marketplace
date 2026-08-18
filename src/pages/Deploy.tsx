import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe, ArrowRight, Loader2, Building2, Clock, Phone, Palette, AlertCircle,
} from "lucide-react";

interface FallbackData {
  business_name: string;
  niche: string;
  services: string;
  hours: string;
  phone: string;
}

export default function Deploy() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackConfigId, setFallbackConfigId] = useState<string | null>(null);
  const [fallback, setFallback] = useState<FallbackData>({
    business_name: "",
    niche: "",
    services: "",
    hours: "",
    phone: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");

    try {
      const normalizedUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;

      const { data, error: fnError } = await supabase.functions.invoke(
        "create-deploy-config",
        { body: { url: normalizedUrl } }
      );

      if (fnError) throw fnError;

      if (data?.status === "ready") {
        navigate(`/deploy/${data.id}`);
      } else if (data?.needsFallback) {
        setFallbackConfigId(data.id);
        setShowFallback(true);
        setLoading(false);
      } else {
        navigate(`/deploy/${data.id}`);
      }
    } catch (err) {
      console.error("Deploy error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleFallbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fallbackConfigId) return;

    setLoading(true);
    setError("");

    try {
      const services = fallback.services
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const { error: updateError } = await supabase
        .from("deploy_configs")
        .update({
          business_name: fallback.business_name || null,
          niche: fallback.niche || null,
          services,
          hours: fallback.hours || null,
          phones: fallback.phone ? [fallback.phone] : [],
          status: "ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", fallbackConfigId);

      if (updateError) throw updateError;

      navigate(`/deploy/${fallbackConfigId}`);
    } catch (err) {
      console.error("Fallback error:", err);
      setError("Failed to save. Please try again.");
      setLoading(false);
    }
  }

  if (showFallback) {
    return (
      <>
        <SEO
          title="Tell Us About Your Business — Katexs"
          description="Quick setup for your AI agent demo."
        />
        <SiteHeader variant="transparent" />
        <main className="relative flex min-h-screen items-center justify-center pt-16">
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-xl px-5 py-24">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                We couldn't scan that site
              </h1>
              <p className="mt-3 text-[14px] leading-relaxed text-white/40">
                No worries — tell us a bit about your business and we'll build your demo manually.
              </p>
            </div>

            <form onSubmit={handleFallbackSubmit} className="space-y-4">
              <FallbackField
                icon={<Building2 className="h-4 w-4 text-white/20" />}
                label="Business name"
                value={fallback.business_name}
                onChange={(v) => setFallback((p) => ({ ...p, business_name: v }))}
                placeholder="Acme Corp"
                required
              />
              <FallbackField
                icon={<Palette className="h-4 w-4 text-white/20" />}
                label="Industry / Niche"
                value={fallback.niche}
                onChange={(v) => setFallback((p) => ({ ...p, niche: v }))}
                placeholder="e.g. Plumbing, SaaS, Restaurant"
                required
              />
              <FallbackField
                icon={<Globe className="h-4 w-4 text-white/20" />}
                label="Services (comma-separated)"
                value={fallback.services}
                onChange={(v) => setFallback((p) => ({ ...p, services: v }))}
                placeholder="Web design, SEO, Branding"
                required
              />
              <FallbackField
                icon={<Clock className="h-4 w-4 text-white/20" />}
                label="Business hours"
                value={fallback.hours}
                onChange={(v) => setFallback((p) => ({ ...p, hours: v }))}
                placeholder="Mon–Fri 9am–5pm"
              />
              <FallbackField
                icon={<Phone className="h-4 w-4 text-white/20" />}
                label="Phone number"
                value={fallback.phone}
                onChange={(v) => setFallback((p) => ({ ...p, phone: v }))}
                placeholder="+1 (555) 000-0000"
              />

              {error && (
                <p className="text-center text-sm text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !fallback.business_name.trim() || !fallback.niche.trim()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[14px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Build my demo
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SEO
        title="Instant AI Demo — Katexs"
        description="Paste your website URL and see your custom AI agent in action — in seconds."
      />
      <SiteHeader variant="transparent" />

      <main className="relative flex min-h-screen items-center justify-center pt-16">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/[0.04] blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-2xl px-5 py-24 text-center">
          <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
            Try it free — no signup required
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            See Your AI Agent <br className="hidden sm:block" />
            <span className="text-white/60">in 30 Seconds</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/40">
            Paste your website URL. We'll scan it, build a custom AI agent trained on your
            business, and show you what it can do — live.
          </p>

          <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-xl">
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1.5 transition-all focus-within:border-white/[0.15] focus-within:bg-white/[0.05]">
              <Globe className="ml-3 h-5 w-5 shrink-0 text-white/20" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourwebsite.com"
                className="flex-1 border-0 bg-transparent px-2 py-3.5 text-[15px] text-white placeholder:text-white/25 focus:outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!url.trim() || loading}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-6 py-3 text-[13px] font-semibold text-black transition-all hover:bg-white/90 active:scale-[0.97] disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Build my demo
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}
          </form>

          <div className="mt-16 flex items-center justify-center gap-8 text-[12px] text-white/20">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500/60" />
              No signup required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500/60" />
              Free forever
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500/60" />
              30-second setup
            </span>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function FallbackField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-white/40">
        {label}
        {required && <span className="ml-0.5 text-white/20">*</span>}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 transition-all focus-within:border-white/[0.15] focus-within:bg-white/[0.05]">
        {icon}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="flex-1 border-0 bg-transparent text-[14px] text-white placeholder:text-white/25 focus:outline-none"
        />
      </div>
    </div>
  );
}
