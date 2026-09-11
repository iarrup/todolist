import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import type { Task } from '@/db/schema';
import type { TaskEditingController } from '@/hooks/useTaskEditing';
import { formatTaskDueAt } from '@/lib/formatTaskDueAt';
import { pickDateTime } from '@/lib/pickDateTime';

/**
 * A single task row: a checkbox (toggles complete), static text or (when
 * this task is the one being edited per `editing`) an inline, pre-filled,
 * auto-save-on-blur text field, and swipe-to-reveal delete. Swiping left
 * reveals a "Delete" button; the swipe itself does not delete — only an
 * explicit tap on that revealed button does (decided with the user,
 * superseding the spec's original "swipe alone deletes" call).
 *
 * Also shows a schedule affordance (F9): an unscheduled task gets a small
 * "add schedule" icon; a scheduled task shows its due date/time (tap to
 * change it) plus a small clear button. Cancelling the native date/time
 * picker at either step leaves the task's existing schedule untouched.
 */
interface TaskRowProps {
  task: Task;
  editing: TaskEditingController;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
  onScheduleTask: (id: string, dueAt: number | null) => void;
}

export function TaskRow({
  task,
  editing,
  onToggleComplete,
  onDeleteTask,
  onScheduleTask,
}: TaskRowProps) {
  const { editingId, draftText, setDraftText, handleLongPress, commitEdit } = editing;
  const swipeableRef = useRef<Swipeable>(null);

  const handleOpenPicker = async () => {
    const initial = task.dueAt ? new Date(task.dueAt) : new Date();
    const picked = await pickDateTime(initial);
    if (picked) onScheduleTask(task.id, picked.getTime());
  };

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
          <View style={styles.taskContent}>
            <Pressable
              testID={`task-text-pressable-${task.id}`}
              onLongPress={() => handleLongPress(task)}
            >
              <Text
                testID="task-text"
                style={[styles.taskText, task.completed && styles.taskTextCompleted]}
              >
                {task.text}
              </Text>
            </Pressable>

            {task.dueAt != null ? (
              <View style={styles.scheduleRow}>
                <Pressable testID="task-due-at" onPress={handleOpenPicker} hitSlop={8}>
                  <Text style={styles.dueAtText}>{formatTaskDueAt(task.dueAt)}</Text>
                </Pressable>
                <Pressable
                  testID="task-clear-schedule"
                  accessibilityRole="button"
                  accessibilityLabel="Clear schedule"
                  onPress={() => onScheduleTask(task.id, null)}
                  hitSlop={8}
                >
                  <Text style={styles.clearScheduleGlyph}>×</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                testID="task-add-schedule"
                accessibilityRole="button"
                accessibilityLabel="Add schedule"
                onPress={handleOpenPicker}
                hitSlop={8}
                style={styles.addScheduleButton}
              >
                <Text style={styles.addScheduleGlyph}>📅 Schedule</Text>
              </Pressable>
            )}
          </View>
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
  taskContent: {
    flex: 1,
    gap: 4,
  },
  taskText: {
    fontSize: 16,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#8a8a8e',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueAtText: {
    fontSize: 13,
    color: '#208AEF',
  },
  clearScheduleGlyph: {
    fontSize: 16,
    color: '#8a8a8e',
  },
  addScheduleButton: {
    alignSelf: 'flex-start',
  },
  addScheduleGlyph: {
    fontSize: 13,
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
