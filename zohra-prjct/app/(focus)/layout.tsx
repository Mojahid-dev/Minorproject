import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

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
      {children}
    </div>
  );
}
