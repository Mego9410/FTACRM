import { createClient } from "@/lib/supabase/server";
import { UsersClient } from "./users-client";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const supabase = await createClient();
  const [{ data: users }, { data: branches }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, branch_id, calendar_color, is_active")
      .order("full_name"),
    supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
  ]);
  return <UsersClient users={users ?? []} branches={branches ?? []} />;
}
