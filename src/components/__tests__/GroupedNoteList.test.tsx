import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import type { Note } from '@/db/schema';

import { GroupedNoteList } from '../GroupedNoteList';

const note = (id: string, text: string, createdAt: number): Note => ({
  id,
  text,
  createdAt,
  updatedAt: createdAt,
});

const day1 = new Date(2026, 8, 1, 9, 0, 0).getTime();
const day2 = new Date(2026, 8, 2, 9, 0, 0).getTime();

describe('GroupedNoteList', () => {
  it('shows the empty message when there are no notes', () => {
    const { getByText, queryAllByTestId } = render(
      <GroupedNoteList notes={[]} onEditNote={jest.fn()} emptyMessage="No notes this week" />,
    );

    expect(getByText('No notes this week')).toBeTruthy();
    expect(queryAllByTestId('note-text')).toHaveLength(0);
  });

  it('renders one section per day that has notes, with notes newest-first, omitting empty days', () => {
    const notes = [
      note('1', 'day1 early', day1),
      note('2', 'day2 note', day2),
      note('3', 'day1 late', day1 + 60_000),
    ];
    const { getAllByTestId, getByText } = render(
      <GroupedNoteList notes={notes} onEditNote={jest.fn()} emptyMessage="No notes this week" />,
    );

    // Two day groups only (no group for a day with zero notes).
    expect(getAllByTestId(/^day-subheading-/)).toHaveLength(2);
    expect(getByText('day1 early')).toBeTruthy();
    expect(getByText('day1 late')).toBeTruthy();
    expect(getByText('day2 note')).toBeTruthy();

    const texts = getAllByTestId('note-text').map((el) => el.props.children);
    // day2 group (newer) first, then day1 group; within day1, newest-first.
    expect(texts).toEqual(['day2 note', 'day1 late', 'day1 early']);
  });

  it('supports the same long-press-edit flow as NoteList, via the shared row', () => {
    const onEditNote = jest.fn();
    const notes = [note('1', 'hello', day1)];
    const { getByTestId } = render(
      <GroupedNoteList notes={notes} onEditNote={onEditNote} emptyMessage="No notes this week" />,
    );

    fireEvent(getByTestId('note-row-1'), 'longPress');
    expect(getByTestId('note-edit-input').props.value).toBe('hello');

    fireEvent.changeText(getByTestId('note-edit-input'), '  updated  ');
    fireEvent(getByTestId('note-edit-input'), 'blur');

    expect(onEditNote).toHaveBeenCalledTimes(1);
    expect(onEditNote).toHaveBeenCalledWith('1', 'updated');
  });

  it('only allows one note to be edited at a time across sections', () => {
    const onEditNote = jest.fn();
    const notes = [note('1', 'first', day1), note('2', 'second', day2)];
    const { getByTestId } = render(
      <GroupedNoteList notes={notes} onEditNote={onEditNote} emptyMessage="No notes this week" />,
    );

    fireEvent(getByTestId('note-row-1'), 'longPress');
    fireEvent.changeText(getByTestId('note-edit-input'), 'edited first');
    fireEvent(getByTestId('note-row-2'), 'longPress');

    expect(onEditNote).toHaveBeenCalledWith('1', 'edited first');
    expect(getByTestId('note-edit-input').props.value).toBe('second');
  });
});
