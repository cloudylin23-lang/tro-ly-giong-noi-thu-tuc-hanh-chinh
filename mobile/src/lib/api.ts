import { File, UploadType } from 'expo-file-system';
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
    /** Lỗi gốc (vd "Network request failed") — hiện kèm để chẩn đoán, không phải để người dùng đọc */
    public detail?: string,
  ) {
    super(message);
  }
}

const errText = (err: unknown) => (err instanceof Error ? `${err.name}: ${err.message}` : String(err)).slice(0, 120);

export const apiBaseUrl = BASE_URL;

/** Câu báo lỗi dễ hiểu cho người dùng */
export function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    // Kèm mã lỗi gốc ở cuối (chữ nhỏ trong ngoặc) để nhóm chẩn đoán được khi thử trên máy thật
    if (err.kind === 'network' || err.kind === 'timeout')
      return err.detail ? `${copy.errors.network} (${err.detail})` : copy.errors.network;
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
    throw new ApiError(
      aborted ? 'Hết thời gian chờ' : 'Không kết nối được máy chủ',
      aborted ? 'timeout' : 'network',
      errText(err),
    );
  } finally {
    clearTimeout(timer);
  }
  let data: { error?: string } | null = null;
  try {
    data = (await res.json()) as { error?: string };
  } catch {
    // Mất mạng giữa chừng lúc đang nhận body: coi là lỗi mạng để còn gửi lại được
    if (res.ok) throw new ApiError('Không nhận được trả lời từ máy chủ', 'network');
  }
  if (!res.ok) throw new ApiError(data?.error ?? `Lỗi máy chủ ${res.status}`, 'server');
  return data as T;
}

/** Lỗi do đường truyền (không phải do server) → gửi lại cùng dữ liệu là an toàn */
export function isRetryable(err: unknown): boolean {
  return err instanceof ApiError && (err.kind === 'network' || err.kind === 'timeout');
}

// Server STT tối đa ~23s (13s model chính + 10s dự phòng, server/lib/config.ts) + thời gian upload trên 3G.
// Phải nhỏ hơn maxDuration của api/stt.ts trong server/vercel.json (60s).
const STT_TIMEOUT_MS = 35_000;
const STT_RETRY_DELAY_MS = 1_500;

/**
 * Android/iOS: gửi file ghi âm bằng upload NATIVE của expo-file-system (multipart, field "audio"),
 * không qua fetch + FormData của React Native — cách cũ báo "mạng chập chờn" trên Redmi
 * dù request chưa từng tới server (log Vercel không có /api/stt nào từ điện thoại).
 */
async function uploadNative(uri: string): Promise<string> {
  if (!BASE_URL) throw new ApiError('Chưa cấu hình EXPO_PUBLIC_API_URL', 'config');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STT_TIMEOUT_MS);
  let res: { status: number; body: string };
  try {
    res = await new File(uri).upload(`${BASE_URL}/api/stt`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'audio',
      mimeType: 'audio/m4a',
      headers: { 'x-app-token': APP_TOKEN },
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = controller.signal.aborted;
    throw new ApiError(
      aborted ? 'Hết thời gian chờ' : 'Không kết nối được máy chủ',
      aborted ? 'timeout' : 'network',
      errText(err),
    );
  } finally {
    clearTimeout(timer);
  }
  let data: { text?: string; error?: string } | null = null;
  try {
    data = JSON.parse(res.body) as { text?: string; error?: string };
  } catch {
    if (res.status < 400) throw new ApiError('Không nhận được trả lời từ máy chủ', 'network', `body: ${res.body.slice(0, 80)}`);
  }
  if (res.status >= 400) throw new ApiError(data?.error ?? `Lỗi máy chủ ${res.status}`, 'server');
  return data?.text ?? '';
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

  /**
   * Gửi file ghi âm (uri cục bộ) → chữ. Lỗi mạng / hết giờ thì tự gửi lại 1 lần cùng file
   * (server không lưu gì nên gửi lại an toàn). Lỗi do server (4xx, 5xx) thì không gửi lại.
   */
  async stt(uri: string): Promise<string> {
    const send = async () => {
      if (Platform.OS === 'web') {
        // Web: uri là blob: URL, trình duyệt ghi ra webm
        const form = new FormData();
        const blob = await (await fetch(uri)).blob();
        form.append('audio', blob, blob.type.includes('mp4') ? 'audio.m4a' : 'audio.webm');
        const { text } = await request<{ text?: string }>('/api/stt', { method: 'POST', body: form }, STT_TIMEOUT_MS);
        return text ?? '';
      }
      return uploadNative(uri);
    };
    try {
      return await send();
    } catch (err) {
      if (!isRetryable(err)) throw err;
      await new Promise((r) => setTimeout(r, STT_RETRY_DELAY_MS)); // mạng vừa rớt, chờ chút rồi gửi lại
      return send();
    }
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
