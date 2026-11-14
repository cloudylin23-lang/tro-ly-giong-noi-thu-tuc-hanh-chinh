import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler, json } from '../lib/http.js';
import { addLogFields, log } from '../lib/log.js';
import { HttpError } from '../lib/openai.js';

let lines: Record<string, unknown>[] = [];
const capture = (...args: unknown[]) => {
  lines.push(JSON.parse(String(args[0])));
};

beforeEach(() => {
  lines = [];
  vi.spyOn(console, 'log').mockImplementation(capture);
  vi.spyOn(console, 'warn').mockImplementation(capture);
  vi.spyOn(console, 'error').mockImplementation(capture);
});
afterEach(() => vi.restoreAllMocks());

const req = (headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/turn', { method: 'POST', headers });

describe('structured log + request id', () => {
  it('mọi dòng log của 1 request cùng reqId, trùng header x-request-id', async () => {
    const h = handler(async () => {
      addLogFields({ mode: 'classify' });
      log.info('step.one');
      log.info('step.two', { chars: 12 });
      return json({ ok: true });
    });
    const res = await h.fetch(req());
    const id = res.headers.get('x-request-id');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(lines.map((l) => l.msg)).toEqual(['step.one', 'step.two', 'request']);
    for (const l of lines) expect(l).toMatchObject({ reqId: id, method: 'POST', path: '/api/turn' });
    expect(lines[1]).toMatchObject({ mode: 'classify', chars: 12 });
    expect(lines[2]).toMatchObject({ level: 'info', status: 200 });
    expect(typeof lines[2].ms).toBe('number');
  });

  it('2 request khác nhau → 2 reqId khác nhau', async () => {
    const h = handler(async () => json({}));
    const a = (await h.fetch(req())).headers.get('x-request-id');
    const b = (await h.fetch(req())).headers.get('x-request-id');
    expect(a).not.toBe(b);
  });

  it('dùng x-request-id client gửi lên nếu hợp lệ, bỏ qua nếu không', async () => {
    const h = handler(async () => json({}));
    expect((await h.fetch(req({ 'x-request-id': 'app-1234abcd' }))).headers.get('x-request-id')).toBe('app-1234abcd');
    expect((await h.fetch(req({ 'x-request-id': 'bad id; drop table' }))).headers.get('x-request-id')).not.toContain(
      'drop',
    );
  });

  it('lỗi: body có requestId; 4xx log warn, 5xx log error kèm thông tin lỗi', async () => {
    const res400 = await handler(async () => {
      throw new HttpError(400, 'Thiếu utterance');
    }).fetch(req());
    expect(await res400.json()).toEqual({ error: 'Thiếu utterance', requestId: res400.headers.get('x-request-id') });
    expect(lines.at(-1)).toMatchObject({ level: 'warn', status: 400, error: 'Thiếu utterance' });

    await handler(async () => {
      throw new Error('boom');
    }).fetch(req());
    expect(lines.at(-1)).toMatchObject({ level: 'error', status: 500, error: 'boom', errorName: 'Error' });
  });

  it('log ngoài request vẫn là JSON hợp lệ (reqId undefined)', () => {
    log.warn('cold.start', { x: 1 });
    expect(lines.at(-1)).toMatchObject({ level: 'warn', msg: 'cold.start', x: 1 });
  });
});
