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
