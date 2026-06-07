import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function DashboardPlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <>
      <SiteHeader showCategories={false} />
      <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff" }}>
        <div className="max-w-3xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p style={{ color: "#888", marginTop: 8 }}>{note ?? "Coming in the next build phase."}</p>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
