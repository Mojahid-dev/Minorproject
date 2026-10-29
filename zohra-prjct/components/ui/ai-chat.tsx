"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options } from "rehype-sanitize";

import {

  ArrowRight,
  ArrowUp,
  Check,
  Copy,
  FileText,
  LoaderCircle,
  Menu,
  MessageSquarePlus,
  Paperclip,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { MAX_ATTACHED_DOCUMENTS } from "@/lib/document-context";

type Message = { role: "user" | "assistant"; content: string; note?: string };
type LibraryFile = { id: string; originalName: string; pageCount: number | null; status: string; textExtractionStatus: string };
type ChatSource = { id: string; name: string; truncated: boolean };
/** One line of the streamed reply sent by /api/ai/chat. */
type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; sources?: ChatSource[] }
  | { type: "error"; error?: string };
type Conversation = { id: string; title: string; updatedAt: string; _count?: { messages: number } };
type Dialog = { kind: "dirty" } | { kind: "delete"; id: string } | null;

const promptSuggestions = [
  "Explain a difficult idea simply",
  "Help me think through a plan",
  "Explore an idea with me",
];

const fileSuggestions = [
  "Summarize this file",
  "Make 10 practice questions from it",
  "Explain the hardest part simply",
];

/** The server only needs role and content; extra fields such as notes stay in the browser. */
const toPayload = ({ role, content }: Message) => ({ role, content });

const markdownSanitizeSchema: Options = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", "language-math", "math-inline", "math-display"],
    ],
  },
};

function ZohraMark({ size = "regular" }: { size?: "regular" | "large" }) {
  const dimensions = size === "large" ? 45 : 30;
  return (
    <span className={`zohra-ai-mark inline-grid shrink-0 place-items-center ${size === "large" ? "size-[66px] rounded-[20px]" : "size-10 rounded-xl"}`}>
      <Image src="/Logo.svg" alt="" width={dimensions} height={dimensions} priority={size === "large"} className="h-[76%] w-[76%] object-contain" />
    </span>
  );
}

