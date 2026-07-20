import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Anthropic API client (plain fetch — no SDK dependency). Env-gated: every
 * feature built on this degrades gracefully when ANTHROPIC_API_KEY is absent.
 * Every call is logged to ai_jobs for cost tracking and reproducibility.
 */

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const REASONING_MODEL = () => process.env.AI_MODEL_REASONING ?? "claude-sonnet-5";

type AiCallArgs = {
  kind: string;
  system: string;
  user: string;
  maxTokens?: number;
  callRecordingId?: string | null;
  practiceId?: string | null;
  requestedBy?: string | null;
};

type AnthropicResponse = {
  content: { type: string; text?: string }[];
  usage?: { input_tokens: number; output_tokens: number };
  model?: string;
  error?: { message: string };
};

/**
 * Run one model call, expecting a single JSON object back (the prompt must ask
 * for JSON only). Returns the parsed object or throws; the ai_jobs row records
 * either way.
 */
export async function aiJson<T>(args: AiCallArgs): Promise<T> {
  if (!aiConfigured()) throw new Error("ANTHROPIC_API_KEY not configured");
  const admin = createAdminClient();
  const { data: job } = await admin
    .from("ai_jobs")
    .insert({
      kind: args.kind,
      status: "running",
      input: { system: args.system.slice(0, 2000), user: args.user.slice(0, 8000) },
      model: REASONING_MODEL(),
      call_recording_id: args.callRecordingId ?? null,
      practice_id: args.practiceId ?? null,
      requested_by: args.requestedBy ?? null,
    })
    .select("id")
    .single();

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: REASONING_MODEL(),
        max_tokens: args.maxTokens ?? 2000,
        system: args.system,
        messages: [{ role: "user", content: args.user }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const json = (await res.json()) as AnthropicResponse;
    if (!res.ok) throw new Error(json.error?.message ?? `Anthropic API ${res.status}`);

    const text = json.content.find((c) => c.type === "text")?.text ?? "";
    // Tolerate prose or fences around the JSON object.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model returned no JSON object");
    const parsed = JSON.parse(match[0]) as T;

    if (job) {
      await admin
        .from("ai_jobs")
        .update({
          status: "done",
          output: parsed as Record<string, unknown>,
          input_tokens: json.usage?.input_tokens ?? null,
          output_tokens: json.usage?.output_tokens ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
    return parsed;
  } catch (err) {
    if (job) {
      await admin
        .from("ai_jobs")
        .update({
          status: "error",
          error: err instanceof Error ? err.message : String(err),
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
    throw err;
  }
}
