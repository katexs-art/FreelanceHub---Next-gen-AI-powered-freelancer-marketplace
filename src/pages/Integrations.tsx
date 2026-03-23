import { useState, useMemo } from "react";
import {
  Search, Plus, Phone, Mail, MessageSquare, Video, Calendar, CreditCard, Megaphone,
  Zap, Wrench, Globe, Webhook, Copy, RefreshCw, ExternalLink, Check, X, Lock,
  ChevronDown, ChevronRight, Send, Code, Shield, Clock, ArrowRight, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useAuth } from "@/hooks/useAuth";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { toast } from "@/components/ui/sonner";

/* ── Integration definitions ── */
interface IntegrationDef {
  name: string;
  key: string;
  category: string;
  description: string;
  comingSoon?: boolean;
  fields: { label: string; key: string; type: "text" | "password" | "select"; placeholder?: string; options?: string[] }[];
  icon: string;
}

const INTEGRATIONS: IntegrationDef[] = [
  { name: "Twilio", key: "twilio", category: "Communication", description: "Phone numbers, SMS, and voice calls. Required for Voice AI and missed call text-back.", icon: "Tw",
    fields: [{ label: "Account SID", key: "account_sid", type: "text", placeholder: "AC..." }, { label: "Auth Token", key: "auth_token", type: "password", placeholder: "Your auth token" }, { label: "Phone Number", key: "phone_number", type: "text", placeholder: "+1..." }] },
  { name: "SendGrid", key: "sendgrid", category: "Communication", description: "Email delivery for automated sequences, follow-ups, and notifications.", icon: "SG",
    fields: [{ label: "API Key", key: "api_key", type: "password", placeholder: "SG..." }, { label: "From Email", key: "from_email", type: "text", placeholder: "hello@yourbusiness.com" }, { label: "From Name", key: "from_name", type: "text", placeholder: "Your Business" }] },
  { name: "ManyChat", key: "manychat", category: "Communication", description: "Facebook Messenger and Instagram DM automation.", icon: "MC",
    fields: [{ label: "API Key", key: "api_key", type: "password", placeholder: "Your API key" }] },
  { name: "WhatsApp Business", key: "whatsapp", category: "Communication", description: "WhatsApp messaging via Twilio. Requires Twilio connection first.", icon: "WA",
    fields: [{ label: "WhatsApp Business Number", key: "phone_number", type: "text", placeholder: "+1..." }] },
  { name: "Vapi", key: "vapi", category: "Voice AI", description: "AI voice agents — powered by Katexs. Configure in AI Studio.", icon: "Va",
    fields: [], comingSoon: false },
  { name: "ElevenLabs", key: "elevenlabs", category: "Voice AI", description: "Ultra-realistic voice cloning for branded AI voice agents.", icon: "EL", comingSoon: true, fields: [] },
  { name: "Google Calendar", key: "google_calendar", category: "Calendar", description: "Sync appointments and let River book directly onto your calendar.", icon: "GC",
    fields: [{ label: "OAuth Token", key: "oauth_token", type: "password", placeholder: "Connect via OAuth" }] },
  { name: "Outlook / Microsoft 365", key: "outlook", category: "Calendar", description: "Sync your Outlook calendar and contacts.", icon: "OL",
    fields: [{ label: "OAuth Token", key: "oauth_token", type: "password", placeholder: "Connect via OAuth" }] },
  { name: "Calendly", key: "calendly", category: "Calendar", description: "Embed scheduling links and sync bookings automatically.", icon: "Cl",
    fields: [{ label: "API Key", key: "api_key", type: "password", placeholder: "Your Calendly API key" }] },
  { name: "Acuity Scheduling", key: "acuity", category: "Calendar", description: "Appointment scheduling for service professionals.", icon: "Ac",
    fields: [{ label: "API Key", key: "api_key", type: "password", placeholder: "Your API key" }, { label: "User ID", key: "user_id_field", type: "text", placeholder: "Your User ID" }] },
  { name: "Stripe", key: "stripe", category: "Payments", description: "Accept payments, send invoices, manage subscriptions.", icon: "St",
    fields: [{ label: "API Key", key: "api_key", type: "password", placeholder: "sk_..." }] },
  { name: "Square", key: "square", category: "Payments", description: "Point-of-sale and online payments for service businesses.", icon: "Sq",
    fields: [{ label: "Access Token", key: "access_token", type: "password", placeholder: "Your access token" }] },
  { name: "PayPal", key: "paypal", category: "Payments", description: "Accept PayPal payments and send invoices.", icon: "PP",
    fields: [{ label: "Client ID", key: "client_id", type: "text", placeholder: "Your Client ID" }, { label: "Secret", key: "secret", type: "password", placeholder: "Your secret" }] },
  { name: "Facebook Ads", key: "facebook_ads", category: "Marketing", description: "Sync Facebook Lead Ads directly into contacts. River calls new leads instantly.", icon: "FB",
    fields: [{ label: "Access Token", key: "access_token", type: "password", placeholder: "Your access token" }] },
  { name: "Google Ads", key: "google_ads", category: "Marketing", description: "Conversion tracking and lead sync from Google Ads campaigns.", icon: "GA",
    fields: [{ label: "OAuth Token", key: "oauth_token", type: "password", placeholder: "Connect via OAuth" }] },
  { name: "TikTok Ads", key: "tiktok_ads", category: "Marketing", description: "Lead generation from TikTok ad campaigns.", icon: "TT", comingSoon: true, fields: [] },
  { name: "Zapier", key: "zapier", category: "Automation", description: "Connect Katexs to 6,000+ apps via Zapier. Use our Zapier app to trigger workflows.", icon: "Zp", fields: [] },
  { name: "Make (Integromat)", key: "make", category: "Automation", description: "Advanced automation with Make.com. Connect via our webhook API.", icon: "Mk", fields: [] },
  { name: "n8n", key: "n8n", category: "Automation", description: "Self-hosted automation. Use our REST API and webhooks with n8n.", icon: "N8", fields: [] },
  { name: "Jobber", key: "jobber", category: "Industry Specific", description: "Home services job management. Sync jobs, clients, and invoices.", icon: "Jb",
    fields: [{ label: "API Key", key: "api_key", type: "password", placeholder: "Your API key" }] },
  { name: "ServiceTitan", key: "servicetitan", category: "Industry Specific", description: "Enterprise HVAC and plumbing management.", icon: "ST", comingSoon: true, fields: [] },
  { name: "Mindbody", key: "mindbody", category: "Industry Specific", description: "Wellness and fitness studio management.", icon: "MB", comingSoon: true, fields: [] },
  { name: "Vagaro", key: "vagaro", category: "Industry Specific", description: "Salon and spa management.", icon: "Vg", comingSoon: true, fields: [] },
  { name: "QuickBooks", key: "quickbooks", category: "Industry Specific", description: "Accounting sync. Auto-create invoices when deals are won.", icon: "QB",
    fields: [{ label: "OAuth Token", key: "oauth_token", type: "password", placeholder: "Connect via OAuth" }] },
];

