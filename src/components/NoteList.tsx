import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { Note } from '@/db/schema';
import { useNoteEditing } from '@/hooks/useNoteEditing';

import { NoteRow } from './NoteRow';

/**
 * Renders the given notes as-is (newest-first ordering is the caller's
 * responsibility — this component does not sort), or an empty state when
 * there are none. Long-pressing a note opens it for inline editing; the edit
 * is committed via `onEditNote` when the field loses focus, unless it was
 * cleared to empty/whitespace, in which case it reverts to the original text.
 */
interface NoteListProps {
  notes: Note[];
  onEditNote: (id: string, text: string) => void;
}

export function NoteList({ notes, onEditNote }: NoteListProps) {
  const editing = useNoteEditing(onEditNote);

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
      renderItem={({ item }) => <NoteRow note={item} editing={editing} />}
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
});
