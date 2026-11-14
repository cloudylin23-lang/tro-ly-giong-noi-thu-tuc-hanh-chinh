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
import { api, friendlyError, isRetryable } from '@/lib/api';
import { speak, stopSpeaking } from '@/lib/speech';

const MAX_MS = 25_000; // tự dừng sau 25 giây
const MIN_MS = 700; // ngắn hơn coi như bấm nhầm
const SLOW_MS = 5_000; // chờ STT quá lâu → báo mạng chậm

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
  const [slow, setSlow] = useState(false);
  const [canRetry, setCanRetry] = useState(false);

  const stateRef = useRef<VoiceState>('idle');
  const lastUriRef = useRef<string | null>(null); // file ghi âm gần nhất chưa ra chữ
  const onTextRef = useRef(onText);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  onTextRef.current = onText;

  const set = (s: VoiceState) => {
    stateRef.current = s;
    setState(s);
  };

  // Báo lỗi bằng chữ và đọc to: người lớn tuổi thường không nhìn màn hình lúc chờ
  const fail = (msg: string) => {
    setError(msg);
    void speak(msg);
  };

  const clearRetry = useCallback(() => {
    lastUriRef.current = null;
    setCanRetry(false);
  }, []);

  // Gửi file lên STT. Gọi khi state đã là 'transcribing'.
  const transcribe = useCallback(async (uri: string) => {
    lastUriRef.current = uri;
    try {
      const text = await api.stt(uri); // tự gửi lại 1 lần nếu lỗi mạng (lib/api.ts)
      if (!mounted.current) return; // đã rời màn hình trong lúc chờ STT → bỏ kết quả
      lastUriRef.current = null;
      set('idle');
      if (!text.trim()) {
        fail(copy.mic.tooShort);
        return;
      }
      await onTextRef.current(text);
    } catch (err) {
      if (!mounted.current) return;
      setCanRetry(isRetryable(err)); // còn file + lỗi đường truyền → cho bấm gửi lại, khỏi nói lại
      if (!isRetryable(err)) lastUriRef.current = null;
      fail(friendlyError(err));
      set('idle');
    }
  }, []);

  const stop = useCallback(async () => {
    if (stateRef.current !== 'recording') return;
    if (timer.current) clearTimeout(timer.current);
    const durationMs = recorder.getStatus().durationMillis;
    set('transcribing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (err) {
      if (!mounted.current) return;
      fail(friendlyError(err));
      set('idle');
      return;
    }
    const uri = recorder.uri;
    if (!uri || durationMs < MIN_MS) {
      fail(copy.mic.tooShort);
      set('idle');
      return;
    }
    await transcribe(uri);
  }, [recorder, transcribe]);

  /** Gửi lại file ghi âm gần nhất (sau lỗi mạng) mà không phải ghi âm lại */
  const retry = useCallback(async () => {
    const uri = lastUriRef.current;
    if (stateRef.current !== 'idle' || !uri) return;
    setError(null);
    setCanRetry(false);
    await stopSpeaking();
    set('transcribing');
    await transcribe(uri);
  }, [transcribe]);

  const start = useCallback(async () => {
    if (stateRef.current !== 'idle') return;
    setError(null);
    clearRetry(); // ghi câu mới → bỏ file cũ
    await stopSpeaking();
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      fail(copy.mic.permissionDenied);
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
      fail(friendlyError(err));
      set('idle');
    }
  }, [recorder, stop, clearRetry]);

  const toggle = useCallback(() => {
    if (stateRef.current === 'recording') void stop();
    else if (stateRef.current === 'idle') void start();
  }, [start, stop]);

  // Chờ STT quá 5 giây → báo "mạng hơi chậm" (chữ + đọc to), không để bác ngồi im chờ
  useEffect(() => {
    if (state !== 'transcribing') {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => {
      setSlow(true);
      void speak(copy.mic.slow);
    }, SLOW_MS);
    return () => clearTimeout(t);
  }, [state]);

  // Rời màn hình khi đang ghi → dừng, không gửi; đang chờ STT → bỏ kết quả
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (stateRef.current === 'recording') {
        stateRef.current = 'idle';
        recorder.stop().catch(() => {});
      }
    };
  }, [recorder]);

  return {
    state,
    error,
    clearError: () => setError(null),
    toggle,
    durationMs: recState.durationMillis,
    /** Đang chờ STT quá 5 giây */
    slow,
    /** Lần gần nhất lỗi mạng / hết giờ và vẫn còn file → hiện nút "Gửi lại" */
    canRetry,
    retry,
    /** Bỏ file đang chờ gửi lại (câu hỏi đã đổi, bác gõ chữ…) để không áp câu cũ vào chỗ mới */
    clearRetry,
  };
}
