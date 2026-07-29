Vercel deployment checklist for Atlas

1) Build command

Set the Vercel Build Command to:

```
pnpm vercel-build
```

This runs `prisma generate` then `next build` (script added in `package.json`).

2) Install command

If using pnpm, set Install Command to:

```
pnpm install
```

(Or leave blank if Vercel detects pnpm automatically.)

3) Environment variables (required)

Add these to Vercel → Project → Settings → Environment Variables:

- `DATABASE_URL` — your Postgres connection string (required)
- `DIRECT_URL` — only if `prisma.config.ts` uses it (optional)

Make sure values are correct for the target environment (production).

4) Redeploy & clear cache

When you trigger a new deploy, choose "Redeploy" and enable "Clear cache" (or use Vercel's redeploy UI option) so the build runs fresh and `prisma generate` executes.

5) Local verification (before pushing)

Run locally to ensure generation and build succeed:

```bash
pnpm prisma generate
pnpm build
```

Confirm `lib/generated/prisma/client.ts` exists after `prisma generate`.

6) Notes and troubleshooting

- Do NOT commit generated Prisma client files into git — rely on `prisma generate` during build.
- If `prisma generate` fails on Vercel, check the build logs to see whether `DATABASE_URL` is available to the build step.
- If your database is private or blocked from the build environment, you can use a `DIRECT_URL` or set up a read-only connection string for generation.

7) Optional: verify versions

Ensure `prisma` and `@prisma/client` are compatible. Update if necessary:

```bash
pnpm add -D prisma@latest
pnpm add @prisma/client@latest
```

If you want, I can prepare these env values or walk you through the Vercel UI steps.
