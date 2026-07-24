"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { setContactStatus } from "../actions";

const OPTIONS = ["Open", "Active", "Nurturing", "On hold", "Not proceeding", "Completed"];

export function ContactStatusControl({ id, status }: { id: string; status: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const options = status && !OPTIONS.includes(status) ? [status, ...OPTIONS] : OPTIONS;

  async function change(next: string) {
    if (next === (status ?? "")) return;
    setBusy(true);
    const res = await setContactStatus({ id, status: next });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Status updated.");
    router.refresh();
  }

  return (
    <span className="relative inline-flex items-center">
      <select
        value={status ?? ""}
        disabled={busy}
        onChange={(e) => void change(e.target.value)}
        aria-label="Contact status"
        className="cursor-pointer appearance-none rounded-full border border-gold/40 bg-gold-tint py-0.5 pl-2.5 pr-6 text-xs font-bold text-gold-deep hover:border-gold focus:outline-none"
      >
        <option value="">Set status…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-1.5 text-gold-deep" />
    </span>
  );
}
