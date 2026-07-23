import Link from "next/link";
import { Building2, CalendarPlus, ListTodo, UserPlus } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard";
import { contactName } from "@/lib/contact-helpers";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import type { AiWidgetRow } from "@/components/dashboard/ai-widget";

const QUICK_ACTIONS = [
  { label: "New contact", href: "/contacts/new", icon: UserPlus },
  { label: "New practice", href: "/practices/new", icon: Building2 },
  { label: "New task", href: "/tasks?new=1", icon: ListTodo },
  { label: "New event", href: "/calendar?new=1", icon: CalendarPlus },
] as const;

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
  ].join(" · ");

  return (
    <div>
      <div className="mb-8">
        <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.08em] text-gold-deep">
          {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
        </p>
        <h1 className="font-serif text-[32px] font-semibold leading-[1.05] tracking-[-0.01em] text-ink sm:text-[44px]">
          Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"},{" "}
          <span className="italic text-gold-deep">{firstName}</span>
        </h1>
        <p className="mt-3 text-[15px] text-fg-2">{summary}</p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="inline-flex items-center gap-2 rounded-[11px] border border-line bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-fg-1 transition-colors hover:border-gold hover:bg-gold-tint"
              >
                <Icon size={15} className="text-gold-deep" />
                {a.label}
              </Link>
            );
          })}
        </div>
      </div>
      <DashboardGrid data={data} ai={ai} initialConfig={layoutRow?.dashboard_layout ?? null} />
    </div>
  );
}
