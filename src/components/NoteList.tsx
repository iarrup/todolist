import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { Note } from '@/db/schema';

/**
 * Renders the given notes as-is (newest-first ordering is the caller's
 * responsibility — this component does not sort), or an empty state when
 * there are none.
 */
interface NoteListProps {
  notes: Note[];
}

export function NoteList({ notes }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No notes yet today</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={notes}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.note}>
          <Text testID="note-text" style={styles.noteText}>
            {item.text}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
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
