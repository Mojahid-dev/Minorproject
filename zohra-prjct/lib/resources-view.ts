import { resourceKind } from "@/lib/dashboard-utils";

export type OrganizationStatus =
  | "PENDING"
  | "PROCESSING"
  | "ORGANIZED"
  | "NEEDS_REVIEW"
  | "FAILED";

export type Resource = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  textExtractionStatus:
    | "NOT_STARTED"
    | "EXTRACTING"
    | "EXTRACTED"
    | "NO_TEXT"
    | "FAILED"
    | "NOT_APPLICABLE";
  pageCount: number | null;
  organizationStatus: OrganizationStatus;
  organizationNote: string | null;
  studyYearId: string | null;
  semesterId: string | null;
  subjectId: string | null;
  chapterId: string | null;
  tags: string[];
  studyYear: { id: string; label: string } | null;
  semester: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
  chapter: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type Chapter = { id: string; name: string; aliases: string[] };
export type Subject = {
  id: string;
  name: string;
  aliases: string[];
  chapters: Chapter[];
};
export type Semester = {
  id: string;
  name: string;
  aliases: string[];
  subjects: Subject[];
};
export type StudyYear = {
  id: string;
  label: string;
  aliases: string[];
  semesters: Semester[];
};

export type FileFilter = "all" | "documents" | "slides" | "images" | "videos" | "other";
export type SortKey = "newest" | "oldest" | "name" | "size";

export const filterLabels: Record<FileFilter, string> = {
  all: "All types",
  documents: "Documents",
  slides: "Slides",
  images: "Images",
  videos: "Videos",
  other: "Other",
};

export const sortLabels: Record<SortKey, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name (A–Z)",
  size: "Largest first",
};

export function filterOf(resource: Resource): Exclude<FileFilter, "all"> {
  switch (resourceKind(resource.mimeType, resource.originalName)) {
    case "pdf":
    case "document":
    case "text":
      return "documents";
    case "slides":
      return "slides";
    case "image":
      return "images";
    case "video":
      return "videos";
    default:
      return "other";
  }
}

export function typeLabel(resource: Resource) {
  const name = resource.originalName;
  const dot = name.lastIndexOf(".");
  if (dot > 0 && dot < name.length - 1) return name.slice(dot + 1).toUpperCase();
  return resource.mimeType.split("/").pop()?.toUpperCase() || "FILE";
}

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function locationParts(resource: Resource): string[] {
  return [
    resource.studyYear?.label,
    resource.semester?.name,
    resource.subject?.name,
    resource.chapter?.name,
  ].filter((part): part is string => Boolean(part));
}

export function matchesQuery(resource: Resource, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  const haystack = [
    resource.originalName,
    ...resource.tags,
    ...locationParts(resource),
  ]
    .join(" ")
    .toLocaleLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export function sortResources(resources: Resource[], key: SortKey) {
  const list = [...resources];
  switch (key) {
    case "oldest":
      return list.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    case "name":
      return list.sort((a, b) =>
        a.originalName.localeCompare(b.originalName, undefined, { numeric: true, sensitivity: "base" }),
      );
    case "size":
      return list.sort((a, b) => b.sizeBytes - a.sizeBytes);
    default:
      return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
}

/** Files that need a decision from the person. */
export function needsDecision(resource: Resource) {
  return (
    resource.organizationStatus === "NEEDS_REVIEW" ||
    resource.organizationStatus === "FAILED"
  );
}

/** The review queue also holds files still waiting to be organised. */
export function inReviewQueue(resource: Resource) {
  return needsDecision(resource) || resource.organizationStatus === "PENDING";
}

export function canRetry(resource: Resource, now: number | null) {
  const staleProcessing =
    resource.organizationStatus === "PROCESSING" &&
    now !== null &&
    now - new Date(resource.updatedAt).getTime() > 3 * 60_000;
  return (
    resource.organizationStatus === "FAILED" ||
    resource.organizationStatus === "NEEDS_REVIEW" ||
    (resource.organizationStatus === "PENDING" && resource.status === "READY") ||
    staleProcessing
  );
}

export type FolderCounts = {
  year: Map<string, number>;
  semester: Map<string, number>;
  subject: Map<string, number>;
  chapter: Map<string, number>;
  /** Files in a subject that still need a decision. */
  subjectReview: Map<string, number>;
  unsorted: number;
};

export function countFolders(resources: Resource[]): FolderCounts {
  const counts: FolderCounts = {
    year: new Map(),
    semester: new Map(),
    subject: new Map(),
    chapter: new Map(),
    subjectReview: new Map(),
    unsorted: 0,
  };
  const bump = (map: Map<string, number>, id: string | null) => {
    if (id) map.set(id, (map.get(id) ?? 0) + 1);
  };
  for (const resource of resources) {
    bump(counts.year, resource.studyYearId);
    bump(counts.semester, resource.semesterId);
    bump(counts.subject, resource.subjectId);
    bump(counts.chapter, resource.chapterId);
    if (resource.subjectId && needsDecision(resource))
      bump(counts.subjectReview, resource.subjectId);
    if (!resource.subjectId) counts.unsorted += 1;
  }
  return counts;
}
