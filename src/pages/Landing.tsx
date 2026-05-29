import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Eyebrow, StatNumber, HairlineDivider, MonoTag, Marquee } from "@/components/ui/mono";
import { ArrowUpRight, ArrowRight, Command } from "lucide-react";
import { GigCard, GigCardSkeleton, type GigCardData } from "@/components/marketplace/GigCard";
import { supabase } from "@/integrations/supabase/client";
import avatar1 from "@/assets/avatars/user-1.jpg";
import avatar2 from "@/assets/avatars/user-2.jpg";
import avatar3 from "@/assets/avatars/user-3.jpg";
import avatar4 from "@/assets/avatars/user-4.jpg";
import avatar5 from "@/assets/avatars/user-5.jpg";
import avatar6 from "@/assets/avatars/user-6.jpg";
import avatar7 from "@/assets/avatars/user-7.jpg";
import avatar8 from "@/assets/avatars/user-8.jpg";

const AVATARS = [avatar1, avatar2, avatar3, avatar4, avatar5, avatar6, avatar7, avatar8];

const CATEGORIES = [
  { label: "Build with AI", slug: "build-with-ai" },
  { label: "Sound & Speak with AI", slug: "sound-and-speak-with-ai" },
  { label: "Create with AI", slug: "create-with-ai" },
  { label: "Grow with AI", slug: "grow-with-ai" },
  { label: "Run with AI", slug: "run-with-ai" },
  { label: "Understand AI", slug: "understand-ai" },
  { label: "Write with AI", slug: "write-with-ai" },
  { label: "Learn AI", slug: "learn-ai" },
];

const ROTATING = [
  "build a landing page in React",
  "design a brand identity system",
  "write a 90-day content plan",
  "edit a 60-second product film",
  "ship a Shopify storefront",
  "compose a sonic logo",
];

const POPULAR = ["Logo Design", "WordPress", "Voice Over", "Video Editing", "AI Artists", "SEO"];

