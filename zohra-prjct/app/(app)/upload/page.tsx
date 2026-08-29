"use client";

import {
  CheckCircle2,
  FileText,
  FileUp,
  Film,
  FolderOpen,
  LoaderCircle,
  Paperclip,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

type UploadItem = {
  id: string;
  file: File;
  status: "ready" | "uploading" | "complete";
};

const acceptedTypes = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.mp4,.mov,.webm";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(file: File) {
  if (file.type.startsWith("video/")) return "Video";
  if (file.type === "application/pdf") return "PDF";
  if (file.name.match(/\.(doc|docx)$/i)) return "Document";
  if (file.name.match(/\.(ppt|pptx)$/i)) return "Presentation";
  return "Note";
}

function getYouTubeEmbedUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.replace(/^www\./, "");
    let videoId = "";

    if (hostname === "youtu.be") {
      videoId = url.pathname.slice(1);
    } else if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") ?? "";
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/")[2] ?? "";
      }
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(videoId)
      ? `https://www.youtube.com/embed/${videoId}`
      : "";
  } catch {
    return "";
  }
}

export default function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      status: "ready" as const,
    }));
    setItems((current) => [...current, ...incoming]);
  }

  function uploadFiles() {
    setItems((current) => current.map((item) => ({ ...item, status: "uploading" })));
    window.setTimeout(() => {
      setItems((current) => current.map((item) => ({ ...item, status: "complete" })));
    }, 900);
  }

  function removeFile(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  const readyCount = items.filter((item) => item.status === "ready").length;
  const youtubeEmbedUrl = getYouTubeEmbedUrl(youtubeUrl);

  return (
    <div className="mx-auto max-w-5xl text-white">
        <header className="flex items-center justify-between gap-4">
          <div className="text-sm font-medium text-neutral-400">Resource library</div>
          <div className="flex items-center gap-2 text-sm text-neutral-500"><FolderOpen size={17} /> Personal library</div>
        </header>

        <section className="mt-10">
          <p className="text-sm font-medium text-neutral-400">Resource library</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Upload your learning materials</h1>
          <p className="mt-3 max-w-2xl text-neutral-400">Add notes, PDFs, documents, presentations, or videos to keep everything together.</p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: FileText, label: "Notes & documents", detail: "TXT, DOC, DOCX, MD" },
            { icon: FileUp, label: "PDFs & slides", detail: "PDF, PPT, PPTX" },
            { icon: Film, label: "Video lessons", detail: "MP4, MOV, WEBM" },
          ].map(({ icon: Icon, label, detail }) => (
            <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <Icon size={20} className="text-neutral-200" />
              <p className="mt-4 font-semibold">{label}</p>
              <p className="mt-1 text-sm text-neutral-500">{detail}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-400">
              <Film size={19} />
            </div>
            <div>
              <h2 className="font-semibold">Add a YouTube lesson</h2>
              <p className="mt-1 text-sm text-neutral-500">Paste a YouTube link to preview it in your resource library.</p>
            </div>
          </div>
          <label htmlFor="youtube-url" className="mt-5 block text-sm font-medium text-neutral-300">YouTube URL</label>
          <input
            id="youtube-url"
            type="url"
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="mt-2 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm outline-none transition placeholder:text-neutral-600 focus:border-zinc-600"
          />
          {youtubeUrl.trim() && !youtubeEmbedUrl && (
            <p className="mt-2 text-sm text-red-400">Enter a valid YouTube video link.</p>
          )}
          {youtubeEmbedUrl && (
            <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800 bg-black">
              <div className="aspect-video">
                <iframe
                  src={youtubeEmbedUrl}
                  title="YouTube video preview"
                  className="size-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </section>

        <section
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
          className={`mt-6 rounded-3xl border border-dashed p-8 text-center transition sm:p-14 ${dragging ? "border-white bg-white/10" : "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500"}`}
        >
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-black"><UploadCloud size={26} /></div>
          <h2 className="mt-5 text-lg font-semibold">Drop files here to upload</h2>
          <p className="mt-2 text-sm text-neutral-500">or choose files from your device</p>
          <input ref={inputRef} onChange={(event) => event.target.files && addFiles(event.target.files)} type="file" accept={acceptedTypes} multiple className="hidden" />
          <button onClick={() => inputRef.current?.click()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"><Paperclip size={16} />Browse files</button>
          <p className="mt-4 text-xs text-neutral-600">Supported: PDF, Word, PowerPoint, notes, and video files</p>
        </section>

        {items.length > 0 && (
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 p-5">
              <div><h2 className="font-semibold">Upload queue</h2><p className="mt-1 text-sm text-neutral-500">{items.length} file{items.length === 1 ? "" : "s"} selected</p></div>
              {readyCount > 0 && <button onClick={uploadFiles} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200">Upload {readyCount} file{readyCount === 1 ? "" : "s"}</button>}
            </div>
            <ul className="divide-y divide-zinc-800">
              {items.map((item) => {
                const Icon = item.file.type.startsWith("video/") ? Film : FileText;
                return <li key={item.id} className="flex items-center gap-3 p-4 sm:p-5"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-800 text-neutral-300"><Icon size={19} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.file.name}</p><p className="mt-1 text-xs text-neutral-500">{fileKind(item.file)} · {formatSize(item.file.size)}</p></div>{item.status === "uploading" && <LoaderCircle size={18} className="animate-spin text-neutral-400" />}{item.status === "complete" && <span className="flex items-center gap-1.5 text-sm text-emerald-400"><CheckCircle2 size={17} />Uploaded</span>}{item.status === "ready" && <button onClick={() => removeFile(item.id)} aria-label={`Remove ${item.file.name}`} className="grid size-9 place-items-center rounded-lg text-neutral-500 transition hover:bg-red-500/10 hover:text-red-400"><Trash2 size={17} /></button>}</li>;
              })}
            </ul>
          </section>
        )}

        <p className="mt-5 flex items-center gap-2 text-xs text-neutral-600"><X size={13} /> Files stay in this upload queue until you choose Upload.</p>
    </div>
  );
}
