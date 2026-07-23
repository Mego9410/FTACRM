"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult , dbFail } from "@/lib/action-result";

const MAX_BYTES = 20 * 1024 * 1024;

export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  const me = await requireProfile();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file.");
  if (file.size > MAX_BYTES) return fail("Files are limited to 20 MB.");

  const link = {
    contact_id: (formData.get("contact_id") as string) || null,
    practice_id: (formData.get("practice_id") as string) || null,
    deal_id: (formData.get("deal_id") as string) || null,
  };
  if (!link.contact_id && !link.practice_id && !link.deal_id) return fail("No record link.");
  const categoryId = (formData.get("category_id") as string) || null;
  const path = String(formData.get("path"));

  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  const storagePath = `${link.contact_id ?? link.practice_id ?? link.deal_id}/${Date.now()}-${safeName}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("documents")
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || "application/octet-stream",
    });
  if (uploadError) return fail(`Upload failed: ${uploadError.message}`);

  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    category_id: categoryId,
    ...link,
    uploaded_by: me.id,
  });
  if (error) return dbFail(error);
  revalidatePath(path);
  return ok();
}

export async function getDocumentUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", parsed.data.id)
    .single();
  if (!doc) return fail("Document not found.");
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 60 * 10);
  if (error || !data) return fail("Could not create download link.");
  return ok({ url: data.signedUrl });
}

export async function deleteDocument(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid(), path: z.string() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path, uploaded_by")
    .eq("id", parsed.data.id)
    .single();
  if (!doc) return fail("Document not found.");
  if (doc.uploaded_by !== me.id && me.role !== "admin") {
    return fail("Only the uploader or an administrator can delete a document.");
  }
  const admin = createAdminClient();
  await admin.storage.from("documents").remove([doc.storage_path]);
  const { error } = await supabase.from("documents").delete().eq("id", parsed.data.id);
  if (error) return dbFail(error);
  revalidatePath(parsed.data.path);
  return ok();
}
