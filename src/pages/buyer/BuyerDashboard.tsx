import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ClipboardList, MessageSquare, Plus, Search, ShoppingBag, Users, Gift, Star,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  price: number;
  created_at: string;
  delivery_deadline: string | null;
  seller_id: string;
  gig_id: string | null;
  gigs: { title: string; thumbnail_url: string | null; category: string | null } | null;
  seller: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
}

interface ExpertRec {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  primary_category: string | null;
  average_rating: number | null;
  starting_price: number | null;
}

interface ConvRow {
  id: string;
  last_message_preview: string | null;
  last_message_at: string;
  other: { full_name: string | null; username: string | null; avatar_url: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending Payment",
  in_progress: "In Progress",
  delivered: "Delivered",
  revision_requested: "Revision",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  disputed: "Disputed",
};

const statusVariant = (s: string): "default" | "success" | "outline" | "destructive" => {
  if (s === "completed") return "success";
  if (s === "cancelled" || s === "refunded" || s === "disputed") return "destructive";
  if (s === "pending_payment" || s === "revision_requested") return "outline";
  return "default";
};

function Avatar({ url, name, size = 32 }: { url?: string | null; name?: string | null; size?: number }) {
  const initial = (name?.[0] ?? "?").toUpperCase();
  return url ? (
    <img src={url} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs font-medium shrink-0"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

export default function BuyerDashboard() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [recs, setRecs] = useState<ExpertRec[]>([]);
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [stats, setStats] = useState({ active: 0, spent: 0, experts: 0, messages: 0 });

  const firstName = (profile?.full_name ?? user?.email ?? "there").split(" ")[0].split("@")[0];
  const today = format(new Date(), "EEEE, MMMM d");

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Orders + joined gig/seller
      const { data: ord } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, price, created_at, delivery_deadline, seller_id, gig_id, gigs:gig_id(title, thumbnail_url, category)",
        )
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const rows = (ord ?? []) as any[];
      const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
      const { data: sellers } = sellerIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .in("id", sellerIds)
        : { data: [] as any };
      const sellerMap = new Map((sellers ?? []).map((s: any) => [s.id, s]));
      const enriched: OrderRow[] = rows.map((r) => ({ ...r, seller: sellerMap.get(r.seller_id) ?? null }));
      setOrders(enriched);

      // Stats
      const { data: all } = await supabase
        .from("orders")
        .select("status, price, seller_id")
        .eq("buyer_id", user.id);
      const a = (all ?? []) as Array<{ status: string; price: number; seller_id: string }>;
      const activeStatuses = ["in_progress", "delivered", "revision_requested", "pending_payment"];
      const completedOrPaid = a.filter((o) => !["pending_payment", "cancelled", "refunded"].includes(o.status));

      // Unread messages
      const { count: msgCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      setStats({
        active: a.filter((o) => activeStatuses.includes(o.status)).length,
        spent: completedOrPaid.reduce((s, o) => s + (o.price ?? 0), 0),
        experts: new Set(completedOrPaid.map((o) => o.seller_id)).size,
        messages: msgCount ?? 0,
      });

      // Recent conversations
      const { data: cv } = await supabase
        .from("conversations")
        .select("id, last_message_preview, last_message_at, participant_one, participant_two")
        .or(`participant_one.eq.${user.id},participant_two.eq.${user.id}`)
        .order("last_message_at", { ascending: false })
        .limit(3);
      const cvRows = (cv ?? []) as any[];
      const otherIds = cvRows.map((c) => (c.participant_one === user.id ? c.participant_two : c.participant_one));
      const { data: others } = otherIds.length
        ? await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", otherIds)
        : { data: [] as any };
      const otherMap = new Map((others ?? []).map((p: any) => [p.id, p]));
      setConvs(
        cvRows.map((c) => ({
          id: c.id,
          last_message_preview: c.last_message_preview,
          last_message_at: c.last_message_at,
          other: otherMap.get(c.participant_one === user.id ? c.participant_two : c.participant_one) ?? null,
        })),
      );

      // Recommended experts: based on categories from past orders, fallback to top rated
      const cats = [
        ...new Set(rows.map((r) => r.gigs?.category).filter(Boolean)),
      ] as string[];
      let expertQuery = supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, primary_category, average_rating")
        .eq("role", "seller")
        .eq("seller_status", "approved")
        .not("average_rating", "is", null)
        .order("average_rating", { ascending: false })
        .limit(12);
      if (cats.length) expertQuery = expertQuery.in("primary_category", cats);
      const { data: ex } = await expertQuery;
      let experts = (ex ?? []) as any[];
      if (experts.length < 4) {
        const { data: top } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url, primary_category, average_rating")
          .eq("role", "seller")
          .eq("seller_status", "approved")
          .order("average_rating", { ascending: false, nullsFirst: false })
          .limit(8);
        const seen = new Set(experts.map((e) => e.id));
        (top ?? []).forEach((e: any) => {
          if (!seen.has(e.id) && experts.length < 4) { experts.push(e); seen.add(e.id); }
        });
      }
      experts = experts.slice(0, 4);

      // Starting price per expert
      const expIds = experts.map((e) => e.id);
      const { data: gigs } = expIds.length
        ? await supabase
            .from("gigs")
            .select("seller_id, starting_price")
            .in("seller_id", expIds)
            .eq("status", "active")
        : { data: [] as any };
      const priceMap = new Map<string, number>();
      (gigs ?? []).forEach((g: any) => {
        const cur = priceMap.get(g.seller_id);
        if (cur === undefined || g.starting_price < cur) priceMap.set(g.seller_id, g.starting_price);
      });
      setRecs(experts.map((e) => ({ ...e, starting_price: priceMap.get(e.id) ?? null })));
    })();
  }, [user?.id]);

  const activeOrders = orders.filter((o) =>
    ["in_progress", "delivered", "revision_requested", "pending_payment"].includes(o.status),
  );

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Welcome header */}
        <header>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-foreground-muted mt-1 text-sm">{today}</p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Active Projects", value: stats.active },
              { label: "Total Spent", value: `$${stats.spent.toLocaleString()}` },
              { label: "Experts Hired", value: stats.experts },
              { label: "Unread Messages", value: stats.messages },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-background-subtle p-4">
                <div className="text-xs uppercase tracking-wider text-foreground-muted">{s.label}</div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">{s.value}</div>
              </div>
            ))}
          </div>
        </header>

        {/* Quick actions */}
        <section className="flex flex-wrap gap-2">
          <Link to="/post-job"><Button variant="green"><Plus /> Post a Project</Button></Link>
          <Link to="/services"><Button variant="outline"><Search /> Find an Expert</Button></Link>
          <Link to="/buyer/orders"><Button variant="outline"><ShoppingBag /> View Orders</Button></Link>
          <Button variant="ghost" disabled className="opacity-70">
            <Gift /> Refer a Friend
            <span className="ml-1 text-[10px] uppercase tracking-wider rounded-full border border-white/15 px-2 py-0.5">
              Soon
            </span>
          </Button>
        </section>

        {/* Active projects */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-lg font-semibold">Active projects</h2>
            <Link to="/buyer/orders" className="text-xs text-foreground-muted hover:text-foreground">
              View all
            </Link>
          </div>
          {activeOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No active projects"
              message="Post your first project and get proposals within hours."
              action={{ label: "Post a Project", to: "/post-job" }}
              secondaryAction={{ label: "Find an Expert", to: "/services", variant: "outline" }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeOrders.slice(0, 4).map((o) => {
                const sellerName = o.seller?.full_name ?? o.seller?.username ?? "Expert";
                return (
                  <div key={o.id} className="rounded-2xl border border-white/[0.08] bg-background-subtle p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-mono uppercase tracking-wider text-foreground-muted">{o.order_number}</div>
                        <div className="mt-1 font-medium truncate">{o.gigs?.title ?? "Untitled project"}</div>
                      </div>
                      <Badge variant={statusVariant(o.status)}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar url={o.seller?.avatar_url} name={sellerName} size={28} />
                      <span className="text-sm text-foreground-muted truncate">{sellerName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-foreground-muted">
                      <span>
                        {o.delivery_deadline
                          ? `Due ${formatDistanceToNow(new Date(o.delivery_deadline), { addSuffix: true })}`
                          : "No deadline"}
                      </span>
                      <span className="font-mono tabular-nums text-foreground">${o.price}</span>
                    </div>
                    <Link to={`/orders/${o.id}`} className="mt-auto">
                      <Button variant="outline" size="sm" className="w-full">View Project</Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recommended experts */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Recommended experts</h2>
          {recs.length === 0 ? (
            <EmptyState icon={Users} title="No experts to recommend yet" message="Place your first order to get personalized recommendations." variant="plain" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {recs.map((e) => {
                const name = e.full_name ?? e.username ?? "Expert";
                return (
                  <div key={e.id} className="rounded-2xl border border-white/[0.08] bg-background-subtle p-5 flex flex-col items-center text-center gap-2">
                    <Avatar url={e.avatar_url} name={name} size={56} />
                    <div className="font-medium truncate w-full">{name}</div>
                    <div className="text-xs text-foreground-muted truncate w-full">
                      {e.primary_category ?? "Specialist"}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Star size={12} className="fill-foreground text-foreground" />
                      <span className="tabular-nums">{(e.average_rating ?? 0).toFixed(1)}</span>
                    </div>
                    {e.starting_price != null && (
                      <div className="text-xs text-foreground-muted">From ${e.starting_price}</div>
                    )}
                    <Link to={`/u/${e.username ?? e.id}`} className="w-full mt-2">
                      <Button variant="outline" size="sm" className="w-full">View Profile</Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent messages */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent messages</h2>
            <Link to="/inbox" className="text-xs text-foreground-muted hover:text-foreground">
              View all messages
            </Link>
          </div>
          {convs.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No conversations yet"
              message="Reach out to an expert to start a conversation."
              action={{ label: "Find an Expert", to: "/services" }}
            />
          ) : (
            <ul className="rounded-2xl border border-white/[0.08] bg-background-subtle divide-y divide-white/[0.06]">
              {convs.map((c) => {
                const name = c.other?.full_name ?? c.other?.username ?? "Conversation";
                return (
                  <li key={c.id}>
                    <Link to={`/inbox?c=${c.id}`} className="flex items-center gap-3 p-4 hover:bg-white/[0.03] transition-colors">
                      <Avatar url={c.other?.avatar_url} name={name} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium truncate">{name}</div>
                          <div className="text-xs text-foreground-muted shrink-0">
                            {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                          </div>
                        </div>
                        <div className="text-sm text-foreground-muted truncate">
                          {c.last_message_preview ?? "—"}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent orders */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Recent orders</h2>
          {orders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              message="Browse our catalog of experts and place your first order."
              action={{ label: "Browse Experts", to: "/services" }}
              variant="plain"
            />
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-background-subtle overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.08] hover:bg-transparent">
                    <TableHead>Order #</TableHead>
                    <TableHead>Expert</TableHead>
                    <TableHead className="hidden md:table-cell">Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 8).map((o) => {
                    const sellerName = o.seller?.full_name ?? o.seller?.username ?? "Expert";
                    return (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer border-white/[0.06]"
                        onClick={() => (window.location.href = `/orders/${o.id}`)}
                      >
                        <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar url={o.seller?.avatar_url} name={sellerName} size={24} />
                            <span className="truncate max-w-[120px]">{sellerName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[240px] truncate">
                          {o.gigs?.title ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">${o.price}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(o.status)}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-foreground-muted text-xs">
                          {format(new Date(o.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
