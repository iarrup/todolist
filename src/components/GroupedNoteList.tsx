import { SectionList, StyleSheet, Text, View } from 'react-native';

import type { Note } from '@/db/schema';
import { useNoteEditing } from '@/hooks/useNoteEditing';
import { formatDayHeading } from '@/lib/formatDay';
import { groupNotesByDay } from '@/lib/groupNotesByDay';

import { NoteRow } from './NoteRow';

/**
 * Renders notes grouped by the local calendar day they were created on — a
 * day sub-heading (reusing `formatDayHeading`, so a day that happens to be
 * today reads "Today, Sep 3" here too) per day that has at least one note;
 * days with none simply don't appear. Used for week/month browsing (F5);
 * `NoteList` still handles the flat day view. Shares `useNoteEditing` +
 * `NoteRow` with `NoteList` so edit behavior is identical in every view.
 */
interface GroupedNoteListProps {
  notes: Note[];
  onEditNote: (id: string, text: string) => void;
  emptyMessage: string;
}

export function GroupedNoteList({ notes, onEditNote, emptyMessage }: GroupedNoteListProps) {
  const editing = useNoteEditing(onEditNote);

  if (notes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const sections = groupNotesByDay(notes).map((group) => ({
    dayStart: group.dayStart,
    data: group.notes,
  }));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.list}
      renderSectionHeader={({ section }) => (
        <Text testID={`day-subheading-${section.dayStart}`} style={styles.dayHeading}>
          {formatDayHeading(new Date(section.dayStart))}
        </Text>
      )}
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
  dayHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingTop: 8,
  },
});
