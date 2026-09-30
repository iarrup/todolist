import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import type { Note } from '@/db/schema';
import { normalizeNoteInput } from '@/lib/noteInput';

export interface NoteEditingController {
  editingId: string | null;
  draftText: string;
  setDraftText: (text: string) => void;
  handleLongPress: (item: Note) => void;
  commitEdit: (id: string, text: string) => void;
}

/**
 * Long-press-to-edit / auto-save-on-blur / revert-on-empty state (F4),
 * factored out so `NoteList` (day) and `GroupedNoteList` (week/month, F5)
 * share one code path and cannot drift in edit behavior. Starting an edit
 * while another note is mid-edit commits/reverts the open one first, so only
 * one note is ever editable at a time within a hook instance. Android's
 * Back button also commits the open edit rather than exiting the app.
 */
export function useNoteEditing(
  onEditNote: (id: string, text: string) => void,
): NoteEditingController {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');

  function commitEdit(id: string, text: string) {
    const normalized = normalizeNoteInput(text);
    if (normalized !== null) onEditNote(id, normalized);
    setEditingId(null);
    setDraftText('');
  }

  // While a note is being edited, the Android Back button saves the edit (or
  // reverts it if emptied) and stays on the screen instead of exiting the app.
  useEffect(() => {
    if (editingId === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      commitEdit(editingId, draftText);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, draftText]);

  function handleLongPress(item: Note) {
    if (editingId !== null && editingId !== item.id) {
      commitEdit(editingId, draftText);
    }
    setEditingId(item.id);
    setDraftText(item.text);
  }

  return { editingId, draftText, setDraftText, handleLongPress, commitEdit };
}
