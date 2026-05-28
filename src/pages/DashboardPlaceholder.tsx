import { AppShell } from "@/components/layout/AppShell";

export default function DashboardPlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-foreground-muted mt-2">{note ?? "Coming in the next build phase."}</p>
      </div>
    </AppShell>
  );
}
