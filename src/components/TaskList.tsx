import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { Task } from '@/db/schema';
import { useTaskEditing } from '@/hooks/useTaskEditing';
import type { Recurrence } from '@/lib/recurrence';

import { TaskRow } from './TaskRow';

/**
 * Renders the given tasks as-is (ordering and filtering are the caller's
 * responsibility — this component does not sort or filter; the Tasks screen
 * passes it only open tasks per F8), or an empty state when there are none.
 * Long-pressing a task's text opens it for inline editing; the
 * edit is committed via `onEditTask` on blur, unless cleared to
 * empty/whitespace, in which case it reverts. Tapping a task's checkbox
 * toggles `onToggleComplete`; completing a swipe deletes via `onDeleteTask`.
 * Setting, changing, or clearing a task's due date/time (F9) goes through
 * `onScheduleTask`; setting, changing, or clearing recurrence (F11) goes
 * through `onSetRecurrence`. `emptyMessage` defaults to F8's "All caught
 * up!" (Open mode); Browse mode's Day granularity (F10) passes its own
 * message so an empty browsed day doesn't read as "you're back in Open
 * mode."
 */
interface TaskListProps {
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
  emptyMessage?: string;
}

export function TaskList({
  tasks,
  onEditTask,
  onToggleComplete,
  onDeleteTask,
  onScheduleTask,
  onSetRecurrence,
  onSnoozeTask,
  emptyMessage = 'All caught up!',
}: TaskListProps) {
  const editing = useTaskEditing(onEditTask);

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
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
});
