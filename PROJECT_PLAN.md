# Zohra Project Plan

## 1. Purpose

This plan turns the repository review into an ordered, actionable path toward a reliable first release. It describes the current product, the work recommended for the first release, work to defer, dependencies, and the criteria for calling the release ready.

## 2. Project snapshot

Zohra is a Next.js application with account sign-in, an authenticated personal resource library, private file uploads through Vercel Blob, and text extraction for selectable-text PDFs. The repository already contains resource APIs, per-user resource ownership checks, duplicate detection using file checksums, PDF extraction status tracking, and library screens.

The current implementation and product copy do not fully agree:

- Several marketing sections describe a different product named Atlas and promise notes, tasks, calendars, teams, and other capabilities that are not implemented.
- Pricing and social-proof content contains placeholders.
- The upload UI and README mention video uploads, while server validation and Blob upload authorization do not accept video files.
- Some dashboard content is static or labels newly added files as recently opened.
- Settings includes switches that only change local page state and are not persisted.
- Account deletion removes database records but does not remove the user's files from Blob storage.
- Email verification is required in the authentication configuration, while SMTP is documented as optional and email delivery is skipped when SMTP is not configured.
- The README describes an `.env.example` file that was not present in the project file listing during review.
- There is no dedicated automated test script documented in the README.

The authenticated app roadmap is now being implemented against the existing PostgreSQL, Prisma, private Blob, and Better Auth setup. Email verification remains enabled and therefore requires working SMTP configuration for email/password registration.

## 2.1 Implementation status

### Implemented in this pass

- Persistent personal task records, user-scoped create/list/update/delete APIs, date filters, priorities, and task completion.
- A `/tasks` route with All, Today, Upcoming, Overdue, and Completed filters, task editing, due-date labels, status controls, and deletion confirmation.
- Dashboard resource and task counts, current date and account greeting, recent additions, today's task checklist, and conditional overdue summary.
- App navigation limited to implemented routes, working resource search from the shared header, and replacement of hard-coded badges and simulated task controls.
- Resource filename search, type cards, All/Recently added/Needs review views, working type filters and sort options, file size and processing state, and confirmed deletion.
- Upload wording and picker aligned to PDF, Office, text/Markdown, and JPEG/PNG support; failed uploads attempt cleanup and can be retried; duplicates point users back to the existing library item.
- Profile verification state, a single profile editor, removal of data-URI avatar upload, and removal of unsaved notification/focus settings.
- Account deletion now clears the user's private Blob objects before database cascades; a retry can continue after a partial Blob cleanup failure.
- Public home, About, and Plans pages aligned to current features; placeholder pricing, fake destinations, and old product naming have been removed from the live pages.
- `.env.example`, SMTP requirements, Google sign-in visibility, route documentation, and supported file documentation updated.

### Still required before release

- Apply the new task migration to the target PostgreSQL database and regenerate Prisma Client in the target environment.
- Configure and exercise PostgreSQL, the private Blob store, SMTP verification mail, and optional Google OAuth.
- Run the critical-path and ownership checks described in Phase 6, then complete a staging smoke pass.
- Confirm deployment project root and production environment values against the actual Vercel project.

## 3. First-release product definition

### Product promise

Zohra gives an individual user a private place to upload, organize, and revisit project resources. For eligible PDFs, it extracts selectable text so users can read that text in the library.

### Include in the first release

- Email and password accounts, with Google sign-in available when configured.
- A private resource library scoped to the signed-in user.
- Uploads to private storage with explicit file-type and size limits.
- Duplicate-file feedback for the same user's library.
- Resource listing, type/status filtering, and deletion.
- PDF text extraction with understandable states for extracted text, no embedded text, and extraction failure.
- Profile editing and account deletion that also cleans up the user's stored files.
- Responsive screens, useful empty states, and accurate user-facing status messages.
- Setup and deployment instructions that match the implemented authentication, database, storage, and migration requirements.

### Defer from the first release

