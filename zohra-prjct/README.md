# Zohra

Zohra is a web workspace for keeping project resources together. It includes a public product site, account registration and sign-in, an authenticated dashboard, and a personal resource library for uploading and organizing files. PDF uploads can have their text extracted and stored for viewing in the library.

## Features

- **Accounts:** email and password registration and sign-in, with optional Google sign-in.
- **Personal workspace:** dashboard, resource library, profile, settings, and upload pages behind authentication.
- **File uploads:** drag-and-drop or file-picker uploads to private Vercel Blob storage. Files are limited to 100 MB and checked against the supported file list. SHA-256 checksums prevent adding the same file to one user's library more than once.
- **PDF text extraction:** text-based PDFs are processed after upload. The app records page count and extraction status and stores at most 500,000 extracted characters. Scanned PDFs without embedded text are marked as having no text; other supported file types are marked as not applicable.
- **Library management:** browse resources, filter by type or status, inspect extracted PDF text, and delete resources.
- **Interface:** responsive Next.js app with dark and light themes, built with Tailwind CSS and reusable UI components.

Supported uploads: PDF, DOC/DOCX, PPT/PPTX, TXT, Markdown, JPEG/PNG, and MP4/MOV/WebM. Text extraction is currently implemented for PDFs only.

## Tech stack

- Next.js 16 (App Router), React 19, and TypeScript
- Tailwind CSS 4
- Better Auth with Prisma adapter
- Prisma 7 and PostgreSQL
- Vercel Blob for file storage
- PDF.js for PDF text extraction
- pnpm for package management

## Requirements

- Node.js 20.9 or later
- pnpm (the repository includes `pnpm-lock.yaml`)
- A PostgreSQL database
- A Vercel Blob store and its read/write token for resource uploads

Google OAuth and SMTP are optional. Google credentials enable Google sign-in. SMTP credentials enable the configured sign-up notification email; without SMTP, the app logs a warning and skips sending it.

## Getting started

1. Clone the repository and enter the application directory:

   ```bash
   git clone <repository-url>
   cd zohra-prjct
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

   The package `postinstall` script generates the Prisma client.

3. Create a local environment file from the template:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env`.

4. Set the environment variables described below. For local development, both database URLs can point to the same PostgreSQL database.

5. Apply the database migrations and generate the Prisma client:

   ```bash
   pnpm prisma migrate deploy
   pnpm prisma generate
   ```

   To create and apply a new migration while developing a schema change, use `pnpm prisma migrate dev --name <migration-name>` instead of `migrate deploy`.

6. Start the development server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Put local values in `.env` at the project root. `.env*` files are ignored by Git; do not commit secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection used by the running application through the Prisma PostgreSQL adapter. |
| `DIRECT_URL` | Yes for Prisma CLI operations | Direct PostgreSQL connection used by `prisma.config.ts` for migrations and other Prisma CLI operations. It can be the same value as `DATABASE_URL` if the provider has no pooled/direct connection distinction. |
| `BETTER_AUTH_SECRET` | Yes | Secret used by Better Auth to sign and protect sessions. Use a long, random value. |
| `BETTER_AUTH_URL` | Yes | Server-side base URL for Better Auth, such as `http://localhost:3000` locally or the deployed app URL. |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Recommended | Client-side auth base URL. Defaults to `http://localhost:3000`; set it to the deployed app URL in production. |
| `BLOB_READ_WRITE_TOKEN` | Yes for uploads and PDF extraction | Read/write token for the Vercel Blob store. It is required by the upload flow and private PDF extraction. |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret. Set both Google values to enable Google sign-in. |
| `SMTP_HOST` | Optional | SMTP host for configured email notifications. |
| `SMTP_PORT` | Optional | SMTP port; defaults to `587`. Port `465` enables TLS. |
| `SMTP_USER` | Optional | SMTP username and default sender address. |
| `SMTP_PASS` or `SMTP_PASSWORD` | Optional | SMTP password. `SMTP_PASS` takes precedence. |
| `SMTP_FROM` | Optional | Sender address; defaults to `SMTP_USER`. |

