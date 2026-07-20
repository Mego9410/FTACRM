import { requireProfile } from "@/lib/auth";
import { getSidebarData } from "@/lib/sidebar";
import { AppNav } from "@/components/shell/app-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const sidebar = await getSidebarData(profile.id).catch(() => null);
  return (
    <div className="min-h-screen bg-surface-2">
      <AppNav profile={profile} sidebar={sidebar}>
        {children}
      </AppNav>
    </div>
  );
}
