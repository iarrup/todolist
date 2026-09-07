import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Note } from '@/db/schema';
import type { NoteEditingController } from '@/hooks/useNoteEditing';

/**
 * A single note row: static text, or (when this note is the one being
 * edited per `editing`) an inline, pre-filled, auto-save-on-blur text field.
 * Shared by `NoteList` (day) and `GroupedNoteList` (week/month, F5) so edit
 * behavior is identical in every view.
 */
interface NoteRowProps {
  note: Note;
  editing: NoteEditingController;
}

export function NoteRow({ note, editing }: NoteRowProps) {
  const { editingId, draftText, setDraftText, handleLongPress, commitEdit } = editing;

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
    <Pressable
      testID={`note-row-${note.id}`}
      onLongPress={() => handleLongPress(note)}
      style={styles.note}
    >
      <Text testID="note-text" style={styles.noteText}>
        {note.text}
      </Text>
    </Pressable>
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
});
