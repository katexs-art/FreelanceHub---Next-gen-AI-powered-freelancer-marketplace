import { useState, useEffect } from "react";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const INSTALL_GUIDES: Record<string, string> = {
  wordpress: "Go to Appearance → Theme Editor → footer.php → paste before </body>",
  shopify: "Online Store → Themes → Edit code → theme.liquid → paste before </body>",
  wix: "Settings → Custom Code → Add Code → Body → End of body",
  squarespace: "Settings → Advanced → Code Injection → Footer",
  html: "Paste before the closing </body> tag in your HTML file",
  webflow: "Project Settings → Custom Code → Footer Code",
};

export function ChatEmbedPanel() {
  const { user } = useAuth();
  const [activeGuide, setActiveGuide] = useState("wordpress");
  const [config, setConfig] = useState<any>({});
  const [stats] = useState({ chats: 0, leads: 0, avgTime: "2.1s" });

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("river_config").eq("user_id", user.id).single().then(({ data }) => {
      setConfig((data?.river_config as any)?.chat_config || {});
    });
  }, [user]);

  const embedCode = `<script>
  window.KatexsConfig = {
    businessId: "${user?.id || "YOUR_ID"}",
    primaryColor: "${config.primary_color || "#020203"}",
    accentColor: "${config.accent_color || "#4ade80"}",
    position: "${config.position || "bottom-right"}",
    agentName: "${config.agent_name || "River"}"
  };
</script>
<script src="https://cdn.katexs.com/widget/v1/chat.js" async></script>`;

  const copyEmbed = () => { navigator.clipboard.writeText(embedCode); toast({ title: "Copied!" }); };

  const downloadEmbed = () => {
    const blob = new Blob([`<!-- Katexs Chat Widget -->\n${embedCode}`], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "katexs-widget.html"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Embed Code */}
      <div className="bg-background-card border border-border-subtle rounded-xl p-4 space-y-3">
        <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em]">Add to your website</p>
        <p className="text-[11px] text-foreground-secondary">Paste this code before the &lt;/body&gt; tag</p>
        <div className="bg-[hsl(240,14%,2%)] border border-border rounded-lg p-3 overflow-x-auto">
          <pre className="text-[11px] font-mono text-accent-green whitespace-pre-wrap break-all">{embedCode}</pre>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1" onClick={copyEmbed}><Copy className="w-3 h-3 mr-1" /> Copy</Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={downloadEmbed}><Download className="w-3 h-3 mr-1" /> Download</Button>
        </div>
      </div>

      {/* Installation Guides */}
      <div className="bg-background-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em]">Installation Guides</p>
        <div className="flex flex-wrap gap-1">
          {Object.keys(INSTALL_GUIDES).map((key) => (
            <button key={key} onClick={() => setActiveGuide(key)}
              className={`text-[10px] px-2 py-1 rounded-md capitalize ${activeGuide === key ? "bg-background-elevated text-foreground" : "text-foreground-secondary hover:text-foreground"}`}>
              {key === "html" ? "HTML" : key}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-foreground-secondary">{INSTALL_GUIDES[activeGuide]}</p>
      </div>

      {/* Stats */}
      <div className="bg-background-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em]">Chat Stats</p>
        {[
          { label: "Chats today", value: stats.chats },
          { label: "Leads captured", value: stats.leads },
          { label: "Avg response time", value: stats.avgTime },
        ].map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-[12px] text-foreground-secondary">{s.label}</span>
            <span className="text-[13px] font-semibold text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Channel Status */}
      <div className="bg-background-card border border-border rounded-xl p-4 space-y-2">
        <p className="text-[10px] text-foreground-secondary uppercase tracking-[0.1em]">Active Channels</p>
        {[
          { label: "Website widget", active: config.website_chat !== false },
          { label: "SMS", active: config.sms_channel === true },
          { label: "Facebook", active: false },
          { label: "Instagram", active: false },
        ].map((ch) => (
          <div key={ch.label} className="flex items-center justify-between">
            <span className="text-[12px] text-foreground-secondary">{ch.label}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${ch.active ? "bg-accent-green/10 text-accent-green" : "bg-foreground-muted/20 text-foreground-muted"}`}>
              {ch.active ? "Active" : "Not connected"}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
