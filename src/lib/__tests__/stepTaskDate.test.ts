/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';

import { stepTaskDate } from '../stepTaskDate';

describe('stepTaskDate', () => {
  it('steps a day forward and backward', () => {
    const date = new Date(2026, 8, 9, 10, 0, 0);
    expect(stepTaskDate(date, 'day', 1)).toEqual(new Date(2026, 8, 10, 10, 0, 0));
    expect(stepTaskDate(date, 'day', -1)).toEqual(new Date(2026, 8, 8, 10, 0, 0));
  });

  it('steps a week forward and backward, including across a month boundary', () => {
    const lateSep = new Date(2026, 8, 28, 10, 0, 0);
    expect(stepTaskDate(lateSep, 'week', 1)).toEqual(new Date(2026, 9, 5, 10, 0, 0));
    expect(stepTaskDate(lateSep, 'week', -1)).toEqual(new Date(2026, 8, 21, 10, 0, 0));
  });

  it('steps a month forward, clamping day-of-month into a shorter month', () => {
    const jan31 = new Date(2026, 0, 31, 9, 30, 0);
    expect(stepTaskDate(jan31, 'month', 1)).toEqual(new Date(2026, 1, 28, 9, 30, 0));
  });

  it('steps a month backward, clamping day-of-month', () => {
    const mar31 = new Date(2026, 2, 31, 9, 30, 0);
    expect(stepTaskDate(mar31, 'month', -1)).toEqual(new Date(2026, 1, 28, 9, 30, 0));
  });

  it('steps a year forward and backward', () => {
    const date = new Date(2026, 8, 9, 10, 0, 0);
    expect(stepTaskDate(date, 'year', 1)).toEqual(new Date(2027, 8, 9, 10, 0, 0));
    expect(stepTaskDate(date, 'year', -1)).toEqual(new Date(2025, 8, 9, 10, 0, 0));
  });

  it('steps a leap-year Feb 29 forward into a non-leap year, clamping to Feb 28', () => {
    const feb29 = new Date(2028, 1, 29, 9, 30, 0);
    expect(stepTaskDate(feb29, 'year', 1)).toEqual(new Date(2029, 1, 28, 9, 30, 0));
  });

  it('steps a leap-year Feb 29 backward into a non-leap year, clamping to Feb 28', () => {
    const feb29 = new Date(2028, 1, 29, 9, 30, 0);
    expect(stepTaskDate(feb29, 'year', -1)).toEqual(new Date(2027, 1, 28, 9, 30, 0));
  });

  it('does not clamp a non-Feb-29 date', () => {
    const midYear = new Date(2026, 5, 15, 9, 30, 0);
    expect(stepTaskDate(midYear, 'year', 1)).toEqual(new Date(2027, 5, 15, 9, 30, 0));
  });
});
