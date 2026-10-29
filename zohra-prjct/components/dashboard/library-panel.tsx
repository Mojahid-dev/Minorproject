// "use client";

// import Link from "next/link";
// import {
//   ArrowRight,
//   CircleAlert,
//   File,
//   FileText,
//   Image as ImageIcon,
//   Loader2,
//   Presentation,
//   UploadCloud,
//   Video,
//   XCircle,
//   type LucideIcon,
// } from "lucide-react";
// // import {
// //   formatRelative,
// //   needsAttention,
// //   plural,
// //   resourceBadge,
// //   resourceKind,
// //   type DashboardResource,
// //   type ResourceBadge,
// //   type ResourceKind,
// // } from "@/lib/dashboard-utils";
// import { Skeleton } from "@/components/ui/skeleton";
// import { cn } from "@/lib/utils";
// import { InlineError, PanelHeader, focusRing, panel, primaryButton } from "./shared";

// const kindIcon: Record<ResourceKind, LucideIcon> = {
//   pdf: FileText,
//   text: FileText,
//   document: FileText,
//   image: ImageIcon,
//   video: Video,
//   slides: Presentation,
//   file: File,
// };

// const badgeStyle: Record<ResourceBadge["tone"], string> = {
//   info: "bg-sky-500/10 text-sky-800 dark:text-sky-300",
//   warn: "bg-amber-500/15 text-amber-900 dark:text-amber-300",
//   danger: "bg-destructive/10 text-destructive",
// };

// function StatusBadge({ badge }: { badge: ResourceBadge }) {
//   // Icon + label so status never depends on colour alone.
//   const Icon =
//     badge.label === "Processing" ? Loader2 : badge.label === "Failed" ? XCircle : CircleAlert;
//   return (
//     <span
//       className={cn(
//         "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
//         badgeStyle[badge.tone],
//       )}
//     >
//       <Icon
//         size={12}
//         aria-hidden="true"
//         className={badge.label === "Processing" ? "motion-safe:animate-spin" : undefined}
//       />
//       {badge.label}
//     </span>
//   );
// }

// function Stat({
//   label,
//   value,
//   warn,
// }: {
//   label: string;
//   value: number;
//   warn?: boolean;
// }) {
//   return (
//     <div className="rounded-xl bg-muted/60 px-3 py-2.5">
//       <dt className="text-xs text-muted-foreground">{label}</dt>
//       <dd
//         className={cn(
//           "mt-0.5 text-xl font-semibold tabular-nums tracking-tight",
//           warn ? "text-amber-800 dark:text-amber-300" : "text-foreground",
//         )}
//       >
//         {value}
//       </dd>
//     </div>
//   );
// }

// type Props = {
//   resources: DashboardResource[];
//   loading: boolean;
//   error: string;
//   now: number | null;
//   onRetry: () => void;
// };

// export function LibraryPanel({ resources, loading, error, now, onRetry }: Props) {
//   const total = resources.length;
//   const organized = resources.filter((r) => r.organizationStatus === "ORGANIZED").length;
//   const attention = resources.filter(needsAttention).length;
//   const recent = resources.slice(0, 5);

//   return (
//     <section aria-labelledby="library-heading" className={cn(panel, "p-4 sm:p-5")}>
//       <PanelHeader
//         id="library-heading"
//         title="Recent files"
//         action={
//           total > 0 && (
//             <Link
//               href="/resources"
//               className={cn(
//                 "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-500/10 dark:text-violet-300",
//                 focusRing,
//               )}
//             >
//               View all <ArrowRight size={14} aria-hidden="true" />
//             </Link>
//           )
//         }
//       />

//       {loading ? (
//         <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading files">
//           <Skeleton className="h-[62px]" />
//           <Skeleton className="h-14" />
//           <Skeleton className="h-14" />
//         </div>
//       ) : error ? (
//         <div className="mt-3">
//           <InlineError message={error} onRetry={onRetry} />
//         </div>
//       ) : total === 0 ? (
//         <div className="mt-3 flex flex-col items-center rounded-xl border border-dashed border-border px-4 py-8 text-center">
//           <span className="grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300">
//             <UploadCloud size={22} aria-hidden="true" />
//           </span>
//           <p className="mt-3 text-sm font-semibold text-foreground">Add your first resource</p>
//           <p className="mt-1 max-w-xs text-sm text-muted-foreground">
//             Upload notes, slides, PDFs or images and Zohra will keep them organised.
//           </p>
//           <Link href="/upload" className={cn(primaryButton, "mt-4")}>
//             <UploadCloud size={17} aria-hidden="true" /> Upload a file
//           </Link>
//         </div>
//       ) : (
//         <>
//           <dl className="mt-3 grid grid-cols-3 gap-2">
//             <Stat label="Files" value={total} />
//             <Stat label="Organised" value={organized} />
//             <Stat label="Need review" value={attention} warn={attention > 0} />
//           </dl>

//           <ul className="mt-3 divide-y divide-border">
//             {recent.map((resource) => {
//               const Icon = kindIcon[resourceKind(resource.mimeType, resource.originalName)];
//               const badge = resourceBadge(resource);
//               return (
//                 <li key={resource.id}>
//                   <Link
//                     href={`/resources/${resource.id}`}
//                     className={cn(
//                       "group -mx-2 flex min-h-[60px] items-center gap-3 rounded-xl px-2 py-2 motion-safe:transition-colors hover:bg-muted/60",
//                       focusRing,
//                     )}
//                   >
//                     <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
//                       <Icon size={20} aria-hidden="true" />
//                     </span>
//                     <span className="min-w-0 flex-1">
//                       <span className="block truncate text-sm font-medium text-foreground">
//                         {resource.originalName}
//                       </span>
//                       <span className="mt-0.5 block truncate text-xs text-muted-foreground">
//                         {resource.subject?.name ?? "Not filed yet"}
//                         {now ? ` · ${formatRelative(resource.createdAt, now)}` : ""}
//                       </span>
//                     </span>
//                     {badge && <StatusBadge badge={badge} />}
//                     <ArrowRight
//                       size={16}
//                       aria-hidden="true"
//                       className="shrink-0 text-muted-foreground motion-safe:transition-transform group-hover:translate-x-0.5"
//                     />
//                   </Link>
//                 </li>
//               );
//             })}
//           </ul>

//           {attention > 0 && (
//             <Link
//               href="/resources"
//               className={cn(
//                 "mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-amber-500/10 px-3.5 text-sm font-medium text-amber-900 hover:bg-amber-500/15 dark:text-amber-300",
//                 focusRing,
//               )}
//             >
//               <CircleAlert size={16} aria-hidden="true" className="shrink-0" />
//               <span className="flex-1">
//                 {plural(attention, "file")} {attention === 1 ? "needs" : "need"} your review
//               </span>
//               <ArrowRight size={15} aria-hidden="true" />
//             </Link>
//           )}
//         </>
//       )}
//     </section>
//   );
// }
