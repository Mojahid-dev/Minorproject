export function duration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;

  // Never show "<1m": that wording is ambiguous while a live timer is running.
  if (hours) return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
  if (minutes) return remainder ? `${minutes} min ${remainder} sec` : `${minutes} min`;
  return `${remainder} sec`;
}

export function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function dateLabel(key: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(`${key}T12:00:00`),
  );
}

export function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(year, m - 1, 1, 12));
}

export function shiftMonth(month: string, by: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + by, 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
