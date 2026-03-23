import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Copy, ExternalLink, QrCode, Share2, DollarSign, Users, MousePointer,
  TrendingUp, Download, RefreshCw,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ── Types ── */
interface AffiliateData {
  id: string;
  referral_code: string;
  referred_count: number;
  earnings: number;
  payout_status: string;
  created_at: string;
}

/* ── Mock data for empty state ── */
const MOCK_CHART = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
  return { month: d.toLocaleString("default", { month: "short" }), earnings: Math.floor(Math.random() * 400) + 50 };
});

const MOCK_REFERRALS = [
  { name: "James Miller", business: "Miller HVAC", plan: "Growth", status: "Active", value: 297, commission: 148.5, date: "Mar 1, 2026", lastPayment: "Mar 23, 2026" },
  { name: "Sarah Kim", business: "Kim Med Spa", plan: "Starter", status: "Active", value: 100, commission: 50, date: "Feb 15, 2026", lastPayment: "Mar 23, 2026" },
  { name: "Tony Reeves", business: "Reeves Plumbing", plan: "Starter", status: "Trial", value: 100, commission: 50, date: "Mar 18, 2026", lastPayment: "—" },
  { name: "Linda Chen", business: "Chen Realty", plan: "Growth", status: "Cancelled", value: 297, commission: 0, date: "Jan 10, 2026", lastPayment: "Feb 1, 2026" },
];

const MOCK_PAYOUTS = [
  { date: "Mar 1, 2026", amount: 247, status: "Paid", stripeId: "po_3Q8kB2..." },
  { date: "Feb 1, 2026", amount: 396.5, status: "Paid", stripeId: "po_3P7jA1..." },
  { date: "Jan 1, 2026", amount: 198.5, status: "Paid", stripeId: "po_3O6iZ0..." },
];

const EMAIL_TEMPLATES = [
  {
    title: "Cold outreach to service business owners",
    subject: "Stop missing calls — AI answers for you 24/7",
    body: `Hey [Name],\n\nI came across your business and thought you'd be interested in this — it's an AI platform that answers your calls 24/7, follows up with leads instantly, and manages your entire CRM.\n\nI've been using it myself and it's genuinely impressive. They offer a 14-day free trial so there's zero risk.\n\nCheck it out: [YOUR_LINK]\n\nHappy to walk you through it if you're curious.\n\nBest,\n[Your Name]`,
  },
  {
    title: "Follow up email",
    subject: "Quick follow up — did you check out Katexs?",
    body: `Hey [Name],\n\nJust wanted to follow up on my last email about Katexs. A few of my contacts have signed up since then and they're loving the AI call answering.\n\nOne guy told me it recovered $3,000 in missed leads in the first week alone.\n\nHere's the link again: [YOUR_LINK]\n\n14-day free trial, no risk.\n\nLet me know if you have questions!\n\n[Your Name]`,
  },
  {
    title: "Case study email",
    subject: "How a plumber added $12K/mo with AI",
    body: `Hey [Name],\n\nQuick story: a plumber I know was missing 40% of his after-hours calls. He set up Katexs AI — now every single call gets answered, qualified, and booked automatically.\n\nFirst month: $12,000 in recovered revenue.\n\nThe platform handles calls, texts, CRM, workflows — everything in one place.\n\nCheck it out: [YOUR_LINK]\n\n[Your Name]`,
  },
];

const SOCIAL_POSTS = [
  { platform: "LinkedIn", text: `🚀 Service business owners — stop losing leads to missed calls.\n\nI've been testing an AI platform that:\n• Answers every call 24/7\n• Follows up via SMS in under 60 seconds\n• Manages your entire CRM\n• Books appointments automatically\n\n14-day free trial, $100/mo after.\n\nCheck it out: [YOUR_LINK]\n\n#AI #ServiceBusiness #SmallBusiness` },
  { platform: "Twitter/X", text: `Service businesses lose $10K+/yr in missed calls.\n\nKatexs fixes that with AI that answers every call, texts back instantly, and books appointments.\n\n14-day free trial 👇\n[YOUR_LINK]` },
  { platform: "Facebook", text: `Any service business owners here? 🔧\n\nI found a platform that uses AI to answer your phone calls 24/7, follow up with leads instantly, and manage your entire business.\n\nA plumber I know recovered $12K in missed revenue in his first month.\n\nFree 14-day trial: [YOUR_LINK]` },
  { platform: "Instagram", text: `Stop missing calls. Start closing more deals. 📞✨\n\nKatexs AI answers every call, follows up with leads in under 60 seconds, and manages your entire CRM.\n\nPerfect for HVAC, plumbers, med spas, realtors — any service business.\n\nLink in bio 👆 or DM me for the link!\n\n#AI #SmallBusiness #ServiceBusiness #Entrepreneurship` },
];

