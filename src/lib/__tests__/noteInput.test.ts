/**
 * @jest-environment node
 *
 * Headless test for the pure capture rule (no React Native runtime needed).
 */
import { describe, expect, it } from '@jest/globals';

import { normalizeNoteInput } from '../noteInput';

describe('normalizeNoteInput', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeNoteInput('  hello world  ')).toBe('hello world');
  });

  it('preserves interior newlines (multiline notes)', () => {
    expect(normalizeNoteInput('  line one\nline two  ')).toBe('line one\nline two');
  });

  it('rejects an empty string', () => {
    expect(normalizeNoteInput('')).toBeNull();
  });

  it('rejects whitespace-only input', () => {
    expect(normalizeNoteInput('   \n\t ')).toBeNull();
  });

  it('keeps ordinary text unchanged', () => {
    expect(normalizeNoteInput('hi')).toBe('hi');
  });
});
