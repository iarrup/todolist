import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Note } from '@/db/schema';
import { normalizeNoteInput } from '@/lib/noteInput';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');

  function commitEdit(id: string, text: string) {
    const normalized = normalizeNoteInput(text);
    if (normalized !== null) onEditNote(id, normalized);
    setEditingId(null);
    setDraftText('');
  }

  function handleLongPress(item: Note) {
    if (editingId !== null && editingId !== item.id) {
      commitEdit(editingId, draftText);
    }
    setEditingId(item.id);
    setDraftText(item.text);
  }

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
      renderItem={({ item }) =>
        item.id === editingId ? (
          <View style={styles.note}>
            <TextInput
              testID="note-edit-input"
              style={styles.noteText}
              value={draftText}
              onChangeText={setDraftText}
              onBlur={() => commitEdit(item.id, draftText)}
              multiline
              submitBehavior="newline"
              autoFocus
            />
          </View>
        ) : (
          <Pressable
            testID={`note-row-${item.id}`}
            onLongPress={() => handleLongPress(item)}
            style={styles.note}
          >
            <Text testID="note-text" style={styles.noteText}>
              {item.text}
            </Text>
          </Pressable>
        )
      }
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
