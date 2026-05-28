import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GigCard, GigCardSkeleton, type GigCardData } from "@/components/marketplace/GigCard";
import { RatingBreakdown } from "@/components/marketplace/RatingBreakdown";
import { ReviewsList } from "@/components/marketplace/ReviewsList";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, Clock, MessageCircle } from "lucide-react";

interface Seller {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  languages: string[];
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

export default function SellerProfile() {
  const { username } = useParams();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [gigs, setGigs] = useState<GigCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    (async () => {
      // Try username, then fall back to id
      const byUsername = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      const profile = byUsername.data ?? (await supabase.from("profiles").select("*").eq("id", username).maybeSingle()).data;
      if (!profile) { setLoading(false); return; }
      setSeller(profile as Seller);
      const { data } = await supabase.from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews")
        .eq("seller_id", profile.id).eq("status", "active");
      setGigs(((data ?? []) as any).map((g: any) => ({ ...g, seller: profile })));
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container py-10 text-foreground-muted">Loading…</main>
        <SiteFooter />
      </div>
    );
  }
  if (!seller) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container py-20 text-center">
          <h1 className="text-2xl font-bold">Seller not found</h1>
          <Link to="/explore" className="text-primary mt-2 inline-block">Browse sellers</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const name = seller.full_name ?? seller.username ?? "Seller";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container py-10">
        <div className="grid lg:grid-cols-[280px_1fr] gap-10">
          <aside>
            <div className="bg-background border border-border rounded-xl p-6 text-center">
              <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 text-primary text-3xl flex items-center justify-center font-semibold overflow-hidden">
                {seller.avatar_url
                  ? <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />
                  : name[0]?.toUpperCase()}
              </div>
              <h1 className="font-bold text-lg mt-4">{name}</h1>
              {seller.username && <p className="text-sm text-foreground-muted">@{seller.username}</p>}
              {seller.is_online && <p className="mt-1 text-xs text-success">● Online</p>}
              <div className="mt-5 space-y-2 text-sm text-left">
                {seller.country && (
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <MapPin className="h-4 w-4" /> {seller.country}
                  </div>
                )}
                <div className="flex items-center gap-2 text-foreground-muted">
                  <Calendar className="h-4 w-4" /> Member since {new Date(seller.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </div>
              </div>
              {seller.bio && (
                <p className="mt-5 text-sm text-left text-foreground-muted whitespace-pre-line">{seller.bio}</p>
              )}
              {(seller.response_time_minutes != null || seller.response_rate != null) && (
                <div className="mt-5 space-y-2 text-sm text-left border-t border-border pt-4">
                  {seller.response_time_minutes != null && (
                    <div className="flex items-center gap-2 text-foreground-muted">
                      <Clock className="h-4 w-4" /> Responds in ~{formatResponseTime(seller.response_time_minutes)}
                    </div>
                  )}
                  {seller.response_rate != null && (
                    <div className="flex items-center gap-2 text-foreground-muted">
                      <MessageCircle className="h-4 w-4" /> {Number(seller.response_rate).toFixed(0)}% response rate
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-10">
            <div>
              <h2 className="text-xl font-bold mb-4">Reviews</h2>
              <div className="mb-5"><RatingBreakdown sellerId={seller.id} /></div>
              <ReviewsList sellerId={seller.id} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-6">{name}'s gigs</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {gigs.length === 0
                  ? <p className="text-foreground-muted col-span-full">No active gigs yet.</p>
                  : gigs.map((g) => <GigCard key={g.id} gig={g} />)}
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
