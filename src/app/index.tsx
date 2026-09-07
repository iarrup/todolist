import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { BrowseHeader } from '@/components/BrowseHeader';
import { GroupedNoteList } from '@/components/GroupedNoteList';
import { NoteComposer } from '@/components/NoteComposer';
import { NoteList } from '@/components/NoteList';
import { insertNote, notesForGranularityQuery, updateNoteText } from '@/db/notes';
import type { Granularity } from '@/lib/granularity';
import { stepDate } from '@/lib/stepDate';

const EMPTY_MESSAGE: Record<Exclude<Granularity, 'day'>, string> = {
  week: 'No notes this week',
  month: 'No notes this month',
};

/**
 * Today view — the default Phase 1 screen, now a day/week/month browser (F5).
 * It reads notes for the current granularity + anchor date from the local
 * database (live) and lets the user capture new ones through the pinned
 * `NoteComposer`. Notes are plain text (no titles, no metadata); newlines render
 * as-is. Saving goes through `insertNote` (always "now", independent of what's
 * being browsed), and the live query refreshes the list automatically — no
 * manual re-fetch.
 */
export default function TodayScreen() {
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const { data: notes } = useLiveQuery(notesForGranularityQuery(granularity, anchorDate), [
    granularity,
    anchorDate.getTime(),
  ]);

  function handlePrev() {
    setAnchorDate((d) => stepDate(d, granularity, -1));
  }
  function handleNext() {
    setAnchorDate((d) => stepDate(d, granularity, 1));
  }
  function handleJumpToToday() {
    setAnchorDate(new Date());
  }
  function handleGranularityChange(g: Granularity) {
    setGranularity(g);
  }

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
      <BrowseHeader
        granularity={granularity}
        anchorDate={anchorDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onJumpToToday={handleJumpToToday}
        onGranularityChange={handleGranularityChange}
      />

      <View style={styles.listArea}>
        {granularity === 'day' ? (
          <NoteList
            notes={notes}
            onEditNote={(id, text) => {
              void updateNoteText(id, text);
            }}
          />
        ) : (
          <GroupedNoteList
            notes={notes}
            onEditNote={(id, text) => {
              void updateNoteText(id, text);
            }}
            emptyMessage={EMPTY_MESSAGE[granularity]}
          />
        )}
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
