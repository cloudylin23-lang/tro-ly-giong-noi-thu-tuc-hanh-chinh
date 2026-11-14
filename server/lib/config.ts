// Toàn bộ biến môi trường của server đọc ở ĐÚNG MỘT chỗ này, kiểm tra một lần lúc khởi động.
// Danh sách biến + ý nghĩa: server/.env.example
import { log } from './log.js';

export type ReasoningEffort = 'none' | 'minimal' | 'low';

export interface AppConfig {
  openaiApiKey: string;
  /** Không phải bí mật (nằm trong APK) — chỉ chặn gọi API bừa bãi. Rỗng = không kiểm tra. */
  appToken: string;
  sttModel: string;
  sttFallbackModel: string;
  llmModel: string;
  llmFallbackModel: string;
  reasoningEffort: ReasoningEffort | undefined;
  llmTimeoutMs: number;
  llmFallbackTimeoutMs: number;
  sttTimeoutMs: number;
  sttFallbackTimeoutMs: number;
}

const EFFORTS: readonly ReasoningEffort[] = ['none', 'minimal', 'low'];

/** Đọc + kiểm tra env. Không throw — trả danh sách lỗi để nơi gọi quyết định. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): { config: AppConfig; problems: string[] } {
  const problems: string[] = [];
  const str = (name: string, fallback = '') => (env[name] ?? '').trim() || fallback;
  const required = (name: string) => {
    const v = str(name);
    if (!v) problems.push(`${name} chưa được đặt (bắt buộc)`);
    return v;
  };
  const ms = (name: string, fallback: number) => {
    const raw = str(name);
    if (!raw) return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1_000 || n > 120_000) {
      problems.push(`${name}="${raw}" phải là số mili giây từ 1000 đến 120000`);
      return fallback;
    }
    return n;
  };

  const effortRaw = str('OPENAI_REASONING_EFFORT');
  let reasoningEffort: ReasoningEffort | undefined;
  if (effortRaw) {
    if ((EFFORTS as readonly string[]).includes(effortRaw)) reasoningEffort = effortRaw as ReasoningEffort;
    else problems.push(`OPENAI_REASONING_EFFORT="${effortRaw}" phải là một trong: ${EFFORTS.join(', ')}`);
  }

  const config: AppConfig = {
    openaiApiKey: required('OPENAI_API_KEY'),
    appToken: str('APP_TOKEN'),
    sttModel: str('OPENAI_STT_MODEL', 'gpt-4o-transcribe'),
    sttFallbackModel: str('OPENAI_STT_FALLBACK_MODEL', 'gpt-4o-mini-transcribe'),
    llmModel: str('OPENAI_MODEL', 'gpt-4.1-mini'),
    llmFallbackModel: str('OPENAI_FALLBACK_MODEL', 'gpt-4o-mini'),
    reasoningEffort,
    // Tổng primary + fallback phải < maxDuration của function trong vercel.json
    llmTimeoutMs: ms('OPENAI_LLM_TIMEOUT_MS', 10_000),
    llmFallbackTimeoutMs: ms('OPENAI_LLM_FALLBACK_TIMEOUT_MS', 10_000),
    sttTimeoutMs: ms('OPENAI_STT_TIMEOUT_MS', 15_000),
    sttFallbackTimeoutMs: ms('OPENAI_STT_FALLBACK_TIMEOUT_MS', 10_000),
  };
  return { config, problems };
}

const loaded = loadConfig();

/** Config dùng chung (đọc 1 lần khi module được nạp = lúc server/function khởi động). */
export const config: AppConfig = loaded.config;
export const configProblems: readonly string[] = loaded.problems;

// Vercel: không throw ở đây (function sẽ chết với 500 không rõ lý do) — log ngay lúc cold start,
// /api/health báo ok:false, và các API cần OpenAI trả lỗi nêu rõ biến nào thiếu.
if (configProblems.length && process.env.VITEST !== 'true') {
  log.error('config.invalid', { problems: configProblems });
}

/** Dùng cho chạy local (dev server, samples): thiếu cấu hình thì dừng ngay với thông báo rõ ràng. */
export function assertConfig(): void {
  if (!configProblems.length) return;
  throw new Error(`Cấu hình server chưa hợp lệ:\n  - ${configProblems.join('\n  - ')}\nXem server/.env.example`);
}
