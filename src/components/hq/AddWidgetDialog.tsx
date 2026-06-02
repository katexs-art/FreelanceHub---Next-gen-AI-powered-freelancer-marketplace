import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { WIDGETS, type WidgetId } from "./widgets";
import type { LayoutItem } from "@/hooks/useDashboardLayout";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hidden: LayoutItem[];
  onAdd: (id: WidgetId) => void;
}

export function AddWidgetDialog({ open, onOpenChange, hidden, onAdd }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a widget</DialogTitle>
        </DialogHeader>
        {hidden.length === 0 ? (
          <p className="text-sm text-foreground-muted py-6 text-center">All available widgets are already on your dashboard.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {hidden.map((h) => {
              const def = WIDGETS[h.id];
              const Icon = def.icon;
              return (
                <button
                  key={h.id}
                  onClick={() => { onAdd(h.id); onOpenChange(false); }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary hover:bg-background-subtle text-left transition"
                >
                  <Icon className="h-5 w-5 text-foreground-muted" />
                  <span className="text-sm font-medium flex-1">{def.title}</span>
                  <Plus className="h-4 w-4 text-foreground-muted" />
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
