/** Generic placeholder for admin sub-pages not yet fully built */
export default function AdminPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4 max-w-[800px]">
      <div>
        <h1 className="text-[20px] font-bold text-foreground tracking-tight">{title}</h1>
        <p className="text-[12px] text-foreground-secondary mt-0.5">{description}</p>
      </div>
      <div className="bg-background-card border border-border rounded-[12px] p-10 text-center">
        <div className="w-10 h-10 rounded-lg bg-background-elevated border border-border-subtle flex items-center justify-center mx-auto mb-3">
          <span className="text-foreground-muted text-[16px]">🚧</span>
        </div>
        <p className="text-[13px] text-foreground-secondary">This section is under development.</p>
        <p className="text-[11px] text-foreground-muted mt-1">Coming soon.</p>
      </div>
    </div>
  );
}
