/**
 * @jest-environment node
 *
 * Headless test for pickDateTime, mocking the native
 * DateTimePickerAndroid.open dialog so no device/emulator is needed.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { pickDateTime } from '../pickDateTime';

// jest.mock calls are hoisted above imports by babel-plugin-jest-hoist, so
// this still applies to the DateTimePickerAndroid import above (see
// NoteComposer.test.tsx for this repo's first precedent).
jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn() },
}));

type OnChange = (event: { type: string }, date?: Date) => void;
interface OpenParams {
  mode: 'date' | 'time';
  value: Date;
  onChange: OnChange;
}
const open = DateTimePickerAndroid.open as unknown as jest.Mock<(params: OpenParams) => void>;

describe('pickDateTime', () => {
  afterEach(() => {
    open.mockReset();
  });

  it('combines the picked date and time into one Date', async () => {
    const pickedDate = new Date(2026, 8, 12);
    const pickedTime = new Date(2020, 0, 1, 15, 30);
    open
      .mockImplementationOnce(({ onChange }) => onChange({ type: 'set' }, pickedDate))
      .mockImplementationOnce(({ onChange }) => onChange({ type: 'set' }, pickedTime));

    const result = await pickDateTime(new Date());

    expect(result).toEqual(new Date(2026, 8, 12, 15, 30, 0, 0));
  });

  it('resolves null when the date dialog is cancelled', async () => {
    open.mockImplementationOnce(({ onChange }) => onChange({ type: 'dismissed' }, undefined));

    const result = await pickDateTime(new Date());

    expect(result).toBeNull();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('resolves null when the time dialog is cancelled after a date is picked', async () => {
    const pickedDate = new Date(2026, 8, 12);
    open
      .mockImplementationOnce(({ onChange }) => onChange({ type: 'set' }, pickedDate))
      .mockImplementationOnce(({ onChange }) => onChange({ type: 'dismissed' }, undefined));

    const result = await pickDateTime(new Date());

    expect(result).toBeNull();
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('seeds the date dialog with the given initial value', async () => {
    const initial = new Date(2026, 8, 12, 9, 0);
    open.mockImplementationOnce(({ onChange }) => onChange({ type: 'dismissed' }, undefined));

    await pickDateTime(initial);

    expect(open).toHaveBeenCalledWith(expect.objectContaining({ mode: 'date', value: initial }));
  });
});
