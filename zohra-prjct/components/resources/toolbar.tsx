"use client";

import { Search, X } from "lucide-react";
import {
  filterLabels,
  sortLabels,
  type FileFilter,
  type SortKey,
} from "@/lib/resources-view";
import { cn } from "@/lib/utils";
import { focusRing } from "@/components/dashboard/shared";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  filter: FileFilter;
  onFilter: (value: FileFilter) => void;
  /** Number of files per type for the current search. */
  counts: Record<FileFilter, number>;
  sort: SortKey;
  onSort: (value: SortKey) => void;
  showSort: boolean;
};

export function Toolbar({ query, onQuery, filter, onFilter, counts, sort, onSort, showSort }: Props) {
  // Only offer types the library actually contains (plus whichever is active).
  const chips = (Object.keys(filterLabels) as FileFilter[]).filter(
    (id) => id === "all" || id === filter || counts[id] > 0,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="resource-search" className="sr-only">
            Search files
          </label>
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="resource-search"
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search by name, tag, subject or chapter…"
            autoComplete="off"
            className={cn(
              "min-h-11 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden",
              focusRing,
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label="Clear search"
              className={cn(
                "absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
                focusRing,
              )}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {showSort && (
          <div>
            <label htmlFor="resource-sort" className="sr-only">
              Sort files
            </label>
            <select
              id="resource-sort"
              value={sort}
              onChange={(event) => onSort(event.target.value as SortKey)}
              className={cn(
                "min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground sm:w-44",
                focusRing,
              )}
            >
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {sortLabels[key]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {chips.length > 1 && (
        <div
          role="group"
          aria-label="Filter by file type"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {chips.map((id) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onFilter(id)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium motion-safe:transition-colors",
                  active
                    ? "border-violet-500/50 bg-violet-500/10 text-violet-800 dark:text-violet-200"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  focusRing,
                )}
              >
                {filterLabels[id]}
                <span className="text-xs tabular-nums opacity-70">{counts[id]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
