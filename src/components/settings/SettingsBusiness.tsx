import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const industries = ["HVAC", "Plumbing", "Electrical", "Landscaping", "Roofing", "Med Spa", "Dental", "Real Estate", "Law Firm", "Auto Repair", "Salon/Spa", "Gym/Fitness", "Restaurant", "Cleaning", "Other"];

export default function SettingsBusiness() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [biz, setBiz] = useState({
    business_name: "", industry: "", phone: "", email: "",
    website: "", description: "", brand_color: "#4ade80",
    street: "", city: "", state: "", zip: "", country: "US",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        const addr = (data as any).business_address || {};
        setBiz({
          business_name: data.business_name || "",
          industry: data.industry || "",
          phone: data.phone || "",
          email: data.email || "",
          website: "", description: "",
          brand_color: (data as any).brand_color || "#4ade80",
          street: addr.street || "", city: addr.city || "",
          state: addr.state || "", zip: addr.zip || "", country: addr.country || "US",
        });
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("users").update({
      business_name: biz.business_name,
      industry: biz.industry,
    } as any).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Business info updated" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-foreground tracking-tight">Your business</h1>
        <p className="text-[12px] text-[#7a7975] mt-0.5">Tell us about your business so River can help better</p>
      </div>

      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-4">
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Business name</label>
          <Input value={biz.business_name} onChange={(e) => setBiz({ ...biz, business_name: e.target.value })} className="h-9 text-[13px]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">Industry</label>
            <select value={biz.industry} onChange={(e) => setBiz({ ...biz, industry: e.target.value })} className="w-full h-9 rounded-md bg-[#161619] border border-[rgba(255,255,255,0.08)] px-3 text-[13px] text-foreground">
              <option value="">Select industry</option>
              {industries.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">Website URL</label>
            <Input value={biz.website} onChange={(e) => setBiz({ ...biz, website: e.target.value })} placeholder="https://" className="h-9 text-[13px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">Business phone</label>
            <Input value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} className="h-9 text-[13px]" />
          </div>
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">Business email</label>
            <Input value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} className="h-9 text-[13px]" />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Business description</label>
          <Textarea value={biz.description} onChange={(e) => setBiz({ ...biz, description: e.target.value })} placeholder="Tell River about your services, pricing, and what makes you different..." className="min-h-[80px] text-[13px] bg-[#161619] border-[rgba(255,255,255,0.08)]" />
          <p className="text-[10px] text-[#7a7975] mt-1">River uses this to understand your business and provide better responses.</p>
        </div>
      </div>

      {/* Address */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-foreground">Business address</h3>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">Street</label>
          <Input value={biz.street} onChange={(e) => setBiz({ ...biz, street: e.target.value })} className="h-9 text-[13px]" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">City</label>
            <Input value={biz.city} onChange={(e) => setBiz({ ...biz, city: e.target.value })} className="h-9 text-[13px]" />
          </div>
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">State</label>
            <Input value={biz.state} onChange={(e) => setBiz({ ...biz, state: e.target.value })} className="h-9 text-[13px]" />
          </div>
          <div>
            <label className="text-[11px] text-[#7a7975] mb-1 block">ZIP</label>
            <Input value={biz.zip} onChange={(e) => setBiz({ ...biz, zip: e.target.value })} className="h-9 text-[13px]" />
          </div>
        </div>
      </div>

      {/* Brand color */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-3">
        <h3 className="text-[14px] font-semibold text-foreground">Brand color</h3>
        <p className="text-[12px] text-[#7a7975]">Used in your chat widget and client-facing pages.</p>
        <div className="flex items-center gap-3">
          <input type="color" value={biz.brand_color} onChange={(e) => setBiz({ ...biz, brand_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
          <Input value={biz.brand_color} onChange={(e) => setBiz({ ...biz, brand_color: e.target.value })} className="h-9 text-[13px] w-[140px]" />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="h-9 text-[12px] gap-1.5">
        <Save className="w-3.5 h-3.5" />
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}
