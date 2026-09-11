import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

/**
 * Opens the native Android date dialog, then the native time dialog, and
 * resolves the combined `Date`. Cancelling either dialog resolves `null` —
 * callers should leave their existing schedule (or lack of one) unchanged in
 * that case, never apply a partial (date-only) result.
 */
export function pickDateTime(initial: Date): Promise<Date | null> {
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'date',
      onChange: (dateEvent, date) => {
        if (dateEvent.type !== 'set' || !date) {
          resolve(null);
          return;
        }
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== 'set' || !time) {
              resolve(null);
              return;
            }
            const combined = new Date(date);
            combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
            resolve(combined);
          },
        });
      },
    });
  });
}
