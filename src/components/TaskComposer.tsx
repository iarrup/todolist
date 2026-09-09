import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { normalizeNoteInput } from '@/lib/noteInput';

/**
 * Minimal task-capture control: a multiline text input pinned at the bottom
 * of the Tasks screen with a send affordance. A task is only its text (no
 * title/metadata) — structurally the same as NoteComposer minus the mic
 * button (F6's voice capture was note-specific, out of scope for F7). Return
 * inserts a newline; the task is committed only by the send button, and only
 * when non-empty after trimming. After a save the field clears but keeps
 * focus for rapid capture.
 */
interface TaskComposerProps {
  onSubmit: (text: string) => void;
}

export function TaskComposer({ onSubmit }: TaskComposerProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');

  const trimmed = normalizeNoteInput(value);
  const canSubmit = trimmed !== null;

  const handleSend = () => {
    if (trimmed === null) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(120,120,128,0.3)',
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
