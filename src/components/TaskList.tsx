import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { Task } from '@/db/schema';
import { useTaskEditing } from '@/hooks/useTaskEditing';

import { TaskRow } from './TaskRow';

/**
 * Renders the given tasks as-is (ordering and filtering are the caller's
 * responsibility — this component does not sort or filter; the Tasks screen
 * passes it only open tasks per F8), or an empty state when there are none.
 * Long-pressing a task's text opens it for inline editing; the
 * edit is committed via `onEditTask` on blur, unless cleared to
 * empty/whitespace, in which case it reverts. Tapping a task's checkbox
 * toggles `onToggleComplete`; completing a swipe deletes via `onDeleteTask`.
 */
interface TaskListProps {
  tasks: Task[];
  onEditTask: (id: string, text: string) => void;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
}

export function TaskList({ tasks, onEditTask, onToggleComplete, onDeleteTask }: TaskListProps) {
  const editing = useTaskEditing(onEditTask);

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>All caught up!</Text>
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
