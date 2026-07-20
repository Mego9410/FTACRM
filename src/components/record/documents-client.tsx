"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { LookupValue } from "@/lib/lookups";
import { Badge, Button, EmptyState, Select } from "@/components/ui/primitives";
import { SortSelect, useClientSort } from "@/components/ui/sortable";
import { deleteDocument, getDocumentUrl, uploadDocument } from "@/lib/actions/documents";

type Doc = {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  category_id: string | null;
  created_at: string;
  uploaded_by: string | null;
};

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsClient({
  documents,
  categories,
  link,
  path,
}: {
  documents: Doc[];
  categories: LookupValue[];
  link: { contact_id: string | null; practice_id: string | null; deal_id: string | null };
  path: string;
}) {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [categoryId, setCategoryId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { sorted, key, dir, set } = useClientSort(
    documents,
    {
      file_name: (d) => d.file_name,
      size_bytes: (d) => d.size_bytes,
      created_at: (d) => d.created_at,
      category: (d) => (d.category_id ? categories.find((c) => c.id === d.category_id)?.value ?? "" : ""),
    },
    { key: "created_at", dir: "desc" },
  );

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file);
      if (link.contact_id) fd.set("contact_id", link.contact_id);
      if (link.practice_id) fd.set("practice_id", link.practice_id);
      if (link.deal_id) fd.set("deal_id", link.deal_id);
      if (categoryId) fd.set("category_id", categoryId);
      fd.set("path", path);
      const res = await uploadDocument(fd);
      if (!res.ok) {
        setError(res.error);
        break;
      }
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload size={14} /> {busy ? "Uploading…" : "Upload"}
        </Button>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-48" aria-label="Category for new uploads">
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.value}</option>
          ))}
        </Select>
        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
        {documents.length > 0 ? (
          <SortSelect
            className="ml-auto"
            options={[
              { key: "file_name", label: "Name" },
              { key: "size_bytes", label: "Size" },
              { key: "created_at", label: "Uploaded" },
              { key: "category", label: "Category" },
            ]}
            sortKey={key}
            dir={dir}
            onChange={set}
          />
        ) : null}
      </div>

      {documents.length === 0 ? (
        <EmptyState title="No documents" body="Contracts, accounts, ID checks and correspondence live here." />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {sorted.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
              <FileText size={18} className="shrink-0 text-fg-3" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg-1">{d.file_name}</p>
                <p className="text-xs text-fg-3">
                  {[formatBytes(d.size_bytes), d.uploaded_by, formatDateTime(d.created_at)].filter(Boolean).join(" · ")}
                </p>
              </div>
              {d.category_id ? (
                <Badge>{categories.find((c) => c.id === d.category_id)?.value ?? "—"}</Badge>
              ) : null}
              <button
                type="button"
                title="Download"
                className="rounded p-1.5 text-fg-3 hover:bg-surface-3 hover:text-fg-1"
                onClick={async () => {
                  const res = await getDocumentUrl({ id: d.id });
                  if (res.ok && res.data) window.open(res.data.url, "_blank");
                }}
              >
                <Download size={15} />
              </button>
              <button
                type="button"
                title="Delete"
                className="rounded p-1.5 text-fg-3 hover:bg-surface-3 hover:text-danger"
                onClick={async () => {
                  if (!window.confirm(`Delete “${d.file_name}”?`)) return;
                  await deleteDocument({ id: d.id, path });
                  router.refresh();
                }}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
