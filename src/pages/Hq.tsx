import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { WidgetCard } from "@/components/hq/WidgetCard";
import { AddWidgetDialog } from "@/components/hq/AddWidgetDialog";
import { Button } from "@/components/ui/button";
import { Settings2, Check, Plus } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import type { WidgetId } from "@/components/hq/widgets";
import { TopPicksRail } from "@/components/hq/TopPicksRail";
import { ExpertsYouMightNeed } from "@/components/hq/ExpertsYouMightNeed";
import { ProjectRecsRow } from "@/components/hq/ProjectRecsRow";

export default function Hq() {
  const { profile } = useAuth();
  const { visible, hidden, reorder, toggleVisible, toggleCollapse, addWidget } = useDashboardLayout();
  const [editMode, setEditMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = visible.map((l) => l.id);
    const oldIdx = ids.indexOf(active.id as WidgetId);
    const newIdx = ids.indexOf(over.id as WidgetId);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(ids, oldIdx, newIdx);
    reorder([...next, ...hidden.map((h) => h.id)]);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">
                  Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
                </h1>
                <p className="text-foreground-muted mt-1">
                  Your headquarters — customize widgets to suit your workflow.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editMode && (
                  <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Add widget
                  </Button>
                )}
                <Button size="sm" variant={editMode ? "green" : "outline"} onClick={() => setEditMode((v) => !v)}>
                  {editMode ? <><Check className="h-3.5 w-3.5" /> Done</> : <><Settings2 className="h-3.5 w-3.5" /> Customize dashboard</>}
                </Button>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <p className="text-foreground-muted mb-4">Your dashboard is empty.</p>
                <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add a widget</Button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={visible.map((l) => l.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {visible.map((l) => (
                      <WidgetCard
                        key={l.id}
                        id={l.id}
                        collapsed={l.collapsed}
                        editMode={editMode}
                        onToggleCollapse={() => toggleCollapse(l.id)}
                        onHide={() => toggleVisible(l.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <TopPicksRail />
        </div>

        <ExpertsYouMightNeed />
        <ProjectRecsRow />

        <AddWidgetDialog open={addOpen} onOpenChange={setAddOpen} hidden={hidden} onAdd={addWidget} />
      </div>
    </AppShell>
  );
}
