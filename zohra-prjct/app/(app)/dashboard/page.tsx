import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) notFound();

  // Loaded here, before the page is sent, so the badge never pops in and shifts the layout.
  const latestRecognition = await prisma.recognitionRequest.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });

  return (
    <DashboardView
      firstName={session.user.name?.trim().split(/\s+/)[0] ?? ""}
      isRecognized={latestRecognition?.status === "APPROVED"}
    />
  );
}
