"use client";

import type { ReportColumn } from "@/lib/reports";
import { formatGBP } from "@/lib/utils";

type Row = Record<string, string | number | null>;

/* ── Cell formatting ────────────────────────────────────────────────── */

/** Human display value for a cell (used by the on-screen table and the PDF). */
export function formatReportCell(col: ReportColumn, v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  switch (col.type) {
    case "money":
      return formatGBP(typeof v === "number" ? v : Number(v) || 0);
    case "number":
      return typeof v === "number" ? v.toLocaleString("en-GB") : String(v);
    case "date":
      return formatUkDate(v, false);
    case "datetime":
      return formatUkDate(v, true);
    default:
      return String(v);
  }
}

/** Raw value for spreadsheet export: numbers stay numeric, dates stay ISO. */
function exportValue(col: ReportColumn, v: string | number | null | undefined): string | number {
  if (v === null || v === undefined) return "";
  if ((col.type === "money" || col.type === "number") && typeof v === "number") return v;
  return String(v);
}

function formatUkDate(v: string | number, withTime: boolean): string {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

/* ── Download helpers ───────────────────────────────────────────────── */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(s: string) {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV — opens cleanly in Excel/Numbers/Sheets (BOM added for Excel). */
export function downloadCsv(filename: string, columns: ReportColumn[], rows: Row[]) {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => csvEscape(String(exportValue(c, r[c.key])))).join(","))
    .join("\r\n");
  triggerDownload(new Blob(["﻿" + header + "\r\n" + body], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

/** Excel .xlsx via SheetJS, lazy-loaded so it never bloats the initial bundle. */
export async function downloadXlsx(filename: string, sheetName: string, columns: ReportColumn[], rows: Row[]) {
  const XLSX = await import("xlsx");
  const aoa = [columns.map((c) => c.label), ...rows.map((r) => columns.map((c) => exportValue(c, r[c.key])))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = columns.map((c) => ({ wch: Math.max(12, c.label.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Print-to-PDF: opens a clean, branded print view and triggers the print dialog. */
export function printReport(title: string, subtitle: string, columns: ReportColumn[], rows: Row[]) {
  const w = window.open("", "_blank", "width=1024,height=768");
  if (!w) return;
  const esc = (s: string) => s.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]!);
  const head = columns.map((c) => `<th class="${c.type === "money" || c.type === "number" ? "num" : ""}">${esc(c.label)}</th>`).join("");
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => `<td class="${c.type === "money" || c.type === "number" ? "num" : ""}">${esc(formatReportCell(c, r[c.key]))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    * { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 28px; color: #1a1a17; }
    .bar { height: 4px; background: #E4AD25; margin: -28px -28px 20px; }
    h1 { font-size: 20px; margin: 0; }
    .sub { color: #6b6b66; font-size: 12px; margin: 4px 0 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e7e7e4; }
    th { text-transform: uppercase; letter-spacing: .04em; font-size: 9px; color: #6b6b66; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    tr:nth-child(even) td { background: #faf9f7; }
    .foot { margin-top: 16px; color: #9a9a95; font-size: 10px; }
    @media print { .bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body>
    <div class="bar"></div>
    <h1>${esc(title)}</h1>
    <div class="sub">${esc(subtitle)}</div>
    <table><thead><tr>${head}</tr></thead><tbody>${rowsHtml}</tbody></table>
    <div class="foot">${rows.length} rows · Aspen — Frank Taylor &amp; Associates</div>
    <script>window.onload=function(){window.print();}</script>
  </body></html>`);
  w.document.close();
}
