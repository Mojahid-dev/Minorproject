export const structureKinds = [
  "year",
  "semester",
  "subject",
  "chapter",
] as const;
export type StructureKind = (typeof structureKinds)[number];

export function parseStructureText(value: unknown, maxLength = 140) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text && text.length <= maxLength ? text : null;
}

export function parseAliases(value: unknown) {
  if (value === undefined) return [] as string[];
  if (!Array.isArray(value) || value.length > 20) return null;
  const aliases = value.map((entry) => parseStructureText(entry, 140));
  if (aliases.some((entry) => !entry)) return null;
  return Array.from(
    new Set((aliases as string[]).map((entry) => entry.trim())),
  );
}

export function normalizeStructureName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
