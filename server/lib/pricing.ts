// Ước tính chi phí từ field `usage` OpenAI trả về. ĐƠN GIÁ CHỈ ĐỂ THAM KHẢO (USD / 1 triệu token) —
// kiểm tra lại ở https://openai.com/api/pricing và sửa bảng này khi giá đổi.
// Model không có trong bảng → costUsd = null (vẫn log số token).

interface TokenPrice {
  input: number;
  cachedInput?: number;
  output: number;
  /** Chỉ model STT: giá token âm thanh đầu vào */
  audioInput?: number;
}

const PRICES: Record<string, TokenPrice> = {
  'gpt-4.1': { input: 2.0, cachedInput: 0.5, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, cachedInput: 0.1, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, cachedInput: 0.025, output: 0.4 },
  'gpt-4o': { input: 2.5, cachedInput: 1.25, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.6 },
  'gpt-4o-transcribe': { input: 2.5, audioInput: 6.0, output: 10.0 },
  'gpt-4o-mini-transcribe': { input: 1.25, audioInput: 3.0, output: 5.0 },
};
/** whisper-1 tính theo phút âm thanh */
const PER_MINUTE: Record<string, number> = { 'whisper-1': 0.006 };

/** Usage đã chuẩn hoá cho cả Responses API lẫn Transcriptions API. */
export interface NormalizedUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  audioTokens?: number;
  audioSeconds?: number;
}

/** Khớp model có hậu tố ngày (vd gpt-4.1-mini-2025-04-14) theo tiền tố dài nhất. */
function priceFor<T>(table: Record<string, T>, model: string): T | undefined {
  const key = Object.keys(table)
    .filter((k) => model === k || model.startsWith(`${k}-`))
    .sort((a, b) => b.length - a.length)[0];
  return key ? table[key] : undefined;
}

export function estimateCostUsd(model: string, u: NormalizedUsage): number | null {
  const perMinute = priceFor(PER_MINUTE, model);
  if (perMinute !== undefined) return u.audioSeconds !== undefined ? round((u.audioSeconds / 60) * perMinute) : null;

  const p = priceFor(PRICES, model);
  if (!p || u.inputTokens === undefined || u.outputTokens === undefined) return null;
  const cached = u.cachedTokens ?? 0;
  const audio = p.audioInput !== undefined ? (u.audioTokens ?? u.inputTokens) : 0; // STT: không có chi tiết → coi như toàn audio
  const text = Math.max(0, u.inputTokens - cached - audio);
  const cost =
    text * p.input + cached * (p.cachedInput ?? p.input) + audio * (p.audioInput ?? p.input) + u.outputTokens * p.output;
  return round(cost / 1_000_000);
}

const round = (n: number) => Math.round(n * 1e8) / 1e8;

/** Chuẩn hoá `usage` của Responses API hoặc Transcriptions API (dạng tokens / duration). */
export function normalizeUsage(usage: unknown): NormalizedUsage {
  if (!usage || typeof usage !== 'object') return {};
  const u = usage as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);
  const details = (u.input_tokens_details ?? u.input_token_details ?? {}) as Record<string, unknown>;
  if (u.type === 'duration') return { audioSeconds: num(u.seconds) };
  return {
    inputTokens: num(u.input_tokens),
    outputTokens: num(u.output_tokens),
    cachedTokens: num(details.cached_tokens),
    audioTokens: num(details.audio_tokens),
  };
}
