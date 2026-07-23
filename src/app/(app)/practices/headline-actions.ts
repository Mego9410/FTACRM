"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Upload (or replace) a practice's headline photo. Falls back to the map when absent. */
export async function uploadPracticeHeadline(formData: FormData): Promise<ActionResult> {
  const me = await requireProfile();
  const practiceId = String(formData.get("practice_id") ?? "");
  if (!z.string().uuid().safeParse(practiceId).success) return fail("Invalid practice.");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image.");
  if (file.size > MAX_BYTES) return fail("Images are limited to 10 MB.");
  if (!ALLOWED.includes(file.type)) return fail("Use a JPG, PNG, WebP or GIF image.");

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: existing } = await supabase
    .from("practices")
    .select("headline_image_path")
    .eq("id", practiceId)
    .single();

  const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const storagePath = `practice-headline/${practiceId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("documents")
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) return fail(`Upload failed: ${uploadError.message}`);

  const { error } = await supabase
    .from("practices")
    .update({ headline_image_path: storagePath })
    .eq("id", practiceId);
  if (error) return dbFail(error);

  // Best-effort tidy of the previous file.
  const prev = (existing as { headline_image_path: string | null } | null)?.headline_image_path;
  if (prev) await admin.storage.from("documents").remove([prev]);

  await audit("practices", practiceId, me.id, [{ field: "headline_image", oldValue: prev ?? null, newValue: "uploaded" }]);
  revalidatePath(`/practices/${practiceId}`, "layout");
  return ok();
}

/** Remove the headline photo, reverting to the generated map. */
export async function removePracticeHeadline(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("practices")
    .select("headline_image_path")
    .eq("id", parsed.data.id)
    .single();
  const path = (existing as { headline_image_path: string | null } | null)?.headline_image_path;

  const { error } = await supabase
    .from("practices")
    .update({ headline_image_path: null })
    .eq("id", parsed.data.id);
  if (error) return dbFail(error);
  if (path) await createAdminClient().storage.from("documents").remove([path]);

  await audit("practices", parsed.data.id, me.id, [{ field: "headline_image", oldValue: "photo", newValue: null }]);
  revalidatePath(`/practices/${parsed.data.id}`, "layout");
  return ok();
}
