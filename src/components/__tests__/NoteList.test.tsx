import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import type { Note } from '@/db/schema';

import { NoteList } from '../NoteList';

const note = (id: string, text: string, createdAt: number): Note => ({
  id,
  text,
  createdAt,
  updatedAt: createdAt,
  deletedAt: null,
});

describe('NoteList', () => {
  it('shows the empty state when there are no notes', () => {
    const { getByText, queryAllByTestId } = render(
      <NoteList notes={[]} onEditNote={jest.fn()} onDeleteNote={jest.fn()} />,
    );

    expect(getByText('No notes yet today')).toBeTruthy();
    expect(queryAllByTestId('note-text')).toHaveLength(0);
  });

  it('renders every note’s text', () => {
    const notes = [note('1', 'first', 3), note('2', 'second', 2), note('3', 'third', 1)];
    const { getByText } = render(
      <NoteList notes={notes} onEditNote={jest.fn()} onDeleteNote={jest.fn()} />,
    );

    expect(getByText('first')).toBeTruthy();
    expect(getByText('second')).toBeTruthy();
    expect(getByText('third')).toBeTruthy();
  });

  it('renders notes in the order given, without re-sorting', () => {
    // Deliberately out of chronological order — NoteList must not re-sort.
    const notes = [note('1', 'oldest', 1), note('2', 'newest', 3), note('3', 'middle', 2)];
    const { getAllByTestId } = render(
      <NoteList notes={notes} onEditNote={jest.fn()} onDeleteNote={jest.fn()} />,
    );

    const texts = getAllByTestId('note-text').map((el) => el.props.children);
    expect(texts).toEqual(['oldest', 'newest', 'middle']);
  });

  it('enters edit mode on long-press, pre-filled with the note’s text', () => {
    const notes = [note('1', 'hello', 1)];
    const { getByTestId, queryByTestId } = render(
      <NoteList notes={notes} onEditNote={jest.fn()} onDeleteNote={jest.fn()} />,
    );

    fireEvent(getByTestId('note-row-1'), 'longPress');

    expect(queryByTestId('note-row-1')).toBeNull();
    expect(getByTestId('note-edit-input').props.value).toBe('hello');
  });

  it('commits the edit when the field is blurred with non-empty text', () => {
    const onEditNote = jest.fn();
    const notes = [note('1', 'hello', 1)];
    const { getByTestId } = render(
      <NoteList notes={notes} onEditNote={onEditNote} onDeleteNote={jest.fn()} />,
    );

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
      <NoteList notes={notes} onEditNote={onEditNote} onDeleteNote={jest.fn()} />,
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
    const { getByTestId } = render(
      <NoteList notes={notes} onEditNote={onEditNote} onDeleteNote={jest.fn()} />,
    );

    fireEvent(getByTestId('note-row-1'), 'longPress');
    fireEvent.changeText(getByTestId('note-edit-input'), 'edited first');
    fireEvent(getByTestId('note-row-2'), 'longPress');

    expect(onEditNote).toHaveBeenCalledWith('1', 'edited first');
    expect(getByTestId('note-edit-input').props.value).toBe('second');
  });

  it('tapping a row’s Delete button calls onDeleteNote with that note’s id', () => {
    const onDeleteNote = jest.fn();
    const notes = [note('1', 'first', 2), note('2', 'second', 1)];
    const { getAllByTestId } = render(
      <NoteList notes={notes} onEditNote={jest.fn()} onDeleteNote={onDeleteNote} />,
    );

    fireEvent.press(getAllByTestId('note-delete-button')[1]);

    expect(onDeleteNote).toHaveBeenCalledTimes(1);
    expect(onDeleteNote).toHaveBeenCalledWith('2');
  });

  it('does not delete on render or long-press alone', () => {
    const onDeleteNote = jest.fn();
    const { getByTestId } = render(
      <NoteList
        notes={[note('1', 'hello', 1)]}
        onEditNote={jest.fn()}
        onDeleteNote={onDeleteNote}
      />,
    );

    fireEvent(getByTestId('note-row-1'), 'longPress');

    expect(onDeleteNote).not.toHaveBeenCalled();
  });

  it('shows no Delete button on the row being edited', () => {
    const notes = [note('1', 'first', 2), note('2', 'second', 1)];
    const { getByTestId, getAllByTestId } = render(
      <NoteList notes={notes} onEditNote={jest.fn()} onDeleteNote={jest.fn()} />,
    );

    fireEvent(getByTestId('note-row-1'), 'longPress');

    expect(getAllByTestId('note-delete-button')).toHaveLength(1);
  });

  it('Back while editing saves the edit and is consumed (no app exit)', () => {
    const handlers: (() => boolean)[] = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((
      _event: string,
      handler: () => boolean,
    ) => {
      handlers.push(handler);
      return { remove: jest.fn() };
    }) as never);
    const onEditNote = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <NoteList notes={[note('1', 'hello', 1)]} onEditNote={onEditNote} onDeleteNote={jest.fn()} />,
    );

    fireEvent(getByTestId('note-row-1'), 'longPress');
    fireEvent.changeText(getByTestId('note-edit-input'), '  edited  ');
    let consumed = false;
    act(() => {
      consumed = handlers[handlers.length - 1]();
    });

    expect(consumed).toBe(true);
    expect(onEditNote).toHaveBeenCalledWith('1', 'edited');
    expect(queryByTestId('note-edit-input')).toBeNull();
    spy.mockRestore();
  });
});
