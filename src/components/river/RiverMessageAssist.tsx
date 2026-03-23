import { useState } from "react";
import { Sparkles, Check, X } from "lucide-react";
import { riverCraftMessage, type RiverContext } from "@/services/river";
import { RiverThinking } from "./RiverThinking";

interface Props {
  context: RiverContext;
  onInsert: (text: string) => void;
}

export function RiverMessageAssist({ context, onInsert }: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [show, setShow] = useState(false);

  const generate = async () => {
    setLoading(true);
    setShow(true);
    try {
      const msg = await riverCraftMessage(context);
      setSuggestion(msg);
    } catch {
      setSuggestion("Unable to generate suggestion right now.");
    }
    setLoading(false);
  };

  return (
    <div className="relative">
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors hover:bg-accent-purple/10"
        style={{ color: "#AFA9EC" }}
      >
        <Sparkles className="w-3 h-3" />
        Ask River
      </button>

      {show && (
        <div
          className="absolute bottom-full mb-2 left-0 w-80 rounded-lg p-3 z-10"
          style={{
            background: "#0f0f12",
            border: "1px solid rgba(127,119,221,0.3)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
            <span className="text-[11px] font-semibold" style={{ color: "#AFA9EC" }}>River suggestion</span>
          </div>
          {loading ? (
            <RiverThinking text="Crafting reply..." />
          ) : (
            <>
              <p className="text-[12px] text-foreground-secondary leading-relaxed mb-3">{suggestion}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { onInsert(suggestion); setShow(false); setSuggestion(""); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-foreground text-background text-[11px] font-medium"
                >
                  <Check className="w-3 h-3" /> Use this
                </button>
                <button
                  onClick={() => { setShow(false); setSuggestion(""); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-foreground-secondary text-[11px]"
                >
                  <X className="w-3 h-3" /> Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