- Paid subscriptions, billing, and plan enforcement.
- Team accounts, shared libraries, and shared permissions.
- Notes, calendar, and full project-management features. A small personal task list is included in the proposed app roadmap below; team/project task management remains deferred.
- AI analysis, summaries, semantic search, and OCR for scanned PDFs.
- Offline mode and claims of cross-device synchronization beyond the existing signed-in web app behavior.
- Video playback or previews until their expected behavior and storage support are defined.
- Data export and support-service promises until their processes are implemented.

## 4. Work plan

### Phase 0 — Confirm product and upload decisions

**Goal:** Settle the first-release promise and the exact file contract before further feature work.

**Work:**

1. Confirm that the first release is a personal resource library with PDF text extraction.
2. Decide the canonical supported file list. Compare the upload UI, client validation, server validation, Blob content-type allowlist, database metadata, README, and marketing copy.
3. Decide explicitly whether videos are in scope. If not, remove video claims from the UI and docs. If yes, add video MIME types and extensions consistently and decide whether the first release stores videos only or also provides previews/playback.
4. Confirm the maximum file size and the behavior users should see when a file exceeds it.
5. Record which external services are required for local development and production: PostgreSQL, Vercel Blob, authentication secret, base URLs, and SMTP if email verification remains mandatory.

**Deliverables:** A short product scope statement and one authoritative supported-file matrix used by implementation and documentation.

**Depends on:** None.

### Phase 1 — Align product identity and public claims

**Goal:** Make the public product experience accurately represent Zohra's first-release capabilities.

**Work:**

1. Replace Atlas naming and placeholder positioning across the landing page, About, Pricing, FAQ, showcase, and footer.
2. Describe the actual resource upload, organization, and PDF text extraction experience.
3. Remove or replace `$X` pricing, placeholder logos, fabricated testimonials, placeholder statistics, and unsupported claims about features such as teams, tasks, notes, calendars, offline use, and exports.
4. Use the existing app experience or showcase video for product visuals. Remove template instructions and empty preview placeholders before release.
5. Check navigation links, contact addresses, social links, and calls to action so they point to real Zohra destinations.

**Deliverables:** Public pages with consistent branding and verifiable capability claims.

**Depends on:** Phase 0 product decision.

### Phase 2 — Make uploads consistent and recoverable

**Goal:** Ensure the upload experience behaves consistently from file selection through persistence.

**Work:**

1. Apply the supported-file matrix from Phase 0 in both client and server validation and in Blob upload authorization.
2. Validate file name, extension, declared MIME type, size, and uploaded content as appropriate. Treat client metadata as untrusted input.
3. Handle concurrent duplicate submissions cleanly and return a clear duplicate-file message.
4. Define the lifecycle of a resource record created before the Blob transfer. If transfer or completion fails, provide a retry or cleanup path so abandoned `PENDING` records do not accumulate.
5. Make upload status transitions accurate in the UI and refresh the saved-resource list after completion instead of assuming every file is immediately `READY`.
6. Ensure deletion works for both completed uploads and incomplete/pending records. Report storage or database cleanup failures clearly.
7. Review large-file behavior and extraction limits. Keep extraction failures separate from upload failures so a stored file remains visible when only PDF processing fails.

**Deliverables:** One reliable upload lifecycle with visible outcomes, duplicate handling, and cleanup for failed or abandoned uploads.

**Depends on:** Phase 0 supported-file decision.

### Phase 3 — Complete storage and account lifecycle handling

**Goal:** Ensure user deletion and resource deletion cover both database records and external files.

**Work:**

1. Update account deletion so it identifies and removes the user's Blob objects as well as database records.
2. Define failure handling for partial deletion. The API must not claim complete deletion if file cleanup failed; use retryable cleanup or a durable deletion workflow where needed.
3. Keep ownership checks on every resource listing, deletion, extraction, and extracted-text retrieval operation.
4. Review storage keys and file metadata handling so user-supplied names cannot change the ownership boundary or overwrite another resource.
5. Confirm duplicate-check behavior for resources that are pending, failed, or removed.

**Deliverables:** Resource deletion and account deletion with explicit, recoverable outcomes across PostgreSQL and Blob storage.

**Depends on:** Phase 2 resource lifecycle behavior.

### Phase 4 — Resolve authentication and configuration gaps

