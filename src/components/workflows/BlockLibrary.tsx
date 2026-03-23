import {
  UserPlus, PhoneMissed, FileText, TrendingUp, Clock, Globe, DollarSign, Tag, Play,
  MessageSquare, Mail, Phone, UserCheck, ArrowRightCircle, Bell, Calendar, GitBranch,
  MessageCircle, PhoneCall, MailOpen, Filter, Search, ChevronDown, ChevronRight
} from "lucide-react";
import { useState } from "react";
import { TRIGGERS, ACTIONS, CONDITIONS } from "./WorkflowTypes";

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

interface BlockLibraryProps {
  onAddNode: (type: "trigger" | "action" | "condition" | "river", blockType: string, label: string) => void;
}

function Section({ title, color, items, onAdd, nodeType }: {
  title: string;
  color: string;
  items: { value: string; label: string; icon: string; desc: string; isRiver?: boolean }[];
  onAdd: (type: "trigger" | "action" | "condition" | "river", blockType: string, label: string) => void;
  nodeType: "trigger" | "action" | "condition";
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 w-full mb-2">
        {open ? <ChevronDown size={12} className="text-foreground-secondary" /> : <ChevronRight size={12} className="text-foreground-secondary" />}
        <span className="text-[10px] text-foreground-secondary uppercase tracking-[0.08em] font-medium">{title}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <button
              key={item.value}
              onClick={() => onAdd(item.isRiver ? "river" : nodeType, item.value, item.label)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[hsl(var(--background-elevated))] transition-colors text-left group"
            >
              <span className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
                item.isRiver ? "bg-[hsl(var(--accent-purple))]/10 text-[hsl(var(--accent-purple))]" :
                color
              }`}>
                {ICON_MAP[item.icon] || <Play size={14} />}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-foreground truncate">{item.label}</p>
                <p className="text-[10px] text-foreground-muted truncate">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlockLibrary({ onAddNode }: BlockLibraryProps) {
  const [search, setSearch] = useState("");

  const filterItems = (items: typeof TRIGGERS) =>
    items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-[260px] border-r border-[hsl(var(--border))] flex flex-col h-full bg-[hsl(var(--background-card))]">
      <div className="p-3 border-b border-[hsl(var(--border))]">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks..."
            className="w-full pl-8 pr-3 py-1.5 bg-[hsl(var(--background-elevated))] border border-[hsl(var(--border))] rounded-lg text-[11px] text-foreground outline-none placeholder:text-foreground-muted focus:border-[hsl(var(--ring))]"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <Section title="Triggers" color="bg-[hsl(var(--accent-green))]/10 text-[hsl(var(--accent-green))]" items={filterItems(TRIGGERS)} onAdd={onAddNode} nodeType="trigger" />
        <Section title="Actions" color="bg-[hsl(var(--background-elevated))] text-foreground-secondary" items={filterItems(ACTIONS)} onAdd={onAddNode} nodeType="action" />
        <Section title="Conditions" color="bg-amber-500/10 text-amber-400" items={filterItems(CONDITIONS)} onAdd={onAddNode} nodeType="condition" />
      </div>
    </div>
  );
}
