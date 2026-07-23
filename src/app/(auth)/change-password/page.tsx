import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { AspenWordmark } from "@/components/shell/brand";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export const metadata = { title: "Set your password" };
// Render at request time — this reads the signed-in profile.
export const dynamic = "force-dynamic";

export default async function ForcedChangePasswordPage() {
  const profile = await getProfile();
  if (!profile) redirect("/sign-in");

  return (
    <main className="flex min-h-screen flex-col bg-surface-2">
      <div className="h-1 bg-gold" />
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <AspenWordmark className="h-11 w-auto" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fg-4">
              Frank Taylor &amp; Associates
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
            <p className="mb-1 text-sm font-semibold text-fg-1">Choose your password</p>
            <p className="mb-4 text-sm text-fg-3">
              For security, set your own password before continuing. Enter the temporary password you were
              given, then a new one.
            </p>
            <ChangePasswordForm
              currentLabel="Temporary password"
              submitLabel="Set password and continue"
              redirectTo="/dashboard"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
