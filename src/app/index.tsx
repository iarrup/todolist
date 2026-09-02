import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { NoteComposer } from '@/components/NoteComposer';
import { insertNote, notesForDayQuery } from '@/db/notes';

/**
 * Today view — the default Phase 1 screen. It reads today's notes from the local
 * database (live) and lets the user capture new ones through the pinned
 * `NoteComposer`. Notes are plain text (no titles, no metadata); newlines render
 * as-is. Saving goes through `insertNote`, and the live query refreshes the list
 * automatically — no manual re-fetch.
 */
export default function TodayScreen() {
  const { data: notes } = useLiveQuery(notesForDayQuery(new Date()));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.listArea}>
        {notes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No notes yet today</Text>
          </View>
        ) : (
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.note}>
                <Text style={styles.noteText}>{item.text}</Text>
              </View>
            )}
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8a8a8e',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  note: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  noteText: {
    fontSize: 16,
  },
});
