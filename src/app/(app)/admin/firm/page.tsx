import { requireRole } from "@/lib/auth";
import { getFirmSettings } from "@/lib/firm-settings";
import { FirmSettingsClient } from "./firm-client";

export const metadata = { title: "Firm settings" };

export default async function FirmSettingsPage() {
  await requireRole("admin");
  const settings = await getFirmSettings();
  return <FirmSettingsClient settings={settings} />;
}
