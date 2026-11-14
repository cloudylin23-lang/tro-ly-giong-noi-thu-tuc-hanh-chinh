import { Platform } from 'react-native';
import { copy } from '@/copy';
import { procedures } from '@/data/procedures';
import type { ClassifyResponse, ExtractResponse, Field, FieldSpec, Procedure } from '@/types';

// Đặt trong mobile/.env (chạy local) và eas.json (khi build APK).
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
// Token này nằm trong APK nên KHÔNG phải bí mật — chỉ để chặn người lạ gọi ké API lúc demo.
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

export type ApiErrorKind = 'config' | 'network' | 'timeout' | 'server';

export class ApiError extends Error {
  constructor(
    message: string,
    public kind: ApiErrorKind,
  ) {
    super(message);
  }
}

export const apiBaseUrl = BASE_URL;

/** Câu báo lỗi dễ hiểu cho người dùng */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.kind === 'network' || err.kind === 'timeout') return copy.errors.network;
    if (err.kind === 'config') return err.message;
  }
  if (__DEV__ && err instanceof Error) return `${copy.errors.generic} (${err.message})`;
  return copy.errors.generic;
}

async function request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  if (!BASE_URL) throw new ApiError('Chưa cấu hình EXPO_PUBLIC_API_URL', 'config');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), 'x-app-token': APP_TOKEN },
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new ApiError(aborted ? 'Hết thời gian chờ' : 'Không kết nối được máy chủ', aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? `Lỗi máy chủ ${res.status}`, 'server');
  return data as T;
}

const toSpec = ({ key, label, kind, hint, options }: Field): FieldSpec => ({
  key,
  label,
  kind,
  hint,
  options: options?.map(({ value, label: l }) => ({ value, label: l })),
});

export const api = {
  health() {
    return request<{ ok: boolean; hasKey: boolean; sttModel: string; llmModel: string }>(
      '/api/health',
      { method: 'GET' },
      8_000,
    );
  },

  /** Gửi file ghi âm (uri cục bộ) → chữ */
  async stt(uri: string): Promise<string> {
    const form = new FormData();
    if (Platform.OS === 'web') {
      // Web: uri là blob: URL, trình duyệt ghi ra webm
      const blob = await (await fetch(uri)).blob();
      form.append('audio', blob, blob.type.includes('mp4') ? 'audio.m4a' : 'audio.webm');
    } else {
      // React Native nhận object {uri, name, type} làm file trong FormData
      form.append('audio', { uri, name: 'audio.m4a', type: 'audio/m4a' } as unknown as Blob);
    }
    const { text } = await request<{ text: string }>('/api/stt', { method: 'POST', body: form }, 25_000);
    return text;
  },

  classify(utterance: string) {
    return request<ClassifyResponse>(
      '/api/turn',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'classify',
          utterance,
          procedures: procedures.map(({ id, name, aliases }) => ({ id, name, aliases })),
        }),
      },
      15_000,
    );
  },

  extract(args: { utterance: string; procedure: Procedure; current: Field; others: Field[] }) {
    return request<ExtractResponse>(
      '/api/turn',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'extract',
          utterance: args.utterance,
          procedureName: args.procedure.name,
          currentField: toSpec(args.current),
          otherFields: args.others.map(toSpec),
        }),
      },
      15_000,
    );
  },
};
