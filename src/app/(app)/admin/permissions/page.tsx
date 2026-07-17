import { createClient } from "@/lib/supabase/server";
import { PermissionsClient } from "./permissions-client";

export const metadata = { title: "Permissions" };

// The full permission vocabulary the app checks. Grants for manager/agent are
// editable; admin implicitly holds everything.
const ALL_PERMISSIONS: { key: string; label: string }[] = [
  { key: "campaigns.send", label: "Send campaigns" },
  { key: "deals.edit", label: "Edit deals & stages" },
  { key: "reports.view", label: "View management reporting" },
  { key: "contacts.delete", label: "Archive contacts" },
  { key: "contacts.erase", label: "GDPR erasure" },
  { key: "exports.full", label: "Full data exports" },
];

export default async function PermissionsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("role_permissions").select("role, permission");
  return <PermissionsClient allPermissions={ALL_PERMISSIONS} grants={data ?? []} />;
}
