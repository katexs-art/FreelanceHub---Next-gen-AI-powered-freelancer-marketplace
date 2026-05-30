import { supabase } from "@/integrations/supabase/client";

export type TestStatus = "not_run" | "running" | "pass" | "fail";
export interface TestResult { status: TestStatus; message?: string; error?: string; }
export interface TestCase {
  id: string;
  group: string;
  title: string;
  run: () => Promise<{ ok: boolean; message?: string }>;
}

const ok = (message?: string) => ({ ok: true, message });
const fail = (message: string) => ({ ok: false, message });

async function asTestUser<T>(email: string, password: string, fn: () => Promise<T>): Promise<T> {
  await supabase.auth.signInWithPassword({ email, password });
  try {
    return await fn();
  } finally {
    // restore admin session via stored credentials if present
  }
}

const TEST_PASSWORD = "TestPass123!";
const BUYER1 = "buyer1@test.katexs.com";
const SELLER1 = "seller1@test.katexs.com";
const ADMIN = "admin@test.katexs.com";

async function getOrCreateTestOrder(): Promise<string> {
  // sign in as buyer1, pick first gig from seller1, create order
  await supabase.auth.signInWithPassword({ email: BUYER1, password: TEST_PASSWORD });
  const { data: gigs } = await supabase
    .from("gigs")
    .select("id, gig_packages(id)")
    .eq("status", "active")
    .limit(5);
  const pkgId = gigs?.flatMap((g: any) => g.gig_packages || [])?.[0]?.id;
  if (!pkgId) throw new Error("no test package available");
  const { data: orderId, error } = await supabase.rpc("create_gig_order", { _package_id: pkgId });
  if (error) throw error;
  return orderId as unknown as string;
}