**Goal:** Make account creation and local/deployed setup work according to the documented configuration.

**Work:**

1. Decide whether email verification is required for the first release.
2. If required, treat SMTP as a required setup dependency for email/password registration and document a safe local development approach. If verification is not required, update the auth configuration and user-facing copy together.
3. Verify the configured Google sign-in behavior when credentials are absent and when they are present.
4. Add a safe `.env.example` containing variable names and non-secret placeholders, if the project intends to document that file.
5. Update the README and deployment guide with required variables, optional integrations, database migration steps, storage setup, and the real Vercel project root/build command.
6. Confirm Prisma generation and migration behavior are both clearly described for the deployed repository configuration.

**Deliverables:** A reproducible local setup and a deployment checklist consistent with the auth and storage implementation.

**Depends on:** A decision about email verification and the chosen deployment setup.

### Phase 5 — Make authenticated screens truthful and useful

**Goal:** Remove simulated product behavior and make the existing resource workflows clear.

**Work:**

1. Replace the dashboard's hard-coded date and fixed “Good morning, Zohra” greeting with current date and signed-in user information, or remove those elements if they add little value.
2. Rename “Recently opened” to “Recently added” unless the app begins tracking actual opens.
3. Replace static dashboard cards with useful links or real resource counts and statuses. Remove cards that imply task or project functionality.
4. Make resource filters and tabs produce the labels and results they promise. In particular, verify “Subjects,” “Recently added,” and “Needs review” behavior.
5. Implement the displayed sort control or remove the inactive “Sort by: Name” label.
6. For email notifications and focus mode, either implement persistence and define their effects or defer/remove the controls from the first release.
7. Improve error, empty, pending, extraction-failed, and deletion states so users can tell what happened and what action is available.

**Deliverables:** Dashboard, library, and settings screens that represent real data and working controls.

**Depends on:** Phase 0 product scope; can proceed alongside Phases 2–4 after the scope is set.

### Phase 6 — Release checks and operational readiness

**Goal:** Establish confidence in the core user journeys and the deployment process.

**Work:**

1. Add automated checks for supported-file validation, ownership scoping, duplicate handling, upload failure cleanup, and account/resource deletion.
2. Cover PDF extraction outcomes: extracted text, no embedded text, and processing failure.
3. Add an end-to-end smoke checklist for sign-up/sign-in, upload, library visibility, extracted-text viewing, resource deletion, and account deletion.
4. Verify database migrations against a clean database and document the production migration step.
5. Verify required environment variables and storage configuration in a staging deployment.
6. Review logs and user-visible errors for accidental exposure of secrets or private file content.

**Deliverables:** Automated critical-path checks, a release smoke checklist, and a repeatable deployment procedure.

**Depends on:** Phases 2–5 for stable expected behavior.

### Phase 7 — Build the personal task feature

**Goal:** Replace the current task placeholders with a real, useful personal task list.

**Work:**

1. Add a `Task` data model linked to the signed-in user. Include a required title; optional description and due date; a status (`TODO`, `IN_PROGRESS`, `DONE`); a priority; and created/updated timestamps. Index common queries by user, status, and due date.
2. Add authenticated APIs to list, create, update, and delete tasks. Every database query must be scoped to the current user. Validate title length, status, priority, and date inputs on the server.
3. Create a real `/tasks` route and update the sidebar “Tasks” link to point to it. Provide a simple list view first, with All, Today, Upcoming, Overdue, and Completed filters.
4. Let users add, edit, complete/reopen, and delete tasks. Confirm destructive deletion and make completion state immediately clear.
5. Sort unfinished tasks by due date and priority, with tasks lacking due dates grouped after dated tasks. Make overdue and due-today states understandable without relying on color alone.
6. Add loading, empty, validation, and error states. Keep the first version personal and single-user; do not build team assignment or shared tasks.
7. Add a database migration and checks for user ownership, task validation, status changes, and due-date filters.

**Deliverables:** Persistent personal tasks with a working route, APIs, filters, and accurate counts for the dashboard and sidebar.

**Depends on:** First-release scope, database migration setup, and the authenticated app shell.

