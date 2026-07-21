import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import { LaunchPicker } from "./launch-picker";

export const metadata = { title: "Launches" };

const STATUS_TONE: Record<string, "gold" | "green" | "danger" | "warn" | "neutral"> = {
  draft: "neutral",
  scheduled: "warn",
  sending: "gold",
  sent: "green",
  cancelled: "danger",
};

export default async function LaunchesPage() {
  const supabase = await createClient();

  const [{ data: practices }, { data: launches, error: launchesError }] = await Promise.all([
    supabase
      .from("practices")
      .select("id, ref, display_title, town, status")
      .in("status", ["preparing", "available"])
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("campaigns")
      .select("id, name, status, recipient_count, sent_count, scheduled_at, started_at, created_at, practices!campaigns_practice_id_fkey(display_title, ref)")
      .eq("kind", "launch")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Marketing"
        title="Launches"
        subtitle="Send a new practice to every matched buyer — details pulled automatically, in the FTA design"
      />

      <LaunchPicker practices={practices ?? []} />

      <Card className="mt-5">
        <CardHeader title="Past and scheduled launches" />
        {launchesError ? (
          <p className="px-5 py-6 text-sm text-fg-3">
            Launches need migration 0014_launches.sql running in Supabase first.
          </p>
        ) : (launches ?? []).length === 0 ? (
          <EmptyState title="No launches yet" body="Pick a practice above to send its launch to matched buyers." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-fg-3">
                  <th className="px-5 py-2.5">Launch</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Recipients</th>
                  <th className="px-3 py-2.5">Sent</th>
                  <th className="px-3 py-2.5">Scheduled for</th>
                  <th className="px-3 py-2.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(launches ?? []).map((l) => {
                  const practice = l.practices as unknown as { display_title: string; ref: string } | null;
                  return (
                    <tr key={l.id} className="hover:bg-surface-2">
                      <td className="px-5 py-3">
                        <Link href={`/campaigns/${l.id}`} className="font-semibold text-fg-1 hover:text-gold-deep">
                          {l.name}
                        </Link>
                        {practice ? <p className="text-xs text-fg-3">{practice.ref}</p> : null}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={STATUS_TONE[l.status] ?? "neutral"} className="capitalize">{l.status}</Badge>
                      </td>
                      <td className="px-3 py-3 font-semibold text-fg-1">{l.recipient_count}</td>
                      <td className="px-3 py-3 text-fg-2">{l.sent_count}</td>
                      <td className="px-3 py-3 text-fg-2">{l.scheduled_at ? formatDateTime(l.scheduled_at) : "—"}</td>
                      <td className="px-3 py-3 text-fg-3">{formatDateTime(l.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
