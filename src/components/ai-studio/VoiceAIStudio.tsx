import { VoiceConfig } from "./VoiceConfig";
import { VoiceTester } from "./VoiceTester";
import { VoicePhonePanel } from "./VoicePhonePanel";

export function VoiceAIStudio() {
  return (
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
  );
}
