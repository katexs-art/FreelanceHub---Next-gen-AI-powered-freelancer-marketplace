import { useState, useRef, useCallback, useEffect } from "react";
import {
  UserPlus, PhoneMissed, FileText, TrendingUp, Clock, Globe, DollarSign, Tag, Play,
  MessageSquare, Mail, Phone, UserCheck, ArrowRightCircle, Bell, Calendar, GitBranch,
  MessageCircle, PhoneCall, MailOpen, Filter, Trash2, Copy, X, ZoomIn, ZoomOut, Maximize
} from "lucide-react";
import type { WorkflowNode, WorkflowConnection } from "./WorkflowTypes";

const ICON_MAP: Record<string, React.ReactNode> = {
  UserPlus: <UserPlus size={14} />, PhoneMissed: <PhoneMissed size={14} />, FileText: <FileText size={14} />,
  TrendingUp: <TrendingUp size={14} />, Clock: <Clock size={14} />, Globe: <Globe size={14} />,
  DollarSign: <DollarSign size={14} />, Tag: <Tag size={14} />, Play: <Play size={14} />,
  MessageSquare: <MessageSquare size={14} />, Mail: <Mail size={14} />, Phone: <Phone size={14} />,
  UserCheck: <UserCheck size={14} />, ArrowRightCircle: <ArrowRightCircle size={14} />,
  Bell: <Bell size={14} />, Calendar: <Calendar size={14} />, GitBranch: <GitBranch size={14} />,
  MessageCircle: <MessageCircle size={14} />, PhoneCall: <PhoneCall size={14} />, MailOpen: <MailOpen size={14} />,
  Filter: <Filter size={14} />,
};

import { TRIGGERS, ACTIONS, CONDITIONS } from "./WorkflowTypes";
const ALL_BLOCKS = [...TRIGGERS, ...ACTIONS, ...CONDITIONS];
function getBlockIcon(blockType: string) {
  const block = ALL_BLOCKS.find((b) => b.value === blockType);
  return block ? ICON_MAP[block.icon] || <Play size={14} /> : <Play size={14} />;
}

function getConfigSummary(node: WorkflowNode): string {
  if (node.config.message) return node.config.message.substring(0, 50) + (node.config.message.length > 50 ? "..." : "");
  if (node.config.subject) return node.config.subject;
  if (node.config.duration) return `${node.config.duration} ${node.config.unit || "minutes"}`;
  if (node.config.script) return node.config.script.substring(0, 40) + "...";
  if (node.config.url) return node.config.url.substring(0, 40);
  return "";
}

interface Props {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateNode: (id: string, updates: Partial<WorkflowNode>) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onAddConnection: (conn: Omit<WorkflowConnection, "id">) => void;
  onDeleteConnection: (id: string) => void;
}

