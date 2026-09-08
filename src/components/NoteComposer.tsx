import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { normalizeNoteInput } from '@/lib/noteInput';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';

/**
 * Minimal note-capture control: a multiline text input pinned at the bottom of
 * the Today screen with a send affordance and a mic affordance for voice
 * capture. A note is only its text (no title/metadata). Return inserts a
 * newline (multiline `submitBehavior`); the note is committed only by the
 * send button, and only when it is non-empty after trimming. After a save the
 * field clears but keeps focus for rapid capture. Tapping the mic toggles
 * on-device speech recognition, which streams recognized text into this same
 * field via `useVoiceCapture`.
 */
interface NoteComposerProps {
  onSubmit: (text: string) => void;
}

export function NoteComposer({ onSubmit }: NoteComposerProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const voice = useVoiceCapture(value, setValue);

  const trimmed = normalizeNoteInput(value);
  const canSubmit = trimmed !== null;

  const handleSend = () => {
    if (trimmed === null) return;
    onSubmit(trimmed);
    setValue('');
  };

  const micLabel =
    voice.status === 'listening'
      ? 'Stop voice input'
      : voice.status === 'unavailable'
        ? 'Voice input unavailable'
        : 'Start voice input';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <TextInput
        testID="note-input"
        style={styles.input}
        value={value}
        onChangeText={setValue}
        editable={voice.status !== 'listening'}
        placeholder="Write a note…"
        placeholderTextColor="#8a8a8e"
        multiline
        submitBehavior="newline"
      />
      <Pressable
        testID="note-mic"
        accessibilityRole="button"
        accessibilityLabel={micLabel}
        accessibilityState={{
          disabled: voice.status === 'unavailable',
          selected: voice.status === 'listening',
        }}
        disabled={voice.status === 'unavailable'}
        onPress={voice.toggle}
        style={[
          styles.micButton,
          voice.status === 'listening' && styles.micButtonListening,
          voice.status === 'unavailable' && styles.micButtonDisabled,
        ]}
      >
        <Text style={styles.micButtonText}>{voice.status === 'listening' ? '⏹' : '🎤'}</Text>
      </Pressable>
      <Pressable
        testID="note-send"
        accessibilityRole="button"
        accessibilityLabel="Save note"
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
  micButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#8a8a8e',
  },
  micButtonListening: {
    backgroundColor: '#EF4444',
  },
  micButtonDisabled: {
    opacity: 0.4,
  },
  micButtonText: {
    fontSize: 18,
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
