import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIDGETS, type WidgetId } from "./widgets";

interface Props {
  id: WidgetId;
  collapsed: boolean;
  editMode: boolean;
  onToggleCollapse: () => void;
  onHide: () => void;
}

export function WidgetCard({ id, collapsed, editMode, onToggleCollapse, onHide }: Props) {
  const def = WIDGETS[id];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editMode });
  const Icon = def.icon;
  const Body = def.Component;

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl bg-background border border-border p-5",
        editMode && "border-dashed border-foreground/30"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          {editMode && (
            <button
              {...attributes}
              {...listeners}
              className="text-foreground-muted hover:text-foreground cursor-grab active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <Icon className="h-4 w-4 text-foreground-muted" />
          <h3 className="text-sm font-semibold truncate">{def.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggleCollapse} className="p-1 text-foreground-muted hover:text-foreground" aria-label={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          {editMode && (
            <button onClick={onHide} className="p-1 text-foreground-muted hover:text-foreground" aria-label="Hide widget">
              <EyeOff className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {!collapsed && <Body />}
    </div>
  );
}
