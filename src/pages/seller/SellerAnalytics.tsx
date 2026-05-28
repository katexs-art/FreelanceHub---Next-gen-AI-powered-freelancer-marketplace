import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface DayBucket { date: string; orders: number; earnings: number; }
interface TopGig { id: string; title: string; total_orders: number; average_rating: number; impressions: number; clicks: number; }

export default function SellerAnalytics() {
  const { user } = useAuth();
  const [days, setDays] = useState<DayBucket[]>([]);
  const [gigs, setGigs] = useState<TopGig[]>([]);
  const [funnel, setFunnel] = useState({ impressions: 0, clicks: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ data: orders }, { data: ag }] = await Promise.all([
        supabase.from("orders").select("created_at, seller_earnings, status")
          .eq("seller_id", user.id).gte("created_at", since).order("created_at"),
        supabase.from("gigs").select("id,title,total_orders,average_rating,impressions,clicks")
          .eq("seller_id", user.id).order("total_orders", { ascending: false }).limit(5),
      ]);

      const buckets: Record<string, DayBucket> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        buckets[key] = { date: key.slice(5), orders: 0, earnings: 0 };
      }
      (orders ?? []).forEach((o: any) => {
        const key = o.created_at.slice(0, 10);
        if (buckets[key]) {
          buckets[key].orders++;
          buckets[key].earnings += Math.round((o.seller_earnings ?? 0) / 100);
        }
      });
      setDays(Object.values(buckets));
      setGigs((ag ?? []) as TopGig[]);

      const imp = (ag ?? []).reduce((s: number, g: any) => s + (g.impressions ?? 0), 0);
      const clk = (ag ?? []).reduce((s: number, g: any) => s + (g.clicks ?? 0), 0);
      setFunnel({ impressions: imp, clicks: clk, orders: (orders ?? []).length });
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppShell>
      <SEO title="Analytics" description="Track impressions, clicks, orders and earnings across your gigs." />
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-sm text-foreground-muted mb-8">Last 30 days</p>

        {loading ? <p className="text-foreground-muted text-sm">Loading…</p> : (
          <div className="space-y-8">
            <div className="grid sm:grid-cols-3 gap-3">
              <Card label="Impressions" value={funnel.impressions} />
              <Card label="Clicks" value={funnel.clicks} sub={funnel.impressions ? `${Math.round((funnel.clicks/funnel.impressions)*100)}% CTR` : "—"} />
              <Card label="Orders" value={funnel.orders} sub={funnel.clicks ? `${Math.round((funnel.orders/funnel.clicks)*100)}% conv` : "—"} />
            </div>

            <Section title="Orders per day">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--foreground-muted))" fontSize={11} />
                  <YAxis stroke="hsl(var(--foreground-muted))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="orders" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Section>

            <Section title="Earnings per day ($)">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--foreground-muted))" fontSize={11} />
                  <YAxis stroke="hsl(var(--foreground-muted))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="earnings" fill="hsl(var(--foreground))" />
                </BarChart>
              </ResponsiveContainer>
            </Section>

            <Section title="Top gigs">
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-background-elevated text-foreground-muted text-xs">
                    <tr><th className="text-left p-3">Gig</th><th className="text-right p-3">Orders</th><th className="text-right p-3">Rating</th><th className="text-right p-3">Impr.</th><th className="text-right p-3">Clicks</th></tr>
                  </thead>
                  <tbody>
                    {gigs.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center text-foreground-muted">No gigs yet</td></tr>
                    ) : gigs.map(g => (
                      <tr key={g.id} className="border-t border-border">
                        <td className="p-3 truncate max-w-xs">{g.title}</td>
                        <td className="p-3 text-right">{g.total_orders}</td>
                        <td className="p-3 text-right">{g.average_rating ? Number(g.average_rating).toFixed(1) : "—"}</td>
                        <td className="p-3 text-right">{g.impressions}</td>
                        <td className="p-3 text-right">{g.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Card({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-background border border-border rounded-lg p-4">
      <div className="text-xs text-foreground-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value.toLocaleString()}</div>
      {sub && <div className="text-xs text-foreground-muted mt-0.5">{sub}</div>}
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      <div className="bg-background border border-border rounded-lg p-4">{children}</div>
    </div>
  );
}