const statusColor = (s: string) => {
  if (s === "Active") return "green" as const;
  if (s === "Trial") return "purple" as const;
  if (s === "Cancelled" || s === "Churned") return "destructive" as const;
  return "default" as const;
};

const payoutColor = (s: string) => {
  if (s === "Paid") return "green" as const;
  if (s === "Pending") return "purple" as const;
  return "default" as const;
};

/* ── Component ── */
const AffiliateDashboard = () => {
  const { user } = useAuth();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"emails" | "social" | "ads" | "talking">("emails");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
      if (data) setAffiliate(data as unknown as AffiliateData);
      setLoading(false);
    })();
  }, [user]);

  const referralUrl = affiliate ? `https://katexs.com/ref/${affiliate.referral_code}` : "https://katexs.com/ref/your-code";

  const copyLink = () => { navigator.clipboard.writeText(referralUrl); toast.success("Referral link copied!"); };
  const copyText = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied to clipboard!"); };

  const totalEarned = affiliate?.earnings || 842;
  const thisMonth = 247;
  const pending = 247;
  const activeRefs = MOCK_REFERRALS.filter(r => r.status === "Active").length;
  const totalClicks = 1247;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-background-elevated rounded-[10px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-bold text-foreground">Affiliate Dashboard</h1>
        <p className="text-[13px] text-foreground-secondary mt-0.5">
          Welcome back{user?.email ? ` ${user.email.split("@")[0]}` : ""} · Affiliate since {affiliate ? new Date(affiliate.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Mar 2026"}
        </p>
      </div>

      {/* Referral Link */}
      <div className="bg-background-card border border-border-subtle rounded-[12px] p-6">
        <p className="text-label text-foreground-secondary tracking-[0.1em] mb-3">YOUR REFERRAL LINK</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-background-elevated border border-border rounded-lg px-4 py-2.5 font-mono text-[13px] text-foreground truncate">
            {referralUrl}
          </div>
          <Button onClick={copyLink} size="sm" className="flex-shrink-0 gap-1.5"><Copy className="w-3.5 h-3.5" />Copy</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {["Twitter/X", "LinkedIn", "Facebook", "Email", "WhatsApp"].map(p => (
            <Button key={p} variant="ghost" size="sm" className="gap-1.5 text-[11px]">
              <Share2 className="w-3 h-3" />{p}
            </Button>
          ))}
          <Button variant="ghost" size="sm" className="gap-1.5 text-[11px]"><QrCode className="w-3 h-3" />QR Code</Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total earned", value: `$${totalEarned.toLocaleString()}`, icon: DollarSign, green: true },
          { label: "This month", value: `$${thisMonth}`, icon: TrendingUp },
          { label: "Pending payout", value: `$${pending}`, icon: DollarSign },
          { label: "Active referrals", value: activeRefs.toString(), icon: Users },
          { label: "Total clicks", value: totalClicks.toLocaleString(), icon: MousePointer },
        ].map(m => (
          <div key={m.label} className="bg-background-card border border-border rounded-[10px] p-4">
            <p className="text-label text-foreground-secondary tracking-[0.08em]">{m.label.toUpperCase()}</p>
            <p className={`text-[28px] font-bold tracking-tight mt-1 ${m.green ? "text-accent-green" : "text-foreground"}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-background-card border border-border rounded-[10px] p-5">
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Earnings over time</h3>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MOCK_CHART}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "hsl(42,3%,47%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(42,3%,47%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ background: "hsl(240,5%,8.5%)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, color: "#f8f7f4", fontSize: 12 }} formatter={(v: number) => [`$${v}`, "Earnings"]} />
              <Line type="monotone" dataKey="earnings" stroke="#f8f7f4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-background-card border border-border rounded-[10px] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-[14px] font-semibold text-foreground">Your referrals</h3>
          <Button variant="ghost" size="sm" className="gap-1.5 text-[11px]"><Download className="w-3 h-3" />Export CSV</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-background-elevated text-foreground-secondary uppercase tracking-[0.08em] text-[11px]">
                <th className="text-left px-5 py-3 font-medium">Client</th>
                <th className="text-left px-5 py-3 font-medium">Business</th>
                <th className="text-left px-5 py-3 font-medium">Plan</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-right px-5 py-3 font-medium">Commission</th>
                <th className="text-right px-5 py-3 font-medium">Referred</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_REFERRALS.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-[hsl(240,8%,7%)] transition-colors">
                  <td className="px-5 py-3 text-foreground font-medium">{r.name}</td>
                  <td className="px-5 py-3 text-foreground-secondary">{r.business}</td>
                  <td className="px-5 py-3 text-foreground-secondary">{r.plan}</td>
                  <td className="px-5 py-3"><Badge variant={statusColor(r.status)}>{r.status}</Badge></td>
                  <td className="px-5 py-3 text-right text-accent-green font-semibold">${r.commission}/mo</td>
                  <td className="px-5 py-3 text-right text-foreground-secondary">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-background-card border border-border rounded-[10px] overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-[14px] font-semibold text-foreground">Payout history</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-background-elevated text-foreground-secondary uppercase tracking-[0.08em] text-[11px]">
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-right px-5 py-3 font-medium">Amount</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Stripe ID</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PAYOUTS.map((p, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-5 py-3 text-foreground">{p.date}</td>
                  <td className="px-5 py-3 text-right text-foreground font-semibold">${p.amount}</td>
                  <td className="px-5 py-3"><Badge variant={payoutColor(p.status)}>{p.status}</Badge></td>
                  <td className="px-5 py-3 text-foreground-secondary font-mono text-[11px]">{p.stripeId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border text-right">
          <span className="text-[12px] text-foreground-secondary">Total paid: </span>
          <span className="text-[14px] font-bold text-accent-green">${MOCK_PAYOUTS.reduce((s, p) => s + p.amount, 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Marketing Materials */}
      <div className="bg-background-card border border-border rounded-[10px] overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-[14px] font-semibold text-foreground">Marketing toolkit</h3>
        </div>
        <div className="flex border-b border-border">
          {(["emails", "social", "ads", "talking"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-[12px] font-medium transition-colors border-b-2 ${activeTab === tab ? "text-foreground border-foreground" : "text-foreground-secondary border-transparent hover:text-foreground"}`}>
              {tab === "emails" ? "Email templates" : tab === "social" ? "Social posts" : tab === "ads" ? "Ad copy" : "Talking points"}
            </button>
          ))}
        </div>
        <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
          {activeTab === "emails" && EMAIL_TEMPLATES.map((t, i) => (
            <div key={i} className="bg-background-secondary border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-[13px] font-semibold text-foreground">{t.title}</h4>
                  <p className="text-[11px] text-foreground-secondary mt-0.5">Subject: {t.subject}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyText(t.body.replace(/\[YOUR_LINK\]/g, referralUrl))} className="text-[10px] gap-1"><Copy className="w-3 h-3" />Copy</Button>
              </div>
              <pre className="text-[12px] text-foreground-secondary whitespace-pre-wrap leading-relaxed mt-2 bg-background-elevated rounded-md p-3 border border-border">{t.body}</pre>
            </div>
          ))}
          {activeTab === "social" && SOCIAL_POSTS.map((p, i) => (
            <div key={i} className="bg-background-secondary border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="default">{p.platform}</Badge>
                <Button variant="ghost" size="sm" onClick={() => copyText(p.text.replace(/\[YOUR_LINK\]/g, referralUrl))} className="text-[10px] gap-1"><Copy className="w-3 h-3" />Copy</Button>
              </div>
              <pre className="text-[12px] text-foreground-secondary whitespace-pre-wrap leading-relaxed mt-1">{p.text}</pre>
            </div>
          ))}
          {activeTab === "ads" && (
            <div className="space-y-4">
              {[
                { headline: "Stop Losing Leads to Missed Calls", body: "AI answers every call 24/7. Follows up in 60 seconds. Books appointments automatically. Free 14-day trial.", cta: "Start Free Trial" },
                { headline: "Your Phone Is Costing You $10K/Year", body: "Every missed call is money lost. Katexs AI picks up every time, texts back instantly, and closes deals while you sleep.", cta: "Try It Free" },
                { headline: "The AI Platform That Runs Your Business", body: "Voice AI, CRM, automations, unified inbox — one platform. Used by 500+ service businesses. Free to try.", cta: "Get Started Free" },
              ].map((a, i) => (
                <div key={i} className="bg-background-secondary border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-[14px] font-bold text-foreground">{a.headline}</h4>
                      <p className="text-[12px] text-foreground-secondary mt-1">{a.body}</p>
                      <p className="text-[11px] text-accent-green mt-2 font-medium">CTA: {a.cta}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyText(`${a.headline}\n\n${a.body}\n\n${a.cta}\n\n${referralUrl}`)} className="text-[10px] gap-1 flex-shrink-0"><Copy className="w-3 h-3" />Copy</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === "talking" && (
            <div className="space-y-3">
              <h4 className="text-[13px] font-semibold text-foreground">Key Talking Points</h4>
              {[
                "Katexs answers every phone call 24/7 using AI — no more missed leads",
                "The AI follows up with leads in under 60 seconds via SMS",
                "Everything is in one platform: calls, texts, CRM, workflows, inbox",
                "Free setup, 14-day free trial, $100/mo Starter plan",
                "One plumber recovered $12K in missed revenue in his first month",
                "No tech skills needed — River AI does the heavy lifting",
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-[13px] text-foreground-secondary">
                  <span className="text-accent-green mt-0.5">•</span>{p}
                </div>
              ))}
              <div className="mt-6">
                <h4 className="text-[13px] font-semibold text-foreground mb-3">Common Objections</h4>
                {[
                  { q: "\"I don't trust AI with my calls\"", a: "River AI is trained specifically for service businesses. It qualifies leads, books appointments, and hands off to you for complex conversations." },
                  { q: "\"I already have a CRM\"", a: "Katexs replaces 7+ tools in one platform. Most clients save $200+/mo in tool costs alone." },
                  { q: "\"$100/mo is expensive\"", a: "One recovered missed call pays for 3 months. The average client recovers $3K+ in the first month." },
                ].map((o, i) => (
                  <div key={i} className="bg-background-secondary border border-border rounded-lg p-3 mb-2">
                    <p className="text-[12px] text-foreground font-medium">{o.q}</p>
                    <p className="text-[12px] text-foreground-secondary mt-1">{o.a}</p>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => copyText("Key talking points copied")} className="mt-2 text-[11px] gap-1"><Copy className="w-3 h-3" />Copy all</Button>
            </div>
          )}
        </div>
      </div>

      {/* Performance */}
      <div className="bg-background-card border border-border rounded-[10px] p-5">
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Link performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total clicks", value: "1,247" },
            { label: "Unique clicks", value: "834" },
            { label: "Signup rate", value: "4.8%" },
            { label: "Conversion rate", value: "62%" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em]">{s.label}</p>
              <p className="text-[20px] font-bold text-foreground mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* River Tips - powered by AI */}
      <div className="bg-[hsl(var(--accent-purple)/0.06)] border border-[hsl(var(--accent-purple)/0.15)] border-t-2 border-t-[hsl(var(--accent-purple))] rounded-[10px] p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-[hsl(var(--accent-purple))] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
          <span className="text-[13px] font-semibold text-[#AFA9EC]">River's tips for you</span>
          <button className="ml-auto text-foreground-secondary hover:text-foreground"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
        <p className="text-[13px] text-[#c8c7c2] leading-relaxed">
          Your signup rate is 4.8% — that's above average! Focus on LinkedIn outreach this week. Service business owners in HVAC and plumbing convert 2x better than other industries. Try posting a case study about the plumber who recovered $12K.
        </p>
      </div>
    </div>
  );
};

export default AffiliateDashboard;
