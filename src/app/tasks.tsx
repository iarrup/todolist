import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { TaskComposer } from '@/components/TaskComposer';
import { TaskList } from '@/components/TaskList';
import { deleteTask, insertTask, setTaskCompleted, tasksQuery, updateTaskText } from '@/db/tasks';

/**
 * Tasks tab (F7) — a minimal, unfiltered task list (all tasks, newest
 * first; open-only filtering is F8's job) with add/edit/complete/delete.
 * Reads tasks from the local database (live) via tasksQuery + useLiveQuery,
 * and lets the user capture new ones through the pinned TaskComposer. A task
 * is plain text plus a completed flag (no titles, no metadata).
 */
export default function TasksScreen() {
  const { data: tasks } = useLiveQuery(tasksQuery(), []);

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
      />

      <TaskComposer
        onSubmit={(text) => {
          void insertTask(text);
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
