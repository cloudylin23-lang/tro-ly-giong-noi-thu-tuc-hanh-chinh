import {
  APIConnectionTimeoutError,
  AuthenticationError,
  BadRequestError,
  InternalServerError,
  NotFoundError,
  RateLimitError,
} from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { audioFile, llmOutput } from './fake-openai.js';

const fake = vi.hoisted(() => ({ responses: vi.fn(), transcribe: vi.fn() }));
vi.mock('openai', async (orig) => (await import('./fake-openai.js')).fakeOpenAIModule(await orig(), fake));
process.env.OPENAI_API_KEY = 'sk-test';

const { classifyError, config, HttpError, structured } = await import('../lib/openai.js');
const { transcribe } = await import('../lib/stt.js');

const h = () => new Headers();
const rateLimit = () => new RateLimitError(429, { message: 'slow' }, 'slow', h());
const quota = () => new RateLimitError(429, { code: 'insufficient_quota', message: 'quota' }, 'quota', h());
const server500 = () => new InternalServerError(500, { message: 'boom' }, 'boom', h());
const badRequest = () => new BadRequestError(400, { message: 'bad' }, 'bad', h());
const auth = () => new AuthenticationError(401, { message: 'key' }, 'key', h());
const notFound = () => new NotFoundError(404, { message: 'no model' }, 'no model', h());
const timeout = () => new APIConnectionTimeoutError();

const ask = () =>
  structured<{ ok: boolean }>({
    name: 't',
    schema: {},
    instructions: 'x',
    input: 'y',
    validate: (d): d is { ok: boolean } => typeof (d as { ok?: unknown })?.ok === 'boolean',
  });
const models = () => fake.responses.mock.calls.map((c) => c[0].model);

beforeEach(() => {
  fake.responses.mockReset();
  fake.transcribe.mockReset();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('classifyError', () => {
  it.each([
    ['429 rate limit', rateLimit(), 'transient'],
    ['429 hết quota', quota(), 'quota'],
    ['timeout', timeout(), 'transient'],
    ['500', server500(), 'transient'],
    ['404 model', notFound(), 'model'],
    ['400', badRequest(), 'input'],
    ['401', auth(), 'auth'],
    ['AI trả sai định dạng', new HttpError(502, 'x'), 'model'],
    ['lỗi lạ', new Error('?'), 'unknown'],
  ])('%s → %s', (_n, err, kind) => {
    expect(classifyError(err)).toBe(kind);
  });
});

describe('LLM — model dự phòng', () => {
  it.each([
    ['rate limit', rateLimit],
    ['timeout', timeout],
    ['5xx', server500],
    ['model không tồn tại', notFound],
  ])('%s → thử model dự phòng và thành công', async (_n, makeErr) => {
    fake.responses.mockRejectedValueOnce(makeErr()).mockResolvedValueOnce(llmOutput({ ok: true }));
    await expect(ask()).resolves.toEqual({ ok: true });
    expect(models()).toEqual([config.llmModel, config.llmFallbackModel]);
  });

  it('model chính trả rỗng (output_text = "") → thử model dự phòng', async () => {
    fake.responses
      .mockResolvedValueOnce({ output_text: '', status: 'incomplete' })
      .mockResolvedValueOnce(llmOutput({ ok: true }));
    await expect(ask()).resolves.toEqual({ ok: true });
    expect(models()).toEqual([config.llmModel, config.llmFallbackModel]);
  });

  it('cả 2 model đều trả rỗng → 502', async () => {
    fake.responses.mockResolvedValue({ output_text: '', status: 'incomplete' });
    await expect(ask()).rejects.toMatchObject({ status: 502 });
  });

  it('model chính trả sai định dạng → thử model dự phòng', async () => {
    fake.responses.mockResolvedValueOnce(llmOutput('không phải json')).mockResolvedValueOnce(llmOutput({ ok: true }));
    await expect(ask()).resolves.toEqual({ ok: true });
    expect(models()).toEqual([config.llmModel, config.llmFallbackModel]);
  });

  it.each([
    ['400 input sai', badRequest, 400],
    ['401 sai key', auth, 500],
    ['hết quota', quota, 503],
  ])('%s → KHÔNG thử lại, trả %i', async (_n, makeErr, status) => {
    fake.responses.mockRejectedValue(makeErr());
    await expect(ask()).rejects.toMatchObject({ status });
    expect(fake.responses).toHaveBeenCalledTimes(1);
  });

  it('cả 2 model đều lỗi tạm thời → 503, chỉ gọi đúng 2 lần', async () => {
    fake.responses.mockRejectedValue(rateLimit());
    await expect(ask()).rejects.toMatchObject({ status: 503 });
    expect(fake.responses).toHaveBeenCalledTimes(2);
  });

  it('mỗi lần gọi có timeout riêng và tắt retry của SDK', async () => {
    fake.responses.mockResolvedValue(llmOutput({ ok: true }));
    await ask();
    expect(fake.responses.mock.calls[0][1]).toEqual({ timeout: config.llmTimeoutMs, maxRetries: 0 });
  });

  it('không gửi reasoning cho model dự phòng', async () => {
    const saved = config.reasoningEffort;
    config.reasoningEffort = 'low';
    fake.responses.mockRejectedValueOnce(server500()).mockResolvedValueOnce(llmOutput({ ok: true }));
    await ask();
    expect(fake.responses.mock.calls[0][0].reasoning).toEqual({ effort: 'low' });
    expect(fake.responses.mock.calls[1][0].reasoning).toBeUndefined();
    config.reasoningEffort = saved;
  });
});

describe('STT — model dự phòng', () => {
  it('5xx → thử model STT dự phòng', async () => {
    fake.transcribe.mockRejectedValueOnce(server500()).mockResolvedValueOnce({ text: 'xin chào' });
    await expect(transcribe(audioFile())).resolves.toBe('xin chào');
    expect(fake.transcribe.mock.calls.map((c) => c[0].model)).toEqual([config.sttModel, config.sttFallbackModel]);
  });

  it('400 (file hỏng) → không thử lại, trả 400', async () => {
    fake.transcribe.mockRejectedValue(badRequest());
    await expect(transcribe(audioFile())).rejects.toMatchObject({ status: 400 });
    expect(fake.transcribe).toHaveBeenCalledTimes(1);
  });
});
