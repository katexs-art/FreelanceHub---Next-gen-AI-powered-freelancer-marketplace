import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DashboardMetrics {
  callsToday: number;
  callsYesterday: number;
  newLeads: number;
  newLeadsYesterday: number;
  booked: number;
  bookedYesterday: number;
  wonThisWeek: number;
  wonLastWeek: number;
  lostThisWeek: number;
  lostLastWeek: number;
}

export interface UserProfile {
  full_name: string | null;
  business_name: string | null;
  industry: string | null;
}

export function useDashboardData() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const startOfYesterday = yesterday.toISOString();
    const endOfYesterday = startOfToday;
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay()).toISOString();
    const startOfLastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - 7).toISOString();

    const [
      profileRes,
      callsTodayRes,
      callsYesterdayRes,
      newLeadsRes,
      newLeadsYestRes,
      bookedRes,
      bookedYestRes,
      wonRes,
      wonLastRes,
      lostRes,
      lostLastRes,
      contactsRes,
      activitiesRes,
      dealsRes,
    ] = await Promise.all([
      supabase.from("users").select("full_name, business_name, industry").eq("user_id", user.id).maybeSingle(),
      supabase.from("activities").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "call").gte("created_at", startOfToday),
      supabase.from("activities").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "call").gte("created_at", startOfYesterday).lt("created_at", endOfYesterday),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfToday),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfYesterday).lt("created_at", endOfYesterday),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "booked").gte("created_at", startOfToday),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "booked").gte("created_at", startOfYesterday).lt("created_at", endOfYesterday),
      supabase.from("deals").select("value").eq("user_id", user.id).eq("stage", "won").gte("created_at", startOfWeek),
      supabase.from("deals").select("value").eq("user_id", user.id).eq("stage", "won").gte("created_at", startOfLastWeek).lt("created_at", startOfWeek),
      supabase.from("deals").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("stage", "lost").gte("created_at", startOfWeek),
      supabase.from("deals").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("stage", "lost").gte("created_at", startOfLastWeek).lt("created_at", startOfWeek),
      supabase.from("contacts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
      supabase.from("activities").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("deals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    setProfile(profileRes.data);
    setContacts(contactsRes.data || []);
    setActivities(activitiesRes.data || []);
    setDeals(dealsRes.data || []);

    const wonTotal = (wonRes.data || []).reduce((s, d) => s + (Number(d.value) || 0), 0);
    const wonLastTotal = (wonLastRes.data || []).reduce((s, d) => s + (Number(d.value) || 0), 0);

    setMetrics({
      callsToday: callsTodayRes.count || 0,
      callsYesterday: callsYesterdayRes.count || 0,
      newLeads: newLeadsRes.count || 0,
      newLeadsYesterday: newLeadsYestRes.count || 0,
      booked: bookedRes.count || 0,
      bookedYesterday: bookedYestRes.count || 0,
      wonThisWeek: wonTotal,
      wonLastWeek: wonLastTotal,
      lostThisWeek: lostRes.count || 0,
      lostLastWeek: lostLastRes.count || 0,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { metrics, profile, contacts, activities, deals, loading, refetch: fetchData };
}
