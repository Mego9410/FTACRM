import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { getHelpTopic, HELP_TOPICS } from "@/lib/help-content";

export function generateStaticParams() {
  return HELP_TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getHelpTopic(slug);
  return { title: topic ? `${topic.title} · Help` : "Help" };
}

export default async function HelpTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getHelpTopic(slug);
  if (!topic) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/help" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-deep hover:underline">
        <ArrowLeft size={15} /> All help topics
      </Link>
      <h1 className="text-[28px] font-extrabold tracking-tight text-fg-1">{topic.title}</h1>
      <p className="mt-1 text-fg-3">{topic.summary}</p>

      <div className="mt-6 space-y-4">
        {topic.sections.map((s, i) => (
          <Card key={i} className="p-5">
            <h2 className="text-[15px] font-bold text-fg-1">{s.heading}</h2>
            {s.body.map((p, j) => (
              <p key={j} className="mt-2 text-sm leading-relaxed text-fg-2">{p}</p>
            ))}
            {s.bullets ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg-2">
                {s.bullets.map((b, k) => (
                  <li key={k}>{b}</li>
                ))}
              </ul>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
