import { useState, useCallback } from "react";
import { ArrowLeft, Save, Zap, PlayCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { BlockLibrary } from "./BlockLibrary";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { isNodeConfigured } from "./WorkflowTypes";
import type { WorkflowNode, WorkflowConnection, WorkflowData } from "./WorkflowTypes";
import { useRiverChat } from "@/hooks/useRiverChat";

interface Props {
  workflow: WorkflowData | null;
  onSave: (data: WorkflowData) => void;
  onClose: () => void;
}

export function WorkflowBuilder({ workflow, onSave, onClose }: Props) {
  const [name, setName] = useState(workflow?.name || "Untitled workflow");
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.nodes || []);
  const [connections, setConnections] = useState<WorkflowConnection[]>(workflow?.connections || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const addNode = useCallback((type: "trigger" | "action" | "condition" | "river", blockType: string, label: string) => {
    // Place new node near center or below last node
    const lastNode = nodes[nodes.length - 1];
    const x = lastNode ? lastNode.x : 300;
    const y = lastNode ? lastNode.y + 140 : 60;

    const newNode: WorkflowNode = {
      id: crypto.randomUUID(),
      type,
      blockType,
      label,
      config: blockType === "wait" ? { duration: "5", unit: "minutes" } : {},
      x,
      y,
    };
    setNodes((prev) => [...prev, newNode]);

    // Auto-connect to last node if exists
    if (lastNode) {
      setConnections((prev) => [
        ...prev,
        { id: crypto.randomUUID(), fromNodeId: lastNode.id, toNodeId: newNode.id, fromPort: "default" },
      ]);
    }

    setSelectedNodeId(newNode.id);
  }, [nodes]);

  const updateNode = useCallback((id: string, updates: Partial<WorkflowNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) => prev.filter((c) => c.fromNodeId !== id && c.toNodeId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [selectedNodeId]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const newNode: WorkflowNode = {
      ...node,
      id: crypto.randomUUID(),
      x: node.x + 40,
      y: node.y + 40,
      label: node.label + " (copy)",
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  }, [nodes]);

  const addConnection = useCallback((conn: Omit<WorkflowConnection, "id">) => {
    // Prevent self-connections and duplicates
    if (conn.fromNodeId === conn.toNodeId) return;
    const exists = connections.some(
      (c) => c.fromNodeId === conn.fromNodeId && c.toNodeId === conn.toNodeId && c.fromPort === conn.fromPort
    );
    if (exists) return;
    setConnections((prev) => [...prev, { ...conn, id: crypto.randomUUID() }]);
  }, [connections]);

  const deleteConnection = useCallback((id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleSave = () => {
    onSave({
      id: workflow?.id,
      name,
      trigger: nodes.find((n) => n.type === "trigger")?.blockType || null,
      nodes,
      connections,
      active: workflow?.active ?? false,
      runs_count: workflow?.runs_count ?? 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--background-card))] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-foreground-secondary">
            <ArrowLeft size={16} />
          </button>
          <div className="w-px h-5 bg-[hsl(var(--border))]" />
          <Zap size={14} className="text-[hsl(var(--accent-green))]" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-[14px] font-semibold text-foreground outline-none w-[240px] placeholder:text-foreground-muted"
            placeholder="Workflow name..."
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (nodes.length === 0) {
                toast.error("Add at least one block to test");
                return;
              }
              const triggerNode = nodes.find((n) => n.type === "trigger");
              if (!triggerNode) {
                toast.error("Add a trigger block to test this workflow");
                return;
              }
              const unconfigured = nodes.filter((n) => !isNodeConfigured(n));
              if (unconfigured.length > 0) {
                toast.warning(`${unconfigured.length} block(s) need configuration before testing`);
                return;
              }
              toast.success(`Test run started — ${nodes.length} steps will execute in sequence`);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-foreground border border-[hsl(var(--border-subtle))] rounded-md hover:border-[hsl(var(--border-strong))] transition-colors"
          >
            <PlayCircle size={13} /> Test
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-foreground border border-[hsl(var(--border-subtle))] rounded-md hover:border-[hsl(var(--border-strong))] transition-colors"
          >
            <Save size={13} /> Save
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[hsl(var(--accent-green))] text-black text-[12px] font-medium rounded-md hover:opacity-90 transition-opacity"
          >
            <Upload size={13} /> Publish
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <BlockLibrary onAddNode={addNode} />
        <WorkflowCanvas
          nodes={nodes}
          connections={connections}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onUpdateNode={updateNode}
          onDeleteNode={deleteNode}
          onDuplicateNode={duplicateNode}
          onAddConnection={addConnection}
          onDeleteConnection={deleteConnection}
        />
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={updateNode}
            onClose={() => setSelectedNodeId(null)}
            onDelete={deleteNode}
          />
        )}
      </div>
    </div>
  );
}
