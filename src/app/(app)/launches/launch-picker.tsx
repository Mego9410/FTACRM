"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { Button, Card, Select } from "@/components/ui/primitives";

export function LaunchPicker({
  practices,
}: {
  practices: { id: string; ref: string; display_title: string; town: string | null; status: string }[];
}) {
  const router = useRouter();
  const [practiceId, setPracticeId] = React.useState("");

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 p-5">
        <Rocket size={20} className="shrink-0 text-gold-deep" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-fg-1">Start a launch</p>
          <p className="text-xs text-fg-3">Preparing and available practices can be launched to their matched buyers</p>
        </div>
        <Select
          value={practiceId}
          onChange={(e) => setPracticeId(e.target.value)}
          className="w-full sm:w-96"
          aria-label="Practice to launch"
        >
          <option value="">Choose a practice…</option>
          {practices.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ref} — {p.display_title}{p.town ? `, ${p.town}` : ""}
            </option>
          ))}
        </Select>
        <Button disabled={!practiceId} onClick={() => router.push(`/launches/new?practice=${practiceId}`)}>
          Set up launch
        </Button>
      </div>
    </Card>
  );
}
