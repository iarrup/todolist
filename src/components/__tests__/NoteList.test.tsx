import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

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
    const { getByText, queryAllByTestId } = render(<NoteList notes={[]} />);

    expect(getByText('No notes yet today')).toBeTruthy();
    expect(queryAllByTestId('note-text')).toHaveLength(0);
  });

  it('renders every note’s text', () => {
    const notes = [note('1', 'first', 3), note('2', 'second', 2), note('3', 'third', 1)];
    const { getByText } = render(<NoteList notes={notes} />);

    expect(getByText('first')).toBeTruthy();
    expect(getByText('second')).toBeTruthy();
    expect(getByText('third')).toBeTruthy();
  });

  it('renders notes in the order given, without re-sorting', () => {
    // Deliberately out of chronological order — NoteList must not re-sort.
    const notes = [note('1', 'oldest', 1), note('2', 'newest', 3), note('3', 'middle', 2)];
    const { getAllByTestId } = render(<NoteList notes={notes} />);

    const texts = getAllByTestId('note-text').map((el) => el.props.children);
    expect(texts).toEqual(['oldest', 'newest', 'middle']);
  });
});
