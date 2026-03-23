import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VoiceAIStudio } from "@/components/ai-studio/VoiceAIStudio";
import { ChatAIStudio } from "@/components/ai-studio/ChatAIStudio";
import { RiverStatusBar } from "@/components/ai-studio/RiverStatusBar";

export default function AIStudio() {
  const [activeTab, setActiveTab] = useState("voice");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-foreground tracking-[-0.02em]">AI Studio</h1>
        <p className="text-[13px] text-foreground-secondary mt-1">Build, test, and deploy your AI agents</p>
      </div>

      <RiverStatusBar />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent h-auto p-0 gap-6 border-b border-border rounded-none w-full justify-start">
          <TabsTrigger
            value="voice"
            className="bg-transparent rounded-none px-0 pb-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground text-foreground-secondary border-b-2 border-transparent"
          >
            Voice AI Agent
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="bg-transparent rounded-none px-0 pb-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground text-foreground-secondary border-b-2 border-transparent"
          >
            Chat AI Agent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voice" className="mt-6">
          <VoiceAIStudio />
        </TabsContent>
        <TabsContent value="chat" className="mt-6">
          <ChatAIStudio />
        </TabsContent>
      </Tabs>
    </div>
  );
}
