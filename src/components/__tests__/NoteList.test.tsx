import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

import type { Note } from '@/db/schema';

import { NoteList } from '../NoteList';

const note = (id: string, text: string, createdAt: number): Note => ({
  id,
  text,
  createdAt,
  updatedAt: createdAt,
});

describe('NoteList', () => {
  it('shows the empty state when there are no notes', () => {
    const { getByText, queryAllByTestId } = render(<NoteList notes={[]} onEditNote={jest.fn()} />);

    expect(getByText('No notes yet today')).toBeTruthy();
    expect(queryAllByTestId('note-text')).toHaveLength(0);
  });

  it('renders every note’s text', () => {
    const notes = [note('1', 'first', 3), note('2', 'second', 2), note('3', 'third', 1)];
    const { getByText } = render(<NoteList notes={notes} onEditNote={jest.fn()} />);

    expect(getByText('first')).toBeTruthy();
    expect(getByText('second')).toBeTruthy();
    expect(getByText('third')).toBeTruthy();
  });

  it('renders notes in the order given, without re-sorting', () => {
    // Deliberately out of chronological order — NoteList must not re-sort.
    const notes = [note('1', 'oldest', 1), note('2', 'newest', 3), note('3', 'middle', 2)];
    const { getAllByTestId } = render(<NoteList notes={notes} onEditNote={jest.fn()} />);

    const texts = getAllByTestId('note-text').map((el) => el.props.children);
    expect(texts).toEqual(['oldest', 'newest', 'middle']);
  });

  it('enters edit mode on long-press, pre-filled with the note’s text', () => {
    const notes = [note('1', 'hello', 1)];
    const { getByTestId, queryByTestId } = render(
      <NoteList notes={notes} onEditNote={jest.fn()} />,
    );

    fireEvent(getByTestId('note-row-1'), 'longPress');

    expect(queryByTestId('note-row-1')).toBeNull();
    expect(getByTestId('note-edit-input').props.value).toBe('hello');
  });

  it('commits the edit when the field is blurred with non-empty text', () => {
    const onEditNote = jest.fn();
    const notes = [note('1', 'hello', 1)];
    const { getByTestId } = render(<NoteList notes={notes} onEditNote={onEditNote} />);

    fireEvent(getByTestId('note-row-1'), 'longPress');
    fireEvent.changeText(getByTestId('note-edit-input'), '  updated  ');
    fireEvent(getByTestId('note-edit-input'), 'blur');

    expect(onEditNote).toHaveBeenCalledTimes(1);
    expect(onEditNote).toHaveBeenCalledWith('1', 'updated');
  });

  it('reverts without saving when blurred with empty/whitespace text', () => {
    const onEditNote = jest.fn();
    const notes = [note('1', 'hello', 1)];
    const { getByTestId, getByText, queryByTestId } = render(
      <NoteList notes={notes} onEditNote={onEditNote} />,
    );

    fireEvent(getByTestId('note-row-1'), 'longPress');
    fireEvent.changeText(getByTestId('note-edit-input'), '   ');
    fireEvent(getByTestId('note-edit-input'), 'blur');

    expect(onEditNote).not.toHaveBeenCalled();
    expect(queryByTestId('note-edit-input')).toBeNull();
    expect(getByText('hello')).toBeTruthy();
  });

  it('only allows one note to be edited at a time, committing the first on switch', () => {
    const onEditNote = jest.fn();
    const notes = [note('1', 'first', 2), note('2', 'second', 1)];
    const { getByTestId } = render(<NoteList notes={notes} onEditNote={onEditNote} />);

    fireEvent(getByTestId('note-row-1'), 'longPress');
    fireEvent.changeText(getByTestId('note-edit-input'), 'edited first');
    fireEvent(getByTestId('note-row-2'), 'longPress');

    expect(onEditNote).toHaveBeenCalledWith('1', 'edited first');
    expect(getByTestId('note-edit-input').props.value).toBe('second');
  });
});
