"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { exportContactsCsv } from "./csv-actions";

/** Export + import controls for the contacts list header. */
export function ContactsIo() {
  const params = useSearchParams();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function exportCsv() {
    setBusy(true);
    const res = await exportContactsCsv({
      q: params.get("q") ?? undefined,
      role: params.get("role") ?? undefined,
      archived: params.get("archived") ?? undefined,
    });
    setBusy(false);
    if (!res.ok || !res.data) return toast.error(res.ok ? "Nothing to export." : res.error);
    const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.data.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Contacts exported.");
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/contacts/import">
        <Button variant="outline" className="gap-1.5"><Upload size={15} /> Import</Button>
      </Link>
      <Button variant="outline" onClick={exportCsv} disabled={busy} className="gap-1.5">
        <Download size={15} /> Export
      </Button>
      <Link href="/contacts/new">
        <Button>New contact</Button>
      </Link>
    </div>
  );
}
