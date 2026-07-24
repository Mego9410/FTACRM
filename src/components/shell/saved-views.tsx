"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Check, Plus, Trash2 } from "lucide-react";
import { Menu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { listSavedViews, saveView, deleteSavedView, type SavedView } from "@/lib/actions/saved-views";

/** Named filter presets for a list. Saves the current query string and lets the
 * user re-apply it. Scoped to the current user. */
export function SavedViews({ entity }: { entity: "contacts" | "practices" | "deals" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const [views, setViews] = React.useState<SavedView[]>([]);

  const load = React.useCallback(() => {
    void listSavedViews(entity).then(setViews);
  }, [entity]);
  React.useEffect(() => load(), [load]);

  const currentQuery = React.useMemo(() => {
    const sp = new URLSearchParams(params.toString());
    sp.delete("page");
    return sp.toString();
  }, [params]);

  async function save() {
    const name = window.prompt("Name this view (e.g. \"Hot buyers, London\")");
    if (!name?.trim()) return;
    const res = await saveView({ entity, name: name.trim(), query: currentQuery });
    if (!res.ok) return toast.error(res.error);
    toast.success("View saved.");
    load();
  }

  async function remove(id: string) {
    const res = await deleteSavedView({ id });
    if (!res.ok) return toast.error(res.error);
    load();
  }

  return (
    <Menu
      trigger={
        <span className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 text-sm font-semibold text-fg-2 hover:border-fg-4/80" title="Saved views">
          <Bookmark size={15} /> Views{views.length ? ` (${views.length})` : ""}
        </span>
      }
      className="w-64"
    >
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-fg-4">Saved views</div>
      {views.length === 0 ? (
        <p className="px-3 pb-2 text-sm text-fg-3">No saved views yet.</p>
      ) : (
        views.map((v) => {
          const active = v.query === currentQuery;
          return (
            <div key={v.id} className="flex items-center gap-1 px-1.5">
              <button
                type="button"
                onClick={() => router.push(v.query ? `${pathname}?${v.query}` : pathname)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
              >
                {active ? <Check size={14} className="shrink-0 text-gold-deep" /> : <span className="w-3.5 shrink-0" />}
                <span className="truncate text-fg-1">{v.name}</span>
              </button>
              <button type="button" onClick={() => void remove(v.id)} className="shrink-0 rounded p-1.5 text-fg-4 hover:bg-surface-3 hover:text-danger" aria-label={`Delete ${v.name}`}>
                <Trash2 size={13} />
              </button>
            </div>
          );
        })
      )}
      <div className="mt-1 border-t border-line">
        <button type="button" onClick={() => void save()} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-gold-deep hover:bg-surface-2">
          <Plus size={14} /> Save current filters
        </button>
      </div>
    </Menu>
  );
}
