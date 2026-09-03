import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { DayHeading } from '@/components/DayHeading';
import { NoteComposer } from '@/components/NoteComposer';
import { NoteList } from '@/components/NoteList';
import { insertNote, notesForDayQuery } from '@/db/notes';

/**
 * Today view — the default Phase 1 screen. It reads today's notes from the local
 * database (live) and lets the user capture new ones through the pinned
 * `NoteComposer`. Notes are plain text (no titles, no metadata); newlines render
 * as-is. Saving goes through `insertNote`, and the live query refreshes the list
 * automatically — no manual re-fetch.
 */
export default function TodayScreen() {
  const today = new Date();
  const { data: notes } = useLiveQuery(notesForDayQuery(today));

  // Android's edge-to-edge window never resizes for the keyboard, so neither
  // `windowSoftInputMode="adjustResize"` nor KeyboardAvoidingView's built-in
  // behaviors move the composer. Track the real IME height directly and pad
  // the screen by it instead.
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
      <DayHeading date={today} />

      <View style={styles.listArea}>
        <NoteList notes={notes} />
      </View>

      <NoteComposer
        onSubmit={(text) => {
          void insertNote(text);
        }}
      />
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
