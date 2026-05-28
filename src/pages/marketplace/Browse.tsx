import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MarketplaceNav } from "@/components/marketplace/MarketplaceNav";
import { ExpertCard, ExpertCardSkeleton } from "@/components/marketplace/ExpertCard";
import { useCategories, useExperts } from "@/hooks/useExperts";
import { C, FONT, MONO } from "@/lib/marketplace/theme";
import { Search } from "lucide-react";

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const initialCategory = params.get("category") || "All";
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState(params.get("q") || "");
  const [searchInput, setSearchInput] = useState(search);
  const categories = useCategories();
  const { data, loading } = useExperts({ category, search });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    const next = new URLSearchParams(params);
    if (searchInput) next.set("q", searchInput); else next.delete("q");
    setParams(next, { replace: true });
  };

  const selectCategory = (c: string) => {
    setCategory(c);
    const next = new URLSearchParams(params);
    if (c === "All") next.delete("category"); else next.set("category", c);
    setParams(next, { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.black, color: C.white, fontFamily: FONT }}>
      <MarketplaceNav />

      <section style={{ padding: "3rem 2.5rem 2rem", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ color: C.gray, fontFamily: MONO, fontSize: "0.7rem", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
          / MARKETPLACE
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 600, letterSpacing: "-0.03em", margin: 0, marginBottom: "1.5rem" }}>
          Browse <span style={{ color: C.neon }}>verified</span> experts
        </h1>
        <form onSubmit={onSubmit} style={{
          display: "flex", alignItems: "center", gap: 8,
          border: `1px solid ${C.border2}`, borderRadius: 999, padding: "0.5rem 0.5rem 0.5rem 1.2rem",
          maxWidth: 640,
        }}>
          <Search size={16} color={C.gray} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by skill, tool, or outcome…"
            style={{ flex: 1, background: "transparent", border: 0, outline: "none", color: C.white, fontFamily: FONT, fontSize: "0.9rem" }}
          />
          <button type="submit" style={{
            background: C.neon, color: C.black, borderRadius: 999, border: 0,
            padding: "0.55rem 1.2rem", fontFamily: FONT, fontWeight: 600, cursor: "pointer",
          }}>Search</button>
        </form>
      </section>

      <section style={{ padding: "1.5rem 2.5rem 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["All", ...categories.map((c) => c.name)].map((c) => {
          const active = c === category;
          return (
            <button key={c} onClick={() => selectCategory(c)} style={{
              border: `1px solid ${active ? "#444" : C.border}`,
              color: active ? C.white : C.gray,
              background: active ? "#111" : "transparent",
              borderRadius: 999, padding: "0.4rem 1rem", fontSize: "0.75rem",
              cursor: "pointer", fontFamily: FONT,
            }}>{c}</button>
          );
        })}
      </section>

      <section style={{ padding: "2rem 2.5rem 4rem" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: "0.75rem" }}>
            {Array.from({ length: 6 }).map((_, i) => <ExpertCardSkeleton key={i} />)}
          </div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 0", color: C.gray }}>
            No experts found. Try a different search.
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
