import OpenAI, { APIConnectionError, APIError } from 'openai';
import { errorFields, log } from './log.js';

let client: OpenAI | null = null;

export function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new HttpError(500, 'Server chưa có OPENAI_API_KEY');
  // Không để SDK tự retry: việc thử lại / đổi model do withFallback quyết định
  client ??= new OpenAI({ timeout: 20_000, maxRetries: 0 });
  return client;
}

export const config = {
  sttModel: process.env.OPENAI_STT_MODEL || 'gpt-4o-transcribe',
  sttFallbackModel: process.env.OPENAI_STT_FALLBACK_MODEL || 'gpt-4o-mini-transcribe',
  llmModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  llmFallbackModel: process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini',
  reasoningEffort: (process.env.OPENAI_REASONING_EFFORT || undefined) as
    | 'none'
    | 'minimal'
    | 'low'
    | undefined,
  // Thời gian chờ mỗi lần gọi. Tổng primary + fallback phải < maxDuration trong vercel.json (30s).
  llmTimeoutMs: 10_000,
  llmFallbackTimeoutMs: 10_000,
  sttTimeoutMs: 15_000,
  sttFallbackTimeoutMs: 10_000,
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// ---------------- Phân loại lỗi + model dự phòng ----------------

/**
 * transient: tạm thời (429 rate limit, timeout, mất kết nối, 5xx) → nên thử model dự phòng
 * model:     model chính không dùng được (404) hoặc trả kết quả sai định dạng → thử model dự phòng
 * input:     dữ liệu gửi lên sai (400/422, vd file ghi âm hỏng) → KHÔNG thử lại, thử bao nhiêu cũng lỗi
 * auth:      sai key / không có quyền (401/403) → KHÔNG thử lại, lỗi cấu hình server
 * quota:     hết hạn mức tài khoản (429 insufficient_quota) → KHÔNG thử lại, model khác cùng tài khoản cũng hết
 */
export type FailureKind = 'transient' | 'model' | 'input' | 'auth' | 'quota' | 'unknown';

export function classifyError(err: unknown): FailureKind {
  if (err instanceof HttpError) return err.status === 502 ? 'model' : 'input';
  if (err instanceof APIConnectionError) return 'transient'; // gồm cả APIConnectionTimeoutError
  if (err instanceof APIError) {
    const s = err.status;
    if (s === 429) return err.code === 'insufficient_quota' ? 'quota' : 'transient';
    if (s === 408 || s === 409 || (typeof s === 'number' && s >= 500)) return 'transient';
    if (s === 404) return 'model';
    if (s === 401 || s === 403) return 'auth';
    if (s === 400 || s === 422) return 'input';
  }
  return 'unknown';
}

const RETRYABLE: ReadonlySet<FailureKind> = new Set(['transient', 'model']);

/** Lỗi trả cho app — câu ngắn, không lộ chi tiết nội bộ. */
function toHttpError(err: unknown, kind: FailureKind): HttpError {
  if (err instanceof HttpError) return err;
  switch (kind) {
    case 'transient':
      return new HttpError(503, 'AI đang bận hoặc kết nối tới AI chập chờn, vui lòng thử lại');
    case 'model':
      return new HttpError(502, 'AI tạm thời không dùng được');
    case 'input':
      return new HttpError(400, 'AI không xử lý được dữ liệu gửi lên');
    case 'auth':
      return new HttpError(500, 'Server cấu hình sai khoá OpenAI');
    case 'quota':
      return new HttpError(503, 'Đã hết hạn mức sử dụng AI');
    default:
      return new HttpError(500, 'Lỗi không xác định khi gọi AI');
  }
}

interface Attempt {
  model: string;
  timeoutMs: number;
  isFallback: boolean;
}

/**
 * Gọi model chính; nếu lỗi tạm thời / model hỏng thì thử 1 lần với model dự phòng.
 * Lỗi do input, sai key, hết quota → trả lỗi luôn, không thử lại.
 */
export async function withFallback<T>(
  op: 'llm' | 'stt',
  primary: Omit<Attempt, 'isFallback'>,
  fallback: Omit<Attempt, 'isFallback'> | null,
  call: (a: Attempt) => Promise<T>,
): Promise<T> {
  const run = async (a: Attempt) => {
    const started = Date.now();
    try {
      return await call(a);
    } catch (err) {
      const kind = classifyError(err);
      log.warn('openai.failed', {
        op,
        model: a.model,
        attempt: a.isFallback ? 'fallback' : 'primary',
        kind,
        ms: Date.now() - started,
        ...errorFields(err),
      });
      throw Object.assign(err instanceof Error ? err : new Error(String(err)), { failureKind: kind });
    }
  };

  try {
    return await run({ ...primary, isFallback: false });
  } catch (err) {
    const kind = (err as { failureKind: FailureKind }).failureKind;
    const canFallback = RETRYABLE.has(kind) && fallback && fallback.model !== primary.model;
    if (!canFallback) throw toHttpError(err, kind);
    log.info('openai.fallback', { op, from: primary.model, to: fallback.model, reason: kind });
    try {
      return await run({ ...fallback, isFallback: true });
    } catch (err2) {
      throw toHttpError(err2, (err2 as { failureKind: FailureKind }).failureKind);
    }
  }
}

// ---------------- LLM ----------------

/** Gọi LLM với Structured Outputs, trả về object đã parse và đã kiểm tra. Có model dự phòng. */
export async function structured<T>(opts: {
  name: string;
  schema: Record<string, unknown>;
  instructions: string;
  input: string;
  /** Kiểm tra lại kết quả ở runtime — không tin tuyệt đối vào strict schema */
  validate?: (data: unknown) => data is T;
}): Promise<T> {
  return withFallback(
    'llm',
    { model: config.llmModel, timeoutMs: config.llmTimeoutMs },
    { model: config.llmFallbackModel, timeoutMs: config.llmFallbackTimeoutMs },
    async ({ model, timeoutMs, isFallback }) => {
      const res = await openai().responses.create(
        {
          model,
          instructions: opts.instructions,
          input: opts.input,
          // reasoning chỉ áp cho model chính (model dự phòng có thể không hỗ trợ)
          ...(config.reasoningEffort && !isFallback ? { reasoning: { effort: config.reasoningEffort } } : {}),
          text: {
            format: { type: 'json_schema', name: opts.name, schema: opts.schema, strict: true },
          },
          store: false,
        },
        { timeout: timeoutMs, maxRetries: 0 },
      );
      // Sai định dạng → HttpError 502 → classifyError = 'model' → thử model dự phòng
      return parseOutput(res.output_text, opts.validate);
    },
  );
}

export function parseOutput<T>(text: string, validate?: (data: unknown) => data is T): T {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(502, 'AI trả kết quả không phải JSON');
  }
  if (validate && !validate(data)) throw new HttpError(502, 'AI trả kết quả không đúng định dạng');
  return data as T;
}
