import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MarketplaceNav } from "@/components/marketplace/MarketplaceNav";
import { ExpertCard, ExpertCardSkeleton } from "@/components/marketplace/ExpertCard";
import { useExperts } from "@/hooks/useExperts";
import { supabase } from "@/integrations/supabase/client";
import { C, FONT, MONO } from "@/lib/marketplace/theme";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;
    supabase.from("categories").select("*").eq("slug", slug).maybeSingle().then(({ data }) => setCategory(data));
  }, [slug]);

  const { data, loading } = useExperts({ category: category?.name });

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: FONT }}>
      <MarketplaceNav />

      <section style={{ padding: "3rem 2.5rem 2rem", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ color: C.gray, fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
          <Link to="/browse" style={{ color: C.gray, textDecoration: "none" }}>/ MARKETPLACE</Link> / {(category?.name || slug || "").toUpperCase()}
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 600, letterSpacing: "-0.03em", margin: 0, marginBottom: "1rem" }}>
          {category?.name || "Category"}
        </h1>
        {category?.description && (
          <p style={{ color: C.gray, maxWidth: 640, lineHeight: 1.6 }}>{category.description}</p>
        )}
      </section>

      <section style={{ padding: "2rem 2.5rem 4rem" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: "0.75rem" }}>
            {Array.from({ length: 6 }).map((_, i) => <ExpertCardSkeleton key={i} />)}
          </div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 0", color: C.gray }}>
            No experts in this category yet. <Link to="/browse" style={{ color: C.neon }}>Browse all →</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: "0.75rem" }}>
            {data.map((e) => <ExpertCard key={e.id} e={e} />)}
          </div>
        )}
      </section>
    </div>
  );
}
