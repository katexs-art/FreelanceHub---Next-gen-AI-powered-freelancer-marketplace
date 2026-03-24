import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, Save, Zap, PlayCircle, Upload, Search, User } from "lucide-react";
import { toast } from "sonner";
import { BlockLibrary } from "./BlockLibrary";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { isNodeConfigured } from "./WorkflowTypes";
import type { WorkflowNode, WorkflowConnection, WorkflowData } from "./WorkflowTypes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal";

interface Props {
  workflow: WorkflowData | null;
  onSave: (data: WorkflowData) => void;
  onClose: () => void;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

export function WorkflowBuilder({ workflow, onSave, onClose }: Props) {
  const [name, setName] = useState(workflow?.name || "Untitled workflow");
  const [nodes, setNodes] = useState<WorkflowNode[]>(workflow?.nodes || []);
  const [connections, setConnections] = useState<WorkflowConnection[]>(workflow?.connections || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const { user } = useAuth();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // Fetch contacts when test modal opens
  useEffect(() => {
    if (!showTestModal || !user) return;
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setContacts(data);
      });
  }, [showTestModal, user]);

  const filteredContacts = contacts.filter((c) => {
    const q = contactSearch.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      (c.last_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    );
  });

  const runTest = async (contactId: string) => {
    if (!workflow?.id || !user) {
      toast.error("Save the workflow first before testing");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("workflow-engine", {
        body: {
          action: "execute_workflow",
          workflow_id: workflow.id,
          contact_id: contactId,
          user_id: user.id,
        },
      });

      if (error) throw error;

      setTestResult(data);
      if (data?.success) {
        toast.success(`Workflow completed — ${data.steps_completed || 0} steps executed`);
      } else {
        toast.error(data?.error || "Workflow execution failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to run workflow");
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const addNode = useCallback((type: "trigger" | "action" | "condition" | "river", blockType: string, label: string) => {
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

  const handleTestClick = () => {
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
    if (!workflow?.id) {
      toast.error("Save the workflow first, then test");
      return;
    }
    setTestResult(null);
    setShowTestModal(true);
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
            onClick={handleTestClick}
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

      {/* Test Contact Picker Modal */}
      <Modal open={showTestModal} onOpenChange={setShowTestModal}>
        <ModalContent className="max-w-md">
          <ModalTitle className="text-[15px] font-semibold text-foreground">
            Test Workflow
          </ModalTitle>
          <ModalDescription className="text-[13px] text-foreground-secondary">
            Select a contact to run this workflow against.
          </ModalDescription>

          {testResult ? (
            <div className="mt-4 space-y-3">
              <div className={`p-3 rounded-md border text-[13px] ${testResult.success ? 'border-[hsl(var(--accent-green))]/30 bg-[hsl(var(--accent-green))]/5' : 'border-destructive/30 bg-destructive/5'}`}>
                <p className="font-medium mb-1">
                  {testResult.success ? `✓ ${testResult.status === 'waiting' ? 'Paused (waiting)' : 'Completed'}` : '✗ Failed'}
                </p>
                {testResult.steps_completed !== undefined && (
                  <p className="text-foreground-secondary">{testResult.steps_completed} step(s) executed</p>
                )}
                {testResult.error && <p className="text-destructive mt-1">{testResult.error}</p>}
              </div>
              {testResult.step_results?.map((sr: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[12px] px-2 py-1.5 rounded bg-[hsl(var(--background-elevated))]">
                  <span className={`w-1.5 h-1.5 rounded-full ${sr.result?.success !== false ? 'bg-[hsl(var(--accent-green))]' : 'bg-destructive'}`} />
                  <span className="text-foreground-secondary">{sr.step_label || sr.step_type}</span>
                  {sr.result?.error && <span className="text-destructive ml-auto truncate max-w-[180px]">{sr.result.error}</span>}
                </div>
              ))}
              <button
                onClick={() => setTestResult(null)}
                className="w-full py-2 text-[12px] text-foreground-secondary hover:text-foreground border border-[hsl(var(--border-subtle))] rounded-md"
              >
                Run again
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-foreground-muted" />
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-8 pr-3 py-2 text-[13px] bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border-subtle))] rounded-md text-foreground outline-none placeholder:text-foreground-muted"
                />
              </div>
              <div className="max-h-[240px] overflow-y-auto space-y-1">
                {filteredContacts.length === 0 && (
                  <p className="text-[12px] text-foreground-muted text-center py-4">
                    {contacts.length === 0 ? "No contacts found. Add contacts first." : "No matches."}
                  </p>
                )}
                {filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => runTest(c.id)}
                    disabled={testing}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-[hsl(var(--background-elevated))] text-left transition-colors disabled:opacity-50"
                  >
                    <div className="w-7 h-7 rounded-full bg-[hsl(var(--accent-green))]/10 flex items-center justify-center">
                      <User size={13} className="text-[hsl(var(--accent-green))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {c.first_name} {c.last_name || ""}
                      </p>
                      <p className="text-[11px] text-foreground-muted truncate">
                        {c.email || c.phone || "No contact info"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              {testing && (
                <div className="flex items-center justify-center gap-2 py-3 text-[12px] text-foreground-secondary">
                  <div className="w-3 h-3 border-2 border-[hsl(var(--accent-green))] border-t-transparent rounded-full animate-spin" />
                  Running workflow...
                </div>
              )}
            </div>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
