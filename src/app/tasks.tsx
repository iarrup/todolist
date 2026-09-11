import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { TaskComposer } from '@/components/TaskComposer';
import { TaskList } from '@/components/TaskList';
import {
  deleteTask,
  insertTask,
  openTasksQuery,
  setTaskCompleted,
  updateTaskSchedule,
  updateTaskText,
} from '@/db/tasks';

/**
 * Tasks tab (F7 + F8) — the default view is open (incomplete) tasks only,
 * newest first, with add/edit/complete/delete. Reads tasks from the local
 * database (live) via openTasksQuery + useLiveQuery, and lets the user
 * capture new ones through the pinned TaskComposer. A task is plain text
 * plus a completed flag (no titles, no metadata). Completing a task removes
 * it from this list immediately (no delay/animation); completed tasks are
 * not shown here (no toggle/archive) — see F8's spec.
 */
export default function TasksScreen() {
  const { data: tasks } = useLiveQuery(openTasksQuery(), []);

  // Same Android edge-to-edge keyboard workaround as index.tsx (duplicated
  // locally rather than extracted into a shared hook — see the technical
  // plan's Risks/tradeoffs: extracting would require touching index.tsx,
  // which is outside F7's spec'd file list).
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onShow = Keyboard.addListener('keyboardDidShow', (e) => {
      setAndroidKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener('keyboardDidHide', () => {
      setAndroidKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        Platform.OS === 'android' && { paddingBottom: androidKeyboardHeight },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TaskList
        tasks={tasks}
        onEditTask={(id, text) => {
          void updateTaskText(id, text);
        }}
        onToggleComplete={(id, completed) => {
          void setTaskCompleted(id, completed);
        }}
        onDeleteTask={(id) => {
          void deleteTask(id);
        }}
        onScheduleTask={(id, dueAt) => {
          void updateTaskSchedule(id, dueAt);
        }}
      />

      <TaskComposer
        onSubmit={(text, dueAt) => {
          void insertTask(text, dueAt);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
