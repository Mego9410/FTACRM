import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type LookupValue = {
  id: string;
  value: string;
  sort_order: number;
  is_active: boolean;
  color: string | null;
  system_key: string | null;
};

export type LookupType = {
  id: string;
  key: string;
  label: string;
  is_system: boolean;
  values: LookupValue[];
};

/** All lookup types + values, one query, cached per request. */
export const getAllLookups = cache(async (): Promise<Map<string, LookupType>> => {
  const supabase = await createClient();
  const { data: types } = await supabase.from("lookup_types").select("id, key, label, is_system");
  const { data: values } = await supabase
    .from("lookup_values")
    .select("id, lookup_type_id, value, sort_order, is_active, color, system_key")
    .order("sort_order");
  const map = new Map<string, LookupType>();
  for (const t of types ?? []) {
    map.set(t.key, {
      ...t,
      values: (values ?? [])
        .filter((v) => v.lookup_type_id === t.id)
        .map(({ lookup_type_id: _ignored, ...v }) => v),
    });
  }
  return map;
});

/** Active values for one lookup type key. */
export async function getLookup(key: string): Promise<LookupValue[]> {
  const all = await getAllLookups();
  return (all.get(key)?.values ?? []).filter((v) => v.is_active);
}

/** id → value/color map across all lookups (for rendering stored ids). */
export const getLookupIndex = cache(
  async (): Promise<Map<string, { value: string; color: string | null }>> => {
    const all = await getAllLookups();
    const idx = new Map<string, { value: string; color: string | null }>();
    for (const t of all.values()) {
      for (const v of t.values) idx.set(v.id, { value: v.value, color: v.color });
    }
    return idx;
  },
);
