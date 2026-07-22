"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { LookupValue } from "@/lib/lookups";
import type { SegmentEvaluation } from "@/lib/email/segment";
import { TAG_PALETTE } from "@/lib/merge-tags";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { previewSegment, queueCampaign, saveCampaignDraft } from "./actions";

type Template = { id: string; name: string; subject: string; body_html: string; record_context: string };

function TogglePills({
  options,
  selected,
  onChange,
}: {
  options: { id: string; value: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(active ? selected.filter((x) => x !== o.id) : [...selected, o.id])}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              active ? "bg-ink text-white" : "bg-surface-3 text-fg-2 hover:text-fg-1",
            )}
          >
            {o.value}
          </button>
        );
      })}
    </div>
  );
}

export function CampaignComposer({
  lookups,
  templates,
  explicitContactIds,
  practice,
  sendingEnabled,
}: {
  lookups: { fundings: LookupValue[]; tenures: LookupValue[]; specialisms: LookupValue[] };
  templates: Template[];
  explicitContactIds: string[];
  practice: { id: string; display_title: string } | null;
  sendingEnabled: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(practice ? `New instruction — ${practice.display_title}` : "");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const bodyRef = React.useRef<HTMLTextAreaElement>(null);

  // Segment state
  const usingExplicit = explicitContactIds.length > 0;
  const [temperature, setTemperature] = React.useState<string[]>([]);
  const [fundings, setFundings] = React.useState<string[]>([]);
  const [tenures, setTenures] = React.useState<string[]>([]);
  const [specialisms, setSpecialisms] = React.useState<string[]>([]);
  const [minBudget, setMinBudget] = React.useState("");
  const [notContacted, setNotContacted] = React.useState("");

  const [evaluation, setEvaluation] = React.useState<SegmentEvaluation | null>(null);
  const [counting, setCounting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const segment = React.useMemo(
    () =>
      usingExplicit
        ? { explicit_contact_ids: explicitContactIds }
        : {
            roles: ["buyer"],
            temperature: temperature.length ? temperature : undefined,
            funding_type_ids: fundings.length ? fundings : undefined,
            tenure_type_ids: tenures.length ? tenures : undefined,
            specialism_ids: specialisms.length ? specialisms : undefined,
            min_budget: minBudget ? Number(minBudget.replace(/\D/g, "")) : undefined,
            not_contacted_days: notContacted ? Number(notContacted) : undefined,
          },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usingExplicit, temperature, fundings, tenures, specialisms, minBudget, notContacted],
  );

  React.useEffect(() => {
    let cancelled = false;
    setCounting(true);
    const t = setTimeout(async () => {
      const res = await previewSegment(segment);
      if (!cancelled) {
        if (res.ok && res.data) setEvaluation(res.data);
        setCounting(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [segment]);

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body_html);
  }

  function insertTag(tag: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + tag);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + tag + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + tag.length;
    });
  }

  async function save(queue: boolean) {
    if (!name.trim()) return setError("Give the campaign a name.");
    setBusy(true);
    setError(null);
    const res = await saveCampaignDraft({
      name: name.trim(),
      subject: subject || null,
      body_html: body || null,
      segment_definition: segment,
      practice_id: practice?.id ?? null,
    });
    if (!res.ok || !res.data) {
      setBusy(false);
      return setError(res.ok ? "Save failed." : res.error);
    }
    if (queue) {
      const q = await queueCampaign({ id: res.data.id });
      if (!q.ok) {
        setBusy(false);
        setError(q.error);
        router.push(`/campaigns/${res.data.id}`);
        return;
      }
    }
    setBusy(false);
    router.push(`/campaigns/${res.data.id}`);
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      {/* ── Audience ── */}
      <div className="space-y-5">
        <Card>
          <CardHeader title="Audience" />
          <div className="space-y-4 p-4">
            {usingExplicit ? (
              <p className="text-sm text-fg-2">
                Hand-picked selection of <strong>{explicitContactIds.length}</strong> contacts from
                matching.
              </p>
            ) : (
              <>
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Temperature</p>
                  <TogglePills
                    options={[
                      { id: "hot", value: "Hot" },
                      { id: "warm", value: "Warm" },
                      { id: "cold", value: "Cold" },
                    ]}
                    selected={temperature}
                    onChange={setTemperature}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Looking for funding type</p>
                  <TogglePills options={lookups.fundings} selected={fundings} onChange={setFundings} />
                </div>
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Tenure</p>
                  <TogglePills options={lookups.tenures} selected={tenures} onChange={setTenures} />
                </div>
                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Specialism</p>
                  <TogglePills options={lookups.specialisms} selected={specialisms} onChange={setSpecialisms} />
                </div>
                <Field label="Budget at least (£)" htmlFor="sg_budget" hint="Buyer's max budget covers this figure">
                  <Input id="sg_budget" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} inputMode="numeric" placeholder="500,000" />
                </Field>
                <Field label="Not contacted in (days)" htmlFor="sg_stale">
                  <Input id="sg_stale" value={notContacted} onChange={(e) => setNotContacted(e.target.value)} type="number" min={0} />
                </Field>
              </>
            )}
          </div>
        </Card>

        <Card className="border-gold/50">
          <div className="p-4">
            <p className="text-sm font-bold text-fg-1">
              {counting ? "Counting…" : `${evaluation?.eligible.length ?? 0} sendable recipients`}
            </p>
            {evaluation && evaluation.excluded.length > 0 ? (
              <ul className="mt-1.5 space-y-0.5 text-xs text-fg-3">
                {evaluation.excluded.map((x) => (
                  <li key={x.reason}>
                    {x.count} excluded — {x.reason}
                  </li>
                ))}
              </ul>
            ) : null}
            {evaluation ? (
              <p className="mt-1.5 text-xs text-fg-4">{evaluation.total_matched} matched before exclusions</p>
            ) : null}
          </div>
        </Card>
      </div>

      {/* ── Message ── */}
      <div className="space-y-5">
        <Card>
          <CardHeader
            title="Message"
            action={
              templates.length > 0 ? (
                <Select onChange={(e) => applyTemplate(e.target.value)} defaultValue="" className="w-56" aria-label="Apply template">
                  <option value="">Apply a template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              ) : undefined
            }
          />
          <div className="space-y-4 p-5">
            <Field label="Campaign name (internal)" htmlFor="cc_name">
              <Input id="cc_name" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Subject" htmlFor="cc_subject">
              <Input id="cc_subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="A practice your search has been waiting for" />
            </Field>
            <Field label="Body" htmlFor="cc_body" hint="Plain text with merge tags — wrapped in the branded FTA email shell on send. An unsubscribe link is always appended.">
              <Textarea
                id="cc_body"
                ref={bodyRef as React.Ref<HTMLTextAreaElement>}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                placeholder={"Dear {{contact.salutation|there}},\n\nWe've just brought {{practice.display_title}} to market at {{practice.price_label}}…"}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Merge tags" />
          <div className="space-y-3 p-4">
            {TAG_PALETTE.filter((g) => practice || g.group !== "Practice (marketing-safe)").map((group) => (
              <div key={group.group}>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-fg-4">{group.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.tags.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      title={t.label}
                      onClick={() => insertTag(t.tag)}
                      className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[11px] font-semibold text-fg-2 hover:bg-gold-tint hover:text-gold-deep"
                    >
                      {t.tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-fg-3">
              Practice tags only expose marketing-safe fields — a confidential practice's name and
              address can never appear in a campaign.
            </p>
          </div>
        </Card>

        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
        <div className="flex items-center justify-end gap-2">
          {!sendingEnabled ? (
            <Badge tone="warn">Sending disabled — no provider linked</Badge>
          ) : null}
          <Button variant="outline" disabled={busy} onClick={() => void save(false)}>
            Save draft
          </Button>
          <Button
            disabled={busy || !sendingEnabled || (evaluation?.eligible.length ?? 0) === 0}
            onClick={() => {
              if (
                window.confirm(
                  `Queue this campaign to ${evaluation?.eligible.length ?? 0} recipients? Consent and suppressions are re-checked at send time.`,
                )
              )
                void save(true);
            }}
          >
            {busy ? "Working…" : "Queue send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
