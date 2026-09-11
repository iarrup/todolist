import { describe, expect, it } from '@jest/globals';

import { formatRecurrence } from '../formatRecurrence';

describe('formatRecurrence', () => {
  it('returns null for a non-recurring task', () => {
    expect(formatRecurrence(null, null)).toBeNull();
  });

  it('formats daily', () => {
    expect(formatRecurrence('daily', null)).toBe('Repeats daily');
  });

  it('formats weekdays', () => {
    expect(formatRecurrence('weekdays', null)).toBe('Repeats on weekdays');
  });

  it('formats weekends', () => {
    expect(formatRecurrence('weekends', null)).toBe('Repeats on weekends');
  });

  it('formats specific-days in day-of-week order regardless of input order', () => {
    expect(formatRecurrence('specific-days', [5, 1, 3])).toBe('Repeats weekly on Mon, Wed, Fri');
  });

  it('formats monthly', () => {
    expect(formatRecurrence('monthly', null)).toBe('Repeats monthly');
  });

  it('formats annually', () => {
    expect(formatRecurrence('annually', null)).toBe('Repeats annually');
  });
});
