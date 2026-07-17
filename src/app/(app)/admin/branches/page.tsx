import { createClient } from "@/lib/supabase/server";
import { BranchesClient } from "./branches-client";

export const metadata = { title: "Branches" };

export default async function BranchesPage() {
  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, town, phone, email, is_active")
    .order("name");
  return <BranchesClient branches={branches ?? []} />;
}
