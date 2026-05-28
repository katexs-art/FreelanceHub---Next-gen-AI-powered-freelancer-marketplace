import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container py-20">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-foreground-muted mt-3">{note ?? "Coming in the next build phase."}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
