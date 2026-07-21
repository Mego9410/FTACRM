import { AspenWordmark } from "@/components/shell/brand";

export const metadata = { title: "Setup required" };
export const dynamic = "force-dynamic";

const REQUIRED = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", hint: "Supabase → Project settings → API → Project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", hint: "Supabase → Project settings → API → anon public key" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", hint: "Supabase → Project settings → API → service_role key" },
  { name: "NEXT_PUBLIC_APP_URL", hint: "This deployment's URL, e.g. https://ftacrm.vercel.app" },
  { name: "CRON_SECRET", hint: "Any long random string — protects the cron endpoints" },
];

/**
 * Shown (via middleware rewrite) whenever the deployment has no Supabase
 * configuration — a clear checklist instead of a server crash. Reports only
 * which variable NAMES are set, never values.
 */
export default function SetupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-xl rounded-lg border border-line bg-surface p-8 shadow-sm">
        <AspenWordmark className="h-8 w-auto" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-fg-1">
          Nearly there — this deployment needs configuring
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-2">
          The app is deployed but can't reach its database yet. Add the environment variables
          below in Vercel (Project → Settings → Environment variables), then redeploy — env
          changes only take effect on a fresh deployment.
        </p>
        <ul className="mt-5 space-y-2.5">
          {REQUIRED.map((v) => {
            const set = Boolean(process.env[v.name]);
            return (
              <li key={v.name} className="flex items-start gap-3 rounded-sm border border-line px-4 py-2.5">
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    set ? "bg-private-bg text-private-fg" : "bg-danger-bg text-danger"
                  }`}
                >
                  {set ? "✓" : "✕"}
                </span>
                <span>
                  <code className="text-[13px] font-bold text-fg-1">{v.name}</code>
                  <span className="block text-xs text-fg-3">{v.hint}</span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-xs leading-relaxed text-fg-3">
          Once the variables are set: apply <code>supabase/migrations/</code> and{" "}
          <code>supabase/seed.sql</code> to the Supabase project, create a{" "}
          <code>documents</code> storage bucket, and create your first admin user — the full
          walkthrough is in the repository README under “Getting it running”.
        </p>
      </div>
    </main>
  );
}
