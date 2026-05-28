import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ExpertRow = {
  id: string;
  specialty: string | null;
  bio: string | null;
  tier: string;
  status: string;
  starting_price: number | null;
  rating: number | null;
  total_jobs: number | null;
  response_time: string | null;
  repeat_rate: number | null;
  featured: boolean | null;
  years_experience: string | null;
  delivery_time: string | null;
  languages: string[] | null;
  portfolio_links: string[] | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    business_name: string | null;
  } | null;
};

export function useExperts(opts: { category?: string; search?: string; limit?: number } = {}) {
  const [data, setData] = useState<ExpertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("experts")
        .select("*, profiles!inner(full_name, avatar_url, business_name)")
        .eq("status", "active");

      if (opts.category && opts.category !== "All") {
        q = q.ilike("specialty", `%${opts.category}%`);
      }
      if (opts.search) {
        q = q.or(`specialty.ilike.%${opts.search}%,bio.ilike.%${opts.search}%`);
      }
      q = q.order("featured", { ascending: false }).order("rating", { ascending: false });
      if (opts.limit) q = q.limit(opts.limit);

      const { data, error } = await q;
      if (!active) return;
      if (error) setError(error.message);
      setData((data as any) ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [opts.category, opts.search, opts.limit]);

  return { data, loading, error };
}

export function useExpert(id?: string) {
  const [data, setData] = useState<ExpertRow | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: e }, { data: s }, { data: r }] = await Promise.all([
        supabase.from("experts").select("*, profiles!inner(full_name, avatar_url, business_name)").eq("id", id).maybeSingle(),
        supabase.from("services").select("*").eq("expert_id", id).eq("is_active", true).order("price"),
        supabase.from("reviews").select("*").eq("expert_id", id).order("created_at", { ascending: false }).limit(20),
      ]);
      if (!active) return;
      setData((e as any) ?? null);
      setServices(s ?? []);
      setReviews(r ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  return { data, services, reviews, loading };
}

export function useCategories() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      setData(data ?? []);
    });
  }, []);
  return data;
}
