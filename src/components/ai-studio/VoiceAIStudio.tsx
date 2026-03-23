import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { VoiceConfig } from "./VoiceConfig";
import { VoiceTester } from "./VoiceTester";
import { VoicePhonePanel } from "./VoicePhonePanel";
import { VoiceCallHistory } from "./VoiceCallHistory";
import { VoiceAnalytics } from "./VoiceAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { fullVapiSync } from "@/services/vapiSync";
import { toast } from "@/hooks/use-toast";

export function VoiceAIStudio() {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState("studio");
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSync = async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      await fullVapiSync(user.id);
      setLastSynced("just now");
      setRefreshKey((k) => k + 1);
      toast({ title: "Synced from Vapi", description: "All data refreshed." });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={subTab} onValueChange={setSubTab} className="flex-1">
          <div className="flex items-center justify-between">
            <TabsList className="bg-transparent h-auto p-0 gap-4 rounded-none">
              {[
                { value: "studio", label: "Studio" },
                { value: "history", label: "Call History" },
                { value: "analytics", label: "Analytics" },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="bg-transparent rounded-none px-0 pb-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground text-foreground-secondary border-b-2 border-transparent text-[13px]"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button variant="ghost" size="sm" onClick={handleSync} disabled={syncing} className="text-[11px] h-7 gap-1.5 text-foreground-secondary hover:text-foreground">
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {syncing ? "Syncing..." : "Sync from Vapi"}
              {lastSynced && !syncing && <span className="text-foreground-muted ml-1">· {lastSynced}</span>}
            </Button>
          </div>

          <TabsContent value="studio" className="mt-4">
            <div className="flex gap-4 min-h-[600px]">
              <div key={`config-${refreshKey}`} className="w-[300px] shrink-0 overflow-y-auto max-h-[calc(100vh-260px)] pr-1 space-y-5">
                <VoiceConfig />
              </div>
              <div className="flex-1 min-w-0">
                <VoiceTester />
              </div>
              <div key={`phone-${refreshKey}`} className="w-[280px] shrink-0 overflow-y-auto max-h-[calc(100vh-260px)] space-y-4">
                <VoicePhonePanel />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <VoiceCallHistory />
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <VoiceAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
