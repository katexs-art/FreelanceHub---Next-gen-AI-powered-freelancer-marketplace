import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { UserPlus, MoreHorizontal, Send, CheckCircle, X } from "lucide-react";

const rolePermissions = [
  { feature: "View dashboard", admin: true, manager: true, agent: true, viewer: true },
  { feature: "Manage contacts", admin: true, manager: true, agent: true, viewer: false },
  { feature: "Send messages", admin: true, manager: true, agent: true, viewer: false },
  { feature: "Manage workflows", admin: true, manager: true, agent: false, viewer: false },
  { feature: "View billing", admin: true, manager: false, agent: false, viewer: false },
  { feature: "Manage team", admin: true, manager: false, agent: false, viewer: false },
  { feature: "Platform settings", admin: true, manager: false, agent: false, viewer: false },
];

export default function SettingsTeam() {
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviteMsg, setInviteMsg] = useState("");
  const [invites, setInvites] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("team_invites").select("*").eq("inviter_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setInvites(data || []);
    });
  }, [user]);

  const handleInvite = async () => {
    if (!user || !inviteEmail) return;
    const { error } = await supabase.from("team_invites").insert({
      inviter_id: user.id,
      invitee_email: inviteEmail,
      role: inviteRole,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Invite sent to " + inviteEmail });
      setInviteEmail("");
      setShowInvite(false);
      // refresh
      const { data } = await supabase.from("team_invites").select("*").eq("inviter_id", user.id).order("created_at", { ascending: false });
      setInvites(data || []);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Team members</h1>
          <p className="text-[12px] text-[#7a7975] mt-0.5">Manage who has access to your account</p>
        </div>
        <Button size="sm" onClick={() => setShowInvite(true)} className="h-8 text-[11px] gap-1.5">
          <UserPlus className="w-3 h-3" /> Invite member
        </Button>
      </div>

      {/* Current members */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_80px_80px_40px] gap-2 px-4 py-2.5 bg-[#161619] text-[10px] text-[#7a7975] uppercase tracking-[0.08em]">
          <span>Member</span><span>Role</span><span>Status</span><span>Last active</span><span></span>
        </div>
        <div className="px-4 py-3 flex items-center gap-3 border-b border-[rgba(255,255,255,0.04)]">
          <div className="w-7 h-7 rounded-full bg-[#161619] border border-[rgba(255,255,255,0.10)] flex items-center justify-center text-[10px] text-foreground font-medium">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-foreground font-medium truncate">{user?.email}</div>
            <div className="text-[10px] text-[#7a7975]">You</div>
          </div>
          <span className="text-[10px] bg-[rgba(127,119,221,0.12)] text-[#AFA9EC] px-2 py-0.5 rounded-full w-[100px] text-center">Admin</span>
          <span className="text-[10px] bg-[#4ade80]/10 text-[#4ade80] px-2 py-0.5 rounded-full w-[80px] text-center">Active</span>
          <span className="text-[11px] text-[#7a7975] w-[80px] text-center">Now</span>
          <div className="w-[40px]" />
        </div>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.10)] rounded-[12px] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-foreground">Invite team member</h3>
            <button onClick={() => setShowInvite(false)} className="text-[#7a7975] hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div>
              <label className="text-[11px] text-[#7a7975] mb-1 block">Email address</label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="team@company.com" className="h-9 text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] text-[#7a7975] mb-1 block">Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full h-9 rounded-md bg-[#161619] border border-[rgba(255,255,255,0.08)] px-3 text-[13px] text-foreground">
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="agent">Agent</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">Personal message (optional)</label>
            <Textarea value={inviteMsg} onChange={(e) => setInviteMsg(e.target.value)} placeholder="Hey, join our team on Katexs..." className="min-h-[50px] text-[13px] bg-[#161619] border-[rgba(255,255,255,0.08)]" />
          </div>
          <Button onClick={handleInvite} size="sm" className="h-8 text-[11px] gap-1.5">
            <Send className="w-3 h-3" /> Send invite
          </Button>
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-3">
          <h3 className="text-[14px] font-semibold text-foreground">Pending invites</h3>
          {invites.filter((inv: any) => !inv.accepted).map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
              <div>
                <div className="text-[12px] text-foreground">{inv.invitee_email}</div>
                <div className="text-[10px] text-[#7a7975]">{inv.role} · Sent {new Date(inv.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-6 text-[9px]">Resend</Button>
                <Button variant="outline" size="sm" className="h-6 text-[9px] text-[#f09595] border-[#f09595]/20">Cancel</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role permissions */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <h3 className="text-[14px] font-semibold text-foreground">Role permissions</h3>
        </div>
        <div className="grid grid-cols-[1fr_60px_60px_60px_60px] gap-1 px-4 py-2 bg-[#161619] text-[10px] text-[#7a7975] uppercase tracking-[0.08em]">
          <span>Feature</span><span className="text-center">Admin</span><span className="text-center">Mgr</span><span className="text-center">Agent</span><span className="text-center">View</span>
        </div>
        {rolePermissions.map((perm, i) => (
          <div key={i} className={`grid grid-cols-[1fr_60px_60px_60px_60px] gap-1 px-4 py-2 text-[11px] ${i % 2 === 0 ? "bg-[#0f0f12]" : "bg-[#0a0a0c]"}`}>
            <span className="text-foreground">{perm.feature}</span>
            {[perm.admin, perm.manager, perm.agent, perm.viewer].map((val, j) => (
              <span key={j} className="text-center">
                {val ? <CheckCircle className="w-3.5 h-3.5 text-[#4ade80] mx-auto" /> : <X className="w-3.5 h-3.5 text-[#3a3a3e] mx-auto" />}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
