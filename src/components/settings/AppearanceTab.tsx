import { Check } from "lucide-react";
import { THEMES, ThemeId, useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/mono";
import { toast } from "sonner";

export function AppearanceTab() {
  const { theme, saved, setTheme, setPreview, clearPreview } = useTheme();

  const onPick = async (id: ThemeId) => {
    try {
      await setTheme(id);
      clearPreview();
      toast.success("Theme saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save theme");
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Appearance</Eyebrow>
        <h2 className="display-md mt-2">Make Katexs yours</h2>
        <p className="text-foreground-muted mt-1">Choose a theme for your dashboard.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t.id)}
            onMouseEnter={() => setPreview(t.id)}
            onMouseLeave={clearPreview}
            onFocus={() => setPreview(t.id)}
            onBlur={clearPreview}
            className={cn(
              "relative text-left rounded-2xl border bg-background p-3 transition-all",
              "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              saved === t.id ? "border-primary ring-2 ring-primary/30" : "border-border"
            )}
          >
            <ThemePreview themeId={t.id} />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-medium">{t.name}</span>
              {saved === t.id && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThemePreview({ themeId }: { themeId: ThemeId }) {
  return (
    <div className={cn("kx-theme-" + themeId, "rounded-xl overflow-hidden border border-border")}>
      <div className="flex h-[120px] bg-background">
        <div className="w-[28%] bg-sidebar-background border-r border-sidebar-border p-2 space-y-1.5">
          <div className="h-1.5 rounded-full bg-sidebar-primary w-3/4" />
          <div className="h-1.5 rounded-full bg-sidebar-foreground/20 w-2/3" />
          <div className="h-1.5 rounded-full bg-sidebar-foreground/20 w-1/2" />
          <div className="h-1.5 rounded-full bg-sidebar-foreground/20 w-3/5" />
        </div>
        <div className="flex-1 p-2.5 space-y-2">
          <div className="h-1.5 rounded-full bg-foreground/15 w-1/2" />
          <div className="flex">
            <div className="rounded-full bg-secondary px-2 py-1 text-[8px] text-secondary-foreground">
              Hi there
            </div>
          </div>
          <div className="flex justify-end">
            <div className="rounded-full bg-primary px-2 py-1 text-[8px] text-primary-foreground">
              On it
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
