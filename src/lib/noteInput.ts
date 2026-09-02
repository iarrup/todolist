/**
 * Pure capture rule for typed notes, kept free of React Native imports so it can
 * be unit-tested headlessly and reused (e.g. F4 edit). A note is only its text
 * (minimalism): trim surrounding whitespace, and treat empty/whitespace-only
 * input as not saveable.
 */

/** Trim a raw note; return null if it is empty/whitespace-only (not saveable). */
export function normalizeNoteInput(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}
