import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { ChevronDown, X } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { GigCard, GigCardData, GigCardSkeleton } from "@/components/marketplace/GigCard";
import { RiverCommandBar } from "@/components/services/RiverCommandBar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type Sort = "newest" | "top_rated" | "price_low" | "price_high";

type GigRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  starting_price: number;
  average_rating: number;
  total_reviews: number;
  category: string | null;
  created_at: string;
  seller_id: string;
  gig_packages: { delivery_days: number }[] | null;
};

type SellerInfo = { id: string; username: string | null; full_name: string | null; avatar_url: string | null; location: string | null; country: string | null };

const QUICK_CHIPS = [
  "Voice AI",
  "Chatbot Dev",
  "AI Automation",
  "Prompt Engineering",
  "GoHighLevel",
  "AI Content",
  "AI Agents",
  "Custom AI",
];

const BUDGET_OPTIONS = [
  { label: "$0 – $50", min: 0, max: 50 },
  { label: "$50 – $200", min: 50, max: 200 },
  { label: "$200 – $500", min: 200, max: 500 },
  { label: "$500+", min: 500, max: Infinity },
] as const;

const DELIVERY_OPTIONS = [
  { label: "24 hours", days: 1 },
  { label: "3 days", days: 3 },
  { label: "7 days", days: 7 },
  { label: "Any", days: Infinity },
] as const;

const RATING_OPTIONS = [
  { label: "4.5+", min: 4.5 },
  { label: "4.0+", min: 4.0 },
  { label: "Any", min: 0 },
] as const;

const LOCATION_OPTIONS = ["Online", "US", "UK", "Canada", "Global"] as const;

type BudgetOpt = typeof BUDGET_OPTIONS[number] | null;
type DeliveryOpt = typeof DELIVERY_OPTIONS[number] | null;
type RatingOpt = typeof RATING_OPTIONS[number] | null;
type LocationOpt = typeof LOCATION_OPTIONS[number] | null;

interface FilterPillProps {
  label: string;
  active?: boolean;
  onClear?: () => void;
  children: React.ReactNode;
}

