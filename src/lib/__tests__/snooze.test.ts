import { describe, expect, it } from '@jest/globals';

import { computeSnoozeTime, isTaskOverdue } from '../snooze';

describe('computeSnoozeTime', () => {
  it('10min: now + 10 minutes', () => {
    const now = new Date(2026, 8, 9, 14, 30, 0, 0);
    const result = computeSnoozeTime('10min', now, new Date(2026, 8, 9, 9, 0).getTime());
    expect(result).toEqual(new Date(2026, 8, 9, 14, 40, 0, 0));
  });

  it('1hour: now + 1 hour', () => {
    const now = new Date(2026, 8, 9, 14, 30, 0, 0);
    const result = computeSnoozeTime('1hour', now, new Date(2026, 8, 9, 9, 0).getTime());
    expect(result).toEqual(new Date(2026, 8, 9, 15, 30, 0, 0));
  });

  it("tomorrow: next calendar day at the original due time-of-day, not now's time", () => {
    const now = new Date(2026, 8, 9, 14, 30, 0, 0); // Wed Sep 9, 14:30 (snoozing now)
    const originalDueAt = new Date(2026, 8, 9, 9, 0, 0, 0).getTime(); // was due 9:00
    const result = computeSnoozeTime('tomorrow', now, originalDueAt);
    expect(result).toEqual(new Date(2026, 8, 10, 9, 0, 0, 0)); // Thu Sep 10, 9:00
  });

  it('tomorrow: rolls across a month boundary correctly', () => {
    const now = new Date(2026, 8, 30, 20, 0, 0, 0); // Sep 30
    const originalDueAt = new Date(2026, 8, 30, 8, 0).getTime();
    const result = computeSnoozeTime('tomorrow', now, originalDueAt);
    expect(result).toEqual(new Date(2026, 9, 1, 8, 0, 0, 0)); // Oct 1
  });

  it('10min: rolls across an hour boundary correctly', () => {
    const now = new Date(2026, 8, 9, 23, 55, 0, 0);
    const result = computeSnoozeTime('10min', now, now.getTime());
    expect(result).toEqual(new Date(2026, 8, 10, 0, 5, 0, 0));
  });
});

describe('isTaskOverdue', () => {
  const now = new Date(2026, 8, 9, 12, 0, 0, 0);

  it('true when dueAt is in the past and the task is open', () => {
    expect(isTaskOverdue({ dueAt: now.getTime() - 1000, completed: false }, now)).toBe(true);
  });

  it('false when dueAt is in the future', () => {
    expect(isTaskOverdue({ dueAt: now.getTime() + 1000, completed: false }, now)).toBe(false);
  });

  it('false when the task is completed, even if dueAt is in the past', () => {
    expect(isTaskOverdue({ dueAt: now.getTime() - 1000, completed: true }, now)).toBe(false);
  });

  it('false when unscheduled (dueAt is null)', () => {
    expect(isTaskOverdue({ dueAt: null, completed: false }, now)).toBe(false);
  });

  it('false when dueAt is exactly now (not yet in the past)', () => {
    expect(isTaskOverdue({ dueAt: now.getTime(), completed: false }, now)).toBe(false);
  });
});