export default function Landing() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [phIdx, setPhIdx] = useState(0);
  const [featured, setFeatured] = useState<GigCardData[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setPhIdx((i) => (i + 1) % ROTATING.length), 2800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id")
        .eq("status", "active")
        .order("total_orders", { ascending: false })
        .limit(8);
      const ids = [...new Set((data ?? []).map((g) => g.seller_id))];
      const { data: sellers } = ids.length
        ? await supabase.from("profiles").select("id,username,full_name,avatar_url").in("id", ids)
        : { data: [] as any };
      const byId = new Map((sellers ?? []).map((s: any) => [s.id, s]));
      setFeatured((data ?? []).map((g) => ({ ...g, seller: byId.get(g.seller_id) ?? null })) as GigCardData[]);
      setFeaturedLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="KATEXS — The AI Freelance Marketplace"
        description="Hire AI-native freelancers. Find experts in seconds, ship work in days. The first marketplace built for the AI era."
        jsonLd={{ "@context": "https://schema.org", "@type": "Organization", name: "Katexs", url: "https://katexs.lovable.app" }}
      />
      <SiteHeader />

      {/* ───────────────────────────── HERO ───────────────────────────── */}
      <section className="relative border-b-hairline">
        <div className="container-page pt-28 pb-24 md:pt-40 md:pb-32 text-center">
          <div className="inline-flex items-center gap-2 mono-tag mb-10">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span>KATEXS / V1 — LIVE 2026</span>
          </div>

          <h1 className="display-xl mx-auto max-w-5xl">
            The freelance market,
            <br />
            <span className="text-foreground-muted">rebuilt from first principles.</span>
          </h1>

          <p className="mt-8 text-base md:text-lg text-foreground-muted max-w-xl mx-auto leading-relaxed">
            A precision marketplace where talent and intent meet through intelligence — not noise.
          </p>

          {/* River AI search */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/river-results?q=${encodeURIComponent(q.trim())}`); }}
            className="mt-12 max-w-3xl mx-auto"
          >
            <div className="eyebrow mb-4">POWERED BY RIVER AI</div>
            <div className="surface flex items-center gap-3 rounded-full px-2 py-2 h-14">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tell River what you need — I'll find the best AI experts for you..."
                className="flex-1 bg-transparent text-sm md:text-base px-4 focus:outline-none placeholder:text-foreground-subtle"
              />
              <Button type="submit" size="sm" className="h-10 rounded-full bg-black text-white hover:bg-black/90">
                Find My Expert
              </Button>
            </div>
          </form>

        </div>
      </section>


      {/* ───────────────────────────── STATS STRIP ───────────────────────────── */}
      <section className="border-b-hairline">
        <div className="container-page py-14 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06]">
          {[
            { label: "GIGS DELIVERED", value: "2.4M" },
            { label: "AVG. RATING", value: "4.9" },
            { label: "COUNTRIES", value: "164" },
            { label: "PAID TO TALENT", value: "$1.2B" },
          ].map((s) => (
            <div key={s.label} className="bg-background px-6 py-8">
              <div className="eyebrow mb-3">{s.label}</div>
              <div className="font-mono text-3xl md:text-4xl text-foreground tabular">{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────────── CATEGORIES ───────────────────────────── */}
      <section className="border-b-hairline">
        <div className="container-page py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <Eyebrow>01 / Catalog</Eyebrow>
              <h2 className="display-md mt-3">Every craft. One surface.</h2>
            </div>
            <Link to="/explore" className="hidden md:inline-flex items-center gap-1 eyebrow hover:text-foreground transition-colors">
              All categories <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06]">
            {CATEGORIES.map((c, i) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="bg-background p-6 md:p-8 group hover:bg-background-subtle transition-colors"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs text-foreground-subtle tabular">{String(i + 1).padStart(2, "0")}</span>
                  <ArrowUpRight className="h-4 w-4 text-foreground-subtle group-hover:text-foreground transition-colors" />
                </div>
                <div className="mt-12 font-heading text-base md:text-lg leading-tight">{c.label}</div>
                <div className="mt-2 eyebrow">EXPLORE</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────── FEATURED GIGS ───────────────────────────── */}
      <section className="border-b-hairline">
        <div className="container-page py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <Eyebrow>02 / Featured</Eyebrow>
              <h2 className="display-md mt-3">Top-rated gigs, live now.</h2>
            </div>
            <Link to="/explore" className="hidden md:inline-flex items-center gap-1 eyebrow hover:text-foreground transition-colors">
              Browse all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredLoading
              ? Array.from({ length: 8 }).map((_, i) => <GigCardSkeleton key={i} />)
              : featured.length === 0
                ? <p className="text-foreground-muted col-span-full">No gigs published yet.</p>
                : featured.map((g) => <GigCard key={g.id} gig={g} />)}
          </div>
        </div>
      </section>

      {/* ───────────────────────────── HOW IT WORKS ───────────────────────────── */}
      <section className="border-b-hairline">
        <div className="container-page py-24">
          <div className="text-center mb-16">
            <Eyebrow>03 / Workflow</Eyebrow>
            <h2 className="display-md mt-3 max-w-2xl mx-auto">Three moves. Zero ceremony.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.06]">
            {[
              { n: "01", t: "Search with intent", d: "Describe the outcome. Our AI matches gigs, packages, and sellers in milliseconds — ranked by signal, not ads." },
              { n: "02", t: "Brief & buy in escrow", d: "Pick a package, submit requirements, fund the order. Money sits in escrow until you accept the delivery." },
              { n: "03", t: "Ship, review, repeat", d: "Realtime chat, custom offers, revisions, disputes — all in one workspace. Two-way reviews keep the bar high." },
            ].map((s) => (
              <div key={s.n} className="bg-background p-8 md:p-10">
                <div className="font-mono text-5xl tabular text-foreground-subtle">{s.n}</div>
                <div className="mt-8 font-heading text-xl">{s.t}</div>
                <p className="mt-3 text-sm text-foreground-muted leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────── TRUST / FOR BUSINESS ───────────────────────────── */}
      <section className="border-b-hairline">
        <div className="container-page py-24 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Eyebrow>04 / Trust</Eyebrow>
            <h2 className="display-md mt-3">Built for serious work.</h2>
            <p className="mt-6 text-foreground-muted max-w-md leading-relaxed">
              Verified sellers, escrowed payments, dispute resolution, KYC, and an admin layer that operates at platform scale.
              Every gig is screened. Every dollar is accounted for.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/become-a-seller"><Button variant="outline">Become a seller</Button></Link>
              <Link to="/explore"><Button variant="ghost">Browse the catalog</Button></Link>
            </div>
          </div>
          <div className="surface p-10 grid grid-cols-2 gap-px bg-white/[0.06]">
            {[
              { l: "ESCROW", v: "100%" },
              { l: "DISPUTE SLA", v: "24H" },
              { l: "KYC TIERS", v: "3" },
              { l: "UPTIME", v: "99.99%" },
            ].map((s) => (
              <div key={s.l} className="bg-background-subtle p-6">
                <div className="eyebrow">{s.l}</div>
                <div className="mt-4 font-mono text-3xl tabular">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────── PRESS MARQUEE ───────────────────────────── */}
      <section className="border-b-hairline py-14">
        <div className="container-page mb-8 text-center">
          <Eyebrow>TRUSTED BY OPERATORS AT</Eyebrow>
        </div>
        <Marquee>
          {["STRIPE", "LINEAR", "VERCEL", "FIGMA", "NOTION", "RAYCAST", "SUPERHUMAN", "RAMP", "ARC", "MERCURY"].map((b) => (
            <span key={b} className="font-mono text-xl text-foreground-subtle tracking-[0.18em] mx-10">{b}</span>
          ))}
        </Marquee>
      </section>

      {/* ───────────────────────────── FINAL CTA ───────────────────────────── */}
      <section>
        <div className="container-page py-32 text-center">
          <Eyebrow>05 / Begin</Eyebrow>
          <h2 className="display-lg mt-4 max-w-3xl mx-auto">
            The next decade of work
            <br />
            <span className="text-foreground-muted">starts on Katexs.</span>
          </h2>
          <div className="mt-12 flex justify-center gap-3">
            <Link to="/signup"><Button size="lg">Open an account</Button></Link>
            <Link to="/become-a-seller"><Button size="lg" variant="outline">Sell on Katexs</Button></Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function RiverAISearch() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  return (
    <section className="border-b-hairline">
      <div className="container-page py-20">
        <form
          onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/river-results?q=${encodeURIComponent(q.trim())}`); }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="eyebrow mb-4">POWERED BY RIVER AI</div>
          <div className="surface flex items-center gap-3 rounded-full px-2 py-2 h-14">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tell River what you need — I'll find the best AI experts for you..."
              className="flex-1 bg-transparent text-sm md:text-base px-4 focus:outline-none placeholder:text-foreground-subtle"
            />
            <Button type="submit" size="sm" className="h-10 rounded-full bg-black text-white hover:bg-black/90">
              Find My Expert
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
