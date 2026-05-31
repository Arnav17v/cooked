import type { SeminarSessionDto } from "@/lib/api";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type SeminarMonthGroup = {
  monthKey: string;
  monthLabel: string;
  events: SeminarSessionDto[];
};

export function formatPriceInr(inr: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(inr);
}

export function formatSeminarDateRange(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatSeminarDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function seminarMetaLine(s: SeminarSessionDto): string {
  const parts = [`${s.spots_total} seats`];
  if (s.tags.length > 0) {
    parts.unshift(s.tags[0]);
  }
  return parts.join(" · ");
}

export function seminarLocationShort(venue: string): string {
  const parts = venue.split("·").map((p) => p.trim());
  return parts[0] ?? venue;
}

export function groupSeminarsByMonth(sessions: SeminarSessionDto[]): SeminarMonthGroup[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime(),
  );
  const map = new Map<string, SeminarSessionDto[]>();

  for (const event of sorted) {
    const d = new Date(event.date_time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }

  return Array.from(map.entries()).map(([monthKey, events]) => {
    const d = new Date(events[0]!.date_time);
    return {
      monthKey,
      monthLabel: MONTH_NAMES[d.getMonth()] ?? monthKey,
      events,
    };
  });
}

export function seminarListIconBg(title: string): string {
  const palette = ["#d44d1f", "#8a3210", "#2d4a3e", "#5c4d2e", "#7c3aed"];
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return palette[h % palette.length]!;
}

export function seminarInitial(title: string): string {
  const t = title.trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}
