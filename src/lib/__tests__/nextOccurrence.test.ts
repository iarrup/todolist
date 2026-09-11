import { describe, expect, it } from '@jest/globals';

import { nextOccurrence } from '../nextOccurrence';

describe('nextOccurrence', () => {
  it('daily: advances one day, preserving time-of-day', () => {
    const current = new Date(2026, 8, 9, 14, 30); // Wed Sep 9, 14:30
    const next = nextOccurrence(current, 'daily', null);
    expect(next).toEqual(new Date(2026, 8, 10, 14, 30));
  });

  it('weekdays: from a Friday, rolls to Monday (skipping the weekend)', () => {
    const current = new Date(2026, 8, 11, 9, 0); // Fri Sep 11
    const next = nextOccurrence(current, 'weekdays', null);
    expect(next).toEqual(new Date(2026, 8, 14, 9, 0)); // Mon Sep 14
  });

  it('weekends: from a Saturday, rolls to Sunday (not skipping to next week)', () => {
    const current = new Date(2026, 8, 12, 9, 0); // Sat Sep 12
    const next = nextOccurrence(current, 'weekends', null);
    expect(next).toEqual(new Date(2026, 8, 13, 9, 0)); // Sun Sep 13
  });

  it('weekends: from a Sunday, rolls forward to the following Saturday', () => {
    const current = new Date(2026, 8, 13, 9, 0); // Sun Sep 13
    const next = nextOccurrence(current, 'weekends', null);
    expect(next).toEqual(new Date(2026, 8, 19, 9, 0)); // Sat Sep 19
  });

  it('specific-days: rolls to the next matching weekday', () => {
    const current = new Date(2026, 8, 9, 9, 0); // Wed Sep 9
    const next = nextOccurrence(current, 'specific-days', [1, 3, 5]); // Mon/Wed/Fri
    expect(next).toEqual(new Date(2026, 8, 11, 9, 0)); // Fri Sep 11
  });

  it('specific-days: same weekday selected wraps to next week, not today', () => {
    const current = new Date(2026, 8, 11, 9, 0); // Fri Sep 11
    const next = nextOccurrence(current, 'specific-days', [1, 3, 5]); // Mon/Wed/Fri
    expect(next).toEqual(new Date(2026, 8, 14, 9, 0)); // Mon Sep 14, not today
  });

  it('specific-days: throws if recurrenceDays is empty', () => {
    const current = new Date(2026, 8, 9, 9, 0);
    expect(() => nextOccurrence(current, 'specific-days', [])).toThrow();
  });

  it('specific-days: throws if recurrenceDays is null', () => {
    const current = new Date(2026, 8, 9, 9, 0);
    expect(() => nextOccurrence(current, 'specific-days', null)).toThrow();
  });

  it('monthly: advances one month, preserving day and time when it exists', () => {
    const current = new Date(2026, 8, 15, 8, 0); // Sep 15
    const next = nextOccurrence(current, 'monthly', null);
    expect(next).toEqual(new Date(2026, 9, 15, 8, 0)); // Oct 15
  });

  it('monthly: clamps the 31st into a 30-day month instead of overflowing', () => {
    const current = new Date(2026, 7, 31, 8, 0); // Aug 31
    const next = nextOccurrence(current, 'monthly', null);
    expect(next).toEqual(new Date(2026, 8, 30, 8, 0)); // Sep 30, not Oct 1
  });

  it('monthly: clamps the 31st into February', () => {
    const current = new Date(2027, 0, 31, 8, 0); // Jan 31, 2027
    const next = nextOccurrence(current, 'monthly', null);
    expect(next).toEqual(new Date(2027, 1, 28, 8, 0)); // Feb 28 (2027 not leap)
  });

  it('annually: advances one year, preserving month/day/time when it exists', () => {
    const current = new Date(2026, 8, 15, 8, 0);
    const next = nextOccurrence(current, 'annually', null);
    expect(next).toEqual(new Date(2027, 8, 15, 8, 0));
  });

  it('annually: clamps Feb 29 into a non-leap year', () => {
    const current = new Date(2028, 1, 29, 8, 0); // Feb 29, 2028 (leap)
    const next = nextOccurrence(current, 'annually', null);
    expect(next).toEqual(new Date(2029, 1, 28, 8, 0)); // Feb 28, 2029 (not leap)
  });
});
