/**
 * Deepgram pre-recorded transcription (EU endpoint, en-GB, diarised).
 * Env-gated on DEEPGRAM_API_KEY; wrapped so the vendor can swap (fallback:
 * Azure AI Speech UK South) without touching callers.
 */

export function transcriptionConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

type DeepgramResponse = {
  results?: {
    channels?: {
      alternatives?: {
        transcript?: string;
        words?: { word: string; speaker?: number; punctuated_word?: string }[];
      }[];
    }[];
  };
  err_msg?: string;
};

/** Transcribe an audio buffer → diarised "Agent:/Caller:" transcript. */
export async function transcribeAudio(
  audio: ArrayBuffer,
  mimeType: string,
): Promise<string> {
  if (!transcriptionConfigured()) throw new Error("DEEPGRAM_API_KEY not configured");
  const params = new URLSearchParams({
    model: "nova-2",
    language: "en-GB",
    diarize: "true",
    punctuate: "true",
    smart_format: "true",
  });
  const res = await fetch(`https://api.eu.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": mimeType,
    },
    body: audio,
    signal: AbortSignal.timeout(120_000),
  });
  const json = (await res.json()) as DeepgramResponse;
  if (!res.ok) throw new Error(json.err_msg ?? `Deepgram ${res.status}`);

  const alt = json.results?.channels?.[0]?.alternatives?.[0];
  if (!alt) throw new Error("Deepgram returned no transcript");

  // Rebuild diarised turns from word-level speaker labels.
  const words = alt.words ?? [];
  if (words.length === 0) return alt.transcript ?? "";
  const lines: string[] = [];
  let speaker = -1;
  let current: string[] = [];
  const label = (s: number) => (s === 0 ? "Agent" : "Caller");
  for (const w of words) {
    const s = w.speaker ?? 0;
    if (s !== speaker) {
      if (current.length > 0) lines.push(`${label(speaker)}: ${current.join(" ")}`);
      speaker = s;
      current = [];
    }
    current.push(w.punctuated_word ?? w.word);
  }
  if (current.length > 0) lines.push(`${label(speaker)}: ${current.join(" ")}`);
  return lines.join("\n");
}
