import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GigCard, type GigCardData } from "@/components/marketplace/GigCard";
import { ProfileReviewsSection } from "@/components/marketplace/ProfileReviewsSection";
import { SEO } from "@/components/SEO";
import { SellerLevelBadge } from "@/components/marketplace/SellerLevelBadge";
import { FollowSellerButton } from "@/components/marketplace/FollowSellerButton";
import { VerifiedBadge } from "@/components/marketplace/VerifiedBadge";
import { ReportDialog } from "@/components/marketplace/ReportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SkillsTagInput } from "@/components/postjob/SkillsTagInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  MapPin, Calendar, Clock, MessageCircle, Camera, Pencil, Star,
  Globe, Linkedin, Twitter, Trash2, ShoppingBag, X,
} from "lucide-react";

interface Seller {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  location: string | null;
  languages: string[] | null;
  seller_skills: string[] | null;
  member_since: string;
  is_online: boolean;
  response_rate: number | null;
  response_time_minutes: number | null;
  average_rating: number | null;
  total_reviews: number;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
}

function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (60 * 24))}d`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("") || "?";
}

function avatarColor(seed: string) {
  const palette = ["#16A34A", "#0EA5E9", "#7F77DD", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

export default function SellerProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [gigs, setGigs] = useState<GigCardData[]>([]);
  const [completedOrders, setCompletedOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: "", bio: "", location: "",
    languages: [] as string[], seller_skills: [] as string[],
    website_url: "", linkedin_url: "", twitter_url: "",
    avatar_url: "" as string | null | "",
  });
  const [langInput, setLangInput] = useState("");

  const isOwner = !!user && !!seller && user.id === seller.id;

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      const byUsername = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      const profile = byUsername.data ?? (await supabase.from("profiles").select("*").eq("id", username).maybeSingle()).data;
      if (!profile) { setLoading(false); return; }
      setSeller(profile as any);
      const { data: g } = await supabase.from("gigs")
        .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews")
        .eq("seller_id", profile.id).eq("status", "active");
      setGigs(((g ?? []) as any).map((x: any) => ({ ...x, seller: profile })));
      const { count } = await supabase.from("orders")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", profile.id).eq("status", "completed");
      setCompletedOrders(count ?? 0);
      setLoading(false);
    })();
  }, [username]);

  function beginEdit() {
    if (!seller) return;
    setForm({
      full_name: seller.full_name ?? "",
      bio: seller.bio ?? "",
      location: seller.location ?? seller.country ?? "",
      languages: seller.languages ?? [],
      seller_skills: seller.seller_skills ?? [],
      website_url: seller.website_url ?? "",
      linkedin_url: seller.linkedin_url ?? "",
      twitter_url: seller.twitter_url ?? "",
      avatar_url: seller.avatar_url ?? "",
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!seller) return;
    setSaving(true);
    const patch = {
      full_name: form.full_name.trim() || null,
      bio: form.bio.trim().slice(0, 250) || null,
      location: form.location.trim() || null,
      languages: form.languages,
      seller_skills: form.seller_skills,
      website_url: form.website_url.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      twitter_url: form.twitter_url.trim() || null,
      avatar_url: form.avatar_url || null,
    };
    const { error } = await supabase.from("profiles").update(patch).eq("id", seller.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setSeller({ ...seller, ...patch } as Seller);
    setEditing(false);
    toast.success("Profile updated");
  }

  async function handleUpload(file: File) {
    if (!seller) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${seller.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) { setUploading(false); toast.error(error.message); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm(f => ({ ...f, avatar_url: data.publicUrl }));
    setUploading(false);
    toast.success("Photo uploaded — remember to save");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container py-10 text-foreground-muted">Loading…</main>
        <SiteFooter />
      </div>
    );
  }
  if (!seller) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 container py-20 text-center">
          <h1 className="text-2xl font-bold">Expert not found</h1>
          <Link to="/explore" className="text-primary mt-2 inline-block">Browse experts</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const name = (editing ? form.full_name : seller.full_name) || seller.username || "Expert";
  const displayAvatar = editing ? form.avatar_url : seller.avatar_url;
  const totalOrdersForLevel = completedOrders;
  const avgRating = Number(seller.average_rating ?? 0);
  const reviewCount = seller.total_reviews ?? 0;

  async function handleMessage() {
    if (!user) { navigate("/login"); return; }
    if (!seller) return;
    const { data, error } = await supabase.rpc("get_or_create_conversation", { _other: seller.id });
    if (error) { toast.error(error.message); return; }
    navigate(`/inbox/${data}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={`${name} — Profile`}
        description={(seller.bio ?? `Hire ${name} on Katexs.`).slice(0, 155)}
      />
      <SiteHeader />
      <main className="flex-1">
        {/* ─────────── HEADER ─────────── */}
        <section className="border-b border-border bg-background">
          <div className="container py-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className="h-[120px] w-[120px] rounded-full overflow-hidden flex items-center justify-center text-white text-4xl font-bold ring-4 ring-background shadow-sm"
                  style={{ background: displayAvatar ? "transparent" : avatarColor(seller.id) }}
                >
                  {displayAvatar
                    ? <img src={displayAvatar} alt={name} className="w-full h-full object-cover" />
                    : initials(name)}
                </div>
                {seller.is_online && (
                  <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-success ring-4 ring-background" />
                )}
                {isOwner && editing && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/50 text-white opacity-0 hover:opacity-100 transition flex flex-col items-center justify-center gap-1"
                      disabled={uploading}
                    >
                      <Camera className="h-6 w-6" />
                      <span className="text-xs font-medium">{uploading ? "Uploading…" : "Change photo"}</span>
                    </button>
                    <input
                      ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    />
                    {form.avatar_url && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, avatar_url: "" }))}
                        className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                        title="Remove photo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Identity + stats */}
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    {editing ? (
                      <Input
                        value={form.full_name}
                        onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                        placeholder="Display name"
                        className="h-11 text-xl font-bold max-w-md"
                        maxLength={80}
                      />
                    ) : (
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{name}</h1>
                    )}
                    {seller.username && <p className="text-sm text-foreground-muted mt-0.5">@{seller.username}</p>}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <SellerLevelBadge
                        orders={totalOrdersForLevel}
                        rating={avgRating}
                        reviews={reviewCount}
                      />
                      <VerifiedBadge sellerId={seller.id} />
                      {seller.is_online && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                          <span className="h-2 w-2 rounded-full bg-success" /> Online
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isOwner ? (
                      editing ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                            <X className="h-4 w-4" /> Cancel
                          </Button>
                          <Button variant="green" size="sm" onClick={handleSave} disabled={saving}>
                            {saving ? "Saving…" : "Save changes"}
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={beginEdit}>
                          <Pencil className="h-4 w-4" /> Edit profile
                        </Button>
                      )
                    ) : (
                      <>
                        <Button variant="green" size="sm" onClick={handleMessage}>
                          <MessageCircle className="h-4 w-4" /> Message
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href="#gigs"><ShoppingBag className="h-4 w-4" /> View gigs</a>
                        </Button>
                        <FollowSellerButton sellerId={seller.id} />
                        <ReportDialog targetType="user" targetId={seller.id} label="Report" />
                      </>
                    )}
                  </div>
                </div>

                {/* Trust signal row */}
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  {reviewCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      {avgRating.toFixed(1)}
                      <span className="text-foreground-muted font-normal">({reviewCount} reviews)</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-foreground-muted">
                    <ShoppingBag className="h-4 w-4" /> {completedOrders} orders completed
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-foreground-muted">
                    <Calendar className="h-4 w-4" />
                    Member since {new Date(seller.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </span>
                  {seller.response_time_minutes != null && (
                    <span className="inline-flex items-center gap-1.5 text-foreground-muted">
                      <Clock className="h-4 w-4" /> Responds in ~{formatResponseTime(seller.response_time_minutes)}
                    </span>
                  )}
                  {seller.response_rate != null && (
                    <span className="inline-flex items-center gap-1.5 text-foreground-muted">
                      <MessageCircle className="h-4 w-4" /> {Number(seller.response_rate).toFixed(0)}% response rate
                    </span>
                  )}
                  {(editing ? form.location : (seller.location ?? seller.country)) && !editing && (
                    <span className="inline-flex items-center gap-1.5 text-foreground-muted">
                      <MapPin className="h-4 w-4" /> {seller.location ?? seller.country}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────── BODY ─────────── */}
        <section className="container py-10">
          <div className="grid lg:grid-cols-[320px_1fr] gap-10">
            {/* Sidebar - About */}
            <aside className="space-y-6">
              <div className="bg-background border border-border rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted mb-3">About</h2>

                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs">Bio</Label>
                      <Textarea
                        value={form.bio}
                        onChange={(e) => setForm(f => ({ ...f, bio: e.target.value.slice(0, 250) }))}
                        placeholder="Tell buyers about yourself"
                        rows={5}
                      />
                      <div className="text-[11px] text-foreground-muted text-right mt-1">{form.bio.length}/250</div>
                    </div>

                    <div>
                      <Label className="text-xs">Location</Label>
                      <Input
                        value={form.location}
                        onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="City, Country"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Skills</Label>
                      <SkillsTagInput
                        value={form.seller_skills}
                        onChange={(v) => setForm(f => ({ ...f, seller_skills: v }))}
                        max={12}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Languages</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {form.languages.map(l => (
                          <span key={l} className="inline-flex items-center gap-1 text-xs bg-secondary border border-border rounded-full px-2 py-1">
                            {l}
                            <button type="button" onClick={() => setForm(f => ({ ...f, languages: f.languages.filter(x => x !== l) }))}>
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={langInput}
                          onChange={(e) => setLangInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && langInput.trim()) {
                              e.preventDefault();
                              setForm(f => ({ ...f, languages: Array.from(new Set([...f.languages, langInput.trim()])) }));
                              setLangInput("");
                            }
                          }}
                          placeholder="Add language and press Enter"
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border">
                      <Label className="text-xs">Social links</Label>
                      <div className="relative">
                        <Globe className="h-4 w-4 absolute left-3 top-3 text-foreground-muted" />
                        <Input value={form.website_url} onChange={(e) => setForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://yoursite.com" className="pl-9 h-9" />
                      </div>
                      <div className="relative">
                        <Linkedin className="h-4 w-4 absolute left-3 top-3 text-foreground-muted" />
                        <Input value={form.linkedin_url} onChange={(e) => setForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="LinkedIn URL" className="pl-9 h-9" />
                      </div>
                      <div className="relative">
                        <Twitter className="h-4 w-4 absolute left-3 top-3 text-foreground-muted" />
                        <Input value={form.twitter_url} onChange={(e) => setForm(f => ({ ...f, twitter_url: e.target.value }))} placeholder="Twitter URL" className="pl-9 h-9" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {seller.bio ? (
                      <p className="text-sm text-foreground-muted whitespace-pre-line">{seller.bio}</p>
                    ) : (
                      isOwner && <p className="text-sm text-foreground-subtle italic">Tell buyers about yourself — click Edit profile.</p>
                    )}

                    {(seller.seller_skills?.length ?? 0) > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted mb-2">Skills</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {seller.seller_skills!.map(s => (
                            <span key={s} className="text-xs bg-secondary border border-border rounded-full px-2.5 py-1 text-foreground">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(seller.languages?.length ?? 0) > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted mb-2">Languages</h3>
                        <p className="text-sm text-foreground">{seller.languages!.join(", ")}</p>
                      </div>
                    )}

                    {(seller.website_url || seller.linkedin_url || seller.twitter_url) && (
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted mb-2">Links</h3>
                        <div className="flex flex-col gap-1.5 text-sm">
                          {seller.website_url && (
                            <a href={seller.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                              <Globe className="h-4 w-4" /> Website
                            </a>
                          )}
                          {seller.linkedin_url && (
                            <a href={seller.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                              <Linkedin className="h-4 w-4" /> LinkedIn
                            </a>
                          )}
                          {seller.twitter_url && (
                            <a href={seller.twitter_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-foreground hover:text-primary">
                              <Twitter className="h-4 w-4" /> Twitter
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>

            {/* Main column */}
            <section className="space-y-12">
              <div>
                <h2 className="text-xl font-bold mb-4">Reviews</h2>
                <ProfileReviewsSection sellerId={seller.id} />
              </div>
              <div id="gigs">
                <h2 className="text-xl font-bold mb-6">{name}'s gigs</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gigs.length === 0
                    ? <p className="text-foreground-muted col-span-full">No active services yet.</p>
                    : gigs.map((g) => <GigCard key={g.id} gig={g} />)}
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
