import { listHolidayRequests } from "@/lib/holidays";
import { HolidaysAdminClient } from "./holidays-admin-client";

export const metadata = { title: "Holiday" };

export default async function AdminHolidaysPage() {
  const all = await listHolidayRequests();
  const pending = all.filter((r) => r.status === "pending");
  const decided = all.filter((r) => r.status !== "pending").slice(0, 40);

  return (
    <div>
      <h1 className="mb-1 text-lg font-extrabold text-fg-1">Holiday</h1>
      <p className="mb-4 text-sm text-fg-3">Review and approve staff annual-leave requests. Approved leave appears on the team calendar.</p>
      <HolidaysAdminClient pending={pending} decided={decided} />
    </div>
  );
}
