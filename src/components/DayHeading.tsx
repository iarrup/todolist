import { StyleSheet, Text } from 'react-native';

import { formatDayHeading } from '@/lib/formatDay';

/**
 * Label-only heading stating which day the Today screen is showing (e.g.
 * "Today, Sep 3"). No tap target, no controls — F5 attaches day navigation
 * here later.
 */
interface DayHeadingProps {
  date: Date;
}

export function DayHeading({ date }: DayHeadingProps) {
  return <Text style={styles.heading}>{formatDayHeading(date)}</Text>;
}

const styles = StyleSheet.create({
  heading: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    fontSize: 20,
    fontWeight: '600',
  },
});
