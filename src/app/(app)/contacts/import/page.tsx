import { requireProfile } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shell/page-header";
import { ImportClient } from "./import-client";

export const metadata = { title: "Import contacts" };

export default async function ImportContactsPage() {
  const me = await requireProfile();
  await requirePermission(me, "contacts.edit");
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Contacts" title="Import contacts" subtitle="Upload a CSV to add many contacts at once" />
      <ImportClient />
    </div>
  );
}
