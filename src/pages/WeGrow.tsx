import { PublicNav } from "@/components/layout/PublicNav";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import { MessageSquare, Zap, Users, Gift } from "lucide-react";

const cards = [
  { icon: Zap, title: "Weekly AI tips", desc: "Actionable strategies to grow your service business with AI every single week." },
  { icon: MessageSquare, title: "Live Q&A with River", desc: "Ask River anything about your business and get instant AI-powered answers." },
  { icon: Users, title: "Member success stories", desc: "See exactly how other service businesses are winning with Katexs and River." },
  { icon: Gift, title: "Exclusive Katexs deals", desc: "Members-only discounts, early access to features, and partner offers." },
];

const WeGrow = () => (
  <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
    <PublicNav />

    <section className="pt-28 pb-16 px-8 text-center">
      <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border" style={{ background: "#111114", borderColor: "rgba(255,255,255,0.10)", fontSize: "11px", color: "hsl(var(--foreground-secondary))" }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--accent-green))" }} />
        FREE COMMUNITY
      </div>
      <h1 className="font-heading text-foreground mx-auto" style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 700, letterSpacing: "-0.04em", maxWidth: "650px", lineHeight: 1.1 }}>
        Join 2,000+ service business owners building with AI.
      </h1>
      <p className="text-foreground-secondary mt-4 mx-auto" style={{ fontSize: "15px", maxWidth: "480px" }}>
        WeGrow is the free community where service business owners share what's working, get help from River, and grow together. No sales pitches. Just real operators.
      </p>
    </section>

    <section className="max-w-4xl mx-auto px-8 pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <div key={c.title} className="rounded-xl border p-6" style={{ background: "hsl(var(--background-card))", borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "hsl(var(--background-elevated))", border: "1px solid rgba(255,255,255,0.10)" }}>
              <c.icon className="w-5 h-5 text-foreground-secondary" />
            </div>
            <h3 className="text-foreground font-semibold" style={{ fontSize: "15px" }}>{c.title}</h3>
            <p className="text-foreground-secondary mt-2" style={{ fontSize: "13px" }}>{c.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center mt-12 space-y-3">
        <a href="https://facebook.com/groups/wegrow" target="_blank" rel="noopener noreferrer">
          <Button size="lg">Join WeGrow free →</Button>
        </a>
        <p className="text-foreground-muted" style={{ fontSize: "12px" }}>Already a Katexs client? WeGrow is included.</p>
      </div>
    </section>

    <PublicFooter />
  </div>
);

export default WeGrow;