const CATEGORIES = ["All", "Communication", "Voice AI", "Calendar", "Payments", "Marketing", "Automation", "Industry Specific", "Webhooks"];
const WEBHOOK_EVENTS = ["contact_created", "deal_won", "deal_lost", "appointment_booked", "call_completed", "payment_received", "workflow_completed"];


/* ── Page ── */
const Integrations = () => {
  const { user } = useAuth();
  const { integrations, webhookLogs, loading, connectIntegration, disconnectIntegration, isConnected, getIntegration, refetch } = useIntegrations();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [connectModal, setConnectModal] = useState<IntegrationDef | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [apiTab, setApiTab] = useState<"curl" | "js" | "python">("curl");
  const [copied, setCopied] = useState(false);

  const connectedCount = integrations.filter(i => i.status === "connected").length;
  const webhooksToday = webhookLogs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;

  const filtered = useMemo(() => {
    let items = INTEGRATIONS;
    if (activeTab !== "All" && activeTab !== "Webhooks") items = items.filter(i => i.category === activeTab);
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()));
    return items;
  }, [activeTab, search]);

  const handleConnect = async () => {
    if (!connectModal || !user) return;
    setSaving(true);
    const apiKey = formValues["api_key"] || formValues["auth_token"] || formValues["access_token"] || formValues["oauth_token"] || "";
    await connectIntegration(connectModal.key, apiKey, formValues);
    toast.success(`${connectModal.name} connected successfully`);
    setSaving(false);
    setConnectModal(null);
    setFormValues({});
  };

  const handleDisconnect = async (key: string, name: string) => {
    await disconnectIntegration(key);
    toast.success(`${name} disconnected`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  const openConnectModal = (intg: IntegrationDef) => {
    setConnectModal(intg);
    setFormValues({});
  };

  const webhookUrl = `https://app.katexs.com/webhooks/${user?.id || "your-id"}/wh_live_xxxx`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-[-0.03em]">Integrations</h1>
          <p className="text-[13px] text-foreground-secondary mt-1">Connect your tools. Everything flows through River.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />Request integration</Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-secondary" />
            <Input className="w-[240px] pl-9 h-9 text-[13px]" placeholder="Search integrations..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "CONNECTED", value: connectedCount },
          { label: "AVAILABLE", value: INTEGRATIONS.length },
          { label: "WEBHOOKS TODAY", value: webhooksToday },
        ].map(s => (
          <div key={s.label} className="bg-background-card border border-border rounded-[10px] p-4">
            <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em]">{s.label}</p>
            <p className="text-[28px] font-bold text-foreground tracking-[-0.03em] mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* River Assistant */}
      <div className="bg-background-card border border-[hsl(var(--accent-purple)/0.15)] border-t-2 border-t-[hsl(var(--accent-purple))] rounded-[10px] p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--accent-purple))]" />
          <span className="text-[13px] font-semibold text-[#AFA9EC]">River Integration Assistant</span>
        </div>
        <p className="text-[12px] text-foreground-secondary mb-3">Tell River what app you want to connect and it will guide you through setup.</p>
        <Input className="h-10 text-[13px]" placeholder="I want to connect..." />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveTab(cat)}
            className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${activeTab === cat ? "text-foreground border-foreground" : "text-foreground-secondary border-transparent hover:text-foreground"}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Integration Cards or Webhooks */}
      {activeTab === "Webhooks" ? (
        <WebhooksSection webhookUrl={webhookUrl} webhookLogs={webhookLogs} copyToClipboard={copyToClipboard} copied={copied} />
      ) : (
        <>
          {activeTab === "All" ? (
            Object.entries(
              filtered.reduce((acc, i) => { (acc[i.category] = acc[i.category] || []).push(i); return acc; }, {} as Record<string, IntegrationDef[]>)
            ).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="text-[13px] font-semibold text-foreground mb-3">{cat}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                  {items.map(intg => (
                    <IntegrationCard key={intg.key} def={intg} connected={isConnected(intg.key)} integration={getIntegration(intg.key)}
                      onConnect={() => openConnectModal(intg)} onDisconnect={() => handleDisconnect(intg.key, intg.name)} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(intg => (
                <IntegrationCard key={intg.key} def={intg} connected={isConnected(intg.key)} integration={getIntegration(intg.key)}
                  onConnect={() => openConnectModal(intg)} onDisconnect={() => handleDisconnect(intg.key, intg.name)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* API Access */}
      <div className="bg-background-card border border-border rounded-[12px] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">API Access</h3>
            <p className="text-[11px] text-foreground-secondary mt-1">Growth + Enterprise plans only</p>
          </div>
          <Badge variant="default">REST API v1</Badge>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-foreground-secondary uppercase tracking-[0.08em] w-20">Base URL</span>
            <code className="text-[12px] text-foreground bg-background-elevated px-3 py-1.5 rounded-md border border-border flex-1">https://api.katexs.com/v1</code>
            <button onClick={() => copyToClipboard("https://api.katexs.com/v1")} className="text-foreground-secondary hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-foreground-secondary uppercase tracking-[0.08em] w-20">API Key</span>
            <code className="text-[12px] text-foreground bg-background-elevated px-3 py-1.5 rounded-md border border-border flex-1">ktxs_live_••••••••••••••••</code>
            <button onClick={() => copyToClipboard("ktxs_live_xxxxxxxxxxxx")} className="text-foreground-secondary hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
            <button className="text-foreground-secondary hover:text-foreground"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
          <p className="text-[11px] text-foreground-secondary">Rate limits: 1,000 requests/hour (Starter) · Unlimited (Growth+)</p>
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-1 mb-2">
            {(["curl", "js", "python"] as const).map(t => (
              <button key={t} onClick={() => setApiTab(t)}
                className={`px-3 py-1 text-[11px] font-medium rounded-md ${apiTab === t ? "bg-background-elevated text-foreground" : "text-foreground-secondary hover:text-foreground"}`}>
                {t === "curl" ? "cURL" : t === "js" ? "JavaScript" : "Python"}
              </button>
            ))}
          </div>
          <pre className="bg-[hsl(240,12%,3%)] border border-border rounded-lg p-4 text-[11px] text-[#c8c7c2] font-mono overflow-x-auto">
            {apiTab === "curl" && `curl -X GET https://api.katexs.com/v1/contacts \\
  -H "Authorization: Bearer ktxs_live_your_key" \\
  -H "Content-Type: application/json"`}
            {apiTab === "js" && `const res = await fetch("https://api.katexs.com/v1/contacts", {
  headers: {
    "Authorization": "Bearer ktxs_live_your_key",
    "Content-Type": "application/json"
  }
});
const contacts = await res.json();`}
            {apiTab === "python" && `import requests

res = requests.get(
    "https://api.katexs.com/v1/contacts",
    headers={"Authorization": "Bearer ktxs_live_your_key"}
)
contacts = res.json()`}
          </pre>
        </div>
      </div>

      {/* Connect Modal — Standard (non-Vapi) */}
      <Modal open={!!connectModal} onOpenChange={() => { setConnectModal(null); setFormValues({}); }}>
        <ModalContent className="max-w-md">
          <ModalTitle className="text-[18px] font-semibold text-foreground">Connect {connectModal?.name}</ModalTitle>
          <ModalDescription className="text-[12px] text-foreground-secondary mt-1">{connectModal?.description}</ModalDescription>
          <div className="space-y-4 mt-4">
            {connectModal?.fields.map(f => (
              <div key={f.key}>
                <label className="text-[12px] font-medium text-foreground mb-1.5 block">{f.label}</label>
                {f.type === "select" ? (
                  <select value={formValues[f.key] || ""} onChange={e => setFormValues(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full h-10 rounded-md bg-background-elevated border border-input px-3 text-[13px] text-foreground">
                    <option value="">Select...</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <Input type={f.type === "password" ? "password" : "text"} placeholder={f.placeholder}
                    value={formValues[f.key] || ""} onChange={e => setFormValues(p => ({ ...p, [f.key]: e.target.value }))}
                    className="text-[13px]" />
                )}
              </div>
            ))}
            {connectModal?.key === "whatsapp" && !isConnected("twilio") && (
              <div className="bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)] rounded-lg p-3">
                <p className="text-[11px] text-[hsl(var(--destructive))]">⚠ Twilio must be connected first.</p>
              </div>
            )}
            {(connectModal?.fields.length ?? 0) === 0 && !connectModal?.comingSoon && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-foreground-secondary uppercase tracking-[0.08em] w-20">API Key</span>
                  <code className="text-[12px] text-foreground bg-background-elevated px-3 py-1.5 rounded-md border border-border flex-1">ktxs_wh_{user?.id?.slice(0, 8) || "xxxx"}</code>
                  <button onClick={() => copyToClipboard(`ktxs_wh_${user?.id?.slice(0, 8) || "xxxx"}`)} className="text-foreground-secondary hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-[11px] text-foreground-secondary">Use these credentials in {connectModal?.name} to connect with Katexs.</p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => { setConnectModal(null); setFormValues({}); }}>Cancel</Button>
              {(connectModal?.fields.length ?? 0) > 0 ? (
                <Button className="flex-1" onClick={handleConnect} disabled={saving}>{saving ? "Connecting..." : "Connect & Test"}</Button>
              ) : (
                <Button className="flex-1" onClick={() => { setConnectModal(null); toast.success("Instructions copied!"); }}>Done</Button>
              )}
            </div>
          </div>
        </ModalContent>
      </Modal>

    </div>
  );
};

/* ── Integration Card ── */
function IntegrationCard({ def, connected, integration, onConnect, onDisconnect }: {
  def: IntegrationDef; connected: boolean; integration?: { config: Record<string, unknown>; connected_at: string | null } | undefined;
  onConnect: () => void; onDisconnect: () => void;
}) {
  
  return (
    <div className="bg-background-card border border-border rounded-[12px] p-5 hover:border-border-strong transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-background-elevated border border-border-subtle flex items-center justify-center text-[13px] font-semibold text-foreground-secondary">
            {def.icon}
          </div>
          <span className="text-[15px] font-semibold text-foreground">{def.name}</span>
        </div>
        {def.comingSoon ? (
          <Badge className="bg-[hsl(36,90%,50%)/0.1] text-[hsl(36,90%,50%)] border-[hsl(36,90%,50%)/0.2] text-[9px]">Coming soon</Badge>
        ) : def.key === "vapi" ? (
          <Badge className="bg-[hsl(var(--accent-purple)/0.15)] text-[#AFA9EC] border-[hsl(var(--accent-purple)/0.25)] text-[9px]">Included</Badge>
        ) : connected ? (
          <Badge variant="green" className="text-[9px]">Connected</Badge>
        ) : (
          <Badge variant="default" className="text-[9px]">Not connected</Badge>
        )}
      </div>
      <p className="text-[12px] text-foreground-secondary leading-relaxed mb-3 line-clamp-2">{def.description}</p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-background-elevated border border-border text-foreground-secondary">{def.category}</span>
      </div>
      {connected && integration && def.key !== "vapi" && (
        <div className="mb-3 space-y-1">
          {integration.connected_at && (
            <p className="text-[10px] text-accent-green">Connected {new Date(integration.connected_at).toLocaleDateString()}</p>
          )}
          {(integration.config as Record<string, unknown>)?.phone_number && (
            <p className="text-[10px] text-foreground-secondary">📞 {String((integration.config as Record<string, unknown>).phone_number)}</p>
          )}
          {(integration.config as Record<string, unknown>)?.from_email && (
            <p className="text-[10px] text-foreground-secondary">✉️ {String((integration.config as Record<string, unknown>).from_email)}</p>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        {def.comingSoon ? (
          <Button variant="ghost" size="sm" disabled className="flex-1 text-[12px]">Coming soon</Button>
        ) : def.key === "vapi" ? (
          <Button variant="ghost" size="sm" className="flex-1 text-[12px]" asChild>
            <a href="/ai-studio">Open AI Studio →</a>
          </Button>
        ) : connected ? (
          <Button variant="destructive" size="sm" className="flex-1 text-[12px]" onClick={onDisconnect}>Disconnect</Button>
        ) : (
          <Button size="sm" className="flex-1 text-[12px]" onClick={onConnect}>Connect</Button>
        )}
      </div>
    </div>
  );
}

/* ── Webhooks Section ── */
function WebhooksSection({ webhookUrl, webhookLogs, copyToClipboard, copied }: {
  webhookUrl: string; webhookLogs: { id: string; direction: string; event_type: string; status: string; response_code: number | null; duration_ms: number | null; created_at: string }[];
  copyToClipboard: (t: string) => void; copied: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-background-card border border-border rounded-[12px] p-5">
        <h3 className="text-[14px] font-semibold text-foreground mb-3">Inbound Webhook URL</h3>
        <div className="flex items-center gap-2 mb-3">
          <code className="text-[12px] text-foreground bg-[hsl(240,12%,3%)] px-3 py-2 rounded-md border border-border flex-1 truncate">{webhookUrl}</code>
          <button onClick={() => copyToClipboard(webhookUrl)} className="text-foreground-secondary hover:text-foreground"><Copy className="w-4 h-4" /></button>
        </div>
        <p className="text-[11px] text-foreground-secondary mb-3">Send a POST request to this URL to trigger workflows from any external app.</p>
        <pre className="bg-[hsl(240,12%,3%)] border border-border rounded-lg p-4 text-[11px] text-[#c8c7c2] font-mono overflow-x-auto">{`{
  "trigger": "new_lead",
  "contact": {
    "first_name": "John",
    "last_name": "Smith",
    "phone": "+16025550100",
    "email": "john@example.com",
    "source": "Facebook Ads"
  },
  "custom_data": {}
}`}</pre>
        <div className="flex gap-2 mt-3">
          <Button variant="ghost" size="sm" className="text-[12px]"><RefreshCw className="w-3 h-3 mr-1.5" />Regenerate secret</Button>
          <Button variant="ghost" size="sm" className="text-[12px]"><Send className="w-3 h-3 mr-1.5" />Test webhook</Button>
        </div>
      </div>
      <div className="bg-background-card border border-border rounded-[12px] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-foreground">Outbound Webhooks</h3>
          <Button size="sm" className="text-[12px]"><Plus className="w-3 h-3 mr-1.5" />Add webhook</Button>
        </div>
        <p className="text-[12px] text-foreground-secondary">Configure webhooks to notify external services when events happen in Katexs.</p>
        <div className="mt-3 text-[11px] text-foreground-secondary">
          <span className="uppercase tracking-[0.08em]">Available events:</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {WEBHOOK_EVENTS.map(e => (
              <span key={e} className="px-2 py-0.5 bg-background-elevated border border-border rounded text-foreground-secondary">{e}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-background-card border border-border rounded-[12px] overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-foreground">Webhook Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-background-elevated border-b border-border">
                {["Time", "Type", "Event", "Status", "Code", "Duration"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] text-foreground-secondary uppercase tracking-[0.08em] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {webhookLogs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-foreground-secondary text-[12px]">No webhook logs yet</td></tr>
              ) : webhookLogs.map(log => (
                <tr key={log.id} className="border-b border-[hsl(var(--border))] hover:bg-background-elevated cursor-pointer">
                  <td className="px-4 py-2.5 text-foreground-secondary">{new Date(log.created_at).toLocaleTimeString()}</td>
                  <td className="px-4 py-2.5"><Badge variant={log.direction === "inbound" ? "green" : "default"} className="text-[9px]">{log.direction}</Badge></td>
                  <td className="px-4 py-2.5 text-foreground">{log.event_type}</td>
                  <td className="px-4 py-2.5"><Badge variant={log.status === "success" ? "green" : "destructive"} className="text-[9px]">{log.status}</Badge></td>
                  <td className="px-4 py-2.5 text-foreground-secondary">{log.response_code || "—"}</td>
                  <td className="px-4 py-2.5 text-foreground-secondary">{log.duration_ms ? `${log.duration_ms}ms` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Integrations;
