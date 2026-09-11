import { SectionList, StyleSheet, Text, View } from 'react-native';

import type { Task } from '@/db/schema';
import { useTaskEditing } from '@/hooks/useTaskEditing';
import { formatDayHeading } from '@/lib/formatDay';
import { groupTasksByMonthAndDay, type TaskMonthGroup } from '@/lib/groupTasksByMonthAndDay';

import { TaskRow } from './TaskRow';

const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

/**
 * Renders scheduled tasks grouped by calendar month, then by day within
 * each month, for the Tasks tab's Browse mode Year granularity (F10).
 * Renders a single `SectionList` sectioned by month (earliest month first)
 * whose items are whole day-groups (not individual tasks) — nesting a
 * `SectionList`/`FlatList` inside another is avoided since React Native
 * warns against nested same-orientation virtualized lists; a day-group's
 * tasks are rendered via a plain, non-virtualized `.map` (a day realistically
 * holds a handful of scheduled tasks). Reuses `useTaskEditing` + `TaskRow`,
 * same as `GroupedTaskList`, so edit/checkbox/delete/schedule behavior is
 * identical everywhere tasks are shown.
 */
interface YearGroupedTaskListProps {
  tasks: Task[];
  onEditTask: (id: string, text: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
  onScheduleTask: (id: string, dueAt: number | null) => void;
}

export function YearGroupedTaskList({
  tasks,
  onEditTask,
  onToggleComplete,
  onDeleteTask,
  onScheduleTask,
}: YearGroupedTaskListProps) {
  const editing = useTaskEditing(onEditTask);

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No tasks this year</Text>
      </View>
    );
  }

  const sections = groupTasksByMonthAndDay(tasks).map((group: TaskMonthGroup) => ({
    monthStart: group.monthStart,
    data: group.days,
  }));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => `${item.dayStart}`}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.list}
      renderSectionHeader={({ section }) => (
        <Text testID={`month-subheading-${section.monthStart}`} style={styles.monthHeading}>
          {monthLabel.format(new Date(section.monthStart))}
        </Text>
      )}
      renderItem={({ item: dayGroup }) => (
        <View style={styles.dayGroup}>
          <Text testID={`day-subheading-${dayGroup.dayStart}`} style={styles.dayHeading}>
            {formatDayHeading(new Date(dayGroup.dayStart))}
          </Text>
          {dayGroup.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              editing={editing}
              onToggleComplete={onToggleComplete}
              onDeleteTask={onDeleteTask}
              onScheduleTask={onScheduleTask}
            />
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8a8a8e',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  monthHeading: {
    fontSize: 16,
    fontWeight: '700',
    paddingTop: 12,
  },
  dayHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dayGroup: {
    gap: 8,
  },
});
