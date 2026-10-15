import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Firestore rejects undefined values; omit optional fields before writes. */
export function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export const DAY_MS = 86_400_000;

export function formatDZD(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} DA`;
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateRange(startMs: number, endMs: number): string {
  return `${formatDate(startMs)} → ${formatDate(endMs)}`;
}

export function toDateInputValue(ms: number): string {
  const d = new Date(ms);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function dateInputToMs(value: string): number | null {
  if (!value) return null;
  const ms = new Date(`${value}T12:00:00`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function daysBetween(startMs: number, endMs: number): number {
  return Math.max(1, Math.round((endMs - startMs) / DAY_MS));
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isRangeBlocked(
  startMs: number,
  endMs: number,
  blocked: { start: number; end: number }[],
): boolean {
  return blocked.some((r) => rangesOverlap(startMs, endMs, r.start, r.end));
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment.');
  }
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