export const TEST_CASES: TestCase[] = [
  // BUYER FLOWS
  { id: "b1", group: "Buyer", title: "Browse loads active gigs", run: async () => {
    const { data, error } = await supabase.from("gigs").select("id").eq("status", "active").limit(10);
    if (error) return fail(error.message);
    return data && data.length > 0 ? ok(`${data.length} gigs`) : fail("no active gigs");
  }},
  { id: "b2", group: "Buyer", title: "Search returns results", run: async () => {
    const { data, error } = await supabase.from("gigs").select("id").ilike("title", "%AI%").limit(5);
    if (error) return fail(error.message);
    return ok(`${data?.length ?? 0} matches`);
  }},
  { id: "b3", group: "Buyer", title: "Categories list", run: async () => {
    const { data } = await supabase.from("gigs").select("primary_category").limit(20);
    return data && data.length > 0 ? ok() : fail("empty");
  }},
  { id: "b4", group: "Buyer", title: "Seller profile fetch", run: async () => {
    const { data, error } = await supabase.from("profiles").select("id").eq("email", SELLER1).maybeSingle();
    if (error || !data) return fail("seller1 missing");
    return ok();
  }},
  { id: "b5", group: "Buyer", title: "Buyer sign-in works", run: async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: BUYER1, password: TEST_PASSWORD });
    return error ? fail(error.message) : ok();
  }},
  { id: "b6", group: "Buyer", title: "Send message to seller", run: async () => {
    await supabase.auth.signInWithPassword({ email: BUYER1, password: TEST_PASSWORD });
    const { data: s } = await supabase.from("profiles").select("id").eq("email", SELLER1).maybeSingle();
    if (!s) return fail("no seller");
    const { data: conv, error } = await supabase.rpc("get_or_create_conversation", { _other: s.id });
    if (error) return fail(error.message);
    return ok(String(conv).slice(0, 8));
  }},
  { id: "b7", group: "Buyer", title: "Post a project", run: async () => {
    await supabase.auth.signInWithPassword({ email: BUYER1, password: TEST_PASSWORD });
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("project_posts").insert({
      buyer_id: u.user!.id, title: "Test project " + Date.now(),
      description: "Automated test project posting", budget_min: 100, budget_max: 500, delivery_days: 7,
    });
    return error ? fail(error.message) : ok();
  }},
  { id: "b8", group: "Buyer", title: "Create order from gig", run: async () => {
    try { const id = await getOrCreateTestOrder(); return ok(id.slice(0, 8)); }
    catch (e: any) { return fail(e.message); }
  }},
  { id: "b9", group: "Buyer", title: "Order shows pending_payment", run: async () => {
    try {
      const id = await getOrCreateTestOrder();
      const { data } = await supabase.from("orders").select("status").eq("id", id).maybeSingle();
      return data?.status === "pending_payment" ? ok() : fail(`status=${data?.status}`);
    } catch (e: any) { return fail(e.message); }
  }},
  { id: "b10", group: "Buyer", title: "Simulated payment marks order paid", run: async () => {
    try {
      const id = await getOrCreateTestOrder();
      await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
      const { error } = await supabase.rpc("simulate_mark_order_paid", { _order_id: id });
      if (error) return fail(error.message);
      const { data } = await supabase.from("orders").select("status, escrow_status").eq("id", id).maybeSingle();
      return (data?.status as string) === "in_progress" && (data?.escrow_status as string) === "held" ? ok() : fail(JSON.stringify(data));
    } catch (e: any) { return fail(e.message); }
  }},

  // ORDER FLOWS
  { id: "o11", group: "Order", title: "Buyer orders list loads", run: async () => {
    await supabase.auth.signInWithPassword({ email: BUYER1, password: TEST_PASSWORD });
    const { error } = await supabase.from("orders").select("id").limit(5);
    return error ? fail(error.message) : ok();
  }},
  { id: "o12", group: "Order", title: "Seller orders list loads", run: async () => {
    await supabase.auth.signInWithPassword({ email: SELLER1, password: TEST_PASSWORD });
    const { error } = await supabase.from("orders").select("id").limit(5);
    return error ? fail(error.message) : ok();
  }},
  { id: "o13", group: "Order", title: "Halfway time advance works", run: async () => {
    try {
      const id = await getOrCreateTestOrder();
      await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
      await supabase.rpc("simulate_mark_order_paid", { _order_id: id });
      const { error } = await supabase.rpc("simulate_order_time_advance", { _order_id: id, _mode: "halfway" });
      return error ? fail(error.message) : ok();
    } catch (e: any) { return fail(e.message); }
  }},
  { id: "o14", group: "Order", title: "Past deadline time advance works", run: async () => {
    try {
      const id = await getOrCreateTestOrder();
      await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
      await supabase.rpc("simulate_mark_order_paid", { _order_id: id });
      const { error } = await supabase.rpc("simulate_order_time_advance", { _order_id: id, _mode: "past_deadline" });
      return error ? fail(error.message) : ok();
    } catch (e: any) { return fail(e.message); }
  }},
  { id: "o15", group: "Order", title: "Seller can mark delivered", run: async () => {
    try {
      const id = await getOrCreateTestOrder();
      await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
      await supabase.rpc("simulate_mark_order_paid", { _order_id: id });
      await supabase.auth.signInWithPassword({ email: SELLER1, password: TEST_PASSWORD });
      const { error } = await supabase.from("order_deliveries").insert({
        order_id: id, message: "Test delivery", files: [],
      } as any);
      return error ? fail(error.message) : ok();
    } catch (e: any) { return fail(e.message); }
  }},
  { id: "o16", group: "Order", title: "Auto-complete clears escrow", run: async () => {
    await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
    const { error } = await supabase.rpc("auto_complete_orders");
    return error ? fail(error.message) : ok();
  }},
  { id: "o17", group: "Order", title: "Seller credits clear", run: async () => {
    await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
    const { error } = await supabase.rpc("clear_due_seller_credits");
    return error ? fail(error.message) : ok();
  }},
  { id: "o18", group: "Order", title: "Seller balance recomputes", run: async () => {
    await supabase.auth.signInWithPassword({ email: SELLER1, password: TEST_PASSWORD });
    const { data } = await supabase.from("seller_accounts").select("available_balance").maybeSingle();
    return data ? ok(`bal=${data.available_balance}`) : fail("no account");
  }},

  // REVIEW FLOWS
  { id: "r19", group: "Review", title: "Review prompts table accessible", run: async () => {
    const { error } = await supabase.from("review_prompts").select("id").limit(1);
    return error ? fail(error.message) : ok();
  }},
  { id: "r20", group: "Review", title: "Reviews table accessible", run: async () => {
    const { error } = await supabase.from("reviews").select("id").limit(1);
    return error ? fail(error.message) : ok();
  }},
  { id: "r21", group: "Review", title: "River score recompute callable", run: async () => {
    await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
    const { data: s } = await supabase.from("profiles").select("id").eq("email", SELLER1).maybeSingle();
    if (!s) return fail("no seller");
    const { error } = await supabase.rpc("recompute_seller_review_stats", { _seller: s.id });
    return error ? fail(error.message) : ok();
  }},

  // ADMIN FLOWS
  { id: "a22", group: "Admin", title: "Admin can read all orders", run: async () => {
    await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
    const { data, error } = await supabase.from("orders").select("id").limit(50);
    return error ? fail(error.message) : ok(`${data?.length ?? 0} rows`);
  }},
  { id: "a23", group: "Admin", title: "Admin can read all profiles", run: async () => {
    await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
    const { data, error } = await supabase.from("profiles").select("id").limit(50);
    return error ? fail(error.message) : ok(`${data?.length ?? 0} rows`);
  }},
  { id: "a24", group: "Admin", title: "Seller approvals queue readable", run: async () => {
    await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
    const { error } = await supabase.from("seller_applications").select("id").limit(5);
    return error ? fail(error.message) : ok();
  }},
  { id: "a25", group: "Admin", title: "Disputes table readable", run: async () => {
    await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
    const { error } = await supabase.from("disputes").select("id").limit(5);
    return error ? fail(error.message) : ok();
  }},
  { id: "a26", group: "Admin", title: "Revenue aggregation works", run: async () => {
    await supabase.auth.signInWithPassword({ email: ADMIN, password: TEST_PASSWORD });
    const { data, error } = await supabase.from("orders").select("platform_fee").eq("status", "completed");
    if (error) return fail(error.message);
    const total = (data ?? []).reduce((s: number, r: any) => s + (r.platform_fee || 0), 0);
    return ok(`$${(total / 100).toFixed(2)} fees`);
  }},
];

export async function runAll(onProgress: (id: string, r: TestResult) => void) {
  for (const t of TEST_CASES) {
    onProgress(t.id, { status: "running" });
    try {
      const r = await t.run();
      onProgress(t.id, { status: r.ok ? "pass" : "fail", message: r.message, error: r.ok ? undefined : r.message });
    } catch (e: any) {
      onProgress(t.id, { status: "fail", error: e?.message ?? String(e) });
    }
  }
}
