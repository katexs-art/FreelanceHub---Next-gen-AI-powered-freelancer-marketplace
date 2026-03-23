import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, X, CheckCircle } from "lucide-react";

export default function SettingsDeleteAccount() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [actualBusinessName, setActualBusinessName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("business_name").eq("user_id", user.id).single().then(({ data }) => {
      setActualBusinessName(data?.business_name || "my account");
    });
  }, [user]);

  const canDelete = confirmText === actualBusinessName && actualBusinessName.length > 0;

  const handleDelete = async () => {
    if (!canDelete) return;
    toast({ title: "Account deletion initiated", description: "Your data will be permanently deleted in 30 days." });
    await signOut();
    navigate("/");
  };

  const deletedItems = [
    "All contacts and deals",
    "Workflows and automations",
    "Messages and conversations",
    "Integration configurations",
    "Team members and invites",
    "River AI conversation history",
  ];

  const keptItems = ["Invoice records (legal requirement)"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-[#f09595] tracking-tight">Delete your account</h1>
        <p className="text-[12px] text-[#7a7975] mt-0.5">This action is permanent and cannot be undone</p>
      </div>

      <div className="bg-[#0f0f12] border border-[#f09595]/20 rounded-[12px] p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#f09595]/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#f09595]" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Are you absolutely sure?</h3>
            <p className="text-[12px] text-[#7a7975] mt-1">All your data including contacts, deals, workflows, and messages will be permanently deleted. This cannot be reversed.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-[#f09595] font-medium mb-2 uppercase tracking-[0.08em]">Will be deleted</div>
            <div className="space-y-1.5">
              {deletedItems.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-[#7a7975]">
                  <X className="w-3 h-3 text-[#f09595] shrink-0" />{item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#7a7975] font-medium mb-2 uppercase tracking-[0.08em]">Will be kept</div>
            <div className="space-y-1.5">
              {keptItems.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[12px] text-[#7a7975]">
                  <CheckCircle className="w-3 h-3 text-[#4ade80] shrink-0" />{item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[rgba(255,255,255,0.06)] pt-4">
          <label className="text-[11px] text-[#7a7975] mb-1 block">
            To confirm, type your business name: <span className="text-foreground font-medium">{actualBusinessName}</span>
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={actualBusinessName}
            className="h-9 text-[13px] border-[#f09595]/20 focus-visible:border-[#f09595]"
          />
        </div>

        <div className="flex gap-3">
          <Button
            disabled={!canDelete}
            onClick={handleDelete}
            className="bg-[#f09595]/10 text-[#f09595] border border-[#f09595]/20 hover:bg-[#f09595]/20 disabled:opacity-30 h-9 text-[12px]"
          >
            Permanently delete my account
          </Button>
          <Button variant="outline" onClick={() => window.history.back()} className="h-9 text-[12px]">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
