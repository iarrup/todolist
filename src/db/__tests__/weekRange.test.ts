/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';

import { startOfWeek, endOfWeek } from '../weekRange';

describe('startOfWeek / endOfWeek', () => {
  it('bounds a mid-week date to its Sunday–Saturday week', () => {
    // Wed, Sep 9, 2026
    const midWeek = new Date(2026, 8, 9, 15, 30, 0);
    expect(new Date(startOfWeek(midWeek))).toEqual(new Date(2026, 8, 6, 0, 0, 0, 0));
    expect(new Date(endOfWeek(midWeek))).toEqual(new Date(2026, 8, 12, 23, 59, 59, 999));
  });

  it('treats a Sunday as the start of its own week', () => {
    const sunday = new Date(2026, 8, 6, 8, 0, 0);
    expect(new Date(startOfWeek(sunday))).toEqual(new Date(2026, 8, 6, 0, 0, 0, 0));
    expect(new Date(endOfWeek(sunday))).toEqual(new Date(2026, 8, 12, 23, 59, 59, 999));
  });

  it('treats a Saturday as the end of its own week', () => {
    const saturday = new Date(2026, 8, 12, 22, 0, 0);
    expect(new Date(startOfWeek(saturday))).toEqual(new Date(2026, 8, 6, 0, 0, 0, 0));
    expect(new Date(endOfWeek(saturday))).toEqual(new Date(2026, 8, 12, 23, 59, 59, 999));
  });
});
