import { beforeEach, describe, expect, it, vi } from 'vitest';
import { audioFile, llmOutput } from './fake-openai.js';

const fake = vi.hoisted(() => ({ responses: vi.fn(), transcribe: vi.fn() }));
vi.mock('openai', async (orig) => (await import('./fake-openai.js')).fakeOpenAIModule(await orig(), fake));
process.env.OPENAI_API_KEY = 'sk-test';

const { estimateCostUsd, normalizeUsage } = await import('../lib/pricing.js');
const { handler, json } = await import('../lib/http.js');
const { structured } = await import('../lib/openai.js');
const { transcribe } = await import('../lib/stt.js');

describe('pricing', () => {
  it('Responses API: chuẩn hoá usage, tính cả token cache', () => {
    const u = normalizeUsage({
      input_tokens: 1000,
      output_tokens: 100,
      input_tokens_details: { cached_tokens: 400 },
      output_tokens_details: { reasoning_tokens: 0 },
    });
    expect(u).toEqual({ inputTokens: 1000, outputTokens: 100, cachedTokens: 400, audioTokens: undefined });
    // gpt-4.1-mini: 600 × 0.40 + 400 × 0.10 + 100 × 1.60 (USD / 1M token)
    expect(estimateCostUsd('gpt-4.1-mini', u)).toBeCloseTo((600 * 0.4 + 400 * 0.1 + 100 * 1.6) / 1e6, 10);
  });

  it('STT dạng tokens: tách token âm thanh / chữ', () => {
    const u = normalizeUsage({
      type: 'tokens',
      input_tokens: 300,
      output_tokens: 20,
      input_token_details: { audio_tokens: 280, text_tokens: 20 },
    });
    expect(estimateCostUsd('gpt-4o-transcribe', u)).toBeCloseTo((20 * 2.5 + 280 * 6 + 20 * 10) / 1e6, 10);
  });

  it('STT dạng duration (whisper-1): tính theo phút', () => {
    expect(estimateCostUsd('whisper-1', normalizeUsage({ type: 'duration', seconds: 30 }))).toBeCloseTo(0.003, 10);
  });

  it('model có hậu tố ngày vẫn khớp giá', () => {
    expect(estimateCostUsd('gpt-4.1-mini-2025-04-14', { inputTokens: 1e6, outputTokens: 0 })).toBe(0.4);
  });

  it('model lạ / thiếu usage → null, không đoán bừa', () => {
    expect(estimateCostUsd('model-moi', { inputTokens: 10, outputTokens: 10 })).toBeNull();
    expect(estimateCostUsd('gpt-4.1-mini', normalizeUsage(undefined))).toBeNull();
  });
});

describe('log token / chi phí', () => {
  let lines: Record<string, unknown>[];
  beforeEach(() => {
    lines = [];
    fake.responses.mockReset();
    fake.transcribe.mockReset();
    const capture = (...a: unknown[]) => lines.push(JSON.parse(String(a[0])));
    vi.spyOn(console, 'log').mockImplementation(capture);
    vi.spyOn(console, 'warn').mockImplementation(capture);
    vi.spyOn(console, 'error').mockImplementation(capture);
  });

  const ask = () =>
    structured<{ ok: boolean }>({
      name: 't',
      schema: {},
      instructions: 'x',
      input: 'y',
      validate: (d): d is { ok: boolean } => typeof (d as { ok?: unknown })?.ok === 'boolean',
    });

  it('mỗi lần gọi có 1 dòng openai.call; dòng request cuối có tổng chi phí của cả request', async () => {
    // model chính trả sai → model dự phòng: cả 2 lần đều tốn tiền và đều được ghi
    fake.responses
      .mockResolvedValueOnce(llmOutput('không phải json', { input_tokens: 1000, output_tokens: 50, total_tokens: 1050 }))
      .mockResolvedValueOnce(llmOutput({ ok: true }, { input_tokens: 1000, output_tokens: 50, total_tokens: 1050 }));
    const res = await handler(async () => json(await ask())).fetch(new Request('http://x/api/turn', { method: 'POST' }));
    expect(res.status).toBe(200);

    const calls = lines.filter((l) => l.msg === 'openai.call');
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ op: 'llm', model: 'gpt-4.1-mini', attempt: 'primary', inputTokens: 1000, outputTokens: 50 });
    expect(calls[1]).toMatchObject({ model: 'gpt-4o-mini', attempt: 'fallback' });
    const primaryCost = (1000 * 0.4 + 50 * 1.6) / 1e6;
    const fallbackCost = (1000 * 0.15 + 50 * 0.6) / 1e6;
    expect(calls[0].costUsd).toBeCloseTo(primaryCost, 10);

    const reqLine = lines.find((l) => l.msg === 'request')!;
    expect(reqLine.openaiCalls).toBe(2);
    expect(reqLine.openaiCostUsd).toBeCloseTo(primaryCost + fallbackCost, 8);
    for (const l of [...calls, reqLine]) expect(l.reqId).toBe(res.headers.get('x-request-id'));
  });

  it('STT cũng ghi usage', async () => {
    fake.transcribe.mockResolvedValue({
      text: 'xin chào',
      usage: { type: 'tokens', input_tokens: 100, output_tokens: 5, total_tokens: 105 },
    });
    await transcribe(audioFile());
    expect(lines.find((l) => l.msg === 'openai.call')).toMatchObject({
      op: 'stt',
      model: 'gpt-4o-transcribe',
      inputTokens: 100,
      outputTokens: 5,
    });
  });
});
