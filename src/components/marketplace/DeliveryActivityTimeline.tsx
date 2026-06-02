import { Upload, MessageSquare, Send, CheckCircle2, RotateCw, Package, CircleDot, FileText, Clock } from "lucide-react";

interface DeliveryActivityTimelineProps {
  order: {
    created_at: string;
    requirements_submitted_at: string | null;
    delivered_at: string | null;
    completed_at: string | null;
    status: string;
    revision_count: number;
  };
  deliveries: Array<{
    id: string;
    message: string | null;
    file_urls: string[];
    created_at: string;
    is_revision: boolean;
  }>;
  onFileClick?: (path: string) => void;
}

export function DeliveryActivityTimeline({ order, deliveries, onFileClick }: DeliveryActivityTimelineProps) {
  type Activity = {
    icon: React.ElementType;
    label: string;
    detail?: string;
    at: string;
    accent?: boolean;
    filePath?: string;
  };

  const activities: Activity[] = [];

  // Order placed
  activities.push({ icon: CircleDot, label: "Order placed", at: order.created_at });

  // Requirements submitted
  if (order.requirements_submitted_at) {
    activities.push({ icon: Package, label: "Requirements submitted", at: order.requirements_submitted_at });
  }

  // Deliveries (oldest first for chronological timeline)
  const sortedDeliveries = [...deliveries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  sortedDeliveries.forEach((d) => {
    // Delivery / Revision sent
    activities.push({
      icon: d.is_revision ? RotateCw : Send,
      label: d.is_revision ? "Revision sent" : "Delivery sent",
      at: d.created_at,
      accent: true,
    });

    // Files uploaded
    d.file_urls.forEach((url) => {
      activities.push({
        icon: FileText,
        label: "File uploaded",
        detail: url.split("/").pop() ?? url,
        at: d.created_at,
        filePath: url,
      });
    });

    // Delivery message
    if (d.message?.trim()) {
      activities.push({
        icon: MessageSquare,
        label: "Delivery message",
        detail: d.message,
        at: d.created_at,
      });
    }
  });

  // Revision requested events (we know count but not exact times — infer from deliveries)
  let revisionCount = 0;
  sortedDeliveries.forEach((d) => {
    if (d.is_revision) {
      revisionCount++;
      // Show revision request just before this revision delivery
      activities.push({
        icon: Clock,
        label: `Revision #${revisionCount} requested`,
        at: d.created_at,
        accent: true,
      });
    }
  });

  // Re-sort to put revision requests before their corresponding deliveries
  // We need to do a custom sort: for each revision delivery, its request goes right before it
  const finalActivities: Activity[] = [];
  const placed = activities.find((a) => a.label === "Order placed")!;
  const reqs = activities.find((a) => a.label === "Requirements submitted");
  if (reqs) finalActivities.push(reqs);

  sortedDeliveries.forEach((d) => {
    if (d.is_revision) {
      finalActivities.push({
        icon: Clock,
        label: `Revision requested`,
        at: d.created_at,
        accent: true,
      });
    }
    finalActivities.push({
      icon: d.is_revision ? RotateCw : Send,
      label: d.is_revision ? "Revision sent" : "Delivery sent",
      at: d.created_at,
      accent: true,
    });
    d.file_urls.forEach((url) => {
      finalActivities.push({
        icon: FileText,
        label: "File uploaded",
        detail: url.split("/").pop() ?? url,
        at: d.created_at,
        filePath: url,
      });
    });
    if (d.message?.trim()) {
      finalActivities.push({
        icon: MessageSquare,
        label: "Delivery message",
        detail: d.message,
        at: d.created_at,
      });
    }
  });

  // Order completed
  if (order.completed_at) {
    finalActivities.push({ icon: CheckCircle2, label: "Order completed", at: order.completed_at, accent: true });
  }

  // Auto-complete warning
  if (order.status === "delivered" && order.delivered_at && !order.completed_at) {
    const autoCompleteMs = new Date(order.delivered_at).getTime() + 3 * 86400000;
    const remainingMs = autoCompleteMs - Date.now();
    if (remainingMs > 0) {
      const days = Math.ceil(remainingMs / 86400000);
      finalActivities.push({
        icon: Clock,
        label: `Auto-completes in ${days} day${days === 1 ? "" : "s"}`,
        at: new Date(autoCompleteMs).toISOString(),
      });
    }
  }

  if (finalActivities.length === 0) {
    return (
      <div className="text-sm text-foreground-muted py-2">No delivery activity yet.</div>
    );
  }

  return (
    <div className="space-y-0">
      {finalActivities.map((a, i) => {
        const Icon = a.icon;
        const isLast = i === finalActivities.length - 1;
        return (
          <div key={i} className="flex gap-3 group">
            <div className="flex flex-col items-center">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                  a.accent
                    ? "bg-primary/10 text-primary"
                    : "bg-background-elevated text-foreground-subtle"
                }`}
              >
                <Icon className="h-2.5 w-2.5" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className={`text-sm ${a.accent ? "font-medium" : "text-foreground-muted"}`}>
                {a.filePath && onFileClick ? (
                  <button
                    onClick={() => onFileClick(a.filePath!)}
                    className="text-primary hover:underline text-left"
                  >
                    {a.label}: {a.detail}
                  </button>
                ) : (
                  a.label
                )}
              </div>
              {!a.filePath && a.detail && (
                <div className="text-sm text-foreground-muted mt-0.5 line-clamp-2 whitespace-pre-line">
                  {a.detail}
                </div>
              )}
              <div className="text-xs text-foreground-muted mt-0.5">
                {new Date(a.at).toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
