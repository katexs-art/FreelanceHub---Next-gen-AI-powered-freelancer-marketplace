import { PublicNav } from "@/components/layout/PublicNav";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Link } from "react-router-dom";
import { FileText, Video, Code, MessageSquare } from "lucide-react";

const links = [
  { icon: Code, title: "API Reference", desc: "REST API documentation for developers", to: "#" },
  { icon: FileText, title: "Workflow Templates", desc: "Pre-built automation templates", to: "#" },
  { icon: Video, title: "Video Tutorials", desc: "Step by step guides for every feature", to: "#" },
  { icon: MessageSquare, title: "Ask River", desc: "River knows how everything works", to: "#" },
];

const Docs = () => (
  <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
    <PublicNav />
    <section className="pt-28 pb-20 px-8 text-center max-w-2xl mx-auto">
      <h1 className="font-heading text-foreground" style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.03em" }}>Documentation</h1>
      <p className="text-foreground-secondary mt-3" style={{ fontSize: "14px" }}>Documentation coming soon. In the meantime, River knows everything.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10">
        {links.map((l) => (
          <Link key={l.title} to={l.to} className="rounded-xl border p-5 text-left hover:border-border-strong transition-colors" style={{ background: "hsl(var(--background-card))", borderColor: "rgba(255,255,255,0.06)" }}>
            <l.icon className="w-5 h-5 text-foreground-secondary mb-3" />
            <p className="text-foreground font-semibold" style={{ fontSize: "14px" }}>{l.title}</p>
            <p className="text-foreground-muted mt-1" style={{ fontSize: "12px" }}>{l.desc}</p>
          </Link>
        ))}
      </div>
    </section>
    <PublicFooter />
  </div>
);

export default Docs;
