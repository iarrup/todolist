import { SectionList, StyleSheet, Text, View } from 'react-native';

import type { Task } from '@/db/schema';
import { useTaskEditing } from '@/hooks/useTaskEditing';
import { formatDayHeading } from '@/lib/formatDay';
import { groupTasksByDay } from '@/lib/groupTasksByDay';
import type { Recurrence } from '@/lib/recurrence';

import { TaskRow } from './TaskRow';

/**
 * Renders scheduled tasks grouped by the local calendar day of their
 * `dueAt` — a day sub-heading (reusing `formatDayHeading`) per day that has
 * at least one scheduled task, earliest day first; days with none simply
 * don't appear. Used for the Tasks tab's Browse mode Week/Month
 * granularities (F10); `TaskList` still handles Browse's Day granularity
 * (and Open mode, unchanged). Reuses `useTaskEditing` + `TaskRow` so
 * long-press-edit, the checkbox, swipe-to-delete, and the schedule
 * affordance are identical to every other task view — including showing
 * completed tasks (unlike Open mode's F8 filtering).
 */
interface GroupedTaskListProps {
  tasks: Task[];
  onEditTask: (id: string, text: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
  onScheduleTask: (id: string, dueAt: number | null) => void;
  onSetRecurrence: (
    id: string,
    recurrence: Recurrence | null,
    recurrenceDays: number[] | null,
  ) => void;
  onSnoozeTask: (id: string, dueAt: number) => void;
  emptyMessage: string;
}

export function GroupedTaskList({
  tasks,
  onEditTask,
  onToggleComplete,
  onDeleteTask,
  onScheduleTask,
  onSetRecurrence,
  onSnoozeTask,
  emptyMessage,
}: GroupedTaskListProps) {
  const editing = useTaskEditing(onEditTask);

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const sections = groupTasksByDay(tasks).map((group) => ({
    dayStart: group.dayStart,
    data: group.tasks,
  }));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.list}
      renderSectionHeader={({ section }) => (
        <Text testID={`day-subheading-${section.dayStart}`} style={styles.dayHeading}>
          {formatDayHeading(new Date(section.dayStart))}
        </Text>
      )}
      renderItem={({ item }) => (
        <TaskRow
          task={item}
          editing={editing}
          onToggleComplete={onToggleComplete}
          onDeleteTask={onDeleteTask}
          onScheduleTask={onScheduleTask}
          onSetRecurrence={onSetRecurrence}
          onSnoozeTask={onSnoozeTask}
        />
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
  dayHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingTop: 8,
  },
});
