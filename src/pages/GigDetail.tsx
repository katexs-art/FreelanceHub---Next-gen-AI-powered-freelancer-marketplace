import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Star, Clock, RefreshCw, Check, Heart, MessageSquare } from "lucide-react";
import { ReviewsList } from "@/components/marketplace/ReviewsList";
import { SEO } from "@/components/SEO";
import { RatingBreakdown } from "@/components/marketplace/RatingBreakdown";
import { RecentlyViewed } from "@/components/marketplace/RecentlyViewed";
import { ReportDialog } from "@/components/marketplace/ReportDialog";
import { VerifiedBadge } from "@/components/marketplace/VerifiedBadge";
import { trackRecentlyViewed } from "@/lib/recentlyViewed";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type PkgType = "basic" | "standard" | "premium";
interface Gig {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  gallery_urls: string[];
  thumbnail_url: string | null;
  starting_price: number;
  total_orders: number;
  total_reviews: number;
  average_rating: number;
  seller_id: string;
}
interface Pkg {
  id: string;
  package_type: PkgType;
  title: string;
  description: string | null;
  price: number;
  delivery_days: number;
  revisions: number;
  features: string[];
}
interface Seller {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  member_since: string;
  is_online: boolean;
  response_rate: number | null;
  response_time_minutes: number | null;
}

