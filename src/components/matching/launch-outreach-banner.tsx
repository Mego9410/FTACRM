"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Mail, Megaphone, X } from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { relativeTime } from "@/lib/utils";
import { acceptSuggestion, dismissSuggestion } from "@/lib/actions/ai-suggestions";

type OutreachSuggestion = {
  id: string;
  created_at: string;
  payload: {
    buyers?: { contact_id: string; name: string; score: number; temperature: string | null }[];
    total?: number;
  };
};

/** Flag raised automatically the moment a practice goes to market: the ranked
 *  buyers to speak to first, with one click through to emailing them. */
export function LaunchOutreachBanner({
  suggestion,
  practiceId,
}: {
  suggestion: OutreachSuggestion;
  practiceId: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const buyers = suggestion.payload.buyers ?? [];
  const emailHref = `/campaigns/new?contacts=${buyers.map((b) => b.contact_id).join(",")}&practice=${practiceId}`;

  return (
    <div className="mb-4 rounded-lg border border-gold/50 bg-gold-tint/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-fg-1">
            <Megaphone size={15} className="text-gold-deep" />
            Gone to market — {suggestion.payload.total ?? buyers.length} buyers matched automatically
          </p>
          <p className="mt-0.5 text-xs text-fg-3">
            Ranked against every buyer's criteria {relativeTime(suggestion.created_at)}. These are the
            people to speak to first:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {buyers.slice(0, 6).map((b) => (
              <Link key={b.contact_id} href={`/contacts/${b.contact_id}`}>
                <Badge tone={b.temperature === "hot" ? "danger" : "gold"} className="cursor-pointer hover:opacity-80">
                  {b.name} · {b.score}
                </Badge>
              </Link>
            ))}
            {buyers.length > 6 ? <Badge>+{buyers.length - 6} more below</Badge> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href={emailHref}>
            <Button size="sm">
              <Mail size={14} /> Email top {buyers.length}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            title="Mark handled"
            onClick={async () => {
              await acceptSuggestion({ id: suggestion.id, path });
              router.refresh();
            }}
          >
            Done
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Dismiss"
            onClick={async () => {
              await dismissSuggestion({ id: suggestion.id, path });
              router.refresh();
            }}
          >
            <X size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