export function WorkflowCanvas({
  nodes, connections, selectedNodeId, onSelectNode,
  onUpdateNode, onDeleteNode, onDuplicateNode,
  onAddConnection, onDeleteConnection,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [draggingNode, setDraggingNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [connecting, setConnecting] = useState<{ nodeId: string; port: "default" | "yes" | "no"; startX: number; startY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains("canvas-bg")) {
      if (e.button === 0) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        onSelectNode(null);
      }
    }
  }, [pan, onSelectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (draggingNode) {
      const coords = toCanvasCoords(e.clientX, e.clientY);
      onUpdateNode(draggingNode.id, {
        x: coords.x - draggingNode.offsetX,
        y: coords.y - draggingNode.offsetY,
      });
    }
  }, [isPanning, panStart, draggingNode, toCanvasCoords, onUpdateNode]);

  const handleMouseUp = useCallback(() => {
    if (connecting) {
      // Check if over a node's input port
      const coords = toCanvasCoords(mousePos.x, mousePos.y);
      const targetNode = nodes.find(
        (n) => n.id !== connecting.nodeId &&
        Math.abs(coords.x - (n.x + 100)) < 60 &&
        Math.abs(coords.y - n.y) < 25
      );
      if (targetNode) {
        onAddConnection({
          fromNodeId: connecting.nodeId,
          toNodeId: targetNode.id,
          fromPort: connecting.port,
        });
      }
      setConnecting(null);
    }
    setIsPanning(false);
    setDraggingNode(null);
  }, [connecting, mousePos, nodes, toCanvasCoords, onAddConnection]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(2, Math.max(0.3, z * delta)));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        onDeleteNode(selectedNodeId);
      }
      if (e.key === "d" && (e.metaKey || e.ctrlKey) && selectedNodeId) {
        e.preventDefault();
        onDuplicateNode(selectedNodeId);
      }
      if (e.key === "Escape") onSelectNode(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNodeId, onDeleteNode, onDuplicateNode, onSelectNode]);

  // Draw bezier connection path
  function getPath(fromNode: WorkflowNode, toNode: WorkflowNode, fromPort: string) {
    const fromX = fromNode.x + 100;
    let fromY = fromNode.y + 70;
    if (fromNode.type === "condition") {
      fromX; // same center
      if (fromPort === "yes") return getBezier(fromNode.x + 40, fromNode.y + 70, toNode.x + 100, toNode.y);
      if (fromPort === "no") return getBezier(fromNode.x + 160, fromNode.y + 70, toNode.x + 100, toNode.y);
    }
    return getBezier(fromX, fromY, toNode.x + 100, toNode.y);
  }

  function getBezier(x1: number, y1: number, x2: number, y2: number) {
    const cy = Math.abs(y2 - y1) * 0.5;
    return `M ${x1} ${y1} C ${x1} ${y1 + cy}, ${x2} ${y2 - cy}, ${x2} ${y2}`;
  }

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ background: "hsl(var(--background-secondary))" }}
    >
      {/* Dot grid */}
      <div
        className="canvas-bg absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* SVG connections */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
        width="4000" height="4000"
      >
        {connections.map((conn) => {
          const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
          const toNode = nodes.find((n) => n.id === conn.toNodeId);
          if (!fromNode || !toNode) return null;
          const pathColor = conn.fromPort === "yes" ? "rgba(74,222,128,0.5)" :
            conn.fromPort === "no" ? "rgba(240,149,149,0.5)" : "rgba(255,255,255,0.15)";
          return (
            <g key={conn.id}>
              <path
                d={getPath(fromNode, toNode, conn.fromPort)}
                fill="none" stroke={pathColor} strokeWidth={1.5}
                markerEnd="url(#arrowhead)"
              />
              {/* Delete button on midpoint */}
              <circle
                cx={(fromNode.x + 100 + toNode.x + 100) / 2}
                cy={(fromNode.y + 70 + toNode.y) / 2}
                r={8}
                fill="hsl(var(--background-card))"
                stroke={pathColor}
                strokeWidth={1}
                className="cursor-pointer pointer-events-auto opacity-0 hover:opacity-100"
                onClick={() => onDeleteConnection(conn.id)}
              />
              <text
                x={(fromNode.x + 100 + toNode.x + 100) / 2}
                y={(fromNode.y + 70 + toNode.y) / 2 + 3.5}
                textAnchor="middle"
                fill="rgba(255,255,255,0.5)"
                fontSize={9}
                className="cursor-pointer pointer-events-auto opacity-0 hover:opacity-100"
                onClick={() => onDeleteConnection(conn.id)}
              >×</text>
            </g>
          );
        })}
        {/* Connecting line preview */}
        {connecting && (
          <line
            x1={connecting.startX}
            y1={connecting.startY}
            x2={toCanvasCoords(mousePos.x, mousePos.y).x}
            y2={toCanvasCoords(mousePos.x, mousePos.y).y}
            stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} strokeDasharray="4"
          />
        )}
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.3)" />
          </marker>
        </defs>
      </svg>

      {/* Nodes */}
      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}>
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isTrigger = node.type === "trigger";
          const isCondition = node.type === "condition";
          const isRiver = node.type === "river";
          const summary = getConfigSummary(node);
          const hasConfig = Object.keys(node.config).length > 0;

          return (
            <div
              key={node.id}
              className={`absolute group cursor-pointer select-none`}
              style={{ left: node.x, top: node.y, width: 200 }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
                const coords = toCanvasCoords(e.clientX, e.clientY);
                setDraggingNode({ id: node.id, offsetX: coords.x - node.x, offsetY: coords.y - node.y });
              }}
            >
              <div className={`rounded-[10px] transition-all ${
                isSelected ? "border-[rgba(255,255,255,0.40)]" : ""
              } ${
                isRiver
                  ? "bg-[hsl(var(--accent-purple))]/[0.08] border border-[hsl(var(--accent-purple))]/20 border-t-[3px] border-t-[hsl(var(--accent-purple))]"
                  : isTrigger
                  ? "bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] border-t-[3px] border-t-[hsl(var(--accent-green))]"
                  : isCondition
                  ? "bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))] border-t-[3px] border-t-amber-400"
                  : "bg-[hsl(var(--background-card))] border border-[hsl(var(--border-subtle))]"
              } ${isSelected ? "shadow-lg" : ""}`}
              >
                {/* Node content */}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`flex-shrink-0 ${
                      isRiver ? "text-[hsl(var(--accent-purple))]" :
                      isTrigger ? "text-[hsl(var(--accent-green))]" :
                      isCondition ? "text-amber-400" :
                      "text-foreground-secondary"
                    }`}>
                      {getBlockIcon(node.blockType)}
                    </span>
                    <span className="text-[13px] font-semibold text-foreground truncate flex-1">{node.label}</span>
                  </div>
                  {summary && (
                    <p className="text-[11px] text-foreground-muted mt-1 truncate pl-6">{summary}</p>
                  )}
                  {/* Status dot */}
                  <div className="flex items-center justify-end mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasConfig ? "bg-[hsl(var(--accent-green))]" : "bg-amber-400"}`} />
                  </div>
                </div>

                {/* Hover actions */}
                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicateNode(node.id); }}
                    className="w-5 h-5 rounded bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] flex items-center justify-center text-foreground-secondary hover:text-foreground"
                  >
                    <Copy size={10} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }}
                    className="w-5 h-5 rounded bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] flex items-center justify-center text-foreground-secondary hover:text-red-400"
                  >
                    <X size={10} />
                  </button>
                </div>
              </div>

              {/* Output connection port(s) */}
              {isCondition ? (
                <>
                  <div className="absolute -bottom-1 left-[20%] -translate-x-1/2">
                    <div
                      className="w-3 h-3 rounded-full bg-[hsl(var(--accent-green))] border-2 border-[hsl(var(--background-secondary))] cursor-crosshair hover:scale-150 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setConnecting({ nodeId: node.id, port: "yes", startX: node.x + 40, startY: node.y + 70 });
                      }}
                    />
                    <span className="text-[8px] text-[hsl(var(--accent-green))] absolute -bottom-3 left-1/2 -translate-x-1/2">Y</span>
                  </div>
                  <div className="absolute -bottom-1 left-[80%] -translate-x-1/2">
                    <div
                      className="w-3 h-3 rounded-full bg-[#f09595] border-2 border-[hsl(var(--background-secondary))] cursor-crosshair hover:scale-150 transition-transform"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setConnecting({ nodeId: node.id, port: "no", startX: node.x + 160, startY: node.y + 70 });
                      }}
                    />
                    <span className="text-[8px] text-[#f09595] absolute -bottom-3 left-1/2 -translate-x-1/2">N</span>
                  </div>
                </>
              ) : (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                  <div
                    className="w-3 h-3 rounded-full bg-foreground/30 border-2 border-[hsl(var(--background-secondary))] cursor-crosshair hover:scale-150 hover:bg-foreground/60 transition-transform"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setConnecting({ nodeId: node.id, port: "default", startX: node.x + 100, startY: node.y + 70 });
                    }}
                  />
                </div>
              )}

              {/* Input port */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                <div className="w-3 h-3 rounded-full bg-foreground/20 border-2 border-[hsl(var(--background-secondary))]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-[hsl(var(--background-card))] border border-[hsl(var(--border))] rounded-lg p-1">
        <button onClick={() => setZoom((z) => Math.min(2, z * 1.2))} className="p-1.5 rounded hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
          <ZoomIn size={14} />
        </button>
        <span className="text-[10px] text-foreground-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))} className="p-1.5 rounded hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
          <ZoomOut size={14} />
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-1.5 rounded hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
          <Maximize size={14} />
        </button>
      </div>
    </div>
  );
}