function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (60 * 24))}d`;
}

export default function GigDetail() {
  const { slug: gigId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [gig, setGig] = useState<Gig | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [selectedTier, setSelectedTier] = useState<PkgType>("basic");
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!gigId) return;
    (async () => {
      const { data: g } = await supabase.from("gigs").select("*").eq("id", gigId).maybeSingle();
      if (!g) { setLoading(false); return; }
      setGig(g as Gig);
      trackRecentlyViewed(g.id);
      // bump impressions (best effort)
      supabase.from("gigs").update({ impressions: (g.impressions ?? 0) + 1 }).eq("id", g.id);

      const [{ data: pkgs }, { data: sel }] = await Promise.all([
        supabase.from("gig_packages").select("*").eq("gig_id", g.id),
        supabase.from("profiles").select("*").eq("id", g.seller_id).maybeSingle(),
      ]);
      const order: PkgType[] = ["basic", "standard", "premium"];
      setPackages(((pkgs ?? []) as Pkg[]).sort((a, b) => order.indexOf(a.package_type) - order.indexOf(b.package_type)));
      setSeller(sel as Seller);
      setLoading(false);

      if (user) {
        const { data: saved } = await supabase.from("saved_gigs")
          .select("id").eq("user_id", user.id).eq("gig_id", g.id).maybeSingle();
        setIsSaved(!!saved);
      }
    })();
  }, [gigId, user]);

  const toggleSave = async () => {
    if (!user || !gig) return nav("/login");
    if (isSaved) {
      await supabase.from("saved_gigs").delete().eq("user_id", user.id).eq("gig_id", gig.id);
      setIsSaved(false);
    } else {
      const { error } = await supabase.from("saved_gigs").insert({ user_id: user.id, gig_id: gig.id });
      if (!error) setIsSaved(true);
    }
  };

  const contactSeller = async () => {
    if (!user) return nav("/login");
    if (!seller || !gig) return;
    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      _other: seller.id, _gig_id: gig.id, _order_id: null,
    });
    if (error) return toast.error(error.message);
    nav(`/inbox/${data}`);
  };

  const selected = packages.find((p) => p.package_type === selectedTier) ?? packages[0];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container py-10 text-foreground-muted">Loading…</main>
        <SiteFooter />
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container py-20 text-center">
          <h1 className="text-2xl font-bold">Gig not found</h1>
          <Link to="/explore" className="text-primary mt-2 inline-block">Browse gigs</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const images = [gig.thumbnail_url, ...gig.gallery_urls].filter(Boolean) as string[];

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={gig.title}
        description={(gig.description ?? "").slice(0, 155) || `${gig.title} — starting at $${gig.starting_price}`}
        type="product"
        image={gig.thumbnail_url ?? undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: gig.title,
          description: gig.description,
          image: gig.thumbnail_url,
          offers: { "@type": "Offer", price: gig.starting_price, priceCurrency: "USD", availability: "https://schema.org/InStock" },
          aggregateRating: gig.total_reviews > 0 ? {
            "@type": "AggregateRating", ratingValue: Number(gig.average_rating), reviewCount: gig.total_reviews,
          } : undefined,
        }}
      />
      <SiteHeader />
      <main className="flex-1 container py-10">
        <nav className="text-xs text-foreground-muted mb-3">
          <Link to="/explore" className="hover:text-foreground">Explore</Link>
          <span className="mx-1">/</span>
          <Link to={`/category/${gig.category}`} className="hover:text-foreground capitalize">{gig.category.replace("-", " ")}</Link>
        </nav>

        <div className="grid lg:grid-cols-[1fr_380px] gap-10">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold">{gig.title}</h1>

            {seller && (
              <div className="mt-4 flex items-center gap-3">
                <Link to={`/u/${seller.username ?? seller.id}`} className="flex items-center gap-2.5 hover:text-primary">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold overflow-hidden">
                    {seller.avatar_url
                      ? <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />
                      : (seller.full_name ?? seller.username ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      {seller.full_name ?? seller.username}
                      <VerifiedBadge sellerId={seller.id} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground-muted">
                      {seller.is_online && <span className="text-success">● Online</span>}
                      {seller.response_time_minutes != null && (
                        <span>Responds in ~{formatResponseTime(seller.response_time_minutes)}</span>
                      )}
                      {seller.response_rate != null && <span>· {Number(seller.response_rate).toFixed(0)}% response rate</span>}
                    </div>
                  </div>
                </Link>
                {gig.total_reviews > 0 && (
                  <div className="ml-2 flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="font-semibold">{Number(gig.average_rating).toFixed(1)}</span>
                    <span className="text-foreground-muted">({gig.total_reviews})</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <div className="aspect-[16/10] rounded-xl overflow-hidden bg-background-elevated border border-border">
                {images[activeImg]
                  ? <img src={images[activeImg]} alt={gig.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-foreground-subtle">No image</div>}
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-2">
                  {images.map((url, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={cn("w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors",
                        i === activeImg ? "border-primary" : "border-transparent")}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <section className="mt-10">
              <h2 className="text-xl font-bold mb-3">About this gig</h2>
              <p className="text-foreground-muted whitespace-pre-line leading-relaxed">
                {gig.description || "The seller hasn't added a description yet."}
              </p>
              {gig.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {gig.tags.map((t) => (
                    <Link key={t} to={`/search?q=${encodeURIComponent(t)}`}
                      className="text-xs px-3 py-1 rounded-full border border-border hover:border-foreground transition-colors">
                      {t}
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Reviews {gig.total_reviews > 0 && <span className="text-foreground-muted font-normal">({gig.total_reviews})</span>}</h2>
                <ReportDialog targetType="gig" targetId={gig.id} label="Report gig" />
              </div>
              <div className="mb-5"><RatingBreakdown gigId={gig.id} /></div>
              <ReviewsList gigId={gig.id} />
            </section>
          </div>

          {/* Pricing panel */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="bg-background border border-border rounded-xl overflow-hidden">
              {packages.length > 1 && (
                <div className="grid grid-cols-3 text-sm border-b border-border">
                  {packages.map((p) => (
                    <button key={p.package_type} onClick={() => setSelectedTier(p.package_type)}
                      className={cn("py-3 capitalize font-medium border-b-2 transition-colors",
                        selectedTier === p.package_type
                          ? "border-foreground text-foreground"
                          : "border-transparent text-foreground-muted hover:text-foreground")}>
                      {p.package_type}
                    </button>
                  ))}
                </div>
              )}

              {selected ? (
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{selected.title}</div>
                    <div className="text-2xl font-bold">${selected.price}</div>
                  </div>
                  <p className="text-sm text-foreground-muted">{selected.description}</p>

                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-foreground-muted" />
                      <span className="font-medium">{selected.delivery_days}d</span></div>
                    <div className="flex items-center gap-1.5"><RefreshCw className="h-4 w-4 text-foreground-muted" />
                      <span className="font-medium">{selected.revisions === 0 ? "No" : selected.revisions} revisions</span></div>
                  </div>

                  {selected.features.length > 0 && (
                    <ul className="space-y-2 text-sm">
                      {selected.features.map((f, i) => (
                        <li key={i} className="flex gap-2"><Check className="h-4 w-4 text-success mt-0.5 shrink-0" />{f}</li>
                      ))}
                    </ul>
                  )}

                  <Button className="w-full" size="lg" disabled={!selected}
                    onClick={async () => {
                      if (!user) return nav("/login");
                      if (!selected) return;
                      toast.loading("Redirecting to checkout…", { id: "co" });
                      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
                        body: { package_id: selected.id, extra_ids: [] },
                      });
                      toast.dismiss("co");
                      if (error || !data?.url) return toast.error(error?.message ?? "Checkout failed");
                      window.location.href = data.url;
                    }}>
                    Continue (${selected.price})
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={contactSeller}>
                      <MessageSquare className="h-4 w-4" /> Contact
                    </Button>
                    <Button variant="outline" size="sm" onClick={toggleSave}>
                      <Heart className={cn("h-4 w-4", isSaved && "fill-destructive text-destructive")} />
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-sm text-foreground-muted">No packages set yet.</div>
              )}
            </div>
          </aside>
        </div>
        <RecentlyViewed excludeId={gig.id} />
      </main>
      <SiteFooter />
    </div>
  );
}
