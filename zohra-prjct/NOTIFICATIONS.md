# Push notifications

Zohra sends browser push notifications through Web Push. Enable them in **Settings → Notifications** on each device. The notification bell in the app header opens those settings.

## Server setup

Set these variables in `.env.local` for local development and in Vercel Project Settings for each deployed environment:

```text
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=...
```

Generate a VAPID key pair with `npx web-push generate-vapid-keys`. Keep the private key secret. Use a long random value for `CRON_SECRET`. Push also requires a working `DATABASE_URL` and the notification migration applied to that database:

```sh
pnpm prisma migrate deploy
```

The Vercel build does not apply migrations automatically. After deployment, open Settings → Notifications, turn notifications on for the device, and use **Send a test** to confirm delivery.

## Scheduled reminders

Task due and exam reminders are checked by `/api/cron/notifications`. `vercel.json` defines a Vercel Schedule every 30 minutes so each user's local reminder time and repeat interval can be honored. Schedules support this frequency on Hobby, Pro, and Enterprise. Hobby runs can be delayed by up to 15 minutes, so delivery can be delayed by up to 45 minutes, plus device or push-service delays. Vercel sends `GET` requests and supplies `Authorization: Bearer $CRON_SECRET`; the endpoint remains idempotent and notification records prevent duplicate sends within each user's selected interval. After deployment, check the project's Schedules page and its run history if reminders do not arrive.

Users choose a local start hour and a repeat interval. Task alerts are sent for due-today or overdue tasks and stop when none remain. Exam milestone alerts remain once per milestone.

The AI finished-a-long-file notification is sent immediately after a file with at least 30 pages or a processing time of at least 20 seconds finishes. Task and exam reminders require a registered device, permission granted by the browser, and their respective switches enabled in Settings.

## Troubleshooting

- If Settings says notifications are not configured, confirm the three VAPID values are set in the running environment and redeploy.
- If turning notifications on fails, use HTTPS, check the browser's site notification permission, and on iPhone/iPad open the installed Home Screen app.
- If the test notification fails, confirm the device is subscribed, the VAPID key pair matches the pair used when it subscribed, and the server can reach the browser push service.
- If scheduled reminders do not arrive, confirm `CRON_SECRET` is set in Vercel, the cron jobs are active in the Vercel project, and the notification migration was applied to the deployed database.
