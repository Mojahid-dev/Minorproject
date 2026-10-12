import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { RecognitionReviewerQueue } from "@/components/recognition/reviewer-queue";
import { auth } from "@/lib/auth";
import { isRecognitionReviewer } from "@/lib/recognition-admin";

export default async function RecognitionReviewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isRecognitionReviewer(session.user.id)) notFound();

  return <RecognitionReviewerQueue />;
}
