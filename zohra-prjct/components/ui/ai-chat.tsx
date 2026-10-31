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
  Search,
  Trash2,
  X,
} from "lucide-react";

import { MAX_ATTACHED_DOCUMENTS } from "@/lib/document-context";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string; note?: string; sources?: ChatSource[] };
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
  "Help me plan a revision schedule",
  "Quiz me on a topic I'm revising",
];

const fileSuggestions = [
  "Summarize this file",
  "Make 10 practice questions from it",
  "Explain the hardest part simply",
];

const focus = "outline-none focus-visible:ring-2 focus-visible:ring-pen";
/** A highlighter stroke across the lower half of the text it sits behind. */
const highlighter = "[background-image:linear-gradient(transparent_46%,var(--mark)_46%,var(--mark)_92%,transparent_92%)]";

/** Groups saved chats by how recently they were used. */
function groupConversations(items: Conversation[], now: number) {
  const today = new Date(now).toDateString();
  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Last 7 days", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const item of items) {
    const time = new Date(item.updatedAt).getTime();
    const slot = Number.isNaN(time) ? 2 : new Date(time).toDateString() === today ? 0 : now - time < 7 * 86_400_000 ? 1 : 2;
    groups[slot].items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

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

function ZohraMark() {
  return (
    <span className="zohra-ai-mark inline-grid size-8 shrink-0 place-items-center rounded-lg">
      <Image src="/Logo.svg" alt="" width={24} height={24} className="h-[68%] w-[68%] object-contain" />
    </span>
  );
}

function FormattedReply({ content }: { content: string }) {
  return (
    <div className="chat-markdown min-w-0 font-reading text-[16.5px] leading-[1.75] text-ink sm:text-[17px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSanitizeSchema], rehypeKatex]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-pen underline decoration-pen/40 underline-offset-4 hover:decoration-pen">{children}</a>
          ),
          pre: ({ children }) => (
            <pre className="my-5 max-w-full overflow-x-auto rounded-md border border-rule bg-ink/[0.05] p-4 text-[13px] leading-6 text-ink">{children}</pre>
          ),
          code: ({ children, className }) => className
            ? <code className="font-mono text-[12.5px]">{children}</code>
            : <code className="rounded-[3px] bg-mark px-1 py-px font-mono text-[0.84em] text-ink">{children}</code>,
          table: ({ children }) => <div className="my-5 max-w-full overflow-x-auto"><table className="w-full border-collapse border-y-2 border-ink text-left font-ui text-[14px]">{children}</table></div>,
          th: ({ children }) => <th className="border-b border-ink py-2 pr-6 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-b border-rule py-2 pr-6">{children}</td>,
          blockquote: ({ children }) => <blockquote className="my-5 border-l-2 border-pen pl-4 italic text-ink-soft">{children}</blockquote>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function AIChat({ initialResourceId, initialPrompt }: { initialResourceId?: string; initialPrompt?: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialPrompt ?? "");
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
  const [loadedAt] = useState(() => Date.now());
  const [query, setQuery] = useState("");
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

  // Arriving from the dashboard with a question: size the box to fit it and put the cursor there.
  useEffect(() => {
    if (!initialPrompt) return;
    const timer = window.setTimeout(() => {
      const box = composerRef.current;
      if (!box) return;
      box.style.height = "48px";
      box.style.height = `${Math.min(box.scrollHeight, 160)}px`;
      box.focus();
      box.setSelectionRange(box.value.length, box.value.length);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialPrompt]);

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
      setMessages([...nextMessages, { role: "assistant", content: reply.trim(), ...(note ? { note } : {}), ...(sources.length ? { sources } : {}) }]);
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

  const groups = groupConversations(
    conversations.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase())),
    loadedAt,
  );
  const suggestions = attachedIds.length ? fileSuggestions : promptSuggestions;
  const lastIndex = messages.length - 1;

  function toggleFile(id: string) {
    setAttachedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : ids.length >= MAX_ATTACHED_DOCUMENTS ? ids : [...ids, id]);
  }

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 px-4 pb-4 pt-4">
        <ZohraMark />
        <p className="font-reading text-[20px] font-semibold tracking-[-0.01em] text-ink">Zohra</p>
        <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close chat history" className={cn("ml-auto grid size-10 place-items-center rounded-md text-ink-soft hover:bg-ink/[0.06] lg:hidden", focus)}><X size={18} /></button>
      </div>

      <button
        type="button"
        onClick={() => {
          setPendingHref(null);
          setPendingOpenId(null);
          if (dirty) setDialog({ kind: "dirty" });
          else startNew();
        }}
        className={cn("mx-4 flex h-11 items-center justify-center gap-2 rounded-lg bg-ink text-sm font-semibold text-paper hover:opacity-90", focus)}
      >
        <MessageSquarePlus size={16} aria-hidden="true" /> New chat
      </button>

      {conversations.length > 0 && (
        <label className="relative mx-4 mt-3 block">
          <span className="sr-only">Search your chats</span>
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats" className={cn("h-10 w-full rounded-lg border border-rule bg-transparent pl-9 pr-3 text-sm placeholder:text-ink-soft", focus)} />
        </label>
      )}

      <div className="mt-4 flex-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 ? (
          <p className="px-3 py-3 text-sm leading-6 text-ink-soft">Chats you save will be listed here.</p>
        ) : groups.length === 0 ? (
          <p className="px-3 py-3 text-sm leading-6 text-ink-soft">No chats match &ldquo;{query}&rdquo;.</p>
        ) : groups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 pb-1 text-[13px] text-ink-soft">{group.label}</p>
            {group.items.map((item) => (
              <div key={item.id} className={cn("group flex items-center gap-1 rounded-lg pl-3 pr-1", conversationId === item.id ? "bg-ink/[0.07]" : "hover:bg-ink/[0.04]")}>
                {renamingId === item.id ? (
                  <form className="flex min-w-0 flex-1 gap-1 py-1" onSubmit={(event) => { event.preventDefault(); void renameConversation(item.id); }}>
                    <input autoFocus maxLength={120} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className={cn("min-w-0 flex-1 rounded-md border border-rule bg-transparent px-2 py-1.5 text-sm", focus)} />
                    <button type="submit" aria-label="Save title" className="grid size-9 place-items-center rounded-md text-pen hover:bg-pen/10"><Check size={15} /></button>
                  </form>
                ) : (
                  <>
                    <button type="button" onClick={() => void openConversation(item.id)} aria-current={conversationId === item.id ? "true" : undefined} className={cn("min-w-0 flex-1 truncate py-2.5 text-left text-[14px] text-ink", conversationId === item.id && "font-medium", focus)}>{item.title}</button>
                    <div className="flex shrink-0 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                      <button type="button" aria-label={`Rename ${item.title}`} onClick={() => { setRenamingId(item.id); setRenameValue(item.title); }} className="grid size-9 place-items-center rounded-md text-ink-soft hover:text-ink"><Pencil size={13} /></button>
                      <button type="button" aria-label={`Delete ${item.title}`} onClick={() => setDialog({ kind: "delete", id: item.id })} className="grid size-9 place-items-center rounded-md text-ink-soft hover:text-flag"><Trash2 size={13} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="border-t border-rule px-4 py-3 text-xs text-ink-soft">Only you can see your chats.</p>
    </div>
  );

  return (
    <section className="planner zohra-ai font-ui relative flex h-[calc(100dvh-11.5rem-env(safe-area-inset-bottom))] min-h-[380px] w-full overflow-hidden rounded-xl border border-rule text-ink lg:h-[calc(100dvh-8.5rem)]">
      <div className="hidden w-[280px] shrink-0 border-r border-rule bg-ink/[0.03] lg:block">{sidebar}</div>

      {historyOpen && (
        <div className="absolute inset-0 z-30 lg:hidden" style={{ backgroundColor: "rgb(9 9 11 / 0.5)" }} onClick={() => setHistoryOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Saved conversations" onClick={(event) => event.stopPropagation()} className="h-full w-[min(86vw,310px)] border-r border-rule bg-paper shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[64px] shrink-0 items-center justify-between gap-3 border-b border-rule px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" aria-label="Open saved conversations" onClick={() => setHistoryOpen(true)} className={cn("grid size-10 shrink-0 place-items-center rounded-md text-ink-soft hover:bg-ink/[0.06] lg:hidden", focus)}><Menu size={19} /></button>
            <div className="min-w-0">
              <h1 className="truncate font-reading text-[18px] font-medium leading-tight text-ink">{conversationId ? activeTitle : "New chat"}</h1>
              <p className="mt-0.5 truncate text-xs text-ink-soft">{attachedIds.length ? `Answering from ${attachedIds.length} of your file${attachedIds.length > 1 ? "s" : ""}` : "Answering from general knowledge"}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {conversationId && <span className="hidden items-center gap-1.5 text-xs text-ink-soft sm:inline-flex"><Check size={13} className="text-pen" /> Saved</span>}
            {dirty && !loading && messages.at(-1)?.role === "assistant" && <button type="button" disabled={saving} onClick={() => void saveConversation()} className={cn("inline-flex h-9 items-center gap-2 rounded-lg border border-rule px-3 text-sm font-medium hover:border-ink disabled:opacity-50", focus)}><Save size={14} />{saving ? "Saving" : "Save chat"}</button>}
          </div>
        </header>

        <div onScroll={(event) => { const el = event.currentTarget; stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; }} className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-[720px] flex-col justify-center pb-4">
              <h2 className="font-reading text-[36px] font-medium leading-[1.06] tracking-[-0.03em] text-ink sm:text-[52px]">{attachedIds.length ? "What should Zohra do with your files?" : "What are you working on?"}</h2>
              <p className="mt-4 max-w-[52ch] text-[16px] leading-7 text-ink-soft">{attachedIds.length ? "Ask anything about them, or start with one of these." : "Ask a question, or pick one of your files and Zohra will answer from it."}</p>

              <div className="mt-7 flex flex-wrap gap-2">
                {suggestions.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => { setInput(prompt); composerRef.current?.focus(); }} className={cn("min-h-11 rounded-lg border border-rule px-4 py-2.5 text-left text-[14px] font-medium text-ink motion-safe:transition-colors hover:border-ink hover:bg-mark", focus)}>{prompt}</button>
                ))}
              </div>

              {files.length > 0 ? (
                <div className="mt-11">
                  <p className="text-[14px] font-medium text-ink">Your files</p>
                  <ul className="mt-2 border-b border-rule">
                    {files.slice(0, 5).map((file) => {
                      const attached = attachedIds.includes(file.id);
                      const full = !attached && attachedIds.length >= MAX_ATTACHED_DOCUMENTS;
                      return (
                        <li key={file.id} className="border-t border-rule">
                          <button type="button" disabled={full} aria-pressed={attached} onClick={() => toggleFile(file.id)} className={cn("flex min-h-14 w-full items-center gap-3.5 px-1 py-3 text-left motion-safe:transition-colors hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-40", attached && "bg-mark/50 hover:bg-mark/50", focus)}>
                            <span className={cn("grid size-5 shrink-0 place-items-center rounded-[4px] border-[1.5px]", attached ? "border-ink bg-ink text-paper" : "border-ink-soft")}>{attached && <Check size={13} strokeWidth={3} />}</span>
                            <span className="min-w-0 flex-1 truncate font-reading text-[17px] text-ink">{file.originalName}</span>
                            {file.pageCount ? <span className="shrink-0 text-sm tabular-nums text-ink-soft">{file.pageCount} pages</span> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="mt-11 text-[14px] leading-6 text-ink-soft">No files yet. Add a PDF on the <Link href="/upload" className="font-medium text-pen underline underline-offset-4">Upload</Link> page and Zohra can answer from it.</p>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-[720px] pb-6">
              {messages.map((message, index) => message.role === "user" ? (
                <div key={`${index}-user`} className="mt-10 flex justify-end first:mt-0">
                  <p className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-ink px-4 py-3 text-[15px] leading-6 text-paper sm:max-w-[78%]">{message.content}</p>
                </div>
              ) : (
                <article key={`${index}-assistant`} className="group/reply mt-6 flex items-start gap-3.5">
                  <span className="hidden sm:block"><ZohraMark /></span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <FormattedReply content={message.content} />
                    {loading && index === lastIndex && <span aria-hidden="true" className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse bg-pen align-text-bottom" />}
                    {message.sources && message.sources.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Files used for this answer">
                        {message.sources.map((source) => (
                          <li key={source.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-rule px-2 py-1 text-[13px] text-ink-soft"><FileText size={13} className="shrink-0" /><span className="max-w-[240px] truncate">{source.name}</span></li>
                        ))}
                      </ul>
                    )}
                    {message.note && <p className="mt-3 bg-mark px-3 py-2 text-[13px] leading-5 text-ink">{message.note}</p>}
                    {!(loading && index === lastIndex) && (
                      <button type="button" onClick={() => void copyReply(message.content, index)} className={cn("-ml-2 mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-soft hover:text-ink", focus)}>
                        {copiedIndex === index ? <Check size={13} /> : <Copy size={13} />}{copiedIndex === index ? "Copied" : "Copy"}
                      </button>
                    )}
                  </div>
                </article>
              ))}

              {loading && messages.at(-1)?.role !== "assistant" && (
                <div className="mt-6 flex items-center gap-3.5 text-[14px] text-ink-soft" role="status" aria-live="polite">
                  <ZohraMark />
                  <span aria-hidden="true" className="flex items-center gap-1">
                    {[0, 160, 320].map((delay) => <i key={delay} className="size-1.5 animate-bounce rounded-full bg-ink-soft motion-reduce:animate-none" style={{ animationDelay: `${delay}ms` }} />)}
                  </span>
                  Thinking
                </div>
              )}

              {error && (
                <div role="alert" className="mt-6 border-l-2 border-flag pl-4 text-[14px] leading-6 text-ink">
                  <p>{error}</p>
                  {messages.at(-1)?.role === "user" && <button type="button" disabled={loading} onClick={() => void sendMessage(messages.at(-1)!.content, true)} className={cn("mt-1 font-semibold underline underline-offset-4", focus)}>Try again</button>}
                </div>
              )}
              {notice && <p role="status" className="mt-6 text-[13px] text-ink-soft">{notice}</p>}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <footer className="shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-1 sm:px-8 sm:pb-4">
          <form ref={formRef} onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="relative mx-auto max-w-[720px]">
            {pickerOpen && (
              <div role="dialog" aria-label="Choose files to ask about" className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-64 overflow-y-auto rounded-xl border border-rule bg-popover p-1.5 text-popover-foreground shadow-xl">
                <p className="px-2.5 pb-1 pt-1.5 text-[13px] text-ink-soft">Choose up to {MAX_ATTACHED_DOCUMENTS} files to ask about</p>
                {files.length === 0 ? (
                  <p className="px-2.5 py-3 text-sm leading-6 text-ink-soft">No files are ready yet. Add a PDF on the <Link href="/upload" className="font-medium text-pen underline underline-offset-4">Upload</Link> page and wait for its text to be read.</p>
                ) : files.map((file) => {
                  const attached = attachedIds.includes(file.id);
                  const full = !attached && attachedIds.length >= MAX_ATTACHED_DOCUMENTS;
                  return (
                    <button key={file.id} type="button" disabled={full} onClick={() => toggleFile(file.id)} className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-3 text-left text-[14px] hover:bg-ink/[0.05] disabled:cursor-not-allowed disabled:opacity-40", attached && "bg-mark/50")}>
                      <FileText size={15} className="shrink-0 text-ink-soft" />
                      <span className="min-w-0 flex-1 truncate">{file.originalName}</span>
                      {file.pageCount ? <span className="shrink-0 text-xs text-ink-soft">{file.pageCount} pages</span> : null}
                      {attached && <Check size={15} className="shrink-0 text-ink" />}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="rounded-2xl border border-ink/25 bg-paper shadow-[0_10px_32px_-14px_rgb(0_0_0/0.35)] focus-within:border-ink">
              {attachedIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-3 pt-3">
                  {attachedIds.map((id) => {
                    const file = files.find((item) => item.id === id);
                    if (!file) return null;
                    return (
                      <span key={id} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-mark py-1 pl-2 pr-1 text-[13px] text-ink">
                        <FileText size={13} className="shrink-0" />
                        <span className="max-w-[220px] truncate">{file.originalName}</span>
                        <button type="button" aria-label={`Remove ${file.originalName}`} onClick={() => setAttachedIds((ids) => ids.filter((item) => item !== id))} className="grid size-6 place-items-center rounded hover:bg-ink/10"><X size={12} /></button>
                      </span>
                    );
                  })}
                </div>
              )}
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
                placeholder={attachedIds.length ? "Ask about your files" : "Ask Zohra anything"}
                aria-label="Message Zohra AI"
                rows={1}
                maxLength={4000}
                disabled={loading}
                className="block max-h-40 min-h-12 w-full resize-none overflow-y-auto bg-transparent px-4 pb-1 pt-4 text-[16px] leading-6 text-ink outline-none placeholder:text-ink-soft disabled:opacity-60"
              />
              <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
                <button type="button" onClick={() => setPickerOpen((open) => !open)} aria-expanded={pickerOpen} className={cn("inline-flex h-9 items-center gap-2 rounded-lg border border-rule px-3 text-sm font-medium hover:border-ink", attachedIds.length ? "text-ink" : "text-ink-soft hover:text-ink", focus)}>
                  <Paperclip size={15} aria-hidden="true" />{attachedIds.length ? `${attachedIds.length} attached` : "Attach files"}
                </button>
                <div className="flex items-center gap-3">
                  {input.length > 3000 && <span className="text-xs tabular-nums text-ink-soft">{input.length} / 4000</span>}
                  <button type="submit" disabled={loading || !input.trim()} aria-label={loading ? "Zohra is thinking" : "Send message"} className={cn("grid size-10 place-items-center rounded-full bg-ink text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:bg-rule disabled:text-ink-soft disabled:opacity-100", focus)}>
                    {loading ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowUp size={19} strokeWidth={2.4} />}
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-2 px-1 text-xs leading-5 text-ink-soft"><span className="hidden sm:inline">Enter sends, Shift+Enter adds a line. </span>Gemini can make mistakes, so check anything important.</p>
          </form>
        </footer>
      </div>

      {dialog && (
        <div className="absolute inset-0 z-40 grid place-items-center p-4" style={{ backgroundColor: "rgb(9 9 11 / 0.55)" }} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissDialog(); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="chat-dialog-title" className="w-full max-w-[400px] rounded-lg border border-rule bg-paper p-6 text-ink shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <h2 id="chat-dialog-title" className="font-reading text-[22px] font-medium leading-tight">{dialog.kind === "delete" ? "Delete this conversation?" : "Save this conversation?"}</h2>
              <button type="button" aria-label="Close dialog" onClick={dismissDialog} className={cn("-mr-2 -mt-1 grid size-10 place-items-center rounded-md text-ink-soft hover:bg-ink/[0.06]", focus)}><X size={17} /></button>
            </div>
            {dialog.kind === "dirty" ? (
              <>
                <p className="mt-2 text-[14px] leading-6 text-ink-soft">This chat isn&apos;t in your history yet. Save it before you leave, or discard it.</p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={dismissDialog} className={cn("h-10 rounded-md px-3 text-sm font-medium text-ink-soft hover:text-ink", focus)}>Stay here</button>
                  <button type="button" onClick={discardAndContinue} className={cn("h-10 rounded-md border border-rule px-4 text-sm font-medium hover:border-ink", focus)}>Discard</button>
                  <button type="button" disabled={saving || messages.at(-1)?.role !== "assistant"} onClick={() => void saveAndContinue()} className={cn("inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50", focus)}>{saving ? "Saving" : "Save and continue"}</button>
                </div>
                {messages.at(-1)?.role !== "assistant" && <p className="mt-3 text-right text-xs text-ink-soft">Retry the current reply before saving.</p>}
              </>
            ) : (
              <>
                <p className="mt-2 text-[14px] leading-6 text-ink-soft">All of its messages will be removed from your saved chats. This can&apos;t be undone.</p>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" onClick={() => setDialog(null)} className={cn("h-10 rounded-md px-3 text-sm font-medium text-ink-soft hover:text-ink", focus)}>Cancel</button>
                  <button type="button" onClick={() => void deleteConversation(dialog.id)} className={cn("h-10 rounded-md bg-flag px-4 text-sm font-semibold text-paper hover:opacity-90", focus)}>Delete conversation</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
