/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';

import { stepDate } from '../stepDate';

describe('stepDate', () => {
  it('steps a day forward and backward', () => {
    const date = new Date(2026, 8, 9, 10, 0, 0);
    expect(stepDate(date, 'day', 1)).toEqual(new Date(2026, 8, 10, 10, 0, 0));
    expect(stepDate(date, 'day', -1)).toEqual(new Date(2026, 8, 8, 10, 0, 0));
  });

  it('steps a week forward and backward, including across a month boundary', () => {
    const lateSep = new Date(2026, 8, 28, 10, 0, 0);
    expect(stepDate(lateSep, 'week', 1)).toEqual(new Date(2026, 9, 5, 10, 0, 0));
    expect(stepDate(lateSep, 'week', -1)).toEqual(new Date(2026, 8, 21, 10, 0, 0));
  });

  it('steps a month forward, clamping day-of-month into a shorter month', () => {
    // Jan 31, 2026 -> Feb has 28 days -> clamp to Feb 28, not roll into March.
    const jan31 = new Date(2026, 0, 31, 9, 30, 0);
    expect(stepDate(jan31, 'month', 1)).toEqual(new Date(2026, 1, 28, 9, 30, 0));
  });

  it('steps a month backward, clamping day-of-month', () => {
    // Mar 31, 2026 -> Feb has 28 days -> clamp to Feb 28.
    const mar31 = new Date(2026, 2, 31, 9, 30, 0);
    expect(stepDate(mar31, 'month', -1)).toEqual(new Date(2026, 1, 28, 9, 30, 0));
  });

  it('steps a month into a leap-year February', () => {
    const jan31LeapYear = new Date(2028, 0, 31, 9, 30, 0);
    expect(stepDate(jan31LeapYear, 'month', 1)).toEqual(new Date(2028, 1, 29, 9, 30, 0));
  });

  it('steps a mid-month date without clamping', () => {
    const midMonth = new Date(2026, 8, 15, 9, 30, 0);
    expect(stepDate(midMonth, 'month', 1)).toEqual(new Date(2026, 9, 15, 9, 30, 0));
  });
});
