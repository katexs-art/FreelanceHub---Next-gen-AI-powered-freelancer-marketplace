import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const sources = ["Facebook Ads", "Google", "Referral", "Website", "Cold outreach", "Other"];
const statuses = ["new", "hot", "warm", "cold"] as const;

export function AddContactModal({ open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", phone: "", email: "", source: "", status: "new" as string, notes: "",
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!user || !form.first_name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("contacts").insert({
      user_id: user.id,
      first_name: form.first_name,
      last_name: form.last_name || null,
      phone: form.phone || null,
      email: form.email || null,
      source: form.source || null,
      status: form.status as any,
      notes: form.notes || null,
    });
    if (!error) {
      await supabase.from("activities").insert({
        user_id: user.id,
        type: "note" as const,
        description: `Added contact: ${form.first_name} ${form.last_name}`.trim(),
      });
      setForm({ first_name: "", last_name: "", phone: "", email: "", source: "", status: "new", notes: "" });
      onSaved();
      onClose();
      toast({ title: "Contact added", description: `${form.first_name} has been saved.` });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Modal open={open} onOpenChange={onClose}>
      <div className="space-y-4">
        <h3 className="text-h3 font-semibold text-foreground">Add contact</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="First name *" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
          <Input placeholder="Last name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
        </div>
        <Input placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        <Input placeholder="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        <select
          value={form.source}
          onChange={(e) => set("source", e.target.value)}
          className="w-full h-10 bg-background-elevated border border-border rounded-md px-3 text-small text-foreground focus:outline-none focus:border-border-strong"
        >
          <option value="">Source</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
          className="w-full h-10 bg-background-elevated border border-border rounded-md px-3 text-small text-foreground focus:outline-none focus:border-border-strong"
        >
          {statuses.map((s) => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <textarea
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="w-full h-20 bg-background-elevated border border-border rounded-md p-3 text-small text-foreground placeholder:text-foreground-muted resize-none focus:outline-none focus:border-border-strong"
        />
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.first_name.trim()}>
            {saving ? "Saving..." : "Save contact"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
