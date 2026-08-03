import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { insertNote, notesForDayQuery } from '@/db/notes';

/**
 * Today view — the app shell for Phase 1. It reads today's notes from the local
 * database and renders them as plain text (no titles, no metadata). This is
 * structure, not the capture feature: real note entry arrives in F2. The only
 * write affordance here is a dev-only seed button used to prove persistence.
 */
export default function TodayScreen() {
  const { data: notes } = useLiveQuery(notesForDayQuery(new Date()));

  return (
    <View style={styles.container}>
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

      {__DEV__ && (
        <Pressable
          style={styles.devButton}
          onPress={() => insertNote(`seed note ${new Date().toLocaleTimeString()}`)}
        >
          <Text style={styles.devButtonText}>+ dev seed</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  devButton: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: '#208AEF',
  },
  devButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
