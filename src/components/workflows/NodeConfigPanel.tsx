import { X, MessageSquare, Mail, Phone, Clock, Globe, Zap } from "lucide-react";
import { isNodeConfigured } from "./WorkflowTypes";
import type { WorkflowNode } from "./WorkflowTypes";

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onUpdate: (id: string, updates: Partial<WorkflowNode>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose, onDelete }: NodeConfigPanelProps) {
  const updateConfig = (key: string, value: string) => {
    onUpdate(node.id, { config: { ...node.config, [key]: value } });
  };

  const isRiver = node.type === "river";

  return (
    <div className={`w-[300px] border-l flex flex-col h-full ${
      isRiver ? "border-[hsl(var(--accent-purple))]/30 bg-[hsl(var(--accent-purple))]/[0.03]" : "border-[hsl(var(--border))] bg-[hsl(var(--background-card))]"
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-2">
          {isRiver && <span className="w-2 h-2 rounded-full bg-[hsl(var(--accent-purple))]" />}
          <span className="text-[13px] font-semibold text-foreground">{node.label}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Label</label>
          <input
            value={node.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-[hsl(var(--ring))]"
          />
        </div>

        {/* SMS config */}
        {(node.blockType === "send_sms") && (
          <>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">To</label>
              <select className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none">
                <option>Contact phone number</option>
                <option>Custom number</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Message</label>
              <textarea
                value={node.config.message || ""}
                onChange={(e) => updateConfig("message", e.target.value)}
                placeholder="Type { to insert variables..."
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none resize-none h-24 focus:border-[hsl(var(--ring))]"
              />
              <div className="flex justify-between mt-1">
                <div className="flex flex-wrap gap-1">
                  {["{first_name}", "{last_name}", "{phone}"].map((v) => (
                    <button
                      key={v}
                      onClick={() => updateConfig("message", (node.config.message || "") + v)}
                      className="px-1.5 py-0.5 bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded text-[10px] text-foreground-secondary hover:text-foreground"
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-foreground-muted">{(node.config.message || "").length}/160</span>
              </div>
            </div>
            <div className="bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border))] rounded-lg p-3">
              <p className="text-[11px] text-foreground-secondary">Send via: <span className="text-foreground">Twilio</span></p>
              <p className="text-[10px] text-foreground-muted mt-1">Connect Twilio in Settings to send SMS</p>
            </div>
          </>
        )}

        {/* Email config */}
        {node.blockType === "send_email" && (
          <>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Subject</label>
              <input
                value={node.config.subject || ""}
                onChange={(e) => updateConfig("subject", e.target.value)}
                placeholder="Email subject..."
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-[hsl(var(--ring))]"
              />
            </div>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Body</label>
              <textarea
                value={node.config.body || ""}
                onChange={(e) => updateConfig("body", e.target.value)}
                placeholder="Email body..."
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none resize-none h-32 focus:border-[hsl(var(--ring))]"
              />
            </div>
          </>
        )}

        {/* Wait/Delay */}
        {node.blockType === "wait" && (
          <div>
            <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Duration</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={node.config.duration || "5"}
                onChange={(e) => updateConfig("duration", e.target.value)}
                className="w-20 bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none"
              />
              <select
                value={node.config.unit || "minutes"}
                onChange={(e) => updateConfig("unit", e.target.value)}
                className="flex-1 bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
        )}

        {/* Condition */}
        {node.type === "condition" && (
          <>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Condition</label>
              <select
                value={node.config.field || ""}
                onChange={(e) => updateConfig("field", e.target.value)}
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none"
              >
                <option value="">Select condition...</option>
                <option value="replied">Contact replied</option>
                <option value="call_answered">Call was answered</option>
                <option value="email_opened">Email was opened</option>
                <option value="deal_value">Deal value</option>
                <option value="has_tag">Has tag</option>
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={node.config.operator || "is"}
                onChange={(e) => updateConfig("operator", e.target.value)}
                className="flex-1 bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none"
              >
                <option value="is">is</option>
                <option value="is_not">is not</option>
                <option value="contains">contains</option>
                <option value="greater_than">greater than</option>
                <option value="less_than">less than</option>
              </select>
              <input
                value={node.config.value || ""}
                onChange={(e) => updateConfig("value", e.target.value)}
                placeholder="Value"
                className="flex-1 bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Yes path label</label>
              <input
                value={node.config.yesLabel || "Yes"}
                onChange={(e) => updateConfig("yesLabel", e.target.value)}
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">No path label</label>
              <input
                value={node.config.noLabel || "No"}
                onChange={(e) => updateConfig("noLabel", e.target.value)}
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none"
              />
            </div>
          </>
        )}

        {/* River call */}
        {node.blockType === "river_call" && (
          <>
            <div>
              <label className="text-[10px] text-[hsl(var(--accent-purple))] uppercase tracking-[0.08em] mb-1.5 block">River AI</label>
              <p className="text-[11px] text-foreground-secondary mb-3">River will handle this call autonomously using AI.</p>
            </div>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Call Script</label>
              <textarea
                value={node.config.script || ""}
                onChange={(e) => updateConfig("script", e.target.value)}
                placeholder="What should River say on the call?"
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--accent-purple))]/20 rounded-lg px-3 py-2 text-[12px] text-foreground outline-none resize-none h-24 focus:border-[hsl(var(--accent-purple))]/40"
              />
            </div>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Goal</label>
              <select
                value={node.config.goal || "qualify"}
                onChange={(e) => updateConfig("goal", e.target.value)}
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none"
              >
                <option value="qualify">Qualify lead</option>
                <option value="book">Book appointment</option>
                <option value="followup">Follow up</option>
                <option value="collect">Collect information</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Max Attempts</label>
              <input
                type="number"
                min="1"
                max="5"
                value={node.config.maxAttempts || "3"}
                onChange={(e) => updateConfig("maxAttempts", e.target.value)}
                className="w-20 bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none"
              />
            </div>
          </>
        )}

        {/* Webhook */}
        {node.blockType === "send_webhook" && (
          <>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">URL</label>
              <input
                value={node.config.url || ""}
                onChange={(e) => updateConfig("url", e.target.value)}
                placeholder="https://..."
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Method</label>
              <select
                value={node.config.method || "POST"}
                onChange={(e) => updateConfig("method", e.target.value)}
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Body (JSON)</label>
              <textarea
                value={node.config.body || "{}"}
                onChange={(e) => updateConfig("body", e.target.value)}
                className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none resize-none h-24 font-mono"
              />
            </div>
          </>
        )}

        {/* Generic actions */}
        {["create_contact", "update_contact", "move_deal", "add_tag", "notify_team", "book_appointment", "add_to_workflow"].includes(node.blockType) && (
          <div>
            <label className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] mb-1.5 block">Configuration</label>
            <textarea
              value={node.config.instruction || ""}
              onChange={(e) => updateConfig("instruction", e.target.value)}
              placeholder="Describe what this step should do..."
              className="w-full bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-lg px-3 py-2 text-[12px] text-foreground outline-none resize-none h-20"
            />
          </div>
        )}

        {/* Status indicator */}
        <div className="flex items-center gap-2 pt-2 border-t border-[hsl(var(--border))]">
          <span className={`w-2 h-2 rounded-full ${isNodeConfigured(node) ? "bg-[hsl(var(--accent-green))]" : "bg-amber-400"}`} />
          <span className="text-[11px] text-foreground-secondary">
            {isNodeConfigured(node) ? "Configured" : "Needs configuration"}
          </span>
        </div>
      </div>

      <div className="p-3 border-t border-[hsl(var(--border))]">
        <button
          onClick={() => onDelete(node.id)}
          className="w-full px-3 py-2 text-[12px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg hover:bg-destructive/10 transition-colors"
        >
          Delete block
        </button>
      </div>
    </div>
  );
}
