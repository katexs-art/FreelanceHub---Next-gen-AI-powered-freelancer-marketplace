import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Save, Copy, Plus, X } from "lucide-react";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SettingsWorkingHours() {
  const [hours, setHours] = useState(
    days.map((d, i) => ({ day: d, open: i < 5, start: "09:00", end: "17:00" }))
  );
  const [afterHours, setAfterHours] = useState("answer_book");
  const [afterMsg, setAfterMsg] = useState("We're currently closed. River will take a message and we'll get back to you during business hours.");
  const [holidays, setHolidays] = useState<{ date: string; label: string }[]>([]);

  const toggleDay = (idx: number) => {
    const updated = [...hours];
    updated[idx].open = !updated[idx].open;
    setHours(updated);
  };

  const updateTime = (idx: number, field: "start" | "end", val: string) => {
    const updated = [...hours];
    updated[idx][field] = val;
    setHours(updated);
  };

  const copyToWeekdays = () => {
    const mon = hours[0];
    setHours(hours.map((h, i) => i < 5 ? { ...h, start: mon.start, end: mon.end, open: true } : h));
    toast({ title: "Copied to all weekdays" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-foreground tracking-tight">Working hours</h1>
        <p className="text-[12px] text-[#7a7975] mt-0.5">Set when your business is open. River adjusts its behavior accordingly.</p>
      </div>

      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-foreground">Business hours</h3>
          <Button variant="outline" size="sm" onClick={copyToWeekdays} className="h-7 text-[10px] gap-1">
            <Copy className="w-3 h-3" /> Copy to weekdays
          </Button>
        </div>
        <div className="space-y-2">
          {hours.map((h, i) => (
            <div key={h.day} className="flex items-center gap-3">
              <button
                onClick={() => toggleDay(i)}
                className={`w-10 h-5 rounded-full relative transition-colors shrink-0 ${h.open ? "bg-[#4ade80]" : "bg-[#161619] border border-[rgba(255,255,255,0.08)]"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-transform ${h.open ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-[12px] text-foreground w-[80px]">{h.day}</span>
              {h.open ? (
                <div className="flex items-center gap-2">
                  <input type="time" value={h.start} onChange={(e) => updateTime(i, "start", e.target.value)} className="h-8 rounded-md bg-[#161619] border border-[rgba(255,255,255,0.08)] px-2 text-[12px] text-foreground" />
                  <span className="text-[11px] text-[#7a7975]">to</span>
                  <input type="time" value={h.end} onChange={(e) => updateTime(i, "end", e.target.value)} className="h-8 rounded-md bg-[#161619] border border-[rgba(255,255,255,0.08)] px-2 text-[12px] text-foreground" />
                </div>
              ) : (
                <span className="text-[11px] text-[#7a7975]">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* After hours */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-foreground">After hours behavior</h3>
        <div className="space-y-2">
          {[
            { id: "answer_book", label: "Answer and book appointments" },
            { id: "answer_message", label: "Answer and take message" },
            { id: "voicemail", label: "Send to voicemail" },
            { id: "custom", label: "Custom message" },
          ].map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
              <div className={`w-4 h-4 rounded-full border ${afterHours === opt.id ? "border-foreground bg-foreground" : "border-[rgba(255,255,255,0.20)]"} flex items-center justify-center`}>
                {afterHours === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-[#020203]" />}
              </div>
              <span className="text-[12px] text-foreground">{opt.label}</span>
            </label>
          ))}
        </div>
        <div>
          <label className="text-[11px] text-[#7a7975] mb-1 block">After hours message</label>
          <Textarea value={afterMsg} onChange={(e) => setAfterMsg(e.target.value)} className="min-h-[60px] text-[13px] bg-[#161619] border-[rgba(255,255,255,0.08)]" />
        </div>
      </div>

      {/* Holidays */}
      <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 space-y-3">
        <h3 className="text-[14px] font-semibold text-foreground">Holidays</h3>
        {holidays.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[12px] text-foreground flex-1">{h.label} — {h.date}</span>
            <button onClick={() => setHolidays(holidays.filter((_, idx) => idx !== i))} className="text-[#7a7975] hover:text-[#f09595]"><X className="w-3 h-3" /></button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setHolidays([...holidays, { date: new Date().toISOString().split("T")[0], label: "Holiday" }])} className="h-7 text-[10px] gap-1">
          <Plus className="w-3 h-3" /> Add holiday
        </Button>
      </div>

      <Button onClick={() => toast({ title: "Working hours saved" })} className="h-9 text-[12px] gap-1.5">
        <Save className="w-3.5 h-3.5" /> Save changes
      </Button>
    </div>
  );
}