function FilterPill({ label, active, onClear, children }: FilterPillProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-full border text-sm font-medium transition-colors ${
            active
              ? "bg-foreground text-background border-foreground"
              : "bg-background border-border text-foreground hover:border-foreground/40"
          }`}
        >
          <span>{label}</span>
          {active && onClear ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear(); }}
              className="ml-0.5 inline-flex items-center justify-center rounded-full hover:bg-background/20 p-0.5"
              aria-label="Clear filter"
            >
              <X size={12} />
            </span>
          ) : (
            <ChevronDown size={14} className="opacity-70" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Services() {
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [sellers, setSellers] = useState<Record<string, SellerInfo>>({});
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string>("");
  const [budget, setBudget] = useState<BudgetOpt>(null);
  const [delivery, setDelivery] = useState<DeliveryOpt>(null);
  const [rating, setRating] = useState<RatingOpt>(null);
  const [location, setLocation] = useState<LocationOpt>(null);
  const [sort, setSort] = useState<Sort>("newest");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gigs")
        .select(
          "id,title,thumbnail_url,starting_price,average_rating,total_reviews,category,created_at,seller_id,gig_packages(delivery_days)"
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) console.error("Failed to load services", error);
      const rows = (data ?? []) as unknown as GigRow[];
      setGigs(rows);
      const ids = Array.from(new Set(rows.map((r) => r.seller_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url,location,country")
          .in("id", ids);
        const map: Record<string, SellerInfo> = {};
        (profs ?? []).forEach((p: any) => { map[p.id] = p; });
        setSellers(map);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = gigs;
    if (cat) {
      const needle = cat.toLowerCase();
      list = list.filter((g) =>
        (g.category ?? "").toLowerCase().includes(needle) ||
        g.title.toLowerCase().includes(needle)
      );
    }
    if (budget) {
      list = list.filter((g) => g.starting_price >= budget.min && g.starting_price < budget.max);
    }
    if (delivery && delivery.days !== Infinity) {
      list = list.filter((g) => {
        const min = g.gig_packages?.length ? Math.min(...g.gig_packages.map((p) => p.delivery_days)) : null;
        return min !== null && min <= delivery.days;
      });
    }
    if (rating && rating.min > 0) {
      list = list.filter((g) => Number(g.average_rating ?? 0) >= rating.min);
    }
    if (location && location !== "Global") {
      const codes: Record<string, string[]> = {
        US: ["us", "united states", "usa", "america"],
        UK: ["uk", "united kingdom", "england", "scotland", "wales", "britain", "gb"],
        Canada: ["ca", "canada"],
        Online: [], // matches sellers with no location set or explicitly "online" / "remote"
      };
      const needles = codes[location] ?? [];
      list = list.filter((g) => {
        const s = sellers[g.seller_id];
        const loc = `${s?.location ?? ""} ${s?.country ?? ""}`.toLowerCase().trim();
        if (location === "Online") return !loc || /online|remote|worldwide/.test(loc);
        return needles.some((n) => loc.includes(n));
      });
    }

    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "top_rated") sorted.sort((a, b) => Number(b.average_rating) - Number(a.average_rating));
    if (sort === "price_low") sorted.sort((a, b) => a.starting_price - b.starting_price);
    if (sort === "price_high") sorted.sort((a, b) => b.starting_price - a.starting_price);
    return sorted;
  }, [gigs, sellers, cat, budget, delivery, rating, location, sort]);

  const toCard = (g: GigRow): GigCardData => {
    const minDelivery = g.gig_packages?.length
      ? Math.min(...g.gig_packages.map((p) => p.delivery_days))
      : null;
    const s = sellers[g.seller_id];
    return {
      id: g.id,
      title: g.title,
      thumbnail_url: g.thumbnail_url,
      starting_price: g.starting_price,
      average_rating: Number(g.average_rating ?? 0),
      total_reviews: g.total_reviews,
      delivery_days: Number.isFinite(minDelivery as number) ? (minDelivery as number) : null,
      seller: s ? { username: s.username, full_name: s.full_name, avatar_url: s.avatar_url } : null,
    };
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f9f9f9" }}>
      <SEO title="Find AI Experts — Katexs" description="Hire verified AI experts in minutes. Intelligence — not noise." />
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="container-page pt-10 pb-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              Find the perfect AI expert. Hire in minutes.
            </h1>
            <p className="mt-3 text-base md:text-lg text-foreground-muted">
              intelligence — not noise.
            </p>
            <div className="mt-6">
              <RiverCommandBar />
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {QUICK_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(cat === c ? "" : c)}
                  className={`px-3.5 py-1.5 rounded-full text-xs border transition-colors ${
                    cat === c
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background border-border text-foreground hover:border-foreground/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Filter bar + results */}
        <section className="container-page pb-16">
          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <FilterPill
              label={cat ? `Category: ${cat}` : "Category"}
              active={!!cat}
              onClear={() => setCat("")}
            >
              {QUICK_CHIPS.map((c) => (
                <DropdownMenuItem key={c} onSelect={() => setCat(c)}>{c}</DropdownMenuItem>
              ))}
            </FilterPill>

            <FilterPill
              label={budget ? `Budget: ${budget.label}` : "Budget"}
              active={!!budget}
              onClear={() => setBudget(null)}
            >
              {BUDGET_OPTIONS.map((b) => (
                <DropdownMenuItem key={b.label} onSelect={() => setBudget(b)}>{b.label}</DropdownMenuItem>
              ))}
            </FilterPill>

            <FilterPill
              label={delivery ? `Delivery: ${delivery.label}` : "Delivery Time"}
              active={!!delivery}
              onClear={() => setDelivery(null)}
            >
              {DELIVERY_OPTIONS.map((d) => (
                <DropdownMenuItem key={d.label} onSelect={() => setDelivery(d)}>{d.label}</DropdownMenuItem>
              ))}
            </FilterPill>

            <FilterPill
              label={rating ? `Rating: ${rating.label}` : "Seller Rating"}
              active={!!rating}
              onClear={() => setRating(null)}
            >
              {RATING_OPTIONS.map((r) => (
                <DropdownMenuItem key={r.label} onSelect={() => setRating(r)}>{r.label}</DropdownMenuItem>
              ))}
            </FilterPill>

            <FilterPill
              label={location ? `Location: ${location}` : "Location"}
              active={!!location}
              onClear={() => setLocation(null)}
            >
              {LOCATION_OPTIONS.map((l) => (
                <DropdownMenuItem key={l} onSelect={() => setLocation(l)}>{l}</DropdownMenuItem>
              ))}
            </FilterPill>
          </div>

          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              {loading ? "Loading…" : `${filtered.length} service${filtered.length === 1 ? "" : "s"}`}
            </h2>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-9 rounded-md bg-background border border-border px-3 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="top_rated">Top Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => <GigCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-background p-16 text-center">
              <h3 className="font-semibold">No services match these filters</h3>
              <p className="text-sm text-foreground-muted mt-1">
                Try clearing filters or ask River above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((g) => <GigCard key={g.id} gig={toCard(g)} />)}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
