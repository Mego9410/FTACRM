# AGENTS.md

Project-specific guidance for AI agents. Read `CLAUDE.md` and `PLAN.md` first for product
context and working rules; this file adds environment/runtime notes.

## Cursor Cloud specific instructions

The app is a single Next.js 15 (App Router) + Supabase CRM. Package manager is **pnpm**.
Standard scripts live in `package.json` (`dev`, `build`, `typecheck`, `test`, `lint`).

### Backing services

Running the app end to end needs a local **Supabase** stack (Postgres + Auth + Storage).
The VM snapshot already has **Docker** and the **Supabase CLI** installed; `supabase init`
has been run, so `supabase/config.toml` is committed. The update script only refreshes
Node deps (`pnpm install`) — it does NOT start services.

Bring the environment up each session (Docker + Supabase are services, so they are not in
the update script):

1. **Start Docker** if it isn't running (needed by the Supabase CLI):
   `sudo dockerd &` — then, once, make the socket usable without sudo:
   `sudo chmod 666 /var/run/docker.sock`. Docker uses the `fuse-overlayfs` storage driver
   (configured in `/etc/docker/daemon.json`) because the kernel lacks full overlay2 support.
2. **Start Supabase**: `supabase start` (first start on a fresh DB volume auto-applies
   `supabase/migrations/*.sql`, then `supabase/seed.sql`, then `supabase/grants.sql`). It
   prints the local API URL and keys. Studio is at http://localhost:54323, the API at
   http://localhost:54321, mailpit (auth emails) at http://localhost:54324.
3. **Env file**: `.env.local` (gitignored) must contain the local Supabase URL + anon +
   service-role keys and is read by `pnpm dev`. Use `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`
   (see gotcha below). If `.env.local` is missing, recreate it from `.env.example` using the
   keys printed by `supabase start`.
4. **First admin user** (Auth has no seeded users — GoTrue manages `auth.users`, so
   `seed.sql` can't create them). Create + promote one:
   ```
   SR=<SERVICE_ROLE_KEY from `supabase start`>
   curl -s -X POST http://127.0.0.1:54321/auth/v1/admin/users \
     -H "apikey: $SR" -H "Authorization: Bearer $SR" -H "Content-Type: application/json" \
     -d '{"email":"admin@fta.local","password":"Password123!","email_confirm":true,"user_metadata":{"full_name":"FTA Admin"}}'
   docker exec supabase_db_workspace psql -U postgres -d postgres \
     -c "update public.profiles set role='admin' where email='admin@fta.local';"
   ```
   A profile row is auto-created by the `on_auth_user_created` trigger (default role
   `agent`); the update promotes it to `admin`. Then sign in at http://localhost:3000/sign-in.
5. **Run the app**: `pnpm dev` → http://localhost:3000.
6. **(Optional) Demo data**: `supabase/demo-data.sql` adds dummy practices, buyers, sellers,
   solicitors, offers, deals across progression stages, and correspondence for exploring the
   flow. Load it AFTER the admin user exists (it attributes ownership/authorship to the first
   profile) and it is idempotent:
   `docker exec -i supabase_db_workspace psql -U postgres -d postgres < supabase/demo-data.sql`.
   It is not auto-seeded (so it stays out of fresh resets / hosted); rerun it after a
   `supabase db reset`.

### Non-obvious gotchas

- **Public-schema grants (critical).** A fresh local Supabase stack sets the `public`
  schema default privileges so `anon`/`authenticated` only get TRUNCATE/REFERENCES/TRIGGER
  on new tables — NOT SELECT/INSERT/UPDATE/DELETE. The app's migrations rely on Supabase's
  usual full default grants (present on the hosted project) and don't GRANT explicitly, so
  without a fix every authenticated query fails with `permission denied for table ...`
  (SQLSTATE 42501) and **sign-in silently bounces back to `/sign-in`** (middleware passes,
  but the layout can't read the user's profile). `supabase/grants.sql` restores the standard
  grants and is wired into `[db.seed].sql_paths` in `config.toml`, so `supabase start` /
  `supabase db reset` apply it automatically. Do not remove it.
- **Use `localhost`, not `127.0.0.1`, for the Supabase URL** in `.env.local`. The app is
  served on `localhost:3000`; keeping the Supabase host as `localhost` too avoids
  host-mismatch confusion for the browser auth-cookie flow. Changing `.env.local` requires a
  dev-server restart (Next inlines `NEXT_PUBLIC_*` at build/compile time).
- **`supabase db reset` wipes `auth.users`** — recreate the admin user (step 4) afterward.
- **Lint is currently broken repo-wide**: `pnpm lint` fails with "ESLint couldn't find an
  eslint.config file" — no flat ESLint config is committed (ESLint 9 requires
  `eslint.config.*`). This is a pre-existing repo gap, not an environment issue.
- `pnpm dev` logs live in the tmux session; middleware `console.log` output does not reliably
  surface there — verify auth/session issues against the DB or the REST API instead.
