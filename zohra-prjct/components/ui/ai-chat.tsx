"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp, Check, Clock3, LoaderCircle,
  Menu, MessageCircle, Pencil, Plus, RefreshCw, Save,
  Sparkles, Trash2, X,
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; updatedAt: string; _count?: { messages: number } };
type Dialog = { kind: "dirty" } | { kind: "delete"; id: string } | null;

const prompts = [
  "Explain a difficult topic in simple terms",
  "Help me make a study plan for this week",
  "Quiz me on a topic I’m learning",
];

function AssistantMark({ small = false }: { small?: boolean }) {
  return <span className={`relative grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white shadow-lg shadow-violet-900/20 ${small ? "size-9 rounded-xl" : "size-12"}`}><Sparkles size={small ? 17 : 23} /><span className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-white bg-emerald-400 dark:border-[#16151d]" /></span>;
}

function FormattedReply({ content }: { content: string }) {
  return <div className="chat-markdown min-w-0 text-[14px] leading-7 text-zinc-700 dark:text-zinc-200 sm:text-[15px]">
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="font-medium text-violet-700 underline decoration-violet-300 underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:decoration-violet-500 dark:hover:text-violet-200">{children}</a>,
      pre: ({ children }) => <pre className="my-4 max-w-full overflow-x-auto rounded-2xl border border-zinc-800 bg-[#111116] p-4 text-[13px] leading-6 text-zinc-100">{children}</pre>,
      code: ({ children, className }) => className
        ? <code className="font-mono text-[12px]">{children}</code>
        : <code className="rounded-md bg-violet-100 px-1.5 py-0.5 font-mono text-[0.88em] text-violet-900 dark:bg-violet-400/15 dark:text-violet-200">{children}</code>,
      table: ({ children }) => <div className="my-4 max-w-full overflow-x-auto"><table className="w-full border-collapse text-left text-sm">{children}</table></div>,
      th: ({ children }) => <th className="border border-zinc-200 bg-zinc-100 px-3 py-2 font-semibold dark:border-white/10 dark:bg-white/5">{children}</th>,
      td: ({ children }) => <td className="border border-zinc-200 px-3 py-2 dark:border-white/10">{children}</td>,
      blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-violet-400 pl-4 text-zinc-600 dark:text-zinc-300">{children}</blockquote>,
    }}>{content}</ReactMarkdown>
  </div>;
}

