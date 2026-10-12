const reviewerIds = new Set(
  (process.env.ZOHRA_RECOGNITION_REVIEWER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

export function isRecognitionReviewer(userId: string) {
  return reviewerIds.has(userId);
}
