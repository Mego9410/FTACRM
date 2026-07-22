import { getLookup } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { PracticeForm } from "../practice-form";

export const metadata = { title: "New practice" };

export default async function NewPracticePage() {
  const [fundings, tenures, specialisms] = await Promise.all([
    getLookup("funding_type"),
    getLookup("tenure_type"),
    getLookup("specialism"),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New practice" subtitle="Starts in Valuation — move it through the lifecycle from the record" />
      <PracticeForm lookups={{ fundings, tenures, specialisms }} />
    </div>
  );
}
