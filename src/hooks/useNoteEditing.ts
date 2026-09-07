import { useState } from 'react';

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
 * one note is ever editable at a time within a hook instance.
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

  function handleLongPress(item: Note) {
    if (editingId !== null && editingId !== item.id) {
      commitEdit(editingId, draftText);
    }
    setEditingId(item.id);
    setDraftText(item.text);
  }

  return { editingId, draftText, setDraftText, handleLongPress, commitEdit };
}