## 5. Screen-by-screen next additions

This section is the immediate product backlog for the signed-in application. It prioritizes connecting existing UI to real data, then adding the personal task workflow.

### A. Dashboard cards and dashboard overview

1. Replace the three static cards (“Navigation complete,” “Build your dashboard,” and “Start a new project”) with real summary cards:
   - **Resources:** total resources and an action to open the library.
   - **Tasks due today:** open today's task list.
   - **Overdue tasks:** open overdue tasks, only when the count is above zero.
   - **Completed this week:** show actual completed task activity once that data is available.
2. Make every card link to its relevant screen and filter. Do not show a clickable card that only links back to the dashboard.
3. Replace the fixed date and “Good morning, Zohra” with the current date and the signed-in user's name. Keep the greeting optional if there is no useful personalization.
4. Rename “Recently opened” to “Recently added” unless resource-open activity is recorded. Show real resource types, added dates, and a clear empty state.
5. Add a compact “Today's tasks” list with the next few due items, checkboxes backed by the task API, and a link to the full task list.
6. Keep summary queries small and user-scoped. If they become expensive, add focused summary endpoints rather than fetching the entire library for each card.

### B. Tasks

1. Add a `/tasks` page and persistent Task model using the fields in Phase 7.
2. Start with a clear list rather than a complex board. Provide quick task creation, edit, completion, deletion, and the All/Today/Upcoming/Overdue/Completed filters.
3. Display due dates, priority, and status consistently. Add sensible defaults: new tasks start as `TODO`, with no due date and normal priority.
4. Connect task counts and the Today's tasks panel to the same server-backed task data.
5. Do not add recurring tasks, subtasks, reminders, calendar sync, or team assignment in the first task version. Revisit those after the basic flow is in use.

### C. Resources

1. Replace the “Subjects” label with a label that matches what the cards contain, such as “File types” or “Collections.” Today those cards group files by type; they are not user-created subjects.
2. Make each type card open the library with that type filter applied, or render the matching resources directly below it.
3. Make All, Recently added, and Needs review tabs actually filter the displayed results. Ensure the filter dropdown applies on every relevant tab and on small screens.
4. Implement the visible sort control (name, newest, oldest, and optionally file size) or remove it until it works.
5. Add functional search by file name. Reuse the global search only after it has a real behavior and clear result scope.
6. Show file type, size, date added, upload state, and PDF extraction state. Add a clear action to view extracted PDF text and distinguish “no embedded text” from processing failure.
7. Add a confirmation step for deletion and refresh the library after success. Keep bulk deletion and user-defined collections for a later iteration.
8. Decide whether resources need open/download/preview actions in the first release. If included, serve private files through an authenticated, ownership-checked path.

### D. Upload

1. Use one shared file support contract across the picker, drag-and-drop validation, resource API, and Blob token route. Decide whether videos are supported before showing video upload copy.
2. Show file name, type, size, validation result, upload progress, and final state for every queued file.
3. Add retry and remove-from-queue actions. Prevent duplicate clicks from creating duplicate pending records.
4. On upload failure, clean up or allow retrying the pending database record; do not leave invisible or confusing records behind.
5. After successful storage, show the true resource-processing state. Non-PDF files should be `READY` with extraction marked not applicable; PDF extraction failure should not be presented as a failed file upload.
6. Add clear duplicate-file feedback and a way to navigate to the existing resource.
7. Keep PDF text extraction as the only document-processing feature until extraction for other formats is explicitly planned.

### E. Profile

1. Keep Profile as a read-only summary of the user's current display name, email, avatar, account verification state, and member-since date.
2. Make the edit action open one canonical profile editor in Settings, avoiding two different profile forms.
3. Replace the current embedded base64 avatar data approach with managed image storage before encouraging avatar uploads broadly. Restrict image formats, keep the size limit, and provide replace/remove actions.
4. Show whether the email address is verified. Add email-change and re-verification only if the authentication flow and support process are ready.
5. Provide useful fallback initials and handle long names and missing profile fields cleanly.

### F. Settings

