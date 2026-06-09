# @cloudleak/web

CloudLeak web app (Next.js App Router). Phase 1: auth, organizations, invites, AWS connect.

## Environment

Copy values into `apps/web/.env.local` (gitignored). The Supabase project for this app is
`cloudleak` (`ivgytzevandcqfiiqiow`).

| Var | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** (secret) |
| `CLOUDLEAK_AWS_ACCOUNT_ID` | The 12-digit AWS account customers trust in their role |
| `AWS_REGION` | Region used by the STS client (default `us-east-1`) |

`SUPABASE_SERVICE_ROLE_KEY` is required by the server services and must never be exposed
to the browser. The public URL + anon key are already filled in `.env.local`.

## Quick local login (no OAuth setup)

Google/GitHub require you to create OAuth apps and enable the providers in Supabase. For
fast local testing there is also **email/password** login on `/login`. A ready-made demo
account is seeded in the database:

```
email:    demo@cloudleak.dev
password: CloudLeakDemo123!
```

Phase-1 write actions (create org, invites, AWS connect) run under the **signed-in user's
JWT** with RLS — so the dashboard works locally **without** a service-role key. The
service-role key remains only for the future background worker.

## Run a scan locally (no AWS account)

Set `CLOUDLEAK_FAKE_AWS=1` in `apps/web/.env.local`. With this flag the scan flow uses a
seeded fake inventory client instead of calling AWS, so you can exercise the full
Scans → Resources experience without a connected account. The scan still requires an AWS
account row with `status = 'connected'`; without live STS you can seed one directly in
Supabase. Then open `/scans`, click **Run scan**, and `/resources` populates with seeded
resources and estimated monthly cost. `CLOUDLEAK_SCAN_REGIONS` (default `us-east-1`)
controls which regions are scanned on the real path.

## OAuth providers

Enable Google and GitHub in Supabase → Authentication → Providers, and set the redirect
URL to:

```
http://localhost:3000/auth/callback        # local
https://<your-domain>/auth/callback        # production
```

## Run

```bash
pnpm --filter @cloudleak/web dev      # http://localhost:3000
pnpm --filter @cloudleak/web build
```

## Integration tests

`test/integration/*` run against the real Supabase project and need two extra env vars:

- `TEST_USER_ID` — the id of a real auth user (create one by signing in once, then copy
  the id from Supabase → Authentication → Users).
- `TEST_USER_JWT` — that user's access token. Obtain it by signing in and copying the
  `access_token` from the Supabase session (browser devtools → Application → Local
  Storage → `sb-<ref>-auth-token`), or via the Supabase JS client `getSession()`.

```bash
pnpm --filter @cloudleak/web test
```
