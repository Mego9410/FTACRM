import { createClient } from "@/lib/supabase/server";
import { IntroBlocksClient } from "./intro-blocks-client";

export const metadata = { title: "Intro email blocks" };

export default async function IntroBlocksPage() {
  const supabase = await createClient();
  const { data: blocks } = await supabase
    .from("intro_email_blocks")
    .select("id, label, body, is_active")
    .order("sort_order");
  return <IntroBlocksClient blocks={blocks ?? []} />;
}
