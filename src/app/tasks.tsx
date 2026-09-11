import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { GroupedTaskList } from '@/components/GroupedTaskList';
import { TaskBrowseHeader } from '@/components/TaskBrowseHeader';
import { TaskComposer } from '@/components/TaskComposer';
import { TaskList } from '@/components/TaskList';
import { TaskModeToggle, type TaskMode } from '@/components/TaskModeToggle';
import { YearGroupedTaskList } from '@/components/YearGroupedTaskList';
import {
  deleteTask,
  insertTask,
  openTasksQuery,
  scheduledTasksForGranularityQuery,
  setTaskCompleted,
  updateTaskSchedule,
  updateTaskText,
} from '@/db/tasks';
import type { TaskGranularity } from '@/lib/taskGranularity';
import { stepTaskDate } from '@/lib/stepTaskDate';

const BROWSE_EMPTY_MESSAGE: Record<Exclude<TaskGranularity, 'year'>, string> = {
  day: 'No tasks today',
  week: 'No tasks this week',
  month: 'No tasks this month',
};

/**
 * Tasks tab (F7 + F8 + F9 + F10) — an Open/Browse mode toggle. Open mode
 * (default) is F8's existing open-only, unfiltered-by-date list, unchanged:
 * add/edit/complete/delete via the pinned TaskComposer, reading
 * openTasksQuery live. Browse mode (F10) is a day/week/month/year scheduled-
 * task browser — only tasks with a dueAt appear (open or completed), grouped
 * chronologically, with no TaskComposer (Browse is read-only; adding a task
 * stays an Open-mode action).
 */
export default function TasksScreen() {
  const [mode, setMode] = useState<TaskMode>('open');
  const { data: openTasks } = useLiveQuery(openTasksQuery(), []);

  const [granularity, setGranularity] = useState<TaskGranularity>('day');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const { data: browseTasks } = useLiveQuery(
    scheduledTasksForGranularityQuery(granularity, anchorDate),
    [granularity, anchorDate.getTime()],
  );

  function handlePrev() {
    setAnchorDate((d) => stepTaskDate(d, granularity, -1));
  }
  function handleNext() {
    setAnchorDate((d) => stepTaskDate(d, granularity, 1));
  }
  function handleJumpToToday() {
    setAnchorDate(new Date());
  }
  function handleGranularityChange(g: TaskGranularity) {
    setGranularity(g);
  }

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

  const onEditTask = (id: string, text: string) => {
    void updateTaskText(id, text);
  };
  const onToggleComplete = (id: string, completed: boolean) => {
    void setTaskCompleted(id, completed);
  };
  const onDeleteTask = (id: string) => {
    void deleteTask(id);
  };
  const onScheduleTask = (id: string, dueAt: number | null) => {
    void updateTaskSchedule(id, dueAt);
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        Platform.OS === 'android' && { paddingBottom: androidKeyboardHeight },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TaskModeToggle mode={mode} onModeChange={setMode} />

      {mode === 'open' ? (
        <TaskList
          tasks={openTasks}
          onEditTask={onEditTask}
          onToggleComplete={onToggleComplete}
          onDeleteTask={onDeleteTask}
          onScheduleTask={onScheduleTask}
        />
      ) : (
        <View style={styles.listArea}>
          <TaskBrowseHeader
            granularity={granularity}
            anchorDate={anchorDate}
            onPrev={handlePrev}
            onNext={handleNext}
            onJumpToToday={handleJumpToToday}
            onGranularityChange={handleGranularityChange}
          />

          {granularity === 'day' ? (
            <TaskList
              tasks={browseTasks}
              onEditTask={onEditTask}
              onToggleComplete={onToggleComplete}
              onDeleteTask={onDeleteTask}
              onScheduleTask={onScheduleTask}
              emptyMessage={BROWSE_EMPTY_MESSAGE.day}
            />
          ) : granularity === 'year' ? (
            <YearGroupedTaskList
              tasks={browseTasks}
              onEditTask={onEditTask}
              onToggleComplete={onToggleComplete}
              onDeleteTask={onDeleteTask}
              onScheduleTask={onScheduleTask}
            />
          ) : (
            <GroupedTaskList
              tasks={browseTasks}
              onEditTask={onEditTask}
              onToggleComplete={onToggleComplete}
              onDeleteTask={onDeleteTask}
              onScheduleTask={onScheduleTask}
              emptyMessage={BROWSE_EMPTY_MESSAGE[granularity]}
            />
          )}
        </View>
      )}

      {mode === 'open' && (
        <TaskComposer
          onSubmit={(text, dueAt) => {
            void insertTask(text, dueAt);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listArea: {
    flex: 1,
  },
});
