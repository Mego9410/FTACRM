import { requireProfile } from "@/lib/auth";
import { AppNav } from "@/components/shell/app-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  return (
    <div className="min-h-screen bg-surface-2">
      <AppNav profile={profile} />
      <main className="mx-auto w-full max-w-[1400px] overflow-x-clip px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
