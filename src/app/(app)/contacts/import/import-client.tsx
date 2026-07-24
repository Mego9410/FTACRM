"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardHeader, Field, Select } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { parseCsv } from "@/lib/csv";
import { importContacts } from "../csv-actions";

// Target fields we can import into, with header aliases for auto-mapping.
const FIELDS: { key: string; label: string; aliases: string[] }[] = [
  { key: "first_name", label: "First name", aliases: ["first name", "firstname", "first", "forename"] },
  { key: "last_name", label: "Last name", aliases: ["last name", "lastname", "surname", "last"] },
  { key: "company_name", label: "Company", aliases: ["company", "company name", "organisation", "organization", "practice"] },
  { key: "email", label: "Email", aliases: ["email", "e-mail", "email address"] },
  { key: "phone", label: "Phone", aliases: ["phone", "telephone", "tel", "landline"] },
  { key: "mobile", label: "Mobile", aliases: ["mobile", "cell", "cellphone"] },
  { key: "town", label: "Town", aliases: ["town", "city"] },
  { key: "postcode", label: "Postcode", aliases: ["postcode", "post code", "zip"] },
  { key: "roles", label: "Roles (buyer/seller…)", aliases: ["role", "roles", "type"] },
];
const IGNORE = "__ignore__";

export function ImportClient() {
  const router = useRouter();
  const toast = useToast();
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<string[][]>([]);
  const [map, setMap] = React.useState<Record<string, string>>({}); // fieldKey -> column index (string) | IGNORE
  const [busy, setBusy] = React.useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ""));
      if (parsed.length < 1) return toast.error("That file looks empty.");
      const hdr = parsed[0]!;
      const body = parsed.slice(1);
      setHeaders(hdr);
      setRows(body);
      // Auto-map by header name.
      const auto: Record<string, string> = {};
      for (const f of FIELDS) {
        const idx = hdr.findIndex((h) => f.aliases.includes(h.trim().toLowerCase()));
        auto[f.key] = idx >= 0 ? String(idx) : IGNORE;
      }
      setMap(auto);
    };
    reader.readAsText(file);
  }

  async function doImport() {
    setBusy(true);
    const mapped = rows.map((r) => {
      const obj: Record<string, unknown> = {};
      for (const f of FIELDS) {
        const col = map[f.key];
        if (col && col !== IGNORE) {
          const raw = (r[Number(col)] ?? "").trim();
          if (!raw) continue;
          obj[f.key] = f.key === "roles" ? raw.split(/[;,/]/).map((s) => s.trim().toLowerCase()).filter(Boolean) : raw;
        }
      }
      return obj;
    });
    const res = await importContacts({ rows: mapped });
    setBusy(false);
    if (!res.ok || !res.data) return toast.error(res.ok ? "Import failed." : res.error);
    toast.success(`Imported ${res.data.created} contact${res.data.created === 1 ? "" : "s"}${res.data.skipped ? `, skipped ${res.data.skipped}` : ""}.`);
    router.push("/contacts");
  }

  return (
    <Card>
      <CardHeader title="Upload a CSV" />
      <div className="space-y-4 p-5">
        <div>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="block w-full text-sm text-fg-2 file:mr-3 file:rounded-md file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-fg-1 hover:file:bg-surface-3" />
          <p className="mt-1.5 text-xs text-fg-3">The first row should be column headers. We&apos;ll try to match them automatically — adjust the mapping below if needed.</p>
        </div>

        {headers.length > 0 ? (
          <>
            <div className="rounded-lg border border-line">
              <p className="border-b border-line px-4 py-2 text-xs font-bold uppercase tracking-wide text-fg-4">Map columns · {rows.length} rows</p>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <Field key={f.key} label={f.label} htmlFor={`map_${f.key}`}>
                    <Select id={`map_${f.key}`} value={map[f.key] ?? IGNORE} onChange={(e) => setMap((m) => ({ ...m, [f.key]: e.target.value }))}>
                      <option value={IGNORE}>— Don&apos;t import —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={String(i)}>{h || `Column ${i + 1}`}</option>
                      ))}
                    </Select>
                  </Field>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={doImport} disabled={busy}>{busy ? "Importing…" : `Import ${rows.length} contacts`}</Button>
              <span className="text-xs text-fg-3">Rows without a name, company or email are skipped.</span>
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