The checked-in `.env.example` currently contains the Blob token placeholder. Add the other values locally based on the table above. A minimal local configuration looks like this:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
BLOB_READ_WRITE_TOKEN="your-vercel-blob-read-write-token"
```

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Next.js development server. |
| `pnpm build` | Generate the Prisma client, then create a production build. |
| `pnpm vercel-build` | Build command intended for Vercel; generates Prisma client before the Next.js build. |
| `pnpm start` | Serve the production build locally. Run `pnpm build` first. |
| `pnpm lint` | Run ESLint. |
| `pnpm prisma generate` | Generate the Prisma client in `lib/generated/prisma`. |
| `pnpm prisma migrate dev --name <name>` | Create and apply a development migration. |
| `pnpm prisma migrate deploy` | Apply committed migrations in a deployment environment. |
| `pnpm prisma studio` | Open Prisma Studio to inspect the configured database. |

## Application routes

### Pages

| Route | Description |
| --- | --- |
| `/` | Public product landing page; signed-in users are redirected to the dashboard. |
| `/about`, `/pricing` | Public marketing pages. |
| `/login`, `/sign-up` | Account access pages. |
| `/dashboard` | Authenticated workspace overview and recent resources. |
| `/resources` | Authenticated resource library. |
| `/upload` | Authenticated resource upload flow. |
| `/profile`, `/settings` | Authenticated account and profile management. |

### API

- `/api/auth/[...all]` — Better Auth endpoints.
- `/api/resources` — list the current user's resources and create a resource record.
- `/api/resources/upload` — authorize and finalize Vercel Blob client uploads.
- `/api/resources/[resourceId]` — fetch or delete a resource owned by the current user.
- `/api/resources/[resourceId]/text` — retrieve extracted text for an owned PDF resource.
- `/api/resources/[resourceId]/extract` — trigger PDF text extraction for an owned resource.
- `/api/account/delete` — delete the signed-in user's account.

Resource APIs require an authenticated session and scope database access to the current user.

## Database and Prisma

The Prisma schema is in `prisma/schema.prisma`; committed migrations are in `prisma/migrations`. The schema stores Better Auth users, sessions, accounts, and verifications, along with resource metadata and PDF extraction results.

The generated Prisma client is written to `lib/generated/prisma` and is ignored by Git. The package install and build scripts generate it automatically. `prisma.config.ts` reads `DIRECT_URL`, while the app's Prisma adapter reads `DATABASE_URL`.

## Deploying to Vercel

1. Import the repository into Vercel and set the project root to `zohra-prjct` if the repository contains this app in a subdirectory.
2. Use pnpm as the package manager. Vercel can detect it from `pnpm-lock.yaml`; the install command can be `pnpm install`.
3. Set the build command to:

   ```bash
   pnpm vercel-build
   ```

4. Add production environment values in **Project Settings → Environment Variables**. At minimum, configure `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, and `BLOB_READ_WRITE_TOKEN`. Add Google and SMTP credentials if those integrations are used.
5. Apply committed database migrations to the production database before or as part of release operations:

   ```bash
   pnpm prisma migrate deploy
   ```

6. Deploy and check the build and runtime logs. A successful build generates the Prisma client, but it does not apply database migrations automatically.

See [VERCEL_SETUP.md](./VERCEL_SETUP.md) for the repository's deployment checklist.

## Project structure

```text
app/
  (marketing)/       Public landing, about, and pricing pages
  (auth)/            Login and sign-up pages
  (app)/             Authenticated dashboard, resources, upload, profile, settings
  api/               Auth, resource, upload, and account API routes
components/          Shared app shell, theme provider, and UI components
hooks/               Shared React hooks
lib/                 Auth, Prisma client, validation, email, PDF helpers
prisma/              Prisma schema and SQL migrations
public/              App icons, logos, and manifest assets
```

## Notes

- Uploads require a valid Blob token and an authenticated account. If upload authorization returns an error, check `BLOB_READ_WRITE_TOKEN` and the Blob store configuration.
- The resource upload API enforces the 100 MB limit and supported MIME types/extensions. It detects duplicate files per user using SHA-256.
- PDF extraction needs access to the uploaded private Blob and the database. A PDF can be stored successfully even if text extraction fails; the resource status and extraction status are tracked separately.
- This repository does not currently define a dedicated automated test script.
