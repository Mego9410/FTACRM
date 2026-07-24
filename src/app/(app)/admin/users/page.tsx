import { createClient } from "@/lib/supabase/server";
import { UsersClient } from "./users-client";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, calendar_color, is_active, phone, job_title, manager_id")
    .order("full_name");
  return <UsersClient users={users ?? []} />;
}
