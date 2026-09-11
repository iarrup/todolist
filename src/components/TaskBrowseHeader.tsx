import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDayHeading } from '@/lib/formatDay';
import { formatMonthHeading } from '@/lib/formatMonth';
import type { TaskGranularity } from '@/lib/taskGranularity';
import { formatWeekHeading } from '@/lib/formatWeek';
import { formatYearHeading } from '@/lib/formatYear';

/**
 * Heading + browsing controls for the Tasks tab's Browse mode (F10): prev/
 * next arrows, tap-the-label-to-jump-to-today, and a Day/Week/Month/Year
 * segmented control. A task-typed sibling of `BrowseHeader` (not a
 * modification of it) — `BrowseHeader.tsx` is an F5-gated file outside
 * F10's spec'd file list, and widening it to a 4th granularity would force
 * touching `index.tsx` too, which is out of scope. Purely presentational,
 * same shape as `BrowseHeader`: it never computes a date itself, only
 * invokes the callbacks.
 */
interface TaskBrowseHeaderProps {
  granularity: TaskGranularity;
  anchorDate: Date;
  now?: Date;
  onPrev: () => void;
  onNext: () => void;
  onJumpToToday: () => void;
  onGranularityChange: (granularity: TaskGranularity) => void;
}

const GRANULARITIES: { key: TaskGranularity; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export function TaskBrowseHeader({
  granularity,
  anchorDate,
  now = new Date(),
  onPrev,
  onNext,
  onJumpToToday,
  onGranularityChange,
}: TaskBrowseHeaderProps) {
  const heading =
    granularity === 'day'
      ? formatDayHeading(anchorDate, now)
      : granularity === 'week'
        ? formatWeekHeading(anchorDate, now)
        : granularity === 'month'
          ? formatMonthHeading(anchorDate, now)
          : formatYearHeading(anchorDate, now);

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
