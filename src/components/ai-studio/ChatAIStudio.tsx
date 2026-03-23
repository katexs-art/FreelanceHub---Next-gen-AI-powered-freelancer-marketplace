import { ChatConfig } from "./ChatConfig";
import { ChatTester } from "./ChatTester";
import { ChatEmbedPanel } from "./ChatEmbedPanel";

export function ChatAIStudio() {
  return (
    <div className="flex gap-4 min-h-[600px]">
      <div className="w-[300px] shrink-0 overflow-y-auto max-h-[calc(100vh-260px)] pr-1 space-y-5">
        <ChatConfig />
      </div>
      <div className="flex-1 min-w-0">
        <ChatTester />
      </div>
      <div className="w-[280px] shrink-0 overflow-y-auto max-h-[calc(100vh-260px)] space-y-4">
        <ChatEmbedPanel />
      </div>
    </div>
  );
}
