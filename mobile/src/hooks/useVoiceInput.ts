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
import { api, friendlyError, isRetryableError } from '@/lib/api';
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

export function useVoiceInput(onText: (text: string) => void | Promise<void>, contextKey?: string) {
  const recorder = useAudioRecorder(PRESET);
  const recState = useAudioRecorderState(recorder, 200);
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryUri, setRetryUri] = useState<string | null>(null);

  const stateRef = useRef<VoiceState>('idle');
  const onTextRef = useRef(onText);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestVersion = useRef(0);
  const starting = useRef(false);
  onTextRef.current = onText;

  const set = useCallback((s: VoiceState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  // Không dùng bản ghi của câu trước hoặc trả kết quả về màn đã rời đi.
  useEffect(() => {
    requestVersion.current++;
    setError(null);
    setRetryUri(null);
    if (stateRef.current === 'transcribing') set('idle');
    return () => { requestVersion.current++; };
  }, [contextKey, set]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryUri(null);
  }, []);

  const transcribe = useCallback(async (uri: string) => {
    const version = requestVersion.current;
    set('transcribing');
    clearError();
    let text: string;
    try {
      text = await api.stt(uri);
    } catch (err) {
      if (version !== requestVersion.current) return;
      setError(friendlyError(err));
      if (isRetryableError(err)) setRetryUri(uri);
      set('idle');
      return;
    }
    if (version !== requestVersion.current) return;
    set('idle');
    if (!text.trim()) {
      setError(copy.mic.tooShort);
      return;
    }
    await onTextRef.current(text);
  }, [clearError, set]);

  const retry = useCallback(async () => {
    if (stateRef.current !== 'idle' || starting.current || !retryUri) return;
    await transcribe(retryUri);
  }, [retryUri, transcribe]);

  const stop = useCallback(async () => {
    if (stateRef.current !== 'recording') return;
    const version = requestVersion.current;
    if (timer.current) clearTimeout(timer.current);
    const durationMs = recorder.getStatus().durationMillis;
    set('transcribing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      if (version !== requestVersion.current) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const uri = recorder.uri;
      if (!uri || durationMs < MIN_MS) {
        setError(copy.mic.tooShort);
        set('idle');
        return;
      }
      await transcribe(uri);
    } catch (err) {
      if (version !== requestVersion.current) return;
      setError(friendlyError(err));
      set('idle');
    }
  }, [recorder, set, transcribe]);

  const start = useCallback(async () => {
    if (stateRef.current !== 'idle' || starting.current) return;
    starting.current = true;
    const version = requestVersion.current;
    clearError();
    try {
      await stopSpeaking();
      const perm = await requestRecordingPermissionsAsync();
      if (version !== requestVersion.current) return;
      if (!perm.granted) {
        setError(copy.mic.permissionDenied);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (version !== requestVersion.current) return;
      recorder.record();
      set('recording');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      timer.current = setTimeout(() => void stop(), MAX_MS);
    } catch (err) {
      if (version !== requestVersion.current) return;
      setError(friendlyError(err));
      set('idle');
    } finally {
      starting.current = false;
    }
  }, [clearError, recorder, set, stop]);

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
    clearError,
    canRetry: retryUri !== null && state === 'idle',
    retry,
    toggle,
    durationMs: recState.durationMillis,
  };
}
