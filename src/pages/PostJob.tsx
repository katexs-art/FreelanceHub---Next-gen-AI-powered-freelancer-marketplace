import { useState, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { toast } from "@/hooks/use-toast";

export default function PostJob() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: categories } = useCategories();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"open" | "river">("open");
  const [saving, setSaving] = useState(false);

  const addSkill = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      const t = skillInput.trim();
      if (!skills.includes(t)) setSkills([...skills, t]);
      setSkillInput("");
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("message-attachments").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("message-attachments").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setAttachments([...attachments, ...urls]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !desc.trim()) {
      toast({ title: "Title and description are required" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("project_posts").insert({
      buyer_id: user.id,
      title: title.trim(),
      description: desc.trim(),
      category: category || null,
      skills,
      budget_min: min ? parseInt(min, 10) : null,
      budget_max: max ? parseInt(max, 10) : null,
      deadline: deadline || null,
      attachments,
      visibility,
      status: "open",
      bid_count: 0,
    }).select("id").maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: "Could not post project", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Project posted" });
    nav(`/projects/${data?.id ?? ""}` || "/projects");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page py-10 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-semibold mb-6">Post a Job</h1>
        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-sm mb-2">Project Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your project a clear title. Example: Build me a voice AI caller for my real estate business"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">What do you need done</label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              style={{ minHeight: 120 }}
              placeholder="Describe your project in detail. What is the goal, what do you need delivered, any specific tools or platforms required?"
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Service Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-[4px] bg-white/[0.03] border border-white/10 px-3.5 text-sm"
            >
              <option value="">Select a category</option>
              {categories.filter((c) => !c.parent_id).map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2">Skills and Tags needed</label>
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={addSkill}
              placeholder="Type a skill and press Enter"
            />
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSkills(skills.filter((x) => x !== s))}
                    className="px-3 py-1 rounded-full border border-white/15 text-xs hover:bg-white/[0.05]"
                  >
                    {s} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm mb-2">Budget</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Min $</label>
                <Input type="number" value={min} onChange={(e) => setMin(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-foreground-muted mb-1">Max $</label>
                <Input type="number" value={max} onChange={(e) => setMax(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2">Delivery deadline</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm mb-2">Attachments</label>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.txt"
              onChange={(e) => handleFiles(e.target.files)}
              className="text-sm"
            />
            {attachments.length > 0 && (
              <div className="text-xs text-foreground-muted mt-2">{attachments.length} file(s) attached</div>
            )}
          </div>

          <div>
            <label className="block text-sm mb-2">Visibility</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={visibility === "open"} onChange={() => setVisibility("open")} />
                Open to all sellers
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={visibility === "river"} onChange={() => setVisibility("river")} />
                River matched sellers only
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 bg-foreground text-background font-mono uppercase tracking-[0.12em] text-[13px] disabled:opacity-50"
            style={{ borderRadius: 999 }}
          >
            {saving ? "Posting…" : "Post My Project"}
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
