import {
  ShoppingBag, MessageSquare, Wallet, Package,
  BarChart3, Briefcase, Sparkles, Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { ActiveOrdersWidget } from "./ActiveOrdersWidget";
import { MessagesWidget } from "./MessagesWidget";
import { EarningsWidget } from "./EarningsWidget";
import { MyGigsWidget } from "./MyGigsWidget";
import { AnalyticsWidget } from "./AnalyticsWidget";
import { OpenProjectsWidget } from "./OpenProjectsWidget";
import { RiverAiWidget } from "./RiverAiWidget";
import { NotificationsWidget } from "./NotificationsWidget";

export type WidgetId =
  | "active_orders" | "messages" | "earnings" | "my_gigs"
  | "analytics" | "open_projects" | "river_ai" | "notifications";

export type Role = "client" | "seller" | "admin";

export interface WidgetDef {
  id: WidgetId;
  title: string;
  icon: LucideIcon;
  roles: Role[];
  Component: ComponentType;
}

export const WIDGETS: Record<WidgetId, WidgetDef> = {
  active_orders: { id: "active_orders", title: "Active Orders", icon: ShoppingBag, roles: ["client","seller","admin"], Component: ActiveOrdersWidget },
  messages:      { id: "messages",      title: "Messages",      icon: MessageSquare, roles: ["client","seller","admin"], Component: MessagesWidget },
  earnings:      { id: "earnings",      title: "Earnings Overview", icon: Wallet,    roles: ["seller","admin"],         Component: EarningsWidget },
  my_gigs:       { id: "my_gigs",       title: "My Gigs",       icon: Package,       roles: ["seller","admin"],         Component: MyGigsWidget },
  analytics:     { id: "analytics",     title: "Analytics",     icon: BarChart3,     roles: ["seller","admin"],         Component: AnalyticsWidget },
  open_projects: { id: "open_projects", title: "Open Projects", icon: Briefcase,     roles: ["client","seller","admin"], Component: OpenProjectsWidget },
  river_ai:      { id: "river_ai",      title: "River AI",      icon: Sparkles,      roles: ["client","seller","admin"], Component: RiverAiWidget },
  notifications: { id: "notifications", title: "Notifications", icon: Bell,          roles: ["client","seller","admin"], Component: NotificationsWidget },
};

export function defaultLayoutForRole(role: Role): WidgetId[] {
  if (role === "seller" || role === "admin") {
    return ["active_orders", "messages", "earnings", "my_gigs"];
  }
  return ["active_orders", "messages", "open_projects", "notifications"];
}
