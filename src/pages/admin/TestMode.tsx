import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TEST_CASES, runAll, type TestResult, type TestStatus } from "@/lib/testFlows";
import { toast } from "sonner";
import { Play, RotateCcw, Trash2, Users, MessageSquare } from "lucide-react";

const STATUS_LABEL: Record<TestStatus, string> = {
  not_run: "Not Run", running: "Running…", pass: "Pass", fail: "Fail",
};
const STATUS_CLASS: Record<TestStatus, string> = {
  not_run: "bg-white/[0.06] text-foreground-muted",
  running: "bg-yellow-500/20 text-yellow-300",
  pass: "bg-green-500/20 text-green-300",
  fail: "bg-red-500/20 text-red-300",
};

export default function TestMode() {
  const [results, setResults] = useState<Record<string, TestResult>>(
    Object.fromEntries(TEST_CASES.map((t) => [t.id, { status: "not_run" }])),
  );
  const [enabled, setEnabled] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(localStorage.getItem("test_last_run"));
  const [running, setRunning] = useState(false);

  const loadFlag = async () => {
    const { data } = await supabase.from("platform_settings").select("value").eq("key", "test_mode_enabled").maybeSingle();
    setEnabled((data as any)?.value === "true");
  };
  useEffect(() => { loadFlag(); }, []);

  const toggle = async () => {
    const next = !enabled;
    const { error } = await supabase.from("platform_settings").update({ value: next ? "true" : "false" }).eq("key", "test_mode_enabled");
    if (error) return toast.error(error.message);
    setEnabled(next);
    toast.success(`Test mode ${next ? "enabled" : "disabled"}`);
  };

  const runOne = async (id: string) => {
    const t = TEST_CASES.find((x) => x.id === id)!;
    setResults((r) => ({ ...r, [id]: { status: "running" } }));
    try {
      const out = await t.run();
      setResults((r) => ({ ...r, [id]: { status: out.ok ? "pass" : "fail", message: out.message, error: out.ok ? undefined : out.message } }));
    } catch (e: any) {
      setResults((r) => ({ ...r, [id]: { status: "fail", error: e?.message ?? String(e) } }));
    }
  };

  const runAllTests = async () => {
    setRunning(true);
    await runAll((id, r) => setResults((prev) => ({ ...prev, [id]: r })));
    const ts = new Date().toISOString();
    localStorage.setItem("test_last_run", ts);
    setLastRun(ts);
    setRunning(false);
  };

  const passed = Object.values(results).filter((r) => r.status === "pass").length;
  const failed = Object.values(results).filter((r) => r.status === "fail").length;

  const groups = Array.from(new Set(TEST_CASES.map((t) => t.group)));

  const reset = async (rpc: "reset_test_orders" | "reset_test_users" | "clear_test_messages", label: string) => {
    const { error } = await supabase.rpc(rpc);
    if (error) toast.error(error.message);
    else toast.success(`${label} done`);
  };

  return (
    <AppShell>
      <div className="max-w-5xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-mono uppercase tracking-[0.12em]">Test Mode</h1>
            <p className="text-sm text-foreground-muted mt-1">Run end-to-end flows against the test accounts. No real money moves.</p>
          </div>
          <Button variant={enabled ? "default" : "outline"} onClick={toggle}>
            {enabled ? "Disable" : "Enable"} Test Mode
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Flow checklist</CardTitle>
              <p className="text-xs text-foreground-muted mt-1 font-mono">
                {passed} of {TEST_CASES.length} passed{failed > 0 && ` · ${failed} failed`}
                {lastRun && ` · last run ${new Date(lastRun).toLocaleString()}`}
              </p>
            </div>
            <Button onClick={runAllTests} disabled={running}>
              <Play className="h-3.5 w-3.5" /> {running ? "Running…" : "Run All Tests"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {groups.map((g) => (
              <div key={g}>
                <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-foreground-subtle mb-2">{g} flows</div>
                <div className="divide-y divide-white/[0.06] border border-white/[0.06] rounded-sm">
                  {TEST_CASES.filter((t) => t.group === g).map((t) => {
                    const r = results[t.id];
                    return (
                      <div key={t.id} className="flex items-center gap-3 p-3 text-sm">
                        <span className="font-mono text-xs text-foreground-subtle w-8">{t.id}</span>
                        <span className="flex-1">{t.title}</span>
                        {r.error && <span className="text-xs text-red-400 truncate max-w-xs" title={r.error}>{r.error}</span>}
                        {r.message && r.status === "pass" && <span className="text-xs text-foreground-subtle">{r.message}</span>}
                        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-sm ${STATUS_CLASS[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => runOne(t.id)} disabled={r.status === "running"}>
                          Run
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Test data</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => reset("reset_test_orders", "Cleared test projects")}>
              <Trash2 className="h-3.5 w-3.5" /> Clear all test orders
            </Button>
            <Button variant="outline" onClick={() => reset("reset_test_users", "Reset test users")}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset test users
            </Button>
            <Button variant="outline" onClick={() => reset("clear_test_messages", "Cleared test messages")}>
              <MessageSquare className="h-3.5 w-3.5" /> Clear test messages
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle><Users className="inline h-4 w-4 mr-2" />Test accounts</CardTitle></CardHeader>
          <CardContent className="text-xs font-mono text-foreground-muted space-y-1">
            <div>buyer1@test.katexs.com / buyer2@test.katexs.com — password: TestPass123!</div>
            <div>seller1/2/3@test.katexs.com — password: TestPass123!</div>
            <div>admin@test.katexs.com — password: TestPass123!</div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
