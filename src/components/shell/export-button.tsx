"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { downloadCsv } from "@/components/shell/bulk-select";

type ExportResult = { ok: true; data?: { filename: string; csv: string } } | { ok: false; error: string };

/** Header "Export CSV" button. Reads the given query params and passes them to
 * the server export action, then downloads the result. */
export function ExportButton({
  action,
  paramKeys,
  label = "Export",
}: {
  action: (input: unknown) => Promise<ExportResult>;
  paramKeys: string[];
  label?: string;
}) {
  const params = useSearchParams();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function run() {
    setBusy(true);
    const input: Record<string, string> = {};
    for (const k of paramKeys) {
      const v = params.get(k);
      if (v) input[k] = v;
    }
    const res = await action(input);
    setBusy(false);
    if (!res.ok || !res.data) return toast.error(res.ok ? "Nothing to export." : res.error);
    downloadCsv(res.data.filename, res.data.csv);
    toast.success("Exported.");
  }

  return (
    <Button variant="outline" onClick={run} disabled={busy} className="gap-1.5">
      <Download size={15} /> {label}
    </Button>
  );
}
