"use client";

import { Download } from "lucide-react";
import { BulkBar, SelectAll, downloadCsv, type BulkAction } from "@/components/shell/bulk-select";
import { useToast } from "@/components/ui/toast";
import { exportDealsByIds } from "./csv-actions";

/** "Select all on page" control for the deals card list toolbar. */
export function DealsSelectAll({ ids }: { ids: string[] }) {
  return (
    <label className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 text-sm font-semibold text-fg-2">
      <SelectAll ids={ids} /> Select all
    </label>
  );
}

export function DealsBulkBar() {
  const toast = useToast();
  const actions: BulkAction[] = [
    {
      label: "Export",
      icon: <Download size={14} />,
      run: async (ids) => {
        const res = await exportDealsByIds({ ids });
        if (!res.ok || !res.data) return toast.error(res.ok ? "Nothing to export." : res.error);
        downloadCsv(res.data.filename, res.data.csv);
        toast.success(`Exported ${ids.length} deals.`);
      },
    },
  ];
  return <BulkBar noun="deal" actions={actions} />;
}
