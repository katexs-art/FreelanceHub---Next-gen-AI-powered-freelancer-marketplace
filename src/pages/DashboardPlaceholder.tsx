import { AppShell } from "@/components/layout/AppShell";

export default function DashboardPlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="text-white/40 mt-2">{note ?? "Coming in the next build phase."}</p>
      </div>
    </AppShell>
  );
}
