import Link from "next/link";
import {
  Compass, UsersRound, Building2, Handshake, FileSignature, ListTodo, Rocket, BarChart3, Settings, LifeBuoy, ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/primitives";
import { HELP_TOPICS } from "@/lib/help-content";

export const metadata = { title: "Help & support" };

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Compass, UsersRound, Building2, Handshake, FileSignature, ListTodo, Rocket, BarChart3, Settings,
};

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Help & support"
        title="How to use the CRM"
        subtitle="Guides for every part of the system. Pick a topic to get started."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {HELP_TOPICS.map((t) => {
          const Icon = ICONS[t.icon] ?? LifeBuoy;
          return (
            <Link key={t.slug} href={`/help/${t.slug}`} className="group block h-full">
              <Card className="flex h-full flex-col gap-2 p-5 transition-all group-hover:-translate-y-[2px] group-hover:shadow-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gold-tint text-gold-deep">
                  <Icon size={18} />
                </span>
                <p className="text-[15px] font-bold text-fg-1">{t.title}</p>
                <p className="flex-1 text-sm text-fg-3">{t.summary}</p>
                <span className="inline-flex items-center gap-1 text-[13px] font-bold text-gold-deep">
                  Read <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Card>
            </Link>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-fg-3">
        Can&apos;t find what you need? Speak to your system administrator — they can adjust settings, permissions and templates for the whole firm.
      </p>
    </div>
  );
}
