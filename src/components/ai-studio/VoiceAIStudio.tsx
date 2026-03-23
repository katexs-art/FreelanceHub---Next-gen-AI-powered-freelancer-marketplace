import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VoiceConfig } from "./VoiceConfig";
import { VoiceTester } from "./VoiceTester";
import { VoicePhonePanel } from "./VoicePhonePanel";
import { VoiceCallHistory } from "./VoiceCallHistory";
import { VoiceAnalytics } from "./VoiceAnalytics";

export function VoiceAIStudio() {
  const [subTab, setSubTab] = useState("studio");

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="bg-transparent h-auto p-0 gap-4 rounded-none">
          {[
            { value: "studio", label: "Studio" },
            { value: "history", label: "Call History" },
            { value: "analytics", label: "Analytics" },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value}
              className="bg-transparent rounded-none px-0 pb-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground text-foreground-secondary border-b-2 border-transparent text-[13px]">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="studio" className="mt-4">
          <div className="flex gap-4 min-h-[600px]">
            <div className="w-[300px] shrink-0 overflow-y-auto max-h-[calc(100vh-260px)] pr-1 space-y-5">
              <VoiceConfig />
            </div>
            <div className="flex-1 min-w-0">
              <VoiceTester />
            </div>
            <div className="w-[280px] shrink-0 overflow-y-auto max-h-[calc(100vh-260px)] space-y-4">
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
  );
}
