export interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "condition" | "river";
  blockType: string;
  label: string;
  config: Record<string, string>;
  x: number;
  y: number;
}

export interface WorkflowConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort: "default" | "yes" | "no";
}

export interface WorkflowData {
  id?: string;
  name: string;
  trigger: string | null;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  active: boolean;
  runs_count: number;
  created_at?: string;
  user_id?: string;
}

export function isNodeConfigured(node: WorkflowNode): boolean {
  if (node.type === "trigger") return true;
  switch (node.blockType) {
    case "send_sms": return !!node.config.message;
    case "send_email": return !!node.config.subject;
    case "wait": return !!node.config.duration;
    case "send_webhook": return !!node.config.url;
    case "river_call": return !!node.config.script;
    default:
      if (node.type === "condition") return !!node.config.field;
      return Object.keys(node.config).length > 0;
  }
}

export interface WorkflowRow {
  id: string;
  name: string;
  trigger: string | null;
  steps: any;
  active: boolean;
  runs_count: number;
  created_at: string;
  user_id: string;
}

// Block definitions
export const TRIGGERS = [
  { value: "new_lead", label: "New lead received", icon: "UserPlus", desc: "Any source" },
  { value: "missed_call", label: "Missed call", icon: "PhoneMissed", desc: "Inbound call missed" },
  { value: "form_submitted", label: "Form submitted", icon: "FileText", desc: "Web form" },
  { value: "deal_stage_changed", label: "Deal stage changed", icon: "TrendingUp", desc: "Pipeline move" },
  { value: "time_delay", label: "Time / Schedule", icon: "Clock", desc: "Cron or delay" },
  { value: "webhook_received", label: "Webhook received", icon: "Globe", desc: "External POST" },
  { value: "payment_received", label: "Payment received", icon: "DollarSign", desc: "Stripe / manual" },
  { value: "tag_added", label: "Tag added to contact", icon: "Tag", desc: "Any tag" },
  { value: "manual", label: "Manual trigger", icon: "Play", desc: "Run manually" },
];

export const ACTIONS = [
  { value: "send_sms", label: "Send SMS", icon: "MessageSquare", desc: "Via Twilio" },
  { value: "send_email", label: "Send email", icon: "Mail", desc: "Via SendGrid" },
  { value: "river_call", label: "River makes a call", icon: "Phone", desc: "Via Vapi", isRiver: true },
  { value: "create_contact", label: "Create contact", icon: "UserPlus", desc: "New CRM record" },
  { value: "update_contact", label: "Update contact status", icon: "UserCheck", desc: "Change status" },
  { value: "move_deal", label: "Move deal stage", icon: "ArrowRightCircle", desc: "Pipeline" },
  { value: "add_tag", label: "Add tag", icon: "Tag", desc: "To contact" },
  { value: "wait", label: "Wait / Delay", icon: "Clock", desc: "Pause execution" },
  { value: "send_webhook", label: "Send webhook", icon: "Globe", desc: "To any URL" },
  { value: "notify_team", label: "Notify team", icon: "Bell", desc: "Slack / internal" },
  { value: "book_appointment", label: "Book appointment", icon: "Calendar", desc: "Calendar" },
  { value: "add_to_workflow", label: "Add to workflow", icon: "GitBranch", desc: "Chain workflows" },
];

export const CONDITIONS = [
  { value: "contact_replied", label: "If contact replied", icon: "MessageCircle", desc: "Any channel" },
  { value: "call_answered", label: "If call was answered", icon: "PhoneCall", desc: "Voice" },
  { value: "email_opened", label: "If email was opened", icon: "MailOpen", desc: "Tracking" },
  { value: "deal_value_over", label: "If deal value over $X", icon: "DollarSign", desc: "Numeric" },
  { value: "has_tag", label: "If contact has tag", icon: "Tag", desc: "Tag check" },
  { value: "time_between", label: "If time is between", icon: "Clock", desc: "Business hours" },
  { value: "source_is", label: "If source is", icon: "Filter", desc: "Lead source" },
];

