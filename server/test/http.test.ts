import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../lib/config.js';
import { handler, json } from '../lib/http.js';
import { HttpError } from '../lib/openai.js';

const req = (method = 'POST', headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/turn', { method, headers });

beforeEach(() => {
  for (const level of ['log', 'warn', 'error'] as const) vi.spyOn(console, level).mockImplementation(() => {});
});
afterEach(() => {
  config.appToken = '';
  vi.restoreAllMocks();
});

describe('handler', () => {
  it('OPTIONS → 204 kèm CORS', async () => {
    const res = await handler(async () => json({})).fetch(req('OPTIONS'));
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('HttpError → JSON { error } đúng status', async () => {
    const res = await handler(async () => {
      throw new HttpError(400, 'Thiếu utterance');
    }).fetch(req());
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'Thiếu utterance' });
  });

  it('lỗi bất ngờ → 500', async () => {
    const res = await handler(async () => {
      throw new Error('boom');
    }).fetch(req());
    expect(res.status).toBe(500);
  });

  it('có APP_TOKEN: sai token → 401, đúng token → 200', async () => {
    config.appToken = 'demo-token';
    const h = handler(async () => json({ ok: true }));
    expect((await h.fetch(req('POST', { 'x-app-token': 'sai' }))).status).toBe(401);
    expect((await h.fetch(req('POST', { 'x-app-token': 'demo-token' }))).status).toBe(200);
  });

  it('APP_TOKEN rỗng → không kiểm tra token', async () => {
    expect((await handler(async () => json({})).fetch(req())).status).toBe(200);
  });
});
