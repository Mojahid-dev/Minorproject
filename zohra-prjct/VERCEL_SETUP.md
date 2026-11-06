# Vercel deployment

The Next.js application is in this directory. When importing the repository, set the Vercel project root to `zohra-prjct`.

## Build settings

- Package manager: pnpm (from `pnpm-lock.yaml`)
- Install command: `pnpm install` (or allow Vercel to detect pnpm)
- Build command: `pnpm vercel-build`
- Output: use the Next.js default

The build script runs `prisma generate` followed by `next build`. It does not apply database migrations.

## Environment variables

Configure values in Vercel Project Settings → Environment Variables for each target environment:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL runtime connection. |
| `DIRECT_URL` | Provider-dependent | Direct connection for Prisma CLI/migrations; falls back to `DATABASE_URL`. |
| `BETTER_AUTH_SECRET` | Yes | Long, random Better Auth session secret. |
| `BETTER_AUTH_URL` | Yes | Canonical deployed origin. |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Recommended | Client authentication origin; set to the deployed origin. |
| `BLOB_READ_WRITE_TOKEN` | Yes for file workflows | Vercel Blob read/write token. |
| `GEMINI_API_KEY` | Yes for study assistant | Google Gemini API credential. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional | Set both to enable Google sign-in. |
| `ZOHRA_RECOGNITION_REVIEWER_IDS` | Optional | Comma-separated reviewer user IDs. Leave unset if no review accounts should be enabled. |

Do not commit secrets or populate the checked-in `.env.example` with real credentials.

## Release sequence

1. Configure the project root, build settings, and environment variables.
2. If using Google sign-in, add `https://your-domain.com/api/auth/callback/google` to the OAuth client's authorized redirect URIs. Configure the corresponding production origin in the two Better Auth URL variables.
3. Apply committed migrations to the intended production database from this project directory with `pnpm prisma migrate deploy`. Schedule this step before the new code needs the changed schema. Migrations are not automatically run by the Vercel build.
4. Deploy and inspect build and runtime logs. Verify sign-in and the configured resource storage flow; exercise Gemini and OAuth when enabled.

For the full release and troubleshooting notes, see [`../docs/OPERATIONS.md`](../docs/OPERATIONS.md). Local setup and command details are in [`README.md`](README.md).
