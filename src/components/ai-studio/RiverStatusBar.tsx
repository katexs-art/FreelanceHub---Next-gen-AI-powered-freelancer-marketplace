import { useIntegrations } from "@/hooks/useIntegrations";
import { useNavigate } from "react-router-dom";

export function RiverStatusBar() {
  const { isConnected } = useIntegrations();
  const navigate = useNavigate();

  const integrations = [
    { name: "Vapi", key: "vapi", alwaysOn: true },
    { name: "Twilio", key: "twilio" },
    { name: "Anthropic", key: "anthropic", alwaysOn: true },
  ];

  return (
    <div className="w-full rounded-[10px] px-4 py-3 flex items-center justify-between"
      style={{ background: "hsla(245,52%,67%,0.06)", border: "1px solid hsla(245,52%,67%,0.20)" }}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent-purple" />
        <span className="text-[13px] text-accent-purple">River AI is powering your agents</span>
      </div>
      <div className="flex items-center gap-2">
        {integrations.map((int) => {
          const connected = int.alwaysOn || isConnected(int.key);
          return (
            <button
              key={int.key}
              onClick={() => !connected && navigate("/integrations")}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${
                connected
                  ? "text-accent-green border-accent-green/30 bg-accent-green/10"
                  : "text-destructive border-destructive/30 bg-destructive/10 cursor-pointer hover:bg-destructive/20"
              }`}
            >
              {int.name} {connected ? "✓" : "✗"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
