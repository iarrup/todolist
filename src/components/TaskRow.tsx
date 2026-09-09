import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import type { Task } from '@/db/schema';
import type { TaskEditingController } from '@/hooks/useTaskEditing';

/**
 * A single task row: a checkbox (toggles complete), static text or (when
 * this task is the one being edited per `editing`) an inline, pre-filled,
 * auto-save-on-blur text field, and swipe-to-reveal delete. Swiping left
 * reveals a "Delete" button; the swipe itself does not delete — only an
 * explicit tap on that revealed button does (decided with the user,
 * superseding the spec's original "swipe alone deletes" call).
 */
interface TaskRowProps {
  task: Task;
  editing: TaskEditingController;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
}

export function TaskRow({ task, editing, onToggleComplete, onDeleteTask }: TaskRowProps) {
  const { editingId, draftText, setDraftText, handleLongPress, commitEdit } = editing;
  const swipeableRef = useRef<Swipeable>(null);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={() => (
        <Pressable
          testID="task-delete-button"
          accessibilityRole="button"
          accessibilityLabel="Delete task"
          onPress={() => {
            swipeableRef.current?.close();
            onDeleteTask(task.id);
          }}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      )}
    >
      <View testID={`task-row-${task.id}`} style={styles.row}>
        <Pressable
          testID="task-checkbox"
          accessibilityRole="checkbox"
          accessibilityLabel={task.completed ? 'Mark task incomplete' : 'Mark task complete'}
          accessibilityState={{ checked: task.completed }}
          onPress={() => onToggleComplete(task.id, !task.completed)}
          hitSlop={8}
          style={styles.checkbox}
        >
          <Text style={styles.checkboxGlyph}>{task.completed ? '☑' : '☐'}</Text>
        </Pressable>

        {task.id === editingId ? (
          <TextInput
            testID="task-edit-input"
            style={styles.taskText}
            value={draftText}
            onChangeText={setDraftText}
            onBlur={() => commitEdit(task.id, draftText)}
            multiline
            submitBehavior="newline"
            autoFocus
          />
        ) : (
          <Pressable
            testID={`task-text-pressable-${task.id}`}
            onLongPress={() => handleLongPress(task)}
            style={styles.textPressable}
          >
            <Text
              testID="task-text"
              style={[styles.taskText, task.completed && styles.taskTextCompleted]}
            >
              {task.text}
            </Text>
          </Pressable>
        )}
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  checkbox: {
    paddingRight: 2,
  },
  checkboxGlyph: {
    fontSize: 20,
  },
  textPressable: {
    flex: 1,
  },
  taskText: {
    flex: 1,
    fontSize: 16,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#8a8a8e',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#EF4444',
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
