import { requireProfile } from "@/lib/auth";
import { AppNav } from "@/components/shell/app-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  return (
    <div className="min-h-screen bg-surface-2">
      <AppNav profile={profile}>{children}</AppNav>
    </div>
  );
}
