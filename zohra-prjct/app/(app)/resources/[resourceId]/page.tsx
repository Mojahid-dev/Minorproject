/* A native image element is needed here because the private file route requires the viewer's session cookie. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenText, Download, ExternalLink, FileText, FolderTree, ShieldCheck, Tag } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { TextDocumentPreview } from "@/components/resources/text-document-preview";

type Props = { params: Promise<{ resourceId: string }> };

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ResourcePreviewPage({ params }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) notFound();

  const { resourceId } = await params;
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, userId: session.user.id },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      extension: true,
      sizeBytes: true,
      status: true,
      textExtractionStatus: true,
      extractedText: true,
      extractionError: true,
      organizationStatus: true,
      organizationNote: true,
      tags: true,
      studyYear: { select: { label: true } },
      semester: { select: { name: true } },
      subject: { select: { name: true } },
      chapter: { select: { name: true } },
      createdAt: true,
    },
  });
  if (!resource) notFound();

  const fileUrl = `/api/resources/${resource.id}/file`;
  const location = [resource.studyYear?.label, resource.semester?.name, resource.subject?.name, resource.chapter?.name].filter(Boolean).join(" → ");
  const isPdf = resource.extension === "pdf" || resource.mimeType.toLowerCase() === "application/pdf";
  const isImage = resource.mimeType.toLowerCase().startsWith("image/");
  const isVideo = resource.mimeType.toLowerCase().startsWith("video/");
  const previewText = resource.extractedText?.slice(0, 200_000) ?? null;

  return (
    <main className="mx-auto max-w-[1440px] pb-8 text-white">
      <Link href="/resources" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm text-neutral-400 transition hover:text-white"><ArrowLeft size={16} /> Back to resources</Link>

      <header className="mt-3 flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#151518] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-200/[0.09] text-violet-100"><FileText size={20} /></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-200">Document preview</p><h1 className="mt-1 break-words text-lg font-semibold sm:text-xl">{resource.originalName}</h1><p className="mt-1 text-xs text-neutral-500">{resource.extension.toUpperCase()} · {formatSize(resource.sizeBytes)} · Added {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(resource.createdAt)}</p></div></div>
        <div className="flex shrink-0 flex-wrap gap-2"><a href={`${fileUrl}?download=1`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-neutral-200 transition hover:bg-white/[0.06]"><Download size={15} /> Download</a>{(isPdf || isImage || isVideo) && <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-black transition hover:bg-neutral-200"><ExternalLink size={15} /> Open in browser</a>}</div>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/10 bg-emerald-200/[0.05] px-2.5 py-1.5 text-emerald-100"><ShieldCheck size={13} /> Private file</span>
        {location && <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-neutral-300"><FolderTree size={13} className="shrink-0" /><span className="break-words">{location}</span></span>}
        {resource.tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-lg border border-violet-200/10 bg-violet-200/[0.05] px-2.5 py-1.5 text-violet-100"><Tag size={12} />{tag}</span>)}
      </div>

      <section aria-label="File contents" className="mt-4 min-h-[60vh] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101012]">
        {resource.status === "PENDING" ? <div className="grid min-h-[55vh] place-items-center p-6 text-center"><div><FileText size={28} className="mx-auto text-neutral-500" /><h2 className="mt-3 font-semibold">This upload is still finishing</h2><p className="mt-1 text-sm text-neutral-400">Return in a moment and open the preview again.</p></div></div>
          : isPdf ? <iframe title={`PDF preview: ${resource.originalName}`} src={`${fileUrl}#toolbar=1&navpanes=0`} className="h-[72vh] min-h-[520px] w-full bg-white sm:h-[calc(100dvh-245px)]" />
            : isImage ? <div className="grid min-h-[55vh] place-items-center p-4 sm:p-8"><img src={fileUrl} alt={resource.originalName} className="max-h-[75vh] max-w-full object-contain" /></div>
              : isVideo ? <div className="grid min-h-[55vh] place-items-center p-4 sm:p-8"><video controls preload="metadata" src={fileUrl} className="max-h-[75vh] w-full rounded-xl bg-black" /></div>
                : previewText ? <div className="mx-auto max-w-4xl p-5 sm:p-8"><div className="mb-5 flex items-center gap-2 border-b border-white/[0.07] pb-4 text-sm font-medium text-neutral-300"><BookOpenText size={17} className="text-violet-200" /> Readable document text</div><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-neutral-300">{previewText}</pre>{resource.extractedText && resource.extractedText.length > previewText.length && <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs text-neutral-500">Preview shortened. Download the original file to read the rest.</p>}</div>
                  : ["doc", "docx", "ppt", "pptx", "txt", "md"].includes(resource.extension) ? <TextDocumentPreview resourceId={resource.id} initial={{ originalName: resource.originalName, textExtractionStatus: resource.textExtractionStatus, extractedText: resource.extractedText, extractionError: resource.extractionError }} />
                    : <div className="grid min-h-[55vh] place-items-center p-6 text-center"><div className="max-w-md"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/[0.06] text-neutral-300"><FileText size={22} /></span><h2 className="mt-4 font-semibold">Preview isn’t available for this file yet</h2><p className="mt-2 text-sm leading-6 text-neutral-400">{resource.textExtractionStatus === "EXTRACTING" || resource.textExtractionStatus === "NOT_STARTED" ? "Zohra is preparing readable text. If it still doesn’t appear, download the original file." : resource.extractionError || "This file format can’t be displayed in the browser. You can still download the original."}</p><p className="mt-3 text-xs text-neutral-500">Scanned pages and older file formats may only be available as the original download.</p></div></div>}
      </section>
    </main>
  );
}
