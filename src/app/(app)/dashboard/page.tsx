import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard";
import { contactName } from "@/lib/contact-helpers";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import type { AiWidgetRow } from "@/components/dashboard/ai-widget";

export const metadata = { title: "My day" };

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [data, { data: layoutRow }, { data: suggestions }] = await Promise.all([
    getDashboardData(profile.id),
    supabase.from("profiles").select("dashboard_layout").eq("id", profile.id).maybeSingle(),
    supabase
      .from("ai_suggestions")
      .select(
        `id, kind, payload, created_at, contact_id, practice_id, deal_id,
         contacts!ai_suggestions_contact_id_fkey(first_name, last_name, company_name),
         practices!ai_suggestions_practice_id_fkey(display_title)`,
      )
      .eq("status", "proposed")
      .or(`for_profile_id.eq.${profile.id},for_profile_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const ai: AiWidgetRow[] = (suggestions ?? []).map((s) => {
    const contact = s.contacts as unknown as { first_name: string | null; last_name: string | null; company_name: string | null } | null;
    const practice = s.practices as unknown as { display_title: string } | null;
    const p = s.payload as { title?: string; subject?: string; buyers?: unknown[] };
    const title =
      s.kind === "email_draft"
        ? `Draft follow-up: ${p.subject ?? "email"}`
        : s.kind === "outreach"
          ? `${(p.buyers as unknown[] | undefined)?.length ?? 0} matched buyers ready to contact`
          : (p.title ?? "Suggestion");
    return {
      id: s.id,
      kind: s.kind as AiWidgetRow["kind"],
      title,
      context: contact ? contactName(contact) : (practice?.display_title ?? null),
      href: s.contact_id
        ? `/contacts/${s.contact_id}/journal`
        : s.practice_id
          ? `/practices/${s.practice_id}/matched`
          : s.deal_id
            ? `/deals/${s.deal_id}`
            : "/dashboard",
      createdAt: s.created_at,
    };
  });

  const firstName = profile.full_name.split(" ")[0];
  const hour = new Date().getHours();
  const openTasks = data.stats.openTasks;
  const eventsToday = data.todayEvents.length;
  const summary = [
    `${openTasks} open ${openTasks === 1 ? "task" : "tasks"}`,
    `${eventsToday} ${eventsToday === 1 ? "event" : "events"} today`,
  ].join("  ·  ");

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-xl border border-line bg-gradient-to-br from-gold-tint/70 via-surface to-surface px-6 py-6 shadow-xs sm:px-8 sm:py-7">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gold/15 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 right-24 h-36 w-36 rounded-full bg-nhs-fg/10 blur-2xl" />
        <div className="relative">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-deep">
            {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
          </p>
          <h1 className="text-[24px] font-extrabold tracking-tight text-fg-1 sm:text-[30px]">
            Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"},{" "}
            <span className="text-gold-deep">{firstName}</span>
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-fg-2">{summary}</p>
        </div>
      </div>
      <DashboardGrid data={data} ai={ai} initialConfig={layoutRow?.dashboard_layout ?? null} />
    </div>
  );
}
