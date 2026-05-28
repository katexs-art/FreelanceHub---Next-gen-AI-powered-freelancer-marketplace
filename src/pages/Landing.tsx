import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Search, Star, Shield, Clock } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  "Graphics & Design", "Programming & Tech", "Digital Marketing",
  "Writing & Translation", "Video & Animation", "Music & Audio",
  "Business", "AI Services",
];

export default function Landing() {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="bg-background-elevated border-b border-border">
        <div className="container py-20 md:py-28">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl">
            Find the perfect <span className="text-primary">freelance services</span> for your business.
          </h1>
          <p className="text-lg text-foreground-muted mt-4 max-w-xl">
            Work with talented people at the most affordable price to get the most out of your time and cost.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q)}`); }}
            className="mt-8 max-w-2xl relative"
          >
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Try "logo design"'
              className="w-full h-14 pl-14 pr-32 rounded-full border border-input bg-background text-base focus:outline-none focus:border-ring shadow-sm"
            />
            <Button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2">Search</Button>
          </form>

          <div className="mt-6 text-sm text-foreground-muted flex flex-wrap gap-x-4 gap-y-2 items-center">
            <span>Popular:</span>
            {["Logo Design", "WordPress", "Voice Over", "Video Editing"].map((p) => (
              <Link key={p} to={`/search?q=${encodeURIComponent(p)}`} className="px-3 py-1 rounded-full border border-border-strong hover:border-foreground transition-colors">
                {p}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-2xl font-bold mb-8">You need it, we've got it</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((c) => (
            <Link key={c} to={`/explore?category=${encodeURIComponent(c)}`}
              className="p-6 rounded-xl border border-border bg-background hover:border-primary hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-lg bg-primary/10 mb-3" />
              <div className="font-medium text-sm">{c}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-background-subtle border-y border-border py-16">
        <div className="container grid md:grid-cols-3 gap-8">
          {[
            { icon: Star, title: "Quality work", desc: "Hand-vetted experts and reviews you can trust." },
            { icon: Shield, title: "Secure payments", desc: "Money in escrow until you approve the work." },
            { icon: Clock, title: "Fast delivery", desc: "Clear deadlines, milestones, and on-time delivery." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{title}</div>
                <p className="text-sm text-foreground-muted mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Suddenly everything's possible.</h2>
        <p className="text-foreground-muted mt-3 max-w-xl mx-auto">
          Join thousands of buyers and sellers shaping the next generation of work.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/signup"><Button size="lg">Get started</Button></Link>
          <Link to="/become-a-seller"><Button size="lg" variant="outline">Become a seller</Button></Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
