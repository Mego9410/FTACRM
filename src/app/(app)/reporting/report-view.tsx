"use client";

import * as React from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import type { ReportColumn } from "@/lib/reports";
import { Button, Card, EmptyState } from "@/components/ui/primitives";
import { SortTh, useClientSort } from "@/components/ui/sortable";
import { downloadCsv, downloadXlsx, formatReportCell, printReport } from "@/lib/export";
import { cn } from "@/lib/utils";

type Row = Record<string, string | number | null>;

export function ReportView({
  title,
  subtitle,
  filename,
  columns,
  rows,
}: {
  title: string;
  subtitle: string;
  filename: string;
  columns: ReportColumn[];
  rows: Row[];
}) {
  const accessors = React.useMemo(
    () => Object.fromEntries(columns.map((c) => [c.key, (r: Row) => r[c.key]])),
    [columns],
  );
  const { sorted, toggle, stateFor } = useClientSort(rows, accessors);
  const [busy, setBusy] = React.useState(false);

  const numericKeys = columns.filter((c) => c.type === "money" || c.type === "number").map((c) => c.key);
  const totals: Record<string, number> = {};
  for (const k of numericKeys) {
    totals[k] = rows.reduce((s, r) => s + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);
  }
  const showTotals = numericKeys.length > 0 && rows.length > 0;
  const isNum = (c: ReportColumn) => c.type === "money" || c.type === "number";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-3">
          {rows.length.toLocaleString("en-GB")} {rows.length === 1 ? "row" : "rows"}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCsv(filename, columns, sorted)}>
            <Download size={14} /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || rows.length === 0}
            onClick={async () => {
              setBusy(true);
              try {
                await downloadXlsx(filename, title, columns, sorted);
              } finally {
                setBusy(false);
              }
            }}
          >
            <FileSpreadsheet size={14} /> Excel
          </Button>
          <Button variant="outline" size="sm" disabled={rows.length === 0} onClick={() => printReport(title, subtitle, columns, sorted)}>
            <Printer size={14} /> PDF
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        {rows.length === 0 ? (
          <EmptyState className="m-4" title="No data for this report" body="Try a different period." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-fg-3">
                {columns.map((c) => (
                  <SortTh
                    key={c.key}
                    label={c.label}
                    sortKey={c.key}
                    state={stateFor(c.key)}
                    onSort={toggle}
                    align={isNum(c) ? "right" : "left"}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                  {columns.map((c, ci) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3 py-2.5",
                        isNum(c) && "text-right tabular-nums",
                        ci === 0 && "font-semibold text-fg-1",
                      )}
                    >
                      {formatReportCell(c, r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {showTotals ? (
                <tr className="border-t-2 border-line bg-surface-2/50 font-bold text-fg-1">
                  {columns.map((c, ci) => (
                    <td key={c.key} className={cn("px-3 py-2.5", isNum(c) && "text-right tabular-nums")}>
                      {ci === 0 ? "Total" : c.key in totals ? formatReportCell(c, totals[c.key]) : ""}
                    </td>
                  ))}
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
