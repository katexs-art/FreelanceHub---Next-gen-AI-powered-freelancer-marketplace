import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Download, CheckCircle } from "lucide-react";

const plans = [
  { name: "STARTER", price: "$100", annual: "$80", features: ["3 client accounts", "Voice AI agent", "Chat AI", "Free CRM", "10 workflow templates", "Email support"] },
  { name: "GROWTH", price: "$297", annual: "$237", features: ["Unlimited clients", "Everything in Starter", "Done-for-you workflows", "Paid ads management", "Priority Slack support", "API access"] },
  { name: "ENTERPRISE", price: "Custom", annual: "Custom", features: ["Everything in Growth", "Full white-label", "Custom AI training", "Dedicated account manager", "SLA guarantee"] },
];

export default function SettingsBilling() {
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState("starter");
  const [trialEnd, setTrialEnd] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("users").select("plan, trial_end_date").eq("user_id", user.id).single().then(({ data }) => {
      if (data) {
        setCurrentPlan(data.plan);
        setTrialEnd(data.trial_end_date);
      }
    });
  }, [user]);

  const daysLeft = trialEnd ? Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86400000)) : null;

  const mockInvoices = [
    { date: "Mar 1, 2026", amount: "$100.00", status: "Paid", plan: "Starter" },
    { date: "Feb 1, 2026", amount: "$100.00", status: "Paid", plan: "Starter" },
    { date: "Jan 1, 2026", amount: "$100.00", status: "Paid", plan: "Starter" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-foreground tracking-tight">Plan + billing</h1>
        <p className="text-[12px] text-[#7a7975] mt-0.5">Manage your subscription and payment method</p>
      </div>

      {/* Current plan */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.10)] rounded-[12px] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#7a7975] uppercase tracking-[0.1em]">{currentPlan.toUpperCase()} PLAN</div>
            <div className="text-[28px] font-bold text-foreground tracking-tight mt-1">
              {currentPlan === "starter" ? "$100" : currentPlan === "growth" ? "$297" : "Custom"}<span className="text-[14px] text-[#7a7975] font-normal">/mo</span>
            </div>
          </div>
          <div className="text-right">
            {daysLeft !== null && daysLeft > 0 ? (
              <span className="text-[11px] bg-[#EF9F27]/10 text-[#EF9F27] px-3 py-1 rounded-full font-medium">{daysLeft} days left in trial</span>
            ) : (
              <span className="text-[11px] bg-[#4ade80]/10 text-[#4ade80] px-3 py-1 rounded-full font-medium">Active</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {currentPlan === "starter" && <Button size="sm" className="h-8 text-[11px]">Upgrade to Growth</Button>}
          <Button variant="outline" size="sm" className="h-8 text-[11px] text-[#f09595] border-[#f09595]/20 hover:bg-[#f09595]/10">Cancel plan</Button>
        </div>
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-3 gap-3">
        {plans.map((plan) => (
          <div key={plan.name} className={`bg-[#0f0f12] border rounded-[12px] p-4 ${currentPlan === plan.name.toLowerCase() ? "border-foreground" : "border-[rgba(255,255,255,0.06)]"}`}>
            <div className="text-[10px] text-[#7a7975] uppercase tracking-[0.1em]">{plan.name}</div>
            <div className="text-[20px] font-bold text-foreground mt-1">{plan.price}<span className="text-[11px] text-[#7a7975] font-normal">/mo</span></div>
            <div className="space-y-1 mt-3">
              {plan.features.map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-[11px] text-[#7a7975]">
                  <CheckCircle className="w-3 h-3 text-[#4ade80] shrink-0" />{f}
                </div>
              ))}
            </div>
            {currentPlan === plan.name.toLowerCase() ? (
              <div className="mt-3 text-[10px] text-[#4ade80] font-medium text-center">Current plan</div>
            ) : (
              <Button variant="outline" size="sm" className="w-full mt-3 h-7 text-[10px]">
                {plan.name === "ENTERPRISE" ? "Contact us" : "Upgrade"}
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Payment method */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-3">
        <h3 className="text-[14px] font-semibold text-foreground">Payment method</h3>
        <div className="flex items-center gap-3 p-3 bg-[#161619] rounded-[8px] border border-[rgba(255,255,255,0.06)]">
          <CreditCard className="w-5 h-5 text-[#7a7975]" />
          <div>
            <div className="text-[12px] text-foreground">•••• •••• •••• 4242</div>
            <div className="text-[10px] text-[#7a7975]">Expires 12/2028</div>
          </div>
          <span className="text-[9px] bg-[#4ade80]/10 text-[#4ade80] px-2 py-0.5 rounded-full ml-auto">Default</span>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-[10px]">Update card</Button>
      </div>

      {/* Invoices */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-3">
        <h3 className="text-[14px] font-semibold text-foreground">Invoices</h3>
        <div className="space-y-0">
          {mockInvoices.map((inv, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
              <div className="flex items-center gap-4">
                <span className="text-[12px] text-[#7a7975] w-[100px]">{inv.date}</span>
                <span className="text-[12px] text-foreground">{inv.amount}</span>
                <span className="text-[10px] bg-[#4ade80]/10 text-[#4ade80] px-2 py-0.5 rounded-full">{inv.status}</span>
              </div>
              <button className="text-[#7a7975] hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Usage */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-foreground">Usage this period</h3>
        {[
          { label: "Contacts", used: 47, limit: currentPlan === "starter" ? 500 : 99999 },
          { label: "Workflows", used: 6, limit: currentPlan === "starter" ? 10 : 99999 },
          { label: "API calls", used: 342, limit: currentPlan === "starter" ? 1000 : 99999 },
          { label: "Team members", used: 1, limit: currentPlan === "starter" ? 1 : 5 },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[#7a7975]">{item.label}</span>
              <span className="text-[11px] text-foreground">{item.used} / {item.limit > 9999 ? "Unlimited" : item.limit}</span>
            </div>
            <Progress value={item.limit > 9999 ? 5 : (item.used / item.limit) * 100} className="h-1.5 bg-[#161619]" />
          </div>
        ))}
      </div>
    </div>
  );
}
