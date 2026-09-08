/**
 * Pure merge rule for streaming speech-recognition transcripts into the
 * composer's text field. expo-speech-recognition delivers each `result`
 * event (partial or final) as the *cumulative* hypothesis for the current
 * listening session, not an incremental delta — so each event replaces the
 * previous transcript rather than appending to it. `baseText` is whatever
 * was in the field the moment listening started; it is always preserved as
 * a prefix so voice capture never discards existing content.
 */
export function mergeVoiceTranscript(baseText: string, transcript: string): string {
  if (transcript.length === 0) return baseText;
  if (baseText.length === 0) return transcript;
  const needsSpace = !/\s$/.test(baseText);
  return baseText + (needsSpace ? ' ' : '') + transcript;
}
