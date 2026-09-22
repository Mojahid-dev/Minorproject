import { prisma } from "@/lib/prisma";
import { get } from "@vercel/blob";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const MAX_STORED_TEXT_CHARS = 500_000;

export function isPdfResource(mimeType: string) {
  return mimeType === "application/pdf";
}

async function extractPdfText(storageKey: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("Vercel Blob is not configured.");

  const blob = await get(storageKey, { access: "private", token, useCache: false });
  if (!blob?.stream) throw new Error("The uploaded PDF could not be found in storage.");

  const data = new Uint8Array(await new Response(blob.stream).arrayBuffer());
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) pages.push(`Page ${pageNumber}\n${text}`);
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  const fullText = pages.join("\n\n");
  return {
    pageCount: pdf.numPages,
    text: fullText.slice(0, MAX_STORED_TEXT_CHARS),
    textLength: fullText.length,
    hasText: fullText.replace(/\s/g, "").length >= 20,
  };
}

export async function extractAndStorePdfText(resourceId: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, mimeType: true, storageKey: true },
  });
  if (!resource) throw new Error("Resource not found.");

  if (!isPdfResource(resource.mimeType)) {
    await prisma.resource.update({
      where: { id: resource.id },
      data: { status: "READY", textExtractionStatus: "NOT_APPLICABLE" },
    });
    return;
  }

  await prisma.resource.update({
    where: { id: resource.id },
    data: { status: "PROCESSING", textExtractionStatus: "EXTRACTING", extractionError: null },
  });

  try {
    const result = await extractPdfText(resource.storageKey);
    await prisma.resource.update({
      where: { id: resource.id },
      data: {
        status: "READY",
        textExtractionStatus: result.hasText ? "EXTRACTED" : "NO_TEXT",
        extractedText: result.hasText ? result.text : null,
        extractedTextLength: result.textLength,
        pageCount: result.pageCount,
        extractedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.resource.update({
      where: { id: resource.id },
      data: {
        status: "READY",
        textExtractionStatus: "FAILED",
        extractionError: error instanceof Error ? error.message : "PDF text extraction failed.",
      },
    });
  }
}
