import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProductTour } from "@/components/onboarding/product-tour";
import { StudyTrackerProvider } from "@/components/study-progress/study-tracker-provider";

/**
 * Full-screen pages that live outside the app shell (no sidebar or top bar).
 * They still require a signed-in user, exactly like the pages in (app).
 */
export default async function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-dvh w-full bg-background text-foreground">
      {/* Headless here: keeps a running study session alive (heartbeats) while chatting. */}
      <StudyTrackerProvider showPlayer={false}>{children}</StudyTrackerProvider>
      <ProductTour />
    </div>
  );
}
