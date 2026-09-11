import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatTaskDueAt } from '@/lib/formatTaskDueAt';
import { normalizeNoteInput } from '@/lib/noteInput';
import { pickDateTime } from '@/lib/pickDateTime';

/**
 * Minimal task-capture control: a multiline text input pinned at the bottom
 * of the Tasks screen with a send affordance. A task is only its text (no
 * title/metadata) plus an optional due date/time (F9) — structurally the
 * same as NoteComposer minus the mic button (F6's voice capture was
 * note-specific, out of scope for F7). Return inserts a newline; the task is
 * committed only by the send button, and only when non-empty after
 * trimming. After a save the field clears (and any pending schedule resets)
 * but keeps focus for rapid capture. Touching nothing on the schedule
 * control creates an unscheduled task, exactly as before F9.
 */
interface TaskComposerProps {
  onSubmit: (text: string, dueAt: number | null) => void;
}

export function TaskComposer({ onSubmit }: TaskComposerProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const [pendingDueAt, setPendingDueAt] = useState<number | null>(null);

  const trimmed = normalizeNoteInput(value);
  const canSubmit = trimmed !== null;

  const handleSend = () => {
    if (trimmed === null) return;
    onSubmit(trimmed, pendingDueAt);
    setValue('');
    setPendingDueAt(null);
  };

  const handleOpenPicker = async () => {
    const initial = pendingDueAt ? new Date(pendingDueAt) : new Date();
    const picked = await pickDateTime(initial);
    if (picked) setPendingDueAt(picked.getTime());
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      {pendingDueAt != null && (
        <View style={styles.scheduleRow}>
          <Pressable testID="task-composer-due-at" onPress={handleOpenPicker} hitSlop={8}>
            <Text style={styles.dueAtText}>{formatTaskDueAt(pendingDueAt)}</Text>
          </Pressable>
          <Pressable
            testID="task-composer-clear-schedule"
            accessibilityRole="button"
            accessibilityLabel="Clear schedule"
            onPress={() => setPendingDueAt(null)}
            hitSlop={8}
          >
            <Text style={styles.clearScheduleGlyph}>×</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.inputRow}>
        <Pressable
          testID="task-composer-add-schedule"
          accessibilityRole="button"
          accessibilityLabel="Add schedule"
          onPress={handleOpenPicker}
          hitSlop={8}
          style={styles.scheduleButton}
        >
          <Text style={styles.scheduleGlyph}>📅</Text>
        </Pressable>
        <TextInput
          testID="task-input"
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder="Add a task…"
          placeholderTextColor="#8a8a8e"
          multiline
          submitBehavior="newline"
        />
        <Pressable
          testID="task-send"
          accessibilityRole="button"
          accessibilityLabel="Save task"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={handleSend}
          style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(120,120,128,0.3)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
  },
  scheduleButton: {
    paddingBottom: 10,
  },
  scheduleGlyph: {
    fontSize: 20,
  },
  dueAtText: {
    fontSize: 13,
    color: '#208AEF',
  },
  clearScheduleGlyph: {
    fontSize: 16,
    color: '#8a8a8e',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 140,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 16,
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  sendButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#208AEF',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
