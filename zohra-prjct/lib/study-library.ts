import { get } from "@vercel/blob";
import { inflateRawSync } from "node:zlib";
import { prisma } from "@/lib/prisma";
import { extractPdfText } from "@/lib/pdf-text-extraction";

const MAX_TEXT_CHARS = 500_000;
const MAX_XML_FILE_BYTES = 8 * 1024 * 1024;
const MAX_XML_TOTAL_BYTES = 24 * 1024 * 1024;

type ChapterRecord = { id: string; name: string; aliases: string[] };
type SubjectRecord = { id: string; name: string; aliases: string[]; chapters: ChapterRecord[] };
type SemesterRecord = { id: string; name: string; aliases: string[]; subjects: SubjectRecord[] };
type YearRecord = { id: string; label: string; aliases: string[]; semesters: SemesterRecord[] };
type Location = {
  studyYearId: string | null;
  semesterId: string | null;
  subjectId: string | null;
  chapterId: string | null;
  organizationStatus: "ORGANIZED" | "NEEDS_REVIEW";
  organizationNote: string;
};

function cleanText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
}

function decodeXmlText(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function zipTextFiles(data: Uint8Array, shouldRead: (name: string) => boolean) {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const minEocd = Math.max(0, bytes.length - 65_557);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= minEocd; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("This Office file is not a valid ZIP document.");

  const entryCount = bytes.readUInt16LE(eocd + 10);
  let cursor = bytes.readUInt32LE(eocd + 16);
  const files: { name: string; text: string }[] = [];
  let expandedTotal = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > bytes.length || bytes.readUInt32LE(cursor) !== 0x02014b50) break;
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const expandedSize = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const name = bytes.toString("utf8", cursor + 46, cursor + 46 + nameLength);

    if (shouldRead(name)) {
      if (expandedSize > MAX_XML_FILE_BYTES || expandedTotal + expandedSize > MAX_XML_TOTAL_BYTES) {
        throw new Error("This Office document expands beyond the safe text-processing limit.");
      }
      if (localOffset + 30 > bytes.length || bytes.readUInt32LE(localOffset) !== 0x04034b50) {
        throw new Error("This Office document contains an invalid file entry.");
      }
      const localNameLength = bytes.readUInt16LE(localOffset + 26);
      const localExtraLength = bytes.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const end = start + compressedSize;
      if (end > bytes.length) throw new Error("This Office document contains a truncated file entry.");
      const compressed = bytes.subarray(start, end);
      let expanded: Buffer;
      if (method === 0) expanded = compressed;
      else if (method === 8) expanded = inflateRawSync(compressed, { maxOutputLength: MAX_XML_FILE_BYTES });
      else throw new Error("This Office document uses an unsupported compression method.");
      expandedTotal += expanded.byteLength;
      files.push({ name, text: expanded.toString("utf8") });
    }

    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function officeXmlText(xmlFiles: { name: string; text: string }[], tag: "w:t" | "a:t") {
  const orderedFiles = tag === "a:t"
    ? [...xmlFiles].sort((a, b) => Number(a.name.match(/slide(\d+)/i)?.[1] ?? 0) - Number(b.name.match(/slide(\d+)/i)?.[1] ?? 0))
    : xmlFiles;
  const extracted = orderedFiles.flatMap(({ text }) =>
    Array.from(text.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g")), (match) => decodeXmlText(match[1])),
  );
  return cleanText(extracted.join(" "));
}

async function extractText(resource: { storageKey: string; mimeType: string; extension: string }) {
  const textTypes = ["pdf", "docx", "pptx", "txt", "md"];
  if (!textTypes.includes(resource.extension)) return { text: "", textLength: 0, pageCount: null, hasText: false };
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Vercel Blob is not configured.");

  if (resource.mimeType === "application/pdf") {
    const result = await extractPdfText(resource.storageKey);
    return { text: result.text, textLength: result.textLength, pageCount: result.pageCount, hasText: result.hasText };
  }

  const blob = await get(resource.storageKey, { access: "private", token, useCache: false });
  if (!blob?.stream) throw new Error("The uploaded file could not be found in storage.");
  const data = new Uint8Array(await new Response(blob.stream).arrayBuffer());
  if (data.byteLength > 100 * 1024 * 1024) throw new Error("The file is too large to process safely.");

  let text = "";
  const mime = resource.mimeType.toLowerCase();
  if (mime === "text/plain" || mime === "text/markdown" || resource.extension === "txt" || resource.extension === "md") {
    text = new TextDecoder("utf-8", { fatal: false }).decode(data);
  } else if (resource.extension === "docx" || resource.extension === "pptx") {
    const xml = zipTextFiles(data, (name) =>
      resource.extension === "docx"
        ? name === "word/document.xml"
        : /^ppt\/slides\/slide\d+\.xml$/i.test(name),
    );
    text = resource.extension === "pptx" ? officeXmlText(xml, "a:t") : officeXmlText(xml, "w:t");
  }

  const normalized = cleanText(text);
  return { text: normalized, textLength: text.length, pageCount: null, hasText: normalized.replace(/\s/g, "").length >= 12 };
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hasExactPhrase(source: string, phrase: string) {
  const normalizedPhrase = normalizeForMatch(phrase);
  if (normalizedPhrase.length < 2) return false;
  return ` ${source} `.includes(` ${normalizedPhrase} `);
}

function namesFor(name: string, aliases: string[]) {
  return [name, ...aliases].map(normalizeForMatch).filter((name) => name.length >= 2);
}

function matchingNodes<T extends { name: string; aliases: string[] }>(items: T[], filename: string, text: string) {
  return items.filter((item) => namesFor(item.name, item.aliases).some((name) => hasExactPhrase(filename, name) || hasExactPhrase(text, name)));
}

function matchLocation(tree: YearRecord[], originalName: string, extractedText: string): Location {
  const filename = normalizeForMatch(originalName.replace(/\.[^.]+$/, ""));
  const text = normalizeForMatch(extractedText);
  const years = matchingNodes(tree.map((year) => ({ ...year, name: year.label })), filename, text);
  if (years.length !== 1) {
    const note = years.length > 1
      ? "Several academic years match. Choose the correct year."
      : tree.length === 0
        ? "Create your academic year, semesters, subjects, and chapters to enable automatic organization."
        : "The file does not clearly identify an academic year. Choose a location or include the year in its name.";
    return { studyYearId: null, semesterId: null, subjectId: null, chapterId: null, organizationStatus: "NEEDS_REVIEW", organizationNote: note };
  }

  const year = tree.find((item) => item.id === years[0].id)!;
  const semesters = matchingNodes(year.semesters, filename, text);
  if (semesters.length !== 1) {
    const note = semesters.length > 1
      ? "Several semesters match in this academic year. Choose the correct semester."
      : "The file does not clearly identify a semester. Choose a location or include the semester in its name.";
    return { studyYearId: year.id, semesterId: null, subjectId: null, chapterId: null, organizationStatus: "NEEDS_REVIEW", organizationNote: note };
  }

  const semester = year.semesters.find((item) => item.id === semesters[0].id)!;
  const subjects = matchingNodes(semester.subjects, filename, text);

  if (subjects.length === 1) {
    const subject = subjects[0];
    const chapters = matchingNodes(subject.chapters, filename, text);
    if (chapters.length === 1) {
      return { studyYearId: year.id, semesterId: semester.id, subjectId: subject.id, chapterId: chapters[0].id, organizationStatus: "ORGANIZED", organizationNote: "Matched the academic year, semester, subject, and chapter from their names or aliases." };
    }
    if (chapters.length > 1) {
      return { studyYearId: year.id, semesterId: semester.id, subjectId: subject.id, chapterId: null, organizationStatus: "NEEDS_REVIEW", organizationNote: "The year, semester, and subject are clear, but several chapter names match. Choose the correct chapter." };
    }
    return { studyYearId: year.id, semesterId: semester.id, subjectId: subject.id, chapterId: null, organizationStatus: "ORGANIZED", organizationNote: "Matched the academic year, semester, and subject. Choose a chapter if needed." };
  }

  // A uniquely named chapter can identify its subject if the year and semester are explicit.
  const chapterMatches = semester.subjects.flatMap((subject) =>
    matchingNodes(subject.chapters, filename, text).map((chapter) => ({ subject, chapter })),
  );
  if (chapterMatches.length === 1) {
    const match = chapterMatches[0];
    return { studyYearId: year.id, semesterId: semester.id, subjectId: match.subject.id, chapterId: match.chapter.id, organizationStatus: "ORGANIZED", organizationNote: "Matched the academic year, semester, and a unique chapter name or alias." };
  }

  const note = subjects.length > 1 || chapterMatches.length > 1
    ? "Several subject or chapter names match in this semester. Choose the correct location."
    : "No unique subject or chapter name was found for this semester. Choose a location or add an alias.";
  return { studyYearId: year.id, semesterId: semester.id, subjectId: null, chapterId: null, organizationStatus: "NEEDS_REVIEW", organizationNote: note };
}

export async function processStudyResource(resourceId: string, retryStale = false) {
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new Error("Resource not found.");
  if (resource.organizationStatus === "PROCESSING" && (!retryStale || resource.updatedAt.getTime() > Date.now() - 3 * 60_000)) return;
  if (resource.organizationStatus === "ORGANIZED") return;

  const claimed = await prisma.resource.updateMany({
    where: {
      id: resourceId,
      OR: [
        { organizationStatus: { in: ["PENDING", "FAILED", "NEEDS_REVIEW"] } },
        ...(retryStale ? [{ organizationStatus: "PROCESSING" as const, updatedAt: { lt: new Date(Date.now() - 3 * 60_000) } }] : []),
      ],
    },
    data: { organizationStatus: "PROCESSING", status: "PROCESSING", textExtractionStatus: "EXTRACTING", organizationNote: null, extractionError: null },
  });
  if (!claimed.count) return;

  try {
    let result: Awaited<ReturnType<typeof extractText>> = { text: "", textLength: 0, pageCount: null, hasText: false };
    let extractionError: string | null = null;
    try {
      result = await extractText(resource);
    } catch (error) {
      extractionError = error instanceof Error ? error.message : "Text extraction failed.";
    }
    const tree = await prisma.studyYear.findMany({
      where: { userId: resource.userId },
      orderBy: { label: "asc" },
      include: { semesters: { orderBy: { name: "asc" }, include: { subjects: { orderBy: { name: "asc" }, include: { chapters: { orderBy: { name: "asc" } } } } } } },
    }) as unknown as YearRecord[];
    const location = matchLocation(tree, resource.originalName, result.text);
    if (extractionError) {
      location.organizationNote = location.organizationStatus === "ORGANIZED"
        ? `Matched from the file name. Document text could not be read: ${extractionError}`
        : `Document text could not be read, so only the file name was checked. ${location.organizationNote}`;
    }
    const textExtractionStatus = extractionError
      ? "FAILED"
      : result.hasText
      ? "EXTRACTED"
      : result.pageCount !== null
        ? "NO_TEXT"
        : ["pdf", "docx", "pptx", "txt", "md"].includes(resource.extension)
          ? "NO_TEXT"
          : "NOT_APPLICABLE";

    await prisma.resource.update({
      where: { id: resource.id },
      data: {
        status: "READY",
        textExtractionStatus,
        extractionError,
        extractedText: result.hasText ? result.text : null,
        extractedTextLength: result.textLength,
        pageCount: result.pageCount,
        extractedAt: new Date(),
        organizationStatus: location.organizationStatus,
        organizationNote: location.organizationNote,
        studyYearId: location.studyYearId,
        semesterId: location.semesterId,
        subjectId: location.subjectId,
        chapterId: location.chapterId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resource processing failed.";
    await prisma.resource.update({
      where: { id: resource.id },
      data: {
        status: "READY",
        textExtractionStatus: "FAILED",
        extractionError: message.slice(0, 1000),
        organizationStatus: "FAILED",
        organizationNote: "Text could not be read. You can retry processing or assign this file manually.",
      },
    });
  }
}

export { matchLocation };