export default function AIChat() {
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const dirty = messages.length > 0 && (!conversationId || (messages.at(-1)?.role === "user" && Boolean(error)));

  const loadList = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/conversations", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch { /* A later save or visit will load the list again. */ }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadList(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadList]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);

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
    if (!retry) { setMessages(nextMessages); setInput(""); }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationId ? [nextMessages.at(-1)] : nextMessages.slice(-100),
          ...(conversationId ? { conversationId } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not get an AI response.");
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("Gemini returned an empty reply. Please try again.");
      setMessages([...nextMessages, { role: "assistant", content: data.reply.trim() }]);
      if (conversationId) void loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  function startNew() {
    setMessages([]); setInput(""); setError(""); setNotice(""); setConversationId(null); setHistoryOpen(false); setDialog(null); setPendingHref(null); setPendingOpenId(null);
  }

  async function saveConversation() {
    if (!dirty || messages.at(-1)?.role !== "assistant" || saving) return false;
    setSaving(true);
    try {
      const response = await fetch("/api/ai/conversations", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }),
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
    } finally { setSaving(false); }
  }

  async function saveAndContinue() {
    const saved = await saveConversation();
    if (!saved) return;
    const destination = pendingHref;
    const openId = pendingOpenId;
    setPendingOpenId(null);
    if (destination) router.push(destination);
    else if (openId) { setPendingHref(null); setDialog(null); void openConversation(openId, true); }
    else startNew();
  }

  function discardAndContinue() {
    const destination = pendingHref;
    const openId = pendingOpenId;
    setDialog(null);
    setPendingOpenId(null);
    if (destination) router.push(destination);
    else if (openId) { setPendingHref(null); void openConversation(openId, true); }
    else startNew();
  }

  async function openConversation(id: string, force = false) {
    if (dirty && !force) { setPendingOpenId(id); setPendingHref(null); setDialog({ kind: "dirty" }); return; }
    setHistoryOpen(false); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open this conversation.");
      setConversationId(id);
      setMessages(data.conversation.messages.map((message: Message) => ({ role: message.role, content: message.content })));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not open this conversation."); }
  }

  async function renameConversation(id: string) {
    const title = renameValue.trim();
    if (!title || title.length > 120) return;
    const response = await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Could not rename conversation."); return; }
    setConversations((items) => items.map((item) => item.id === id ? { ...item, title } : item));
    setRenamingId(null);
    setNotice("Conversation renamed.");
  }

  async function deleteConversation(id: string) {
    const response = await fetch(`/api/ai/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { setError("Could not delete conversation."); return; }
    setConversations((items) => items.filter((item) => item.id !== id));
    if (conversationId === id) startNew();
    setDialog(null);
  }

  const sidebar = <div className="flex h-full min-h-0 flex-col">
    <div className="flex items-center justify-between px-4 pb-3 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">Your conversations</p>
      <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close chat history" className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10 lg:hidden"><X size={17} /></button>
    </div>
    <button type="button" onClick={() => { setPendingHref(null); setPendingOpenId(null); if (dirty) setDialog({ kind: "dirty" }); else startNew(); }} className="mx-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-300/20 dark:bg-violet-400/10 dark:text-violet-200 dark:hover:bg-violet-400/15">
      <Plus size={16} /> New chat
    </button>
    <div className="mt-4 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
      {conversations.length === 0 ? <div className="px-3 py-6 text-center text-xs leading-5 text-zinc-500">Saved chats will appear here.</div> : conversations.map((item) => <div key={item.id} className={`group rounded-xl border px-2 py-2 ${conversationId === item.id ? "border-violet-200 bg-violet-50 dark:border-violet-300/20 dark:bg-violet-400/10" : "border-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.05]"}`}>
        {renamingId === item.id ? <form className="flex gap-1" onSubmit={(event) => { event.preventDefault(); void renameConversation(item.id); }}><input autoFocus maxLength={120} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-violet-400 dark:border-white/10 dark:bg-[#17161e]" /><button aria-label="Save title" className="rounded-md p-1.5 text-violet-700 hover:bg-violet-100 dark:text-violet-200"><Check size={15} /></button></form> : <>
          <button type="button" onClick={() => void openConversation(item.id)} className="block w-full truncate text-left text-[13px] font-medium text-zinc-700 dark:text-zinc-200">{item.title}</button>
          <div className="mt-1.5 flex items-center justify-between"><span className="flex items-center gap-1 text-[10px] text-zinc-500"><Clock3 size={11} />{new Date(item.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><div className="flex gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><button type="button" aria-label={`Rename ${item.title}`} onClick={() => { setRenamingId(item.id); setRenameValue(item.title); }} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10"><Pencil size={13} /></button><button type="button" aria-label={`Delete ${item.title}`} onClick={() => setDialog({ kind: "delete", id: item.id })} className="rounded-md p-1 text-zinc-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-400/10 dark:hover:text-red-300"><Trash2 size={13} /></button></div></div>
        </>}
      </div>)}
    </div>
    <div className="border-t border-zinc-200 px-4 py-3 text-[10px] text-zinc-500 dark:border-white/10">Chats are private to your account</div>
  </div>;

  return <section className="relative flex h-[calc(100dvh-11.5rem-env(safe-area-inset-bottom))] min-h-[380px] w-full overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_18px_60px_rgba(38,28,72,0.08)] dark:border-white/10 dark:bg-[#14131a] dark:shadow-[0_24px_80px_rgba(0,0,0,0.25)] lg:h-[calc(100dvh-8.5rem)]">
    <aside className="hidden w-[248px] shrink-0 border-r border-zinc-200 bg-zinc-50/70 dark:border-white/10 dark:bg-[#111016] lg:block">{sidebar}</aside>
    {historyOpen && <div className="absolute inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setHistoryOpen(false)}><aside onClick={(event) => event.stopPropagation()} className="h-full w-[min(84vw,310px)] border-r border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#14131a]">{sidebar}</aside></div>}

    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-zinc-200 px-3 dark:border-white/10 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5"><button type="button" aria-label="Open saved conversations" onClick={() => setHistoryOpen(true)} className="grid size-9 shrink-0 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10 lg:hidden"><Menu size={19} /></button><AssistantMark small /><div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">Zohra AI</p><p className="text-[10px] text-zinc-500">Your thoughtful AI companion</p></div></div>
        <div className="flex shrink-0 items-center gap-1.5">{conversationId && <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300 sm:inline-flex"><Check size={12} /> Saved</span>}{dirty && messages.at(-1)?.role === "assistant" && <button type="button" disabled={saving} onClick={() => void saveConversation()} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60 sm:px-3"><Save size={13} />{saving ? "Saving" : "Save"}</button>}{conversationId && <button type="button" onClick={() => dirty ? setDialog({ kind: "dirty" }) : startNew()} className="hidden h-8 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5 sm:inline-flex"><Plus size={14} /> New</button>}</div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-7 lg:px-10">
        {messages.length === 0 ? <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center pb-5">
          <div className="mb-6 flex items-center gap-4"><span className="grid size-[58px] place-items-center rounded-[20px] bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-700 text-white shadow-xl shadow-violet-800/20"><Sparkles size={28} /></span><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">A little clarity goes a long way</p><h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-[32px]">Hi, I’m Zohra.</h1></div></div>
          <p className="max-w-xl text-[15px] leading-7 text-zinc-600 dark:text-zinc-400 sm:text-base">Bring me a question, a tricky concept, or a half-formed idea. We’ll work through it together.</p>
          <div className="mt-8 grid gap-2.5 sm:grid-cols-3">{prompts.map((prompt, index) => <button type="button" key={prompt} onClick={() => setInput(prompt)} className="group min-h-[92px] rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 dark:border-white/10 dark:bg-white/[0.025] dark:hover:border-violet-300/30 dark:hover:bg-violet-400/[0.06]"><span className="mb-3 grid size-7 place-items-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">{index === 0 ? <MessageCircle size={15} /> : index === 1 ? <Clock3 size={15} /> : <Sparkles size={15} />}</span><span className="text-xs font-medium leading-5 text-zinc-700 group-hover:text-violet-900 dark:text-zinc-300 dark:group-hover:text-violet-100">{prompt}</span></button>)}</div>
          <p className="mt-6 text-[11px] text-zinc-400">Powered by Google Gemini · Responses can make mistakes</p>
        </div> : <div className="mx-auto max-w-3xl space-y-7 pb-4">{messages.map((message, index) => message.role === "user" ? <div key={`${index}-user`} className="flex justify-end"><div className="max-w-[88%] rounded-[21px] rounded-br-md bg-violet-600 px-4 py-3 text-[14px] leading-6 text-white shadow-sm shadow-violet-900/10 sm:max-w-[78%] sm:px-5 sm:py-3.5">{message.content}</div></div> : <article key={`${index}-assistant`} className="flex items-start gap-3 sm:gap-4"><AssistantMark small /><div className="min-w-0 flex-1 pt-0.5"><div className="mb-1 text-xs font-semibold text-zinc-800 dark:text-zinc-100">Zohra</div><FormattedReply content={message.content} /></div></article>)}
          {loading && <div className="flex items-center gap-3"><AssistantMark small /><div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-500 dark:bg-white/[0.05] dark:text-zinc-400"><LoaderCircle size={15} className="animate-spin text-violet-500" />Thinking through it…</div></div>}
          {error && <div role="alert" className="ml-11 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/20 dark:bg-red-400/[0.07] dark:text-red-200"><div className="flex items-start justify-between gap-3"><p>{error}</p>{messages.at(-1)?.role === "user" && <button type="button" disabled={loading} onClick={() => void sendMessage(messages.at(-1)!.content, true)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-300/70 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-100 dark:border-red-300/20 dark:hover:bg-red-400/10"><RefreshCw size={12} /> Retry</button>}</div></div>}
          {notice && <p role="status" className="ml-11 text-xs text-emerald-700 dark:text-emerald-300">{notice}</p>}
          <div ref={bottomRef} />
        </div>}
      </div>

      <div className="shrink-0 border-t border-zinc-200 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 dark:border-white/10 dark:bg-[#14131a]/95 sm:px-6 sm:pb-4 lg:px-10"><form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="mx-auto max-w-3xl"><div className="flex items-end gap-2 rounded-[20px] border border-zinc-300 bg-white p-2 shadow-[0_4px_18px_rgba(38,28,72,0.06)] transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/10 dark:border-white/15 dark:bg-[#1a1921] dark:focus-within:border-violet-400/50"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Ask anything…" aria-label="Message Zohra AI" rows={1} maxLength={4000} disabled={loading} className="max-h-32 min-h-10 flex-1 resize-y bg-transparent px-2.5 py-2 text-sm leading-6 text-zinc-800 outline-none placeholder:text-zinc-400 disabled:opacity-60 dark:text-zinc-100" /><button type="submit" disabled={loading || !input.trim()} aria-label="Send message" className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-violet-600 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-white/10 dark:disabled:text-zinc-500">{loading ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowUp size={19} />}</button></div><div className="mt-1.5 flex items-center justify-between px-1"><span className="text-[10px] text-zinc-400">Enter to send · Shift + Enter for a new line</span><span className="text-[10px] text-zinc-400">{input.length}/4000</span></div></form></div>
    </div>

    {dialog && <div className="absolute inset-0 z-40 grid place-items-center bg-zinc-950/45 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><div role="dialog" aria-modal="true" aria-labelledby="chat-dialog-title" className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#1c1a24]"><div className="mb-3 flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-200">{dialog.kind === "delete" ? <Trash2 size={18} /> : <Save size={18} />}</span><button type="button" aria-label="Close dialog" onClick={() => { setDialog(null); setPendingHref(null); }} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"><X size={17} /></button></div>{dialog.kind === "dirty" ? <><h2 id="chat-dialog-title" className="text-lg font-semibold text-zinc-900 dark:text-white">Save this conversation?</h2><p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">You can keep it in your chat list or discard it before moving on.</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDialog(null)} className="h-10 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5">Stay here</button><button type="button" onClick={discardAndContinue} className="h-10 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5">Discard</button><button type="button" disabled={saving || messages.at(-1)?.role !== "assistant"} onClick={() => void saveAndContinue()} className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"><Save size={15} />{saving ? "Saving…" : "Save & continue"}</button></div>{messages.at(-1)?.role !== "assistant" && <p className="mt-2 text-center text-[11px] text-zinc-500">Finish or retry the current reply before saving.</p>}</> : <><h2 id="chat-dialog-title" className="text-lg font-semibold text-zinc-900 dark:text-white">Delete this chat?</h2><p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">This conversation and its messages will be permanently removed.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDialog(null)} className="h-10 rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-700 dark:border-white/10 dark:text-zinc-300">Cancel</button><button type="button" onClick={() => void deleteConversation(dialog.id)} className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700">Delete chat</button></div></>}</div></div>}
  </section>;
}
