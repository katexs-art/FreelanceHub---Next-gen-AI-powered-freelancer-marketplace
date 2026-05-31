import { Check, Clock, Package, Upload, RotateCw, CircleDot } from "lucide-react";

interface Event {
  label: string;
  at: string | null | undefined;
  icon: any;
  done: boolean;
}

interface Props {
  order: {
    created_at: string;
    requirements_submitted_at: string | null;
    delivered_at: string | null;
    completed_at: string | null;
    status: string;
    revision_count: number;
  };
}

export function OrderTimeline({ order }: Props) {
  const events: Event[] = [
    { label: "Project placed", at: order.created_at, icon: CircleDot, done: true },
    { label: "Requirements submitted", at: order.requirements_submitted_at, icon: Package, done: !!order.requirements_submitted_at },
    { label: order.revision_count > 0 ? `Delivered (revisions: ${order.revision_count})` : "Delivered", at: order.delivered_at, icon: Upload, done: !!order.delivered_at },
    { label: "Completed", at: order.completed_at, icon: Check, done: !!order.completed_at },
  ];

  return (
    <div className="bg-background border border-border rounded-xl p-5">
      <h2 className="text-sm font-semibold mb-4">Timeline</h2>
      <ol className="space-y-3.5">
        {events.map((e, i) => {
          const Icon = e.icon;
          return (
            <li key={i} className="flex items-start gap-3">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${e.done ? "bg-success/10 text-success" : "bg-background-elevated text-foreground-subtle"}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${e.done ? "font-medium" : "text-foreground-muted"}`}>{e.label}</div>
                <div className="text-xs text-foreground-muted">
                  {e.at ? new Date(e.at).toLocaleString() : "—"}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function DeliveryCountdown({ deadline, status }: { deadline: string | null; status: string }) {
  if (!deadline || ["completed", "cancelled", "refunded"].includes(status)) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  const overdue = ms < 0;
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  return (
    <div className={`flex items-center gap-2 text-xs ${overdue ? "text-destructive" : "text-foreground-muted"}`}>
      <Clock className="h-3.5 w-3.5" />
      {overdue ? `Overdue by ${days}d ${hours}h` : `${days}d ${hours}h remaining`}
    </div>
  );
}
