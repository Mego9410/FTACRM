"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import type { MonthlyFigures } from "@/lib/monthly-figures";

export function MonthlyToolbar({ figures }: { figures: MonthlyFigures }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setMonth(month: string) {
    if (!month) return;
    const sp = new URLSearchParams(params.toString());
    sp.set("month", month);
    router.push(`${pathname}?${sp.toString()}`);
  }

  function exportCsv() {
    const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [["Section", "Metric", "Value", "Value (£)"].join(",")];
    for (const section of figures.sections) {
      for (const row of section.rows) {
        lines.push([esc(section.title), esc(row.label), row.value, row.money ?? ""].join(","));
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly-figures-${figures.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Input
        type="month"
        aria-label="Month"
        defaultValue={figures.month}
        onChange={(e) => setMonth(e.target.value)}
        className="w-44"
      />
      <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
        <Download size={14} /> Export CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
        <Printer size={14} /> Print
      </Button>
    </div>
  );
}
