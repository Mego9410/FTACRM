import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role, SessionProfile } from "@/lib/auth";

const getPermissionMatrix = cache(async (): Promise<Map<Role, Set<string>>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("role_permissions").select("role, permission");
  const map = new Map<Role, Set<string>>();
  for (const row of data ?? []) {
    const set = map.get(row.role as Role) ?? new Set<string>();
    set.add(row.permission);
    map.set(row.role as Role, set);
  }
  return map;
});

/** Admins implicitly hold every permission; others check the editable matrix. */
export async function hasPermission(profile: SessionProfile, permission: string): Promise<boolean> {
  if (profile.role === "admin") return true;
  const matrix = await getPermissionMatrix();
  return matrix.get(profile.role)?.has(permission) ?? false;
}

export async function requirePermission(profile: SessionProfile, permission: string): Promise<void> {
  if (!(await hasPermission(profile, permission))) {
    throw new Error(`Missing permission: ${permission}`);
  }
}
