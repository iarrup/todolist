import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

import type { Task } from '@/db/schema';
import { normalizeNoteInput } from '@/lib/noteInput';

export interface TaskEditingController {
  editingId: string | null;
  draftText: string;
  setDraftText: (text: string) => void;
  handleLongPress: (item: Task) => void;
  commitEdit: (id: string, text: string) => void;
}

/**
 * Long-press-to-edit / auto-save-on-blur / revert-on-empty state for tasks
 * (F7) — a task-typed sibling of useNoteEditing (F4), not a shared generic:
 * useNoteEditing/NoteList/GroupedNoteList are outside F7's spec'd file list,
 * so this duplicates rather than risks already-shipped, gated F4/F5 code.
 * Reuses normalizeNoteInput for the trim/empty rule (not note-specific
 * despite the name).
 */
export function useTaskEditing(
  onEditTask: (id: string, text: string) => void,
): TaskEditingController {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');

  function commitEdit(id: string, text: string) {
    const normalized = normalizeNoteInput(text);
    if (normalized !== null) onEditTask(id, normalized);
    setEditingId(null);
    setDraftText('');
  }

  // While a task is being edited, the Android Back button saves the edit (or
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

  function handleLongPress(item: Task) {
    if (editingId !== null && editingId !== item.id) {
      commitEdit(editingId, draftText);
    }
    setEditingId(item.id);
    setDraftText(item.text);
  }

  return { editingId, draftText, setDraftText, handleLongPress, commitEdit };
}