function FormattedReply({ content }: { content: string }) {
  return (
    <div className="chat-markdown min-w-0 text-[14px] leading-7 text-zinc-700 dark:text-zinc-200 sm:text-[15px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema], rehypeKatex]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-violet-700 underline decoration-violet-300 underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:decoration-violet-500 dark:hover:text-violet-200">{children}</a>
          ),
          pre: ({ children }) => (
            <pre className="my-4 max-w-full overflow-x-auto rounded-xl border border-zinc-800 bg-[#111116] p-4 text-[13px] leading-6 text-zinc-100">{children}</pre>
          ),
          code: ({ children, className }) => className
            ? <code className="font-mono text-[12px]">{children}</code>
            : <code className="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-[0.88em] text-violet-900 dark:bg-violet-400/15 dark:text-violet-200">{children}</code>,
          table: ({ children }) => <div className="my-4 max-w-full overflow-x-auto"><table className="w-full border-collapse text-left text-sm">{children}</table></div>,
          th: ({ children }) => <th className="border border-zinc-200 bg-zinc-100 px-3 py-2 font-semibold dark:border-white/10 dark:bg-white/5">{children}</th>,
          td: ({ children }) => <td className="border border-zinc-200 px-3 py-2 dark:border-white/10">{children}</td>,
          blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-violet-400 pl-4 text-zinc-600 dark:text-zinc-300">{children}</blockquote>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function AIChat({ initialResourceId }: { initialResourceId?: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [attachedIds, setAttachedIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const initialApplied = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const runRef = useRef(0);
  const stickRef = useRef(true);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const dirty = messages.length > 0 && (!conversationId || (messages.at(-1)?.role === "user" && Boolean(error)));
  const activeTitle = conversations.find((item) => item.id === conversationId)?.title ?? "New conversation";

  const loadList = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/conversations", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch { /* The list will load again on the next visit or save. */ }
  }, []);

  const loadFiles = useCallback(async () => {
    try {
      const response = await fetch("/api/resources", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const usable = (Array.isArray(data.resources) ? (data.resources as LibraryFile[]) : []).filter(
        (item) => item.status === "READY" && item.textExtractionStatus === "EXTRACTED",
      );
      setFiles(usable);
      setAttachedIds((ids) => ids.filter((id) => usable.some((file) => file.id === id)));
      if (initialResourceId && !initialApplied.current) {
        initialApplied.current = true;
        if (usable.some((file) => file.id === initialResourceId)) setAttachedIds([initialResourceId]);
        else setNotice("That file is not ready to chat about yet. Its text may still be extracting.");
      }
    } catch { /* The file picker simply stays empty. */ }
  }, [initialResourceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadList(); void loadFiles(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadList, loadFiles]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (event.target instanceof Node && !formRef.current?.contains(event.target)) setPickerOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setPickerOpen(false); };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickerOpen]);

  useEffect(() => {
    // Follow the reply as it grows, unless the reader has scrolled up to read.
    if (stickRef.current) bottomRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (input === "" && composerRef.current) composerRef.current.style.height = "48px";
  }, [input]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || loading) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      if (!dirty || loading || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || target.hasAttribute("download")) return;
      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(destination.pathname + destination.search + destination.hash);
      setPendingOpenId(null);
      setDialog({ kind: "dirty" });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, loading]);

  async function sendMessage(content = input.trim(), retry = false) {
    if (!content || loading) return;
    const base = retry ? messages : messages.at(-1)?.role === "user" && error ? messages.slice(0, -1) : messages;
    const nextMessages = retry ? base : [...base, { role: "user" as const, content }];
    if (!retry) {
      setMessages(nextMessages);
      setInput("");
    }
    const runId = ++runRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    stickRef.current = true;
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: conversationId ? [toPayload(nextMessages.at(-1)!)] : nextMessages.slice(-100).map(toPayload),
          ...(conversationId ? { conversationId } : {}),
          ...(attachedIds.length ? { resourceIds: attachedIds } : {}),
        }),
      });

      if (!response.ok) {
        // Problems found before any text exists arrive as a normal JSON error.
        let data: { error?: string } | null = null;
        try { data = JSON.parse(await response.text()) as { error?: string }; } catch { /* A proxy may return a plain-text error page. */ }
        const statusText = response.statusText ? ` ${response.statusText}` : "";
        throw new Error(data?.error ?? `The AI service returned HTTP ${response.status}${statusText}. Check the deployment's function logs.`);
      }
      if (!response.body) throw new Error("Your browser could not read the reply as it arrived. Please try again.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";
      let sources: ChatSource[] = [];
      let finished = false;
      let streamError = "";
      let frame = 0;

      // Draw at most once per screen refresh so long answers stay smooth.
      const draw = () => {
        frame = 0;
        if (runRef.current === runId) setMessages([...nextMessages, { role: "assistant", content: reply }]);
      };

      const handleLine = (line: string) => {
        if (!line.trim()) return;
        let event: StreamEvent;
        try { event = JSON.parse(line) as StreamEvent; } catch { return; }
        if (event.type === "delta") {
          reply += event.text;
          if (!frame) frame = window.requestAnimationFrame(draw);
        } else if (event.type === "done") {
          finished = true;
          sources = event.sources ?? [];
        } else if (event.type === "error") {
          streamError = event.error || "Something went wrong while writing the reply.";
        }
      };

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handleLine);
      }
      handleLine(buffer + decoder.decode());
      if (frame) window.cancelAnimationFrame(frame);

      if (runRef.current !== runId) return;
      if (streamError) throw new Error(streamError);
      if (!finished) throw new Error("The connection was interrupted before the reply finished. Please try again.");
      if (!reply.trim()) throw new Error("Gemini returned an empty reply. Please try again.");

      const cutNames = [...new Set(sources.filter((source) => source.truncated).map((source) => source.name))];
      const note = cutNames.length ? `Only the first part of ${cutNames.join(", ")} fit into this answer, so details from later pages may be missing.` : undefined;
      setMessages([...nextMessages, { role: "assistant", content: reply.trim(), ...(note ? { note } : {}) }]);
      if (conversationId) void loadList();
    } catch (err) {
      if (runRef.current !== runId || (err instanceof DOMException && err.name === "AbortError")) return;
      // Drop any half-written reply: the server did not save it, so Try again starts clean.
      setMessages(nextMessages);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if (runRef.current === runId) setLoading(false);
    }
  }

  function startNew() {
    runRef.current += 1;
    abortRef.current?.abort();
    setLoading(false);
    setMessages([]);
    setInput("");
    setError("");
    setNotice("");
    setConversationId(null);
    setAttachedIds([]);
    setPickerOpen(false);
    setHistoryOpen(false);
    setDialog(null);
    setPendingHref(null);
    setPendingOpenId(null);
  }

  async function saveConversation() {
    if (!dirty || messages.at(-1)?.role !== "assistant" || saving) return false;
    setSaving(true);
    try {
      const response = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages.map(toPayload) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save this conversation.");
      setConversationId(data.conversation.id);
      setNotice("Conversation saved.");
      await loadList();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this conversation.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndContinue() {
    const saved = await saveConversation();
    if (!saved) return;
    const destination = pendingHref;
    const openId = pendingOpenId;
    setPendingOpenId(null);
    if (destination) router.push(destination);
    else if (openId) {
      setPendingHref(null);
      setDialog(null);
      void openConversation(openId, true);
    } else startNew();
  }

  function discardAndContinue() {
    const destination = pendingHref;
    const openId = pendingOpenId;
    setDialog(null);
    setPendingOpenId(null);
    if (destination) router.push(destination);
    else if (openId) {
      setPendingHref(null);
      void openConversation(openId, true);
    } else startNew();
  }

  async function openConversation(id: string, force = false) {
    if (dirty && !force) {
      setPendingOpenId(id);
      setPendingHref(null);
      setDialog({ kind: "dirty" });
      return;
    }
    runRef.current += 1;
    abortRef.current?.abort();
    setLoading(false);
    setHistoryOpen(false);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open this conversation.");
      setAttachedIds([]);
      setConversationId(id);
      setMessages(data.conversation.messages.map((message: Message) => ({ role: message.role, content: message.content })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open this conversation.");
    }
  }

  async function renameConversation(id: string) {
    const title = renameValue.trim();
    if (!title || title.length > 120) return;
    const response = await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not rename conversation.");
      return;
    }
    setConversations((items) => items.map((item) => item.id === id ? { ...item, title } : item));
    setRenamingId(null);
    setNotice("Conversation renamed.");
  }

  async function deleteConversation(id: string) {
    const response = await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Could not delete conversation.");
      return;
    }
    setConversations((items) => items.filter((item) => item.id !== id));
    if (conversationId === id) startNew();
    setDialog(null);
  }

  async function copyReply(content: string, index: number) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      setNotice("Could not copy this response.");
    }
  }

  function dismissDialog() {
    setDialog(null);
    setPendingHref(null);
    setPendingOpenId(null);
  }

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 px-5 pb-5 pt-5">
        <ZohraMark />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-100">Zohra</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">AI workspace</p>
        </div>
        <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close chat history" className="ml-auto rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10 lg:hidden"><X size={17} /></button>
      </div>

      <button
        type="button"
        onClick={() => {
          setPendingHref(null);
          setPendingOpenId(null);
          if (dirty) setDialog({ kind: "dirty" });
          else startNew();
        }}
        className="mx-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white text-[13px] font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.08]"
      >
        <MessageSquarePlus size={16} strokeWidth={1.8} /> New chat
      </button>

      <div className="mt-7 flex items-center justify-between px-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-500">Recent</p>
        <span className="text-[10px] tabular-nums text-zinc-400 dark:text-zinc-600">{conversations.length || ""}</span>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 ? (
          <p className="px-3 py-4 text-xs leading-5 text-zinc-500">Your saved conversations will appear here.</p>
        ) : conversations.map((item) => (
          <div key={item.id} className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 ${conversationId === item.id ? "bg-zinc-200/70 dark:bg-white/[0.08]" : "hover:bg-zinc-100 dark:hover:bg-white/[0.045]"}`}>
            {renamingId === item.id ? (
              <form className="flex min-w-0 flex-1 gap-1" onSubmit={(event) => { event.preventDefault(); void renameConversation(item.id); }}>
                <input autoFocus maxLength={120} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-violet-500 dark:border-white/10 dark:bg-[#18171c]" />
                <button type="submit" aria-label="Save title" className="rounded-md p-1.5 text-violet-700 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-400/10"><Check size={14} /></button>
              </form>
            ) : (
              <>
                <button type="button" onClick={() => void openConversation(item.id)} className="min-w-0 flex-1 truncate py-1 text-left text-[12px] font-medium text-zinc-700 dark:text-zinc-300">{item.title}</button>
                <div className="flex shrink-0 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                  <button type="button" aria-label={`Rename ${item.title}`} onClick={() => { setRenamingId(item.id); setRenameValue(item.title); }} className="rounded-md p-1.5 text-zinc-500 hover:bg-white hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-zinc-100"><Pencil size={12} /></button>
                  <button type="button" aria-label={`Delete ${item.title}`} onClick={() => setDialog({ kind: "delete", id: item.id })} className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-400/10 dark:hover:text-red-300"><Trash2 size={12} /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 px-5 py-3 dark:border-white/[0.08]">
        <p className="text-[10px] text-zinc-500">Private to your account</p>
      </div>
    </div>
  );

  return (
    <section className="zohra-ai relative flex h-[calc(100dvh-11.5rem-env(safe-area-inset-bottom))] min-h-[380px] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-[0_12px_50px_rgba(28,25,38,0.06)] dark:border-white/[0.09] dark:bg-[#141417] dark:text-zinc-100 dark:shadow-[0_24px_80px_rgba(0,0,0,0.22)] lg:h-[calc(100dvh-8.5rem)]">
      <aside className="hidden w-[256px] shrink-0 border-r border-zinc-200 bg-zinc-50/70 dark:border-white/[0.08] dark:bg-[#111113] lg:block">{sidebar}</aside>

      {historyOpen && (
        <div className="absolute inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setHistoryOpen(false)}>
          <aside role="dialog" aria-modal="true" aria-label="Saved conversations" onClick={(event) => event.stopPropagation()} className="h-full w-[min(86vw,310px)] border-r border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#141417]">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-zinc-200 px-3 dark:border-white/[0.08] sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <button type="button" aria-label="Open saved conversations" onClick={() => setHistoryOpen(true)} className="grid size-9 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.07] lg:hidden"><Menu size={18} /></button>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{conversationId ? activeTitle : "New chat"}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">Google Gemini <span className="mx-1 text-zinc-300 dark:text-zinc-700">·</span> {attachedIds.length ? `Using ${attachedIds.length} of your file${attachedIds.length > 1 ? "s" : ""}` : "General assistant"}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {conversationId && <span className="hidden items-center gap-1.5 text-[10px] text-zinc-500 sm:inline-flex"><span className="size-1.5 rounded-full bg-emerald-500" /> Saved</span>}
            {dirty && !loading && messages.at(-1)?.role === "assistant" && <button type="button" disabled={saving} onClick={() => void saveConversation()} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[11px] font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"><Save size={13} />{saving ? "Saving…" : "Save chat"}</button>}
          </div>
        </header>

        <div onScroll={(event) => { const el = event.currentTarget; stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:px-12">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-[720px] flex-col justify-center pb-7">
              <ZohraMark size="large" />
              <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">A clear place to start</p>
              <h1 className="mt-2 max-w-[620px] text-[30px] font-semibold leading-[1.12] tracking-[-0.045em] text-zinc-900 dark:text-zinc-50 sm:text-[42px]">What would you like to work through?</h1>
              <p className="mt-3 max-w-lg text-[14px] leading-6 text-zinc-500 dark:text-zinc-400">Ask a question, untangle an idea, or get help finding your next step.</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {(attachedIds.length ? fileSuggestions : promptSuggestions).map((prompt) => (
                  <button key={prompt} type="button" onClick={() => { setInput(prompt); composerRef.current?.focus(); }} className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-white/[0.12] dark:bg-white/[0.025] dark:text-zinc-300 dark:hover:border-white/25 dark:hover:text-white">
                    {prompt}<ArrowRight size={12} className="text-zinc-400 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[760px] space-y-8 pb-6 pt-2 sm:space-y-10">
              {messages.map((message, index) => message.role === "user" ? (
                <div key={`${index}-user`} className="flex justify-end">
                  <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#eeebf5] px-4 py-3 text-[13px] leading-6 text-zinc-800 dark:bg-[#282530] dark:text-zinc-100 sm:max-w-[78%] sm:px-5">{message.content}</div>
                </div>
              ) : (
                <article key={`${index}-assistant`} className="group/reply flex items-start gap-3.5 sm:gap-4">
                  <ZohraMark />
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="mb-2 text-[11px] font-semibold tracking-wide text-zinc-800 dark:text-zinc-200">Zohra</div>
                    <FormattedReply content={message.content} />
                    {message.note && <p className="mt-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300">{message.note}</p>}
                    <button type="button" onClick={() => void copyReply(message.content, index)} className="mt-2 inline-flex items-center gap-1.5 rounded-md py-1 text-[10px] text-zinc-400 opacity-100 transition hover:text-zinc-700 dark:hover:text-zinc-200 sm:opacity-0 sm:group-hover/reply:opacity-100 sm:focus:opacity-100">
                      {copiedIndex === index ? <Check size={12} /> : <Copy size={12} />}{copiedIndex === index ? "Copied" : "Copy"}
                    </button>
                  </div>
                </article>
              ))}

              {loading && messages.at(-1)?.role !== "assistant" && (
                <div className="flex items-center gap-3.5" role="status" aria-live="polite">
                  <ZohraMark />
                  <div className="flex items-center gap-2 text-[12px] text-zinc-500"><LoaderCircle size={14} className="animate-spin" /> Zohra is thinking</div>
                </div>
              )}

              {error && (
                <div role="alert" className="ml-[54px] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-800 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-200">
                  <p>{error}</p>
                  {messages.at(-1)?.role === "user" && <button type="button" disabled={loading} onClick={() => void sendMessage(messages.at(-1)!.content, true)} className="mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"><ArrowRight size={12} /> Try again</button>}
                </div>
              )}
              {notice && <p role="status" className="ml-[54px] text-[11px] text-zinc-500">{notice}</p>}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-zinc-200 bg-white px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 dark:border-white/[0.08] dark:bg-[#141417] sm:px-6 sm:pb-4 lg:px-10">
          <form ref={formRef} onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="relative mx-auto max-w-[760px]">
            {pickerOpen && (
              <div role="dialog" aria-label="Choose files to ask about" className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-64 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#1d1c21]">
                <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Ask about your files <span className="font-normal normal-case tracking-normal">· up to {MAX_ATTACHED_DOCUMENTS}</span></p>
                {files.length === 0 ? (
                  <p className="px-2 py-3 text-xs leading-5 text-zinc-500">No files with readable text yet. Add a PDF on the <Link href="/upload" className="font-medium underline underline-offset-2">Upload</Link> page and wait for its text to be extracted.</p>
                ) : files.map((file) => {
                  const attached = attachedIds.includes(file.id);
                  const full = !attached && attachedIds.length >= MAX_ATTACHED_DOCUMENTS;
                  return (
                    <button key={file.id} type="button" disabled={full} onClick={() => setAttachedIds((ids) => attached ? ids.filter((id) => id !== file.id) : [...ids, file.id])} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[12px] text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-white/[0.06]">
                      <FileText size={14} className="shrink-0 text-zinc-400" />
                      <span className="min-w-0 flex-1 truncate">{file.originalName}</span>
                      {file.pageCount ? <span className="shrink-0 text-[10px] text-zinc-400">{file.pageCount} pg</span> : null}
                      {attached && <Check size={14} className="shrink-0 text-violet-600 dark:text-violet-300" />}
                    </button>
                  );
                })}
              </div>
            )}
            {attachedIds.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachedIds.map((id) => {
                  const file = files.find((item) => item.id === id);
                  if (!file) return null;
                  return (
                    <span key={id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 py-1 pl-2.5 pr-1 text-[11px] font-medium text-violet-900 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-100">
                      <FileText size={12} className="shrink-0" />
                      <span className="max-w-[200px] truncate">{file.originalName}</span>
                      <button type="button" aria-label={`Remove ${file.originalName}`} onClick={() => setAttachedIds((ids) => ids.filter((item) => item !== id))} className="rounded-full p-1 hover:bg-violet-200/60 dark:hover:bg-white/10"><X size={11} /></button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-zinc-300 bg-white px-2.5 py-2 transition focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-900/[0.04] dark:border-white/[0.14] dark:bg-[#1b1a1f] dark:focus-within:border-white/25 dark:focus-within:ring-white/[0.04]">
              <button type="button" onClick={() => setPickerOpen((open) => !open)} aria-label="Attach files from your library" aria-expanded={pickerOpen} className={`grid size-9 shrink-0 place-items-center rounded-xl transition hover:bg-zinc-100 dark:hover:bg-white/[0.07] ${attachedIds.length ? "text-violet-600 dark:text-violet-300" : "text-zinc-500"}`}><Paperclip size={16} /></button>
              <textarea
                ref={composerRef}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  event.currentTarget.style.height = "48px";
                  event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 160)}px`;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={attachedIds.length ? "Ask about your files…" : "Message Zohra…"}
                aria-label="Message Zohra AI"
                rows={1}
                maxLength={4000}
                disabled={loading}
                className="max-h-40 min-h-12 flex-1 resize-none overflow-y-auto bg-transparent px-2.5 py-3 text-[13px] leading-5 text-zinc-800 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:text-zinc-100"
              />
              <button type="submit" disabled={loading || !input.trim()} aria-label="Send message" className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-900 text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:disabled:bg-white/10 dark:disabled:text-zinc-500">
                {loading ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowUp size={17} />}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between px-1">
              <span className="text-[10px] text-zinc-400">Enter to send <span className="mx-1 text-zinc-300 dark:text-zinc-700">·</span> Shift + Enter for a new line</span>
              <span className="text-[10px] tabular-nums text-zinc-400">{input.length}/4000</span>
            </div>
            <p className="mt-1 text-center text-[9px] text-zinc-400">Gemini may make mistakes. Check important details.</p>
          </form>
        </footer>
      </div>

      {dialog && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-zinc-950/40 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissDialog(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="chat-dialog-title" className="w-full max-w-[360px] rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#1d1c21]">
            <div className="mb-4 flex items-start justify-between">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Zohra AI</p><h2 id="chat-dialog-title" className="mt-1 text-[16px] font-semibold text-zinc-900 dark:text-white">{dialog.kind === "delete" ? "Delete this conversation?" : "Keep this conversation?"}</h2></div>
              <button type="button" aria-label="Close dialog" onClick={dismissDialog} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"><X size={16} /></button>
            </div>
            {dialog.kind === "dirty" ? (
              <>
                <p className="text-[12px] leading-5 text-zinc-500 dark:text-zinc-400">Save it to your history before moving on, or discard this unsaved chat.</p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={dismissDialog} className="h-9 rounded-lg px-3 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5">Stay here</button>
                  <button type="button" onClick={discardAndContinue} className="h-9 rounded-lg border border-zinc-200 px-3 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5">Discard</button>
                  <button type="button" disabled={saving || messages.at(-1)?.role !== "assistant"} onClick={() => void saveAndContinue()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-[11px] font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"><Save size={13} />{saving ? "Saving…" : "Save & continue"}</button>
                </div>
                {messages.at(-1)?.role !== "assistant" && <p className="mt-3 text-right text-[10px] text-zinc-500">Retry the current reply before saving.</p>}
              </>
            ) : (
              <>
                <p className="text-[12px] leading-5 text-zinc-500 dark:text-zinc-400">Its messages will be permanently removed from your saved chats.</p>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setDialog(null)} className="h-9 rounded-lg px-3 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5">Cancel</button>
                  <button type="button" onClick={() => void deleteConversation(dialog.id)} className="h-9 rounded-lg bg-red-600 px-3 text-[11px] font-medium text-white hover:bg-red-700">Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
