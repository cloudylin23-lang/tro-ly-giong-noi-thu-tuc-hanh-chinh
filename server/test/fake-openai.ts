// Client OpenAI giả cho test — KHÔNG gọi API thật.
// Dùng trong file test:
//   const fake = vi.hoisted(() => ({ responses: vi.fn(), transcribe: vi.fn() }));
//   vi.mock('openai', async (orig) => (await import('./fake-openai.js')).fakeOpenAIModule(await orig(), fake));
// Các lớp lỗi (RateLimitError, APIConnectionTimeoutError…) vẫn là lớp thật của SDK.
import type { Mock } from 'vitest';

export interface FakeCalls {
  responses: Mock;
  transcribe: Mock;
}

export function fakeOpenAIModule(actual: Record<string, unknown>, fake: FakeCalls) {
  class FakeOpenAI {
    responses = { create: fake.responses };
    audio = { transcriptions: { create: fake.transcribe } };
  }
  return { ...actual, default: FakeOpenAI };
}

/** Response giả của responses.create với output_text là JSON (hoặc chuỗi bất kỳ). */
export function llmOutput(data: unknown, usage = { input_tokens: 120, output_tokens: 30, total_tokens: 150 }) {
  return {
    output_text: typeof data === 'string' ? data : JSON.stringify(data),
    usage: { ...usage, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } },
  };
}

export const audioFile = (bytes = 2_000, type = 'audio/m4a') =>
  new File([new Uint8Array(bytes)], 'audio.m4a', { type });
