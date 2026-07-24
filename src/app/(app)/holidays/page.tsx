import { requireProfile } from "@/lib/auth";
import { getMyHolidayRequests } from "@/lib/holidays";
import { PageHeader } from "@/components/shell/page-header";
import { HolidaysClient } from "./holidays-client";

export const metadata = { title: "My holiday" };

export default async function HolidaysPage() {
  const me = await requireProfile();
  const requests = await getMyHolidayRequests(me.id);

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Time off"
        title="My holiday"
        subtitle="Request annual leave and track where each request is up to"
      />
      <HolidaysClient requests={requests} />
    </div>
  );
}
