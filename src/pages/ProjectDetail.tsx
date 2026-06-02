import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Paperclip,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  buyer_id: string;
  title: string;
  description: string;
  category: string | null;
  skills: string[];
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  attachments: string[];
  bid_count: number;
  status: string;
  created_at: string;
};

type Buyer = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  country: string | null;
  member_since: string | null;
};

type BidRow = {
  id: string;
  seller_id: string;
  bid_amount: number;
  delivery_days: number;
  cover_message: string;
  status: string;
  created_at: string;
};

type SellerLite = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  GoHighLevel: "bg-purple-100 text-purple-700 border-purple-200",
  "Voice AI": "bg-blue-100 text-blue-700 border-blue-200",
  "AI Automation": "bg-green-100 text-green-700 border-green-200",
  Marketing: "bg-pink-100 text-pink-700 border-pink-200",
  Development: "bg-orange-100 text-orange-700 border-orange-200",
};

function categoryClass(cat?: string | null) {
  if (!cat) return "bg-gray-100 text-gray-700 border-gray-200";
  return CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fileName(url: string) {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.split("/").pop() || url);
  } catch {
    return url.split("/").pop() || url;
  }
}

export default function ProjectDetail() {
  const { project_id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [sellers, setSellers] = useState<Record<string, SellerLite>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!project_id) return;
    (async () => {
      setLoading(true);
      const { data: p, error } = await supabase
        .from("project_posts")
        .select("*")
        .eq("id", project_id)
        .maybeSingle();
      if (error || !p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProject(p as Project);

      const { data: b } = await supabase
        .from("profiles")
        .select("id,full_name,username,avatar_url,country,member_since")
        .eq("id", (p as Project).buyer_id)
        .maybeSingle();
      setBuyer((b as Buyer) ?? null);

      const { data: bs } = await supabase
        .from("bids")
        .select("id,seller_id,bid_amount,delivery_days,cover_message,status,created_at")
        .eq("project_id", project_id)
        .order("created_at", { ascending: false });
      const bidRows = (bs ?? []) as BidRow[];
      setBids(bidRows);

      const sellerIds = [...new Set(bidRows.map((x) => x.seller_id))];
      if (sellerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name,username,avatar_url")
          .in("id", sellerIds);
        const map: Record<string, SellerLite> = {};
        (profs ?? []).forEach((pr: any) => (map[pr.id] = pr));
        setSellers(map);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel(`project_${project_id}_bids`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bids", filter: `project_id=eq.${project_id}` },
        async (payload) => {
          const next = payload.new as BidRow;
          setBids((prev) => (prev.some((b) => b.id === next.id) ? prev : [next, ...prev]));
          if (!sellers[next.seller_id]) {
            const { data } = await supabase
              .from("profiles")
              .select("id,full_name,username,avatar_url")
              .eq("id", next.seller_id)
              .maybeSingle();
            if (data) setSellers((s) => ({ ...s, [data.id]: data as SellerLite }));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project_id]);

  const isOwner = !!user && !!project && user.id === project.buyer_id;
  const isOpen = project?.status === "open";

  const budget = useMemo(() => {
    if (!project) return "";
    if (project.budget_min != null && project.budget_max != null)
      return `$${project.budget_min.toLocaleString()} – $${project.budget_max.toLocaleString()}`;
    if (project.budget_min != null) return `From $${project.budget_min.toLocaleString()}`;
    if (project.budget_max != null) return `Up to $${project.budget_max.toLocaleString()}`;
    return "Budget on request";
  }, [project]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <SiteHeader />
        <main className="flex-1 container-page py-10 max-w-5xl mx-auto w-full space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <SiteHeader />
        <main className="flex-1 container-page py-16 text-center">
          <h1 className="text-2xl font-bold text-black">Project not found</h1>
          <p className="text-sm text-foreground-muted mt-2">
            It may have been removed or is no longer available.
          </p>
          <Button asChild className="mt-6 bg-green-600 hover:bg-green-700 text-white">
            <Link to="/projects">Back to projects</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEO title={`${project.title} — Open Project`} description={project.description.slice(0, 160)} />
      <SiteHeader />
      <main className="flex-1 container-page py-8 max-w-6xl mx-auto w-full">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-black mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> All projects
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="bg-white border border-border rounded-2xl p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                      isOpen
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-600 border-gray-200",
                    )}
                  >
                    {isOpen && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-600" />
                      </span>
                    )}
                    {isOpen ? "Open" : project.status}
                  </span>
                  {project.category && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border",
                        categoryClass(project.category),
                      )}
                    >
                      {project.category}
                    </span>
                  )}
                </div>
                <span className="text-xs text-foreground-muted inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Posted {ago(project.created_at)}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-black mt-4 tracking-tight">
                {project.title}
              </h1>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Meta icon={DollarSign} label="Budget" value={budget} tint="green" />
                <Meta
                  icon={Calendar}
                  label="Deadline"
                  value={project.deadline ? new Date(project.deadline).toLocaleDateString() : "Flexible"}
                  tint="orange"
                />
                <Meta
                  icon={Users}
                  label="Proposals"
                  value={`${bids.length} bid${bids.length === 1 ? "" : "s"}`}
                  tint="blue"
                />
              </div>
            </div>

            {/* Description */}
            <Section icon={FileText} title="Project description">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {project.description}
              </p>
            </Section>

            {/* Skills */}
            {project.skills?.length > 0 && (
              <Section icon={Tag} title="Skills required">
                <div className="flex flex-wrap gap-1.5">
                  {project.skills.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2.5 py-1 rounded-full bg-green-50 border border-green-100 text-green-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Attachments */}
            {project.attachments?.length > 0 && (
              <Section icon={Paperclip} title="Attachments">
                <ul className="space-y-2">
                  {project.attachments.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-green-700 hover:underline"
                      >
                        <Paperclip className="h-4 w-4" />
                        {fileName(url)}
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Bids / Activity */}
            <Section icon={Sparkles} title={`Activity & proposals (${bids.length})`}>
              {bids.length === 0 ? (
                <p className="text-sm text-foreground-muted">
                  No proposals yet. Be the first to submit a bid.
                </p>
              ) : (
                <ul className="space-y-3">
                  {bids.map((b) => {
                    const s = sellers[b.seller_id];
                    const visible = isOwner || b.seller_id === user?.id;
                    return (
                      <li
                        key={b.id}
                        className="flex items-start gap-3 p-3 rounded-xl border border-border bg-[#f9f9f9]"
                      >
                        <img
                          src={s?.avatar_url || "/placeholder.svg"}
                          alt={s?.full_name || "Seller"}
                          className="w-10 h-10 rounded-full object-cover bg-white border border-border"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-black truncate">
                              {s?.full_name || s?.username || "Expert"}{" "}
                              <span className="font-normal text-foreground-muted">
                                submitted a proposal
                              </span>
                            </span>
                            <span className="text-xs text-foreground-muted">{ago(b.created_at)}</span>
                          </div>
                          {visible ? (
                            <div className="mt-1.5 text-sm text-foreground">
                              <span className="font-semibold text-green-700">
                                ${b.bid_amount.toLocaleString()}
                              </span>{" "}
                              · {b.delivery_days} day{b.delivery_days === 1 ? "" : "s"}
                              {b.cover_message && (
                                <p className="text-foreground-muted mt-1 line-clamp-3 whitespace-pre-wrap">
                                  {b.cover_message}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-foreground-muted">
                              Proposal details are private to the buyer.
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="bg-white border border-border rounded-2xl p-5 sticky top-24">
              {isOwner ? (
                <>
                  <p className="text-xs uppercase tracking-wide text-foreground-muted font-semibold">
                    You own this project
                  </p>
                  <Button asChild className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white">
                    <Link to={`/projects/${project.id}/bids`}>Manage proposals</Link>
                  </Button>
                </>
              ) : isOpen ? (
                <>
                  <p className="text-sm font-semibold text-black">Interested in this project?</p>
                  <p className="text-xs text-foreground-muted mt-1">
                    Submit a proposal with your price and delivery time.
                  </p>
                  <Button asChild className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white">
                    <Link to={`/projects/${project.id}/bid`}>Place a bid</Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-foreground-muted">This project is no longer accepting bids.</p>
              )}

              {/* Buyer card */}
              {buyer && (
                <div className="mt-5 pt-5 border-t border-border">
                  <p className="text-xs uppercase tracking-wide text-foreground-muted font-semibold mb-3">
                    Posted by
                  </p>
                  <Link
                    to={buyer.username ? `/u/${buyer.username}` : "#"}
                    className="flex items-center gap-3 group"
                  >
                    <img
                      src={buyer.avatar_url || "/placeholder.svg"}
                      alt={buyer.full_name || "Buyer"}
                      className="w-10 h-10 rounded-full object-cover border border-border"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-black truncate group-hover:text-green-700">
                        {buyer.full_name || buyer.username || "Client"}
                      </p>
                      {buyer.country && (
                        <p className="text-xs text-foreground-muted truncate">{buyer.country}</p>
                      )}
                    </div>
                  </Link>
                  {buyer.member_since && (
                    <p className="text-[11px] text-foreground-muted mt-2">
                      Member since{" "}
                      {new Date(buyer.member_since).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileText;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-border rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-black inline-flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-green-600" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  tint: "green" | "blue" | "orange";
}) {
  const tints = {
    green: "bg-green-50 text-green-700 border-green-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
  } as const;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-[#f9f9f9]">
      <div className={cn("h-9 w-9 rounded-lg border flex items-center justify-center", tints[tint])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-foreground-muted font-semibold">
          {label}
        </p>
        <p className="text-sm font-semibold text-black truncate">{value}</p>
      </div>
    </div>
  );
}
