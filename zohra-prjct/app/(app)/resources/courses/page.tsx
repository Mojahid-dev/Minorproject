"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Check, ChevronDown, FolderTree, Pencil, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Chapter = { id: string; name: string; aliases: string[] };
type Subject = { id: string; name: string; aliases: string[]; chapters: Chapter[] };
type Semester = { id: string; name: string; aliases: string[]; subjects: Subject[] };
type StudyYear = { id: string; label: string; aliases: string[]; semesters: Semester[] };
type Kind = "year" | "semester" | "subject" | "chapter";
type EditTarget = { kind: Kind; id: string; name: string; aliases: string };

const inputClass = "min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 text-sm text-white outline-none transition focus:border-violet-300/70";

export default function CourseStructurePage() {
  const [years, setYears] = useState<StudyYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [kind, setKind] = useState<Kind>("year");
  const [name, setName] = useState("");
  const [aliases, setAliases] = useState("");
  const [yearId, setYearId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [deleting, setDeleting] = useState<EditTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const semesters = useMemo(() => years.flatMap((year) => year.semesters.map((semester) => ({ ...semester, yearLabel: year.label }))), [years]);
  const subjects = useMemo(() => semesters.flatMap((semester) => semester.subjects.map((subject) => ({ ...subject, semesterLabel: semester.name, yearLabel: semester.yearLabel }))), [semesters]);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/study-structure");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load your course folders.");
      setYears(payload.years);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load your course folders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(false); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const parentId = kind === "semester" ? yearId : kind === "subject" ? semesterId : kind === "chapter" ? subjectId : undefined;
    try {
      const response = await fetch("/api/study-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name, aliases: aliases.split(",").map((alias) => alias.trim()).filter(Boolean), parentId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save this course folder.");
      setName("");
      setAliases("");
      setNotice(`${name.trim()} was added. Zohra will use its name and aliases when organizing uploads.`);
      await load(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this course folder.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setError("");
    setSaving(true);
    try {
      const response = await fetch(`/api/study-structure/${editing.kind}/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editing.name, aliases: editing.aliases.split(",").map((alias) => alias.trim()).filter(Boolean) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not update this course folder.");
      setEditing(null);
      setNotice("Course folder updated. Future uploads will match the new name and aliases.");
      await load(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this course folder.");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem() {
    if (!deleting) return;
    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/study-structure/${deleting.kind}/${deleting.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not delete this course folder.");
      setNotice(`${deleting.name} was removed.`);
      setDeleting(null);
      await load(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this course folder.");
    } finally {
      setIsDeleting(false);
    }
  }

  const parentRequired = kind !== "year";
  const hasParent = kind === "semester" ? years.length > 0 : kind === "subject" ? semesters.length > 0 : subjects.length > 0;

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-clip pb-10 text-white">
      <Link href="/resources" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm text-neutral-400 transition hover:text-white"><ArrowLeft size={16} /> Back to resources</Link>
      <header className="mt-5 flex flex-col gap-3 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">Your study system</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">Course folders</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">Manage and rename folders here, or enter course details after uploading. Zohra reuses matching folders and creates any missing parts of the path automatically.</p></div>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-neutral-300"><FolderTree size={16} className="text-violet-200" /> Year → semester → subject → chapter</div>
      </header>

      {error && <div role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-200">{error}</div>}
      {notice && <div role="status" className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] px-4 py-3 text-sm text-emerald-100">{notice}</div>}

      <div className="mt-4 grid min-w-0 gap-3 sm:mt-6 sm:gap-5 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)]">
        <section className="h-fit rounded-2xl border border-white/[0.08] bg-[#151518] p-4 sm:p-5">
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-200/10 text-violet-100"><Plus size={18} /></span><div><h2 className="font-semibold">Add a folder</h2><p className="mt-1 text-xs leading-5 text-neutral-500">Names are the exact clues the organizer will recognize.</p></div></div>
          <form onSubmit={addItem} className="mt-5 space-y-4">
            <label className="block text-xs font-medium text-neutral-300">Folder level<select value={kind} onChange={(event) => { setKind(event.target.value as Kind); setYearId(""); setSemesterId(""); setSubjectId(""); }} className={`${inputClass} mt-1.5`}><option value="year">Academic year</option><option value="semester">Semester</option><option value="subject">Subject</option><option value="chapter">Chapter</option></select></label>
            {parentRequired && <label className="block text-xs font-medium text-neutral-300">{kind === "semester" ? "Academic year" : kind === "subject" ? "Semester" : "Subject"}<span className="relative mt-1.5 block"><select required value={kind === "semester" ? yearId : kind === "subject" ? semesterId : subjectId} onChange={(event) => kind === "semester" ? setYearId(event.target.value) : kind === "subject" ? setSemesterId(event.target.value) : setSubjectId(event.target.value)} className={`${inputClass} appearance-none pr-9`}><option value="">Choose a parent folder</option>{kind === "semester" ? years.map((year) => <option key={year.id} value={year.id}>{year.label}</option>) : kind === "subject" ? semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.yearLabel} · {semester.name}</option>) : subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.yearLabel} · {subject.semesterLabel} · {subject.name}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-3.5 text-neutral-500" /></span>{!hasParent && <span className="mt-1 block text-[11px] text-amber-200">Create the parent level first.</span>}</label>}
            <label className="block text-xs font-medium text-neutral-300">{kind === "year" ? "Academic year name" : kind === "semester" ? "Semester name" : kind === "subject" ? "Subject name" : "Chapter name"}<input required maxLength={140} value={name} onChange={(event) => setName(event.target.value)} placeholder={kind === "year" ? "2026–27" : kind === "semester" ? "Semester 1" : kind === "subject" ? "Biology" : "Cell structure"} className={`${inputClass} mt-1.5`} /></label>
            <label className="block text-xs font-medium text-neutral-300">Other names (optional)<input value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder="e.g. Bio, BIO101, Unit 1" className={`${inputClass} mt-1.5`} /><span className="mt-1 block text-[11px] font-normal leading-5 text-neutral-500">Separate aliases with commas. Include the wording students use in filenames or document headings.</span></label>
            <button disabled={saving || (parentRequired && !hasParent)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} />{saving ? "Saving…" : "Add to course structure"}</button>
          </form>
        </section>

        <section className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#111113] p-3 sm:p-5">
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4"><div><div className="flex items-center gap-2"><BookOpen size={17} className="text-neutral-400" /><h2 className="font-semibold">Your structure</h2></div><p className="mt-1 text-xs text-neutral-500">Rename folders or adjust aliases whenever your course changes.</p></div><span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-neutral-400">{years.length} year{years.length === 1 ? "" : "s"}</span></div>
          {loading ? <div className="py-12 text-center text-sm text-neutral-500">Loading your course folders…</div> : years.length === 0 ? <div className="py-14 text-center"><FolderTree size={28} className="mx-auto text-neutral-600" /><p className="mt-3 text-sm font-medium text-neutral-300">Start with your academic year</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-neutral-500">For example, add “2026–27”, then create semesters and subjects under it. Uploads can be organized once Zohra has names to match.</p></div> : <div className="mt-4 space-y-3">{years.map((year) => <StructureRow key={year.id} kind="year" id={year.id} name={year.label} aliases={year.aliases} editing={editing} setEditing={setEditing} onSave={saveEdit} onDelete={setDeleting} saving={saving}><div className="mt-2 space-y-2 border-l border-white/[0.08] pl-3">{year.semesters.map((semester) => <StructureRow key={semester.id} kind="semester" id={semester.id} name={semester.name} aliases={semester.aliases} editing={editing} setEditing={setEditing} onSave={saveEdit} onDelete={setDeleting} saving={saving}><div className="mt-2 space-y-2 border-l border-white/[0.08] pl-3">{semester.subjects.map((subject) => <StructureRow key={subject.id} kind="subject" id={subject.id} name={subject.name} aliases={subject.aliases} editing={editing} setEditing={setEditing} onSave={saveEdit} onDelete={setDeleting} saving={saving}><div className="mt-2 space-y-1 border-l border-white/[0.08] pl-3">{subject.chapters.map((chapter) => <StructureRow key={chapter.id} kind="chapter" id={chapter.id} name={chapter.name} aliases={chapter.aliases} editing={editing} setEditing={setEditing} onSave={saveEdit} onDelete={setDeleting} saving={saving} />)}{subject.chapters.length === 0 && <p className="py-1 text-xs text-neutral-600">No chapters yet</p>}</div></StructureRow>)}</div></StructureRow>)}</div></StructureRow>)}</div>}
        </section>
      </div>
      {deleting && <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleting(null); }}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="delete-folder-title" aria-describedby="delete-folder-description" className="my-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#191a1e] p-5 shadow-2xl sm:p-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-rose-300/10 text-rose-200"><Trash2 size={19} /></span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-rose-200">Delete folder</p>
          <h2 id="delete-folder-title" className="mt-1 break-words text-xl font-semibold text-white">Delete “{deleting.name}”?</h2>
          <p id="delete-folder-description" className="mt-2 text-sm leading-6 text-neutral-400">{deleting.kind === "year" || deleting.kind === "semester" || deleting.kind === "subject" ? "This also deletes all folders inside it. Your uploaded files stay in the library, but files in this path become Unsorted." : "The folder will be removed. Uploaded files stay in the library and keep their subject location."} This action cannot be undone.</p>
          {error && <p role="alert" className="mt-3 rounded-xl bg-rose-300/[0.08] px-3 py-2 text-sm text-rose-200">{error}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" disabled={isDeleting} onClick={() => { setDeleting(null); setError(""); }} className="min-h-11 rounded-xl border border-white/10 px-3 text-sm font-medium text-neutral-200 transition hover:bg-white/[0.06] disabled:opacity-50">Keep folder</button><button type="button" disabled={isDeleting} onClick={() => void removeItem()} className="min-h-11 rounded-xl bg-rose-300 px-3 text-sm font-semibold text-rose-950 transition hover:bg-rose-200 disabled:cursor-wait disabled:opacity-60">{isDeleting ? "Deleting…" : "Delete folder"}</button></div>
        </section>
      </div>}
    </main>
  );
}

function StructureRow({ kind, id, name, aliases, editing, setEditing, onSave, onDelete, saving, children }: {
  kind: Kind; id: string; name: string; aliases: string[]; editing: EditTarget | null; setEditing: (value: EditTarget | null) => void; onSave: () => void; onDelete: (target: EditTarget) => void; saving: boolean; children?: React.ReactNode;
}) {
  const isEditing = editing?.id === id;
  return <article className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5 sm:p-3">
    {isEditing ? <div className="space-y-2"><input aria-label="Folder name" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className={inputClass} /><input aria-label="Aliases separated by commas" value={editing.aliases} onChange={(event) => setEditing({ ...editing, aliases: event.target.value })} placeholder="Aliases, separated by commas" className={inputClass} /><div className="flex justify-end gap-2"><button onClick={() => setEditing(null)} className="grid size-9 place-items-center rounded-lg text-neutral-400 hover:bg-white/[0.08]" aria-label="Cancel edit"><X size={16} /></button><button disabled={saving} onClick={onSave} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-black disabled:opacity-50"><Check size={14} />Save</button></div></div> : <><div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span><span className="shrink-0 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] uppercase tracking-wider text-neutral-500">{kind}</span><button onClick={() => setEditing({ kind, id, name, aliases: aliases.join(", ") })} aria-label={`Edit ${name}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-white/[0.08] hover:text-white"><Pencil size={14} /></button><button onClick={() => onDelete({ kind, id, name, aliases: aliases.join(", ") })} aria-label={`Delete ${name}`} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-300/15 bg-rose-300/[0.06] px-2.5 text-xs font-medium text-rose-200 transition hover:bg-rose-300/15"><Trash2 size={14} />Delete</button></div>{aliases.length > 0 && <p className="mt-1 break-words text-xs text-neutral-500">Also matches: {aliases.join(", ")}</p>}</>}
    {children}
  </article>;
}
