import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Swipeable } from 'react-native-gesture-handler';

import type { Note } from '@/db/schema';
import type { NoteEditingController } from '@/hooks/useNoteEditing';

/**
 * A single note row: static text, or (when this note is the one being
 * edited per `editing`) an inline, pre-filled, auto-save-on-blur text field.
 * Shared by `NoteList` (day) and `GroupedNoteList` (week/month, F5) so edit
 * behavior is identical in every view.
 *
 * A static row also supports swipe-to-reveal delete (F14), mirroring
 * `TaskRow`: swiping left reveals a "Delete" button; the swipe itself does
 * not delete — only tapping the button does. A row being edited is not
 * swipeable.
 */
interface NoteRowProps {
  note: Note;
  editing: NoteEditingController;
  onDeleteNote: (id: string) => void;
}

export function NoteRow({ note, editing, onDeleteNote }: NoteRowProps) {
  const { editingId, draftText, setDraftText, handleLongPress, commitEdit } = editing;
  const swipeableRef = useRef<Swipeable>(null);

  if (note.id === editingId) {
    return (
      <View style={styles.note}>
        <TextInput
          testID="note-edit-input"
          style={styles.noteText}
          value={draftText}
          onChangeText={setDraftText}
          onBlur={() => commitEdit(note.id, draftText)}
          multiline
          submitBehavior="newline"
          autoFocus
        />
      </View>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={() => (
        <Pressable
          testID="note-delete-button"
          accessibilityRole="button"
          accessibilityLabel="Delete note"
          onPress={() => {
            swipeableRef.current?.close();
            onDeleteNote(note.id);
          }}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      )}
    >
      <View style={styles.note}>
        <Pressable testID={`note-row-${note.id}`} onLongPress={() => handleLongPress(note)}>
          <Text testID="note-text" style={styles.noteText}>
            {note.text}
          </Text>
        </Pressable>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  note: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,128,0.12)',
  },
  noteText: {
    fontSize: 16,
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#EF4444',
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