1. Separate settings into clear sections: Profile, Preferences, Security, and Account.
2. Keep profile name/avatar editing in one place. Avoid duplicating the profile form on multiple routes.
3. Remove the Email notifications and Focus mode switches until they persist and have defined behavior, or implement persistence with user preferences in the database.
4. Include appearance/theme preference only if the selected preference is saved and consistently applied; the current app already has theme support.
5. Add password-change or session-management actions only when the Better Auth flow is wired and verified.
6. Keep account deletion behind explicit confirmation, then ensure it cleans database records and private Blob objects and reports partial failures accurately.

### G. Shared app shell and navigation

1. Update the sidebar so Resources, Tasks, Calendar, and Team entries do not all route to `/dashboard`. Link only implemented sections; hide or mark later sections clearly.
2. Remove hard-coded sidebar badges such as “3” resources and “12” tasks. Replace them with real per-user counts where useful.
3. Replace the hard-coded “Today” tasks and completion progress with server-backed tasks from the personal task feature.
4. Change the header action from “New project” to an action the product supports, such as “Upload resource” or “New task.”
5. Make search functional for resources first. Keep Messages and Notifications hidden until they have real destinations and behavior.
6. Check active navigation state and mobile navigation after adding `/tasks` and any future routes.

## 6. Suggested sequencing

| Order | Workstream | Reason |
| --- | --- | --- |
| 1 | Confirm first-release scope and file support | Prevents contradictory implementation and claims. |
| 2 | Correct navigation and app-shell placeholders | Stops users being routed to unrelated or fake sections. |
| 3 | Stabilize upload and resource workflows | These are the current core product flows. |
| 4 | Complete resource/account deletion | Prevents orphaned private files and misleading success. |
| 5 | Resolve verification and setup requirements | Makes account creation and deployment reproducible. |
| 6 | Add personal tasks and connect dashboard summaries | Replaces fake task UI with persistent user data. |
| 7 | Complete profile/settings and library search/filter behaviors | Finishes common everyday workflows. |
| 8 | Add release checks and staging verification | Confirms the core path before release. |

Phases 2, 3, and 4 have dependencies and should be coordinated around the chosen upload and authentication behavior. The dashboard's task cards depend on Phase 7. Resource search and filters can be implemented before tasks; task counts and due-date cards must wait for persistent task data.

## 7. Release acceptance criteria

The first release is ready when all of the following are true:

- A new user can create an account using the documented configuration and complete any required verification step.
- A signed-in user can upload every supported file type and receives a clear explanation for rejected files.
- Upload success, pending work, and failure states match the actual database and storage state.
- A user's library and resource APIs expose only resources owned by that user.
- Duplicate files are handled clearly and do not create inconsistent resource records.
- Eligible PDFs expose extracted text; scanned/no-text PDFs and extraction failures show accurate statuses.
- A user can delete a resource and can delete their account without leaving stored files behind, or receives an explicit recoverable failure outcome.
- Dashboard, filters, settings, and marketing pages do not claim functionality that is not implemented.
- Dashboard and sidebar task counts reflect persistent per-user tasks; task list actions persist after reload.
- Setup and deployment instructions list the real required variables, migration steps, and storage requirements.
- Critical user journeys have automated checks or a documented release smoke checklist, and the app has been verified in a staging-like environment.

## 8. Explicitly out of scope for this plan's first release

Do not start implementation of subscriptions, team workspaces, notes, calendar sync, AI analysis, OCR, offline use, video playback, recurring tasks, or export features until product requirements define their user workflows, data model, operational dependencies, and release criteria. These features may be reconsidered after the resource library and personal task list are stable and user needs are clearer.

## 9. Review boundaries

The initial repository review was read-only. Implementation now includes persistent personal tasks and their APIs, a task migration, data-backed dashboard cards, corrected app navigation, resource filtering/search/sorting, upload retry and cleanup behavior, profile verification display, removal of unsaved settings and avatar controls, Blob account cleanup, an environment template, and setup documentation. The public pages now describe Zohra's current individual resource and task features without placeholder pricing or Atlas copy. Apply the committed migrations and validate app behavior with PostgreSQL, Blob, and SMTP configured. Automated checks and staging verification remain release work.
