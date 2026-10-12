"use client";

import { BookOpenText, Download, FileText, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

type TextState = {
  originalName: string;
  textExtractionStatus: "NOT_STARTED" | "EXTRACTING" | "EXTRACTED" | "NO_TEXT" | "FAILED" | "NOT_APPLICABLE";
  extractedText: string | null;
  extractionError: string | null;
};

export function TextDocumentPreview({ resourceId, initial }: { resourceId: string; initial: TextState }) {
  const [resource, setResource] = useState(initial);

  useEffect(() => {
    if (resource.textExtractionStatus !== "NOT_STARTED" && resource.textExtractionStatus !== "EXTRACTING") return;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/resources/${resourceId}/text`, { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          setResource(payload.resource);
          if (payload.resource.textExtractionStatus !== "NOT_STARTED" && payload.resource.textExtractionStatus !== "EXTRACTING") window.clearInterval(timer);
        }
      } catch {
        // A later poll can recover from a temporary connection failure.
      }
      if (attempts >= 16) window.clearInterval(timer);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [resourceId, resource.textExtractionStatus]);

  if (resource.extractedText) {
    return <div className="mx-auto max-w-4xl p-5 sm:p-8"><div className="mb-5 flex items-center gap-2 border-b border-white/[0.07] pb-4 text-sm font-medium text-neutral-300"><BookOpenText size={17} className="text-violet-200" /> Readable document text</div><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-neutral-300">{resource.extractedText.slice(0, 200_000)}</pre>{resource.extractedText.length > 200_000 && <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs text-neutral-500">Preview shortened. Download the original file to read the rest.</p>}</div>;
  }

  const pending = resource.textExtractionStatus === "NOT_STARTED" || resource.textExtractionStatus === "EXTRACTING";
  return <div className="grid min-h-[55vh] place-items-center p-6 text-center"><div className="max-w-md"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/[0.06] text-neutral-300">{pending ? <LoaderCircle size={22} className="animate-spin" /> : <FileText size={22} />}</span><h2 className="mt-4 font-semibold">{pending ? "Preparing your document preview" : "A text preview isn’t available"}</h2><p className="mt-2 text-sm leading-6 text-neutral-400">{pending ? "Zohra is extracting readable text. This page will update automatically." : resource.extractionError || "This file may be scanned, use an older format, or contain no selectable text."}</p><p className="mt-3 text-xs text-neutral-500">The original file is still available to download.</p><a href={`/api/resources/${resourceId}/file?download=1`} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-neutral-200 transition hover:bg-white/[0.06]"><Download size={15} /> Download original</a></div></div>;
}
