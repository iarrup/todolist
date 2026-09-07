import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDayHeading } from '@/lib/formatDay';
import type { Granularity } from '@/lib/granularity';
import { formatMonthHeading } from '@/lib/formatMonth';
import { formatWeekHeading } from '@/lib/formatWeek';

/**
 * Heading + browsing controls for the Today screen (F5): prev/next arrows,
 * a tap-the-label-to-jump-to-today affordance, and a Day/Week/Month
 * segmented control. Purely presentational — it never computes a date
 * itself, only invokes the callbacks; `index.tsx` owns all date arithmetic
 * via `stepDate`.
 */
interface BrowseHeaderProps {
  granularity: Granularity;
  anchorDate: Date;
  now?: Date;
  onPrev: () => void;
  onNext: () => void;
  onJumpToToday: () => void;
  onGranularityChange: (granularity: Granularity) => void;
}

const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export function BrowseHeader({
  granularity,
  anchorDate,
  now = new Date(),
  onPrev,
  onNext,
  onJumpToToday,
  onGranularityChange,
}: BrowseHeaderProps) {
  const heading =
    granularity === 'day'
      ? formatDayHeading(anchorDate, now)
      : granularity === 'week'
        ? formatWeekHeading(anchorDate, now)
        : formatMonthHeading(anchorDate, now);

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <Pressable testID="browse-prev" onPress={onPrev} hitSlop={8} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Pressable testID="browse-heading" onPress={onJumpToToday} style={styles.headingButton}>
          <Text style={styles.heading}>{heading}</Text>
        </Pressable>
        <Pressable testID="browse-next" onPress={onNext} hitSlop={8} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.segmented}>
        {GRANULARITIES.map(({ key, label }) => {
          const active = granularity === key;
          return (
            <Pressable
              key={key}
              testID={`browse-granularity-${key}`}
              onPress={() => onGranularityChange(key)}
              style={[styles.segmentOption, active && styles.segmentOptionActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  arrowText: {
    fontSize: 22,
    fontWeight: '600',
  },
  headingButton: {
    flex: 1,
    alignItems: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: 'rgba(120,120,128,0.12)',
    padding: 2,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentOptionActive: {
    backgroundColor: '#ffffff',
  },
  segmentText: {
    fontSize: 14,
    color: '#666',
  },
  segmentTextActive: {
    color: '#000000',
    fontWeight: '600',
  },
});
