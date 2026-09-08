import { useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import { mergeVoiceTranscript } from '@/lib/mergeVoiceTranscript';

export type VoiceCaptureStatus = 'idle' | 'listening' | 'unavailable';

export interface VoiceCaptureController {
  status: VoiceCaptureStatus;
  toggle: () => void;
}

/**
 * Wires expo-speech-recognition's start/stop + event stream into the
 * composer's existing value/setValue text state — no separate "voice
 * transcript" state (one field, one source of truth). Permission is
 * requested lazily on the first tap, never on mount. One denial flips
 * status to 'unavailable' for the rest of this mount so the mic button
 * stops re-prompting on every tap; typing stays available regardless of
 * status (the caller disables the TextInput only while status === 'listening').
 */
export function useVoiceCapture(
  value: string,
  setValue: (text: string) => void,
): VoiceCaptureController {
  const [status, setStatus] = useState<VoiceCaptureStatus>('idle');
  const baseTextRef = useRef('');
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useSpeechRecognitionEvent('result', (event) => {
    if (status !== 'listening') return;
    const transcript = event.results[0]?.transcript ?? '';
    const merged = mergeVoiceTranscript(baseTextRef.current, transcript);
    setValue(merged);
    // In continuous mode the recognizer's transcript is cumulative only
    // within one speech segment: after a pause it starts the next segment's
    // transcript over from empty. Committing each final result into the base
    // (instead of leaving base fixed at listening-start) is what lets later
    // segments append after earlier ones instead of overwriting them.
    if (event.isFinal) {
      baseTextRef.current = merged;
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setStatus(event.error === 'not-allowed' ? 'unavailable' : 'idle');
  });

  useSpeechRecognitionEvent('end', () => {
    setStatus((current) => (current === 'unavailable' ? 'unavailable' : 'idle'));
  });

  async function start() {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setStatus('unavailable');
      return;
    }
    baseTextRef.current = valueRef.current;
    setStatus('listening');
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
  }

  function stop() {
    ExpoSpeechRecognitionModule.stop();
    setStatus('idle');
  }

  function toggle() {
    if (status === 'unavailable') return;
    if (status === 'listening') stop();
    else void start();
  }

  return { status, toggle };
}