export const TEMPLATES = [
  {
    name: "Missed call text-back",
    trigger: "missed_call",
    desc: "Send an SMS when a call is missed. River responds within 60 seconds.",
    nodes: [
      { id: "t1", type: "trigger" as const, blockType: "missed_call", label: "Missed call", config: {}, x: 300, y: 60 },
      { id: "a1", type: "action" as const, blockType: "send_sms", label: "Send callback SMS", config: { message: "Hey {first_name}, sorry we missed your call! How can we help?" }, x: 300, y: 200 },
      { id: "a2", type: "action" as const, blockType: "wait", label: "Wait 5 minutes", config: { duration: "5", unit: "minutes" }, x: 300, y: 340 },
      { id: "a3", type: "action" as const, blockType: "send_sms", label: "Follow-up SMS", config: { message: "Just following up — would you like to book a time?" }, x: 300, y: 480 },
    ],
    connections: [
      { id: "c1", fromNodeId: "t1", toNodeId: "a1", fromPort: "default" as const },
      { id: "c2", fromNodeId: "a1", toNodeId: "a2", fromPort: "default" as const },
      { id: "c3", fromNodeId: "a2", toNodeId: "a3", fromPort: "default" as const },
    ],
  },
  {
    name: "New lead speed dial",
    trigger: "new_lead",
    desc: "River calls new leads in under 60 seconds to qualify and book.",
    nodes: [
      { id: "t1", type: "trigger" as const, blockType: "new_lead", label: "New lead received", config: {}, x: 300, y: 60 },
      { id: "a1", type: "river" as const, blockType: "river_call", label: "River makes a call", config: { goal: "qualify", script: "Introduce yourself and qualify the lead." }, x: 300, y: 200 },
      { id: "c1", type: "condition" as const, blockType: "call_answered", label: "Call answered?", config: {}, x: 300, y: 340 },
      { id: "a2", type: "action" as const, blockType: "move_deal", label: "Move to Hot", config: { stage: "hot" }, x: 150, y: 480 },
      { id: "a3", type: "action" as const, blockType: "send_sms", label: "Voicemail SMS", config: { message: "Hey {first_name}, we tried calling. Book a time: {booking_link}" }, x: 450, y: 480 },
    ],
    connections: [
      { id: "c1", fromNodeId: "t1", toNodeId: "a1", fromPort: "default" as const },
      { id: "c2", fromNodeId: "a1", toNodeId: "c1", fromPort: "default" as const },
      { id: "c3", fromNodeId: "c1", toNodeId: "a2", fromPort: "yes" as const },
      { id: "c4", fromNodeId: "c1", toNodeId: "a3", fromPort: "no" as const },
    ],
  },
  {
    name: "Appointment reminder",
    trigger: "time_delay",
    desc: "Automatic SMS reminder 24 hours before appointment.",
    nodes: [
      { id: "t1", type: "trigger" as const, blockType: "time_delay", label: "24hrs before appointment", config: {}, x: 300, y: 60 },
      { id: "a1", type: "action" as const, blockType: "send_sms", label: "Reminder SMS", config: { message: "Reminder: Your appointment is tomorrow! Reply CONFIRM to confirm." }, x: 300, y: 200 },
    ],
    connections: [
      { id: "c1", fromNodeId: "t1", toNodeId: "a1", fromPort: "default" as const },
    ],
  },
  {
    name: "Job complete review request",
    trigger: "deal_stage_changed",
    desc: "Send review request SMS after completing a job.",
    nodes: [
      { id: "t1", type: "trigger" as const, blockType: "deal_stage_changed", label: "Deal won", config: { stage: "won" }, x: 300, y: 60 },
      { id: "a1", type: "action" as const, blockType: "wait", label: "Wait 1 day", config: { duration: "1", unit: "days" }, x: 300, y: 200 },
      { id: "a2", type: "action" as const, blockType: "send_sms", label: "Review request", config: { message: "Thanks for choosing us! Would you mind leaving a quick review? {review_link}" }, x: 300, y: 340 },
    ],
    connections: [
      { id: "c1", fromNodeId: "t1", toNodeId: "a1", fromPort: "default" as const },
      { id: "c2", fromNodeId: "a1", toNodeId: "a2", fromPort: "default" as const },
    ],
  },
  {
    name: "Cold lead re-engagement",
    trigger: "time_delay",
    desc: "Multi-touch follow-up sequence to win back cold leads.",
    nodes: [
      { id: "t1", type: "trigger" as const, blockType: "time_delay", label: "Schedule trigger", config: {}, x: 300, y: 60 },
      { id: "a1", type: "action" as const, blockType: "send_sms", label: "Re-engagement SMS", config: { message: "Hey {first_name}, we haven't heard from you. Still interested?" }, x: 300, y: 200 },
      { id: "a2", type: "action" as const, blockType: "wait", label: "Wait 3 days", config: { duration: "3", unit: "days" }, x: 300, y: 340 },
      { id: "a3", type: "action" as const, blockType: "send_email", label: "Offer email", config: { subject: "We'd love to help", body: "Special offer inside..." }, x: 300, y: 480 },
    ],
    connections: [
      { id: "c1", fromNodeId: "t1", toNodeId: "a1", fromPort: "default" as const },
      { id: "c2", fromNodeId: "a1", toNodeId: "a2", fromPort: "default" as const },
      { id: "c3", fromNodeId: "a2", toNodeId: "a3", fromPort: "default" as const },
    ],
  },
  {
    name: "Facebook lead instant response",
    trigger: "new_lead",
    desc: "River SMS + call immediately when Facebook lead comes in.",
    nodes: [
      { id: "t1", type: "trigger" as const, blockType: "new_lead", label: "New Facebook lead", config: { source: "facebook" }, x: 300, y: 60 },
      { id: "a1", type: "action" as const, blockType: "send_sms", label: "Instant SMS", config: { message: "Hey {first_name}, thanks for reaching out! We'll call you shortly." }, x: 300, y: 200 },
      { id: "a2", type: "river" as const, blockType: "river_call", label: "River calls lead", config: { goal: "book", script: "Follow up on their Facebook inquiry." }, x: 300, y: 340 },
    ],
    connections: [
      { id: "c1", fromNodeId: "t1", toNodeId: "a1", fromPort: "default" as const },
      { id: "c2", fromNodeId: "a1", toNodeId: "a2", fromPort: "default" as const },
    ],
  },
];
