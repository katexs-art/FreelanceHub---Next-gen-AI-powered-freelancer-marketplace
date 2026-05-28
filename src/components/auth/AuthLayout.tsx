import { Link } from "react-router-dom";

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background-subtle flex flex-col">
      <header className="py-5 px-6 border-b border-border bg-background">
        <Link to="/" className="font-heading font-bold text-xl">
          katexs<span className="text-primary">.</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-foreground-muted mt-2 text-sm">{subtitle}</p>}
          </div>
          <div className="bg-background border border-border rounded-xl p-8 shadow-sm">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-foreground-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
