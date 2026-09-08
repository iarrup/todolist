import { describe, expect, it } from '@jest/globals';

import { mergeVoiceTranscript } from '../mergeVoiceTranscript';

describe('mergeVoiceTranscript', () => {
  it('returns the transcript alone when there is no base text', () => {
    expect(mergeVoiceTranscript('', 'hello world')).toBe('hello world');
  });

  it('appends after a single space when base text has no trailing whitespace', () => {
    expect(mergeVoiceTranscript('shopping:', 'milk')).toBe('shopping: milk');
  });

  it('does not double a trailing space already present on the base text', () => {
    expect(mergeVoiceTranscript('shopping: ', 'milk')).toBe('shopping: milk');
  });

  it('returns the base text unchanged when the transcript is empty', () => {
    expect(mergeVoiceTranscript('kept', '')).toBe('kept');
  });

  it('replaces the previous transcript on each call rather than concatenating', () => {
    expect(mergeVoiceTranscript('note:', 'milk')).toBe('note: milk');
    expect(mergeVoiceTranscript('note:', 'milk and eggs')).toBe('note: milk and eggs');
  });
});
