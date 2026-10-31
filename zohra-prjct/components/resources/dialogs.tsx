"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import type { Resource, StudyYear } from "@/lib/resources-view";
import { cn } from "@/lib/utils";
import { focusRing, primaryButton, secondaryButton } from "@/components/dashboard/shared";
import { Modal } from "./modal";

const selectClass = cn(
  "mt-1.5 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50",
  focusRing,
);

export type Location = {
  studyYearId: string | null;
  semesterId: string | null;
  subjectId: string | null;
  chapterId: string | null;
};

export function OrganizerDialog({
  resource,
  years,
  busy,
  error,
  onClose,
  onSave,
}: {
  resource: Resource;
  years: StudyYear[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (location: Location) => void;
}) {
  const [yearId, setYearId] = useState(resource.studyYearId ?? "");
  const [semesterId, setSemesterId] = useState(resource.semesterId ?? "");
  const [subjectId, setSubjectId] = useState(resource.subjectId ?? "");
  const [chapterId, setChapterId] = useState(resource.chapterId ?? "");

  const semesters = years.find((year) => year.id === yearId)?.semesters ?? [];
  const subjects = semesters.find((semester) => semester.id === semesterId)?.subjects ?? [];
  const chapters = subjects.find((subject) => subject.id === subjectId)?.chapters ?? [];

  return (
    <Modal labelledBy="organize-title" onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="organize-title" className="text-lg font-semibold tracking-tight">
            Choose a folder
          </h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">{resource.originalName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted",
            focusRing,
          )}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {years.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Create your academic year and course folders first.{" "}
          <Link
            href="/resources/courses"
            className="font-medium text-violet-700 underline dark:text-violet-300"
          >
            Manage course folders
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium">
            Academic year
            <select
              data-autofocus
              value={yearId}
              onChange={(event) => {
                setYearId(event.target.value);
                setSemesterId("");
                setSubjectId("");
                setChapterId("");
              }}
              className={selectClass}
            >
              <option value="">Choose a year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Semester
            <select
              disabled={!yearId}
              value={semesterId}
              onChange={(event) => {
                setSemesterId(event.target.value);
                setSubjectId("");
                setChapterId("");
              }}
              className={selectClass}
            >
              <option value="">Choose a semester</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Subject
            <select
              disabled={!semesterId}
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setChapterId("");
              }}
              className={selectClass}
            >
              <option value="">Choose a subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Chapter <span className="font-normal text-muted-foreground">(optional)</span>
            <select
              disabled={!subjectId}
              value={chapterId}
              onChange={(event) => setChapterId(event.target.value)}
              className={selectClass}
            >
              <option value="">No chapter</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave({ studyYearId: null, semesterId: null, subjectId: null, chapterId: null })
          }
          className={cn(secondaryButton, "disabled:opacity-50")}
        >
          Move to Unsorted
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={cn(secondaryButton, "flex-1 sm:flex-none")}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !subjectId}
            onClick={() =>
              onSave({
                studyYearId: yearId || null,
                semesterId: semesterId || null,
                subjectId: subjectId || null,
                chapterId: chapterId || null,
              })
            }
            className={cn(
              primaryButton,
              "flex-1 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:flex-none",
            )}
          >
            {busy && <Loader2 size={16} aria-hidden="true" className="motion-safe:animate-spin" />}
            {busy ? "Saving…" : "Save location"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ConfirmDeleteDialog({
  resource,
  busy,
  onCancel,
  onConfirm,
}: {
  resource: Resource;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal labelledBy="delete-title" onClose={busy ? () => undefined : onCancel} className="max-w-md">
      <h2 id="delete-title" className="text-lg font-semibold tracking-tight">
        Delete this file?
      </h2>
      <p className="mt-2 break-words text-sm font-medium">{resource.originalName}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The file and its extracted text will be permanently removed from your library. This can&apos;t
        be undone.
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={cn(secondaryButton, "disabled:opacity-50")}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-red-50 motion-safe:transition-colors hover:bg-red-500 disabled:opacity-60",
            focusRing,
          )}
        >
          {busy && <Loader2 size={16} aria-hidden="true" className="motion-safe:animate-spin" />}
          {busy ? "Deleting…" : "Delete file"}
        </button>
      </div>
    </Modal>
  );
}
