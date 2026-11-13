// Bấm để nói → bấm lần nữa để dừng → gửi STT → trả chữ qua onText.
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { copy } from '@/copy';
import { api, friendlyError } from '@/lib/api';
import { stopSpeaking } from '@/lib/speech';

const MAX_MS = 25_000; // tự dừng sau 25 giây
const MIN_MS = 700; // ngắn hơn coi như bấm nhầm

// Mono, bitrate vừa phải: file nhỏ → upload nhanh trên 4G, STT vẫn chính xác
const PRESET: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  bitRate: 64_000,
};

export type VoiceState = 'idle' | 'recording' | 'transcribing';

export function useVoiceInput(onText: (text: string) => void | Promise<void>) {
  const recorder = useAudioRecorder(PRESET);
  const recState = useAudioRecorderState(recorder, 200);
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef<VoiceState>('idle');
  const onTextRef = useRef(onText);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  onTextRef.current = onText;

  const set = (s: VoiceState) => {
    stateRef.current = s;
    setState(s);
  };

  const stop = useCallback(async () => {
    if (stateRef.current !== 'recording') return;
    if (timer.current) clearTimeout(timer.current);
    const durationMs = recorder.getStatus().durationMillis;
    set('transcribing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const uri = recorder.uri;
      if (!uri || durationMs < MIN_MS) {
        setError(copy.mic.tooShort);
        set('idle');
        return;
      }
      const text = await api.stt(uri);
      set('idle');
      if (!text.trim()) {
        setError(copy.mic.tooShort);
        return;
      }
      await onTextRef.current(text);
    } catch (err) {
      setError(friendlyError(err));
      set('idle');
    }
  }, [recorder]);

  const start = useCallback(async () => {
    if (stateRef.current !== 'idle') return;
    setError(null);
    await stopSpeaking();
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError(copy.mic.permissionDenied);
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      set('recording');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      timer.current = setTimeout(() => void stop(), MAX_MS);
    } catch (err) {
      setError(friendlyError(err));
      set('idle');
    }
  }, [recorder, stop]);

  const toggle = useCallback(() => {
    if (stateRef.current === 'recording') void stop();
    else if (stateRef.current === 'idle') void start();
  }, [start, stop]);

  // Rời màn hình khi đang ghi → dừng, không gửi
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (stateRef.current === 'recording') {
        stateRef.current = 'idle';
        recorder.stop().catch(() => {});
      }
    },
    [recorder],
  );

  return {
    state,
    error,
    clearError: () => setError(null),
    toggle,
    durationMs: recState.durationMillis,
  };
}
