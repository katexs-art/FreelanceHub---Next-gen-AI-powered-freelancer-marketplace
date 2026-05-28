import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
}

export function useCategories() {
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      setData((data ?? []) as Category[]);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}
