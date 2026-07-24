"use client";

import { useRouter } from "next/navigation";
import { Download, ArchiveX } from "lucide-react";
import { BulkBar, downloadCsv, type BulkAction } from "@/components/shell/bulk-select";
import { useToast } from "@/components/ui/toast";
import { exportPracticesByIds, bulkWithdrawPractices } from "./csv-actions";

export function PracticesBulkBar() {
  const router = useRouter();
  const toast = useToast();

  const actions: BulkAction[] = [
    {
      label: "Export",
      icon: <Download size={14} />,
      run: async (ids) => {
        const res = await exportPracticesByIds({ ids });
        if (!res.ok || !res.data) return toast.error(res.ok ? "Nothing to export." : res.error);
        downloadCsv(res.data.filename, res.data.csv);
        toast.success(`Exported ${ids.length} practices.`);
      },
    },
    {
      label: "Take off market",
      icon: <ArchiveX size={14} />,
      danger: true,
      run: async (ids) => {
        if (!window.confirm(`Mark ${ids.length} practice${ids.length === 1 ? "" : "s"} as withdrawn? They stay on the database.`)) return;
        const res = await bulkWithdrawPractices({ ids });
        if (!res.ok) return toast.error(res.error);
        toast.success(`${ids.length} practices withdrawn.`);
        router.refresh();
      },
    },
  ];

  return <BulkBar noun="practice" actions={actions} />;
}
